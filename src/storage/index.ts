import type { Session, ExtensionSettings, ActivityLog, TabGroup } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';

// ==================== Generic Storage Helpers ====================

async function getLocal<T>(key: string): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] ?? null);
    });
  });
}

export { getLocal };

async function setLocal<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

async function getSync<T>(key: string): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(key, (result) => {
      resolve(result[key] ?? null);
    });
  });
}

async function setSync<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [key]: value }, resolve);
  });
}

// ==================== Settings ====================

const SETTINGS_KEY = 'tabManager_settings';
const SECURE_KEYS = new Set<keyof ExtensionSettings>([
  'anthropicApiKey',
  'notionApiKey',
  'notionDatabaseId',
  'trelloApiKey',
  'trelloToken',
  'trelloBoardId',
]);

export async function getSettings(): Promise<ExtensionSettings> {
  const [syncSettings, localSettings] = await Promise.all([
    getSync<ExtensionSettings>(SETTINGS_KEY),
    getLocal<ExtensionSettings>(SETTINGS_KEY),
  ]);
  const base = { ...DEFAULT_SETTINGS, ...syncSettings, ...localSettings };
  return base;
}

export async function updateSettings(partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated = { ...current, ...partial };

  const syncPart: Record<string, unknown> = {};
  const localPart: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(partial)) {
    if (SECURE_KEYS.has(key as keyof ExtensionSettings)) {
      localPart[key] = value;
    } else {
      syncPart[key] = value;
    }
  }

  if (Object.keys(localPart).length > 0) {
    const existingLocal = await getLocal<Record<string, unknown>>(SETTINGS_KEY) || {};
    await setLocal(SETTINGS_KEY, { ...existingLocal, ...localPart });
  }
  if (Object.keys(syncPart).length > 0) {
    const existingSync = await getSync<Record<string, unknown>>(SETTINGS_KEY) || {};
    await setSync(SETTINGS_KEY, { ...existingSync, ...syncPart });
  }

  return updated;
}

// ==================== Sessions ====================

const SESSIONS_KEY = 'tabManager_sessions';
const LAST_SESSION_KEY = 'tabManager_lastSession';

export async function getSessions(): Promise<Session[]> {
  const sessions = await getLocal<Session[]>(SESSIONS_KEY);
  return sessions || [];
}

export async function saveSession(session: Session): Promise<void> {
  const sessions = await getSessions();
  sessions.unshift(session);
  // Keep only last 50 sessions
  if (sessions.length > 50) sessions.length = 50;
  await setLocal(SESSIONS_KEY, sessions);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const sessions = await getSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  await setLocal(SESSIONS_KEY, filtered);
}

export async function saveCurrentState(groups: TabGroup[]): Promise<void> {
  const allTabs = groups.flatMap(g => g.tabs);
  await setLocal(LAST_SESSION_KEY, {
    groups,
    savedAt: Date.now(),
    tabCount: allTabs.length,
  });
}

export async function getLastSession(): Promise<{ groups: TabGroup[]; savedAt: number; tabCount: number } | null> {
  return getLocal(LAST_SESSION_KEY);
}

// ==================== Activity Log ====================

const ACTIVITY_KEY = 'tabManager_activity';
const MAX_ACTIVITY_LOG = 200;

export async function logActivity(activity: ActivityLog): Promise<void> {
  const logs = await getLocal<ActivityLog[]>(ACTIVITY_KEY) || [];
  logs.unshift(activity);
  if (logs.length > MAX_ACTIVITY_LOG) logs.length = MAX_ACTIVITY_LOG;
  await setLocal(ACTIVITY_KEY, logs);
}

export async function getActivityLog(limit = 20): Promise<ActivityLog[]> {
  const logs = await getLocal<ActivityLog[]>(ACTIVITY_KEY) || [];
  return logs.slice(0, limit);
}

// ==================== Tab Groups Cache ====================

const GROUPS_KEY = 'tabManager_groups';

export async function getCachedGroups(): Promise<TabGroup[]> {
  const groups = await getLocal<TabGroup[]>(GROUPS_KEY);
  return groups || [];
}

export async function setCachedGroups(groups: TabGroup[]): Promise<void> {
  await setLocal(GROUPS_KEY, groups);
}

// ==================== Content Snippets ====================

const SNIPPETS_KEY = 'tabManager_contentSnippets';

export async function getContentSnippets(): Promise<Record<number, string>> {
  const snippets = await getLocal<Record<number, string>>(SNIPPETS_KEY);
  return snippets || {};
}

export async function setContentSnippet(tabId: number, snippet: string): Promise<void> {
  const snippets = await getContentSnippets();
  snippets[tabId] = snippet;
  await setLocal(SNIPPETS_KEY, snippets);
}

// ==================== Tab Count ====================

const TAB_COUNT_KEY = 'tabManager_tabCount';

export async function getTabCountHistory(): Promise<{ date: string; count: number }[]> {
  const history = await getLocal<{ date: string; count: number }[]>(TAB_COUNT_KEY);
  return history || [];
}

export async function recordTabCount(count: number): Promise<void> {
  const history = await getTabCountHistory();
  const today = new Date().toISOString().split('T')[0];
  
  const existing = history.find(h => h.date === today);
  if (existing) {
    existing.count = Math.max(existing.count, count);
  } else {
    history.push({ date: today, count });
  }

  // Keep last 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const filtered = history.filter(h => h.date >= cutoff.toISOString().split('T')[0]);
  
  await setLocal(TAB_COUNT_KEY, filtered);
}

// ==================== Notion Integration ====================

export async function exportToNotion(
  tab: { title: string; url: string },
  apiKey: string,
  databaseId: string
): Promise<boolean> {
  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          Name: {
            title: [{ text: { content: tab.title } }],
          },
          URL: {
            url: tab.url,
          },
          Status: {
            select: { name: 'To Do' },
          },
          Source: {
            select: { name: 'Tab Manager AI' },
          },
        },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Notion export error:', error);
    return false;
  }
}

// ==================== Trello Integration ====================

export async function exportToTrello(
  tab: { title: string; url: string },
  apiKey: string,
  token: string,
  boardId: string
): Promise<boolean> {
  try {
    // First, get the first list from the board
    const listsResponse = await fetch(
      `https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${token}`
    );

    if (!listsResponse.ok) return false;

    const lists = await listsResponse.json() as Array<{ id: string }>;
    if (lists.length === 0) return false;

    const listId = lists[0].id;

    // Create a card
    const response = await fetch('https://api.trello.com/1/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: apiKey,
        token,
        idList: listId,
        name: tab.title,
        desc: `Saved from Tab Manager AI\n\nURL: ${tab.url}`,
        urlSource: tab.url,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Trello export error:', error);
    return false;
  }
}
