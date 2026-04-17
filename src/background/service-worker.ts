// ==================== Background Service Worker ====================
// Tab Manager AI — monitors tabs, classifies, manages sessions

import { classifyTabs } from '../ai/classifier';
import type { TabInfo, TabGroup, ExtensionMessage, ExtensionSettings } from '../shared/types';
import {
  getSettings,
  updateSettings as updateSettingsFn,
  getCachedGroups,
  setCachedGroups,
  saveCurrentState,
  saveSession,
  getSessions,
  deleteSession as deleteSessionFromStorage,
  logActivity,
  recordTabCount,
  exportToNotion,
  exportToTrello,
  getContentSnippets,
  setContentSnippet,
  getLocal,
  evictStaleSnippets,
} from '../storage/index';

// ==================== Tab Monitoring ====================

const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
let lastTabHash: string | null = null;

function computeTabHash(tabs: TabInfo[]): string {
  const ids = tabs.map(t => `${t.id}:${t.url}:${t.title}`).sort().join('|');
  let hash = 0;
  for (let i = 0; i < ids.length; i++) {
    hash = ((hash << 5) - hash + ids.charCodeAt(i)) | 0;
  }
  return String(hash);
}

function debounce(key: string, fn: () => void, delay: number) {
  if (debounceTimers[key]) clearTimeout(debounceTimers[key]);
  debounceTimers[key] = setTimeout(() => {
    delete debounceTimers[key];
    fn();
  }, delay);
}

async function getAllTabs(): Promise<TabInfo[]> {
  const snippets = await getContentSnippets();
  return new Promise((resolve) => {
    chrome.tabs.query({}, (tabs) => {
      const tabInfos: TabInfo[] = tabs.map(t => ({
        id: t.id!,
        url: t.url || '',
        title: t.title || '',
        favIconUrl: t.favIconUrl || '',
        groupId: t.groupId,
        windowId: t.windowId,
        lastAccessed: t.lastAccessed,
        contentSnippet: snippets[t.id!],
      }));
      resolve(tabInfos);
    });
  });
}

async function classifyAndCache() {
  try {
    const tabs = await getAllTabs();
    const settings = await getSettings();

    await recordTabCount(tabs.length);

    const currentHash = computeTabHash(tabs);
    if (currentHash === lastTabHash) {
      return await getCachedGroups();
    }
    lastTabHash = currentHash;

    if (settings.enableNotifications && tabs.length >= settings.tabLimit) {
      chrome.notifications.create('tab-limit-warning', {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon128.png'),
        title: 'Tab Manager AI',
        message: `You have ${tabs.length} tabs open! Consider closing some to stay focused.`,
        priority: 2,
      });
    }

    const result = await classifyTabs(tabs, {
      useAI: settings.enableAI && settings.aiProvider === 'anthropic',
      apiKey: settings.anthropicApiKey,
    });

    await setCachedGroups(result.groups);
    await saveCurrentState(result.groups);
    await evictStaleSnippets(tabs.map(t => t.id));

    const text = tabs.length > 0 ? String(tabs.length) : '';
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: tabs.length >= settings.tabLimit ? '#ef4444' : '#3b82f6' });

    return result.groups;
  } catch (error) {
    console.error('Classification error:', error);
    return [];
  }
}

// ==================== Event Listeners ====================

chrome.tabs.onCreated.addListener((tab) => {
  debounce('created', () => {
    classifyAndCache();
    logActivity({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action: 'opened',
      description: `Opened: ${tab.title || tab.url || 'New Tab'}`,
      timestamp: Date.now(),
    });
  }, 1000);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  debounce('removed', () => {
    classifyAndCache();
    logActivity({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      action: 'closed',
      description: `Closed tab #${tabId}`,
      timestamp: Date.now(),
    });
  }, 1000);
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.title || changeInfo.url) {
    debounce('updated', () => classifyAndCache(), 2000);
  }
});

chrome.tabs.onActivated.addListener(() => {
  debounce('activated', () => classifyAndCache(), 1500);
});

// ==================== Alarm for Periodic Classification ====================

chrome.alarms.create('periodic-classify', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodic-classify') classifyAndCache();
});

// ==================== Side Panel ====================

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

// ==================== "What were you doing?" on startup ====================

chrome.runtime.onStartup.addListener(async () => {
  const lastSession = await getLocal<{ groups: TabGroup[]; savedAt: number }>('tabManager_lastSession');
  if (lastSession && lastSession.groups.length > 0) {
    const timeAgo = formatTimeAgo(lastSession.savedAt);
    const totalTabs = lastSession.groups.reduce((acc, g) => acc + g.tabs.length, 0);
    chrome.notifications.create('welcome-back', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: 'Welcome back!',
      message: `Last session (${timeAgo}): ${totalTabs} tabs in ${lastSession.groups.length} groups.`,
      priority: 2,
    });
  }
  classifyAndCache();
});

// ==================== Message Handling ====================

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  if (message.type === 'CONTENT_EXTRACTED') {
    const p = (message.payload || {}) as { contentSnippet?: string };
    if (sender.tab?.id && p.contentSnippet) {
      setContentSnippet(sender.tab.id, p.contentSnippet).then(() => {
        sendResponse({ received: true });
      });
    } else {
      sendResponse({ received: true });
    }
    return true;
  }

  handleMessage(message).then(sendResponse).catch((error) => {
    console.error('Message handler error:', error);
    sendResponse({ error: error.message });
  });
  return true;
});

async function handleMessage(message: ExtensionMessage) {
  switch (message.type) {
    case 'GET_TAB_GROUPS': {
      const groups = await getCachedGroups();
      return { groups };
    }
    case 'GET_TAB_COUNT': {
      const tabs = await getAllTabs();
      const settings = await getSettings();
      return { count: tabs.length, limit: settings.tabLimit };
    }
    case 'CLASSIFY_TABS': {
      const groups = await classifyAndCache();
      return { groups };
    }
    case 'SAVE_SESSION': {
      const { name, tags } = (message.payload || {}) as { name: string; tags?: string[] };
      const groups = await getCachedGroups();
      const allTabs = groups.flatMap(g => g.tabs);
      const session = {
        id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: name || `Session ${new Date().toLocaleDateString()}`,
        groups,
        tabCount: allTabs.length,
        savedAt: Date.now(),
        tags,
      };
      await saveSession(session);
      await logActivity({
        id: `act-${Date.now()}`,
        action: 'saved',
        description: `Saved session: ${session.name}`,
        timestamp: Date.now(),
      });
      return { success: true, session };
    }
    case 'GET_SESSIONS': {
      const sessions = await getSessions();
      return { sessions };
    }
    case 'DELETE_SESSION': {
      const { sessionId } = (message.payload || {}) as { sessionId: string };
      await deleteSessionFromStorage(sessionId);
      return { success: true };
    }
    case 'RESTORE_SESSION': {
      const { sessionId } = (message.payload || {}) as { sessionId: string };
      const sessions = await getSessions();
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        for (const group of session.groups) {
          for (const tab of group.tabs) {
            if (tab.url) {
              chrome.tabs.create({ url: tab.url, active: false });
              await new Promise(r => setTimeout(r, 100));
            }
          }
        }
        await logActivity({
          id: `act-${Date.now()}`,
          action: 'restored',
          description: `Restored session: ${session.name}`,
          timestamp: Date.now(),
        });
        return { success: true };
      }
      return { success: false, error: 'Session not found' };
    }
    case 'CLOSE_TAB': {
      const { tabId } = (message.payload || {}) as { tabId: number };
      chrome.tabs.remove(tabId);
      return { success: true };
    }
    case 'CLOSE_GROUP_TABS': {
      const { tabIds } = (message.payload || {}) as { tabIds: number[] };
      chrome.tabs.remove(tabIds);
      return { success: true };
    }
    case 'GET_SETTINGS': {
      const settings = await getSettings();
      return { settings };
    }
    case 'UPDATE_SETTINGS': {
      const partial = (message.payload || {}) as Partial<ExtensionSettings>;
      const updated = await updateSettingsFn(partial);
      return { success: true, settings: updated };
    }
    case 'EXPORT_TO_NOTION': {
      const p = message.payload as { title: string; url: string; apiKey: string; databaseId: string };
      const success = await exportToNotion(p, p.apiKey, p.databaseId);
      return { success };
    }
    case 'EXPORT_TO_TRELLO': {
      const p = message.payload as { title: string; url: string; apiKey: string; token: string; boardId: string };
      const success = await exportToTrello(p, p.apiKey, p.token, p.boardId);
      return { success };
    }
    default:
      return { error: 'Unknown message type' };
  }
}

// ==================== Helpers ====================

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

// ==================== Initialize ====================

let installed = false;
chrome.runtime.onInstalled.addListener(() => {
  installed = true;
  classifyAndCache();
});
if (!installed) classifyAndCache();
