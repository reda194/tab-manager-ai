import React, { useEffect, useState, useCallback } from 'react';
import type { TabGroup, Session, ExtensionSettings } from '../shared/types';
import { GROUP_COLORS, GROUP_TYPE_LABELS, DEFAULT_SETTINGS } from '../shared/types';
import { sendMessage } from '../shared/messaging';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function TabItem({ tab, onExport }: {
  tab: { id: number; title: string; url: string; favIconUrl?: string };
  onExport: (tab: { title: string; url: string }) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors group">
      {tab.favIconUrl ? (
        <img src={tab.favIconUrl} alt="" className="w-4 h-4 flex-shrink-0 rounded-sm"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <div className="w-4 h-4 bg-gray-200 rounded-sm flex-shrink-0" />
      )}
      <a href="#" className="text-sm text-gray-700 hover:text-blue-600 truncate flex-1"
        onClick={(e) => { e.preventDefault(); chrome.tabs.update(tab.id, { active: true }); }}
        title={tab.title}>{tab.title || 'Untitled'}</a>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onExport(tab)} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="Export as task">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        <button onClick={() => sendMessage('CLOSE_TAB', { tabId: tab.id })} className="p-1 text-gray-400 hover:text-red-500 rounded" title="Close">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function GroupSection({ group, onCloseGroup, onExportTab }: {
  group: TabGroup; onCloseGroup: (ids: number[]) => void; onExportTab: (tab: { title: string; url: string }) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const color = GROUP_COLORS[group.color] || '#6b7280';
  const label = GROUP_TYPE_LABELS[group.type];

  return (
    <div className="animate-fade-in border border-gray-200 rounded-xl overflow-hidden mb-3">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <div>
            <span className="font-semibold text-sm text-gray-800">{group.name}</span>
            <span className="ml-2 text-xs text-gray-400">{label?.en || group.type}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-full">{group.tabs.length} tabs</span>
          <button onClick={(e) => { e.stopPropagation(); onCloseGroup(group.tabs.map(t => t.id)); }}
            className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors">Close all</button>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100">
          {group.tabs.map((tab) => <TabItem key={tab.id} tab={tab} onExport={onExportTab} />)}
        </div>
      )}
    </div>
  );
}

function SessionsView({ sessions, onRestore, onDelete }: {
  sessions: Session[]; onRestore: (id: string) => void; onDelete: (id: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">No saved sessions yet</p>
        <p className="text-gray-400 text-xs mt-1">Save your current tabs to create a session</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <div key={session.id} className="border border-gray-200 rounded-xl p-4 animate-fade-in">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-semibold text-sm text-gray-800">{session.name}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(session.savedAt)}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => onRestore(session.id)} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors">Restore</button>
              <button onClick={() => onDelete(session.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors">Delete</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{session.tabCount} tabs</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{session.groups.length} groups</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {session.groups.map((g) => (
              <span key={g.id} className="text-xs flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: GROUP_COLORS[g.color] }} />
                {g.name} ({g.tabs.length})
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsView({ settings, onSave }: { settings: ExtensionSettings; onSave: (s: Partial<ExtensionSettings>) => void }) {
  const [form, setForm] = useState<ExtensionSettings>(settings);
  useEffect(() => { setForm(settings); }, [settings]);

  function updateField<K extends keyof ExtensionSettings>(key: K, value: ExtensionSettings[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    onSave({ [key]: value });
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">General</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600">Tab Limit</label>
            <input type="number" value={form.tabLimit} min={5} max={100}
              onChange={(e) => updateField('tabLimit', parseInt(e.target.value) || 15)}
              className="w-20 px-2 py-1 text-sm border border-gray-200 rounded-lg text-center" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600">Auto-group tabs</label>
            <button onClick={() => updateField('autoGroup', !form.autoGroup)}
              className={`w-10 h-5 rounded-full transition-colors ${form.autoGroup ? 'bg-blue-500' : 'bg-gray-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.autoGroup ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600">Notifications</label>
            <button onClick={() => updateField('enableNotifications', !form.enableNotifications)}
              className={`w-10 h-5 rounded-full transition-colors ${form.enableNotifications ? 'bg-blue-500' : 'bg-gray-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.enableNotifications ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">AI Classification</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600">Enable AI</label>
            <button onClick={() => updateField('enableAI', !form.enableAI)}
              className={`w-10 h-5 rounded-full transition-colors ${form.enableAI ? 'bg-blue-500' : 'bg-gray-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.enableAI ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {form.enableAI && (
            <>
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600">Provider</label>
                <select value={form.aiProvider} onChange={(e) => updateField('aiProvider', e.target.value as 'local' | 'anthropic')}
                  className="px-2 py-1 text-sm border border-gray-200 rounded-lg">
                  <option value="local">Local (Free)</option>
                  <option value="anthropic">Anthropic Claude</option>
                </select>
              </div>
              {form.aiProvider === 'anthropic' && (
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Anthropic API Key</label>
                  <input type="password" value={form.anthropicApiKey || ''} onChange={(e) => updateField('anthropicApiKey', e.target.value)}
                    placeholder="sk-ant-..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Integrations</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Notion API Key</label>
            <input type="password" value={form.notionApiKey || ''} onChange={(e) => updateField('notionApiKey', e.target.value)}
              placeholder="secret_..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Notion Database ID</label>
            <input type="text" value={form.notionDatabaseId || ''} onChange={(e) => updateField('notionDatabaseId', e.target.value)}
              placeholder="Database ID" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
          </div>
          <hr className="border-gray-100" />
          <div>
            <label className="text-sm text-gray-600 block mb-1">Trello API Key</label>
            <input type="text" value={form.trelloApiKey || ''} onChange={(e) => updateField('trelloApiKey', e.target.value)}
              placeholder="Trello API Key" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Trello Token</label>
            <input type="password" value={form.trelloToken || ''} onChange={(e) => updateField('trelloToken', e.target.value)}
              placeholder="Token" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Trello Board ID</label>
            <input type="text" value={form.trelloBoardId || ''} onChange={(e) => updateField('trelloBoardId', e.target.value)}
              placeholder="Board ID" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportDialog({ tab, onClose }: { tab: { title: string; url: string }; onClose: () => void }) {
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);

  async function handleExport(target: 'notion' | 'trello') {
    setExporting(true);
    setResult(null);
    const settingsRes = await sendMessage('GET_SETTINGS');
    const s = settingsRes?.settings as ExtensionSettings | undefined;

    if (target === 'notion') {
      if (!s?.notionApiKey || !s?.notionDatabaseId) { setResult('error'); setExporting(false); return; }
      const res = await sendMessage('EXPORT_TO_NOTION', { ...tab, apiKey: s.notionApiKey, databaseId: s.notionDatabaseId });
      setResult(res?.success ? 'success' : 'error');
    } else {
      if (!s?.trelloApiKey || !s?.trelloToken || !s?.trelloBoardId) { setResult('error'); setExporting(false); return; }
      const res = await sendMessage('EXPORT_TO_TRELLO', { ...tab, apiKey: s.trelloApiKey, token: s.trelloToken, boardId: s.trelloBoardId });
      setResult(res?.success ? 'success' : 'error');
    }
    setExporting(false);
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 shadow-xl max-w-sm w-full mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-800 mb-1">Export as Task</h3>
        <p className="text-xs text-gray-500 mb-4 truncate">{tab.title}</p>
        <div className="space-y-2">
          <button onClick={() => handleExport('notion')} disabled={exporting}
            className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">N</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-800">Export to Notion</p>
              <p className="text-xs text-gray-400">Create a task in your database</p>
            </div>
          </button>
          <button onClick={() => handleExport('trello')} disabled={exporting}
            className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-bold">T</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-800">Export to Trello</p>
              <p className="text-xs text-gray-400">Create a card on your board</p>
            </div>
          </button>
        </div>
        {result === 'success' && <p className="text-sm text-green-600 mt-3 text-center">Exported successfully!</p>}
        {result === 'error' && <p className="text-sm text-red-500 mt-3 text-center">Export failed. Check settings.</p>}
        <button onClick={onClose} className="w-full mt-4 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Close</button>
      </div>
    </div>
  );
}

type ViewTab = 'tabs' | 'sessions' | 'settings';

export function SidePanel() {
  const [view, setView] = useState<ViewTab>('tabs');
  const [groups, setGroups] = useState<TabGroup[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [settings, setSettings] = useState<ExtensionSettings>({ ...DEFAULT_SETTINGS });
  const [tabCount, setTabCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exportTab, setExportTab] = useState<{ title: string; url: string } | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, sessionsRes, settingsRes, countRes] = await Promise.all([
        sendMessage('GET_TAB_GROUPS'), sendMessage('GET_SESSIONS'),
        sendMessage('GET_SETTINGS'), sendMessage('GET_TAB_COUNT'),
      ]);
      if (groupsRes?.groups) setGroups(groupsRes.groups);
      if (sessionsRes?.sessions) setSessions(sessionsRes.sessions);
      if (settingsRes?.settings) setSettings(settingsRes.settings);
      if (countRes?.count != null) setTabCount(countRes.count);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleRefresh() {
    setLoading(true);
    const result = await sendMessage('CLASSIFY_TABS');
    if (result?.groups) setGroups(result.groups);
    const countRes = await sendMessage('GET_TAB_COUNT');
    if (countRes?.count != null) setTabCount(countRes.count);
    setLoading(false);
  }

  async function handleSaveSession() {
    setSaving(true);
    await sendMessage('SAVE_SESSION', { name: sessionName || `Session ${new Date().toLocaleDateString()}` });
    setSessionName('');
    setSaving(false);
    const res = await sendMessage('GET_SESSIONS');
    if (res?.sessions) setSessions(res.sessions);
  }

  async function handleRestoreSession(id: string) {
    await sendMessage('RESTORE_SESSION', { sessionId: id });
    handleRefresh();
  }

  async function handleDeleteSession(id: string) {
    await sendMessage('DELETE_SESSION', { sessionId: id });
    const res = await sendMessage('GET_SESSIONS');
    if (res?.sessions) setSessions(res.sessions);
  }

  async function handleCloseGroup(tabIds: number[]) {
    await sendMessage('CLOSE_GROUP_TABS', { tabIds });
    setTimeout(handleRefresh, 500);
  }

  async function handleSaveSettings(partial: Partial<ExtensionSettings>) {
    const res = await sendMessage('UPDATE_SETTINGS', partial);
    if (res?.settings) setSettings(res.settings);
  }

  const overLimit = tabCount >= settings.tabLimit;
  const navItems: { id: ViewTab; label: string; icon: string }[] = [
    { id: 'tabs', label: 'Tabs', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'sessions', label: 'Sessions', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ];

  return (
    <div className="h-screen bg-white flex flex-col">
      <div className="px-6 pt-6 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Tab Manager AI</h1>
              <p className="text-xs text-gray-400">Organize your browsing</p>
            </div>
          </div>
          <button onClick={handleRefresh} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Refresh">
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            overLimit ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
            <span className={`w-2 h-2 rounded-full ${overLimit ? 'bg-red-500 animate-pulse-dot' : 'bg-blue-500'}`} />
            {tabCount} tabs
          </div>
          <div className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">{groups.length} groups</div>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-colors ${
                view === item.id ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Analyzing tabs...</span>
            </div>
          </div>
        ) : (
          <>
            {view === 'tabs' && (
              <div>
                {groups.length > 0 && (
                  <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-xl">
                    <input type="text" value={sessionName} onChange={(e) => setSessionName(e.target.value)}
                      placeholder="Session name..." className="flex-1 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg" />
                    <button onClick={handleSaveSession} disabled={saving}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
                {groups.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <p className="text-gray-500">No tabs to organize</p>
                    <p className="text-gray-400 text-sm mt-1">Open some tabs and they'll appear here</p>
                  </div>
                ) : (
                  groups.map((group) => <GroupSection key={group.id} group={group} onCloseGroup={handleCloseGroup} onExportTab={(tab) => setExportTab(tab)} />)
                )}
              </div>
            )}
            {view === 'sessions' && <SessionsView sessions={sessions} onRestore={handleRestoreSession} onDelete={handleDeleteSession} />}
            {view === 'settings' && <SettingsView settings={settings} onSave={handleSaveSettings} />}
          </>
        )}
      </div>

      {exportTab && <ExportDialog tab={exportTab} onClose={() => setExportTab(null)} />}
    </div>
  );
}
