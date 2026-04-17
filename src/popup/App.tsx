import React, { useEffect, useState, useCallback } from 'react';
import type { TabGroup } from '../shared/types';
import { GROUP_COLORS, GROUP_TYPE_LABELS } from '../shared/types';
import { sendMessage } from '../shared/messaging';

function GroupCard({ group, onCloseGroup }: { group: TabGroup; onCloseGroup: (ids: number[]) => void }) {
  const [expanded, setExpanded] = useState(false);
  const color = GROUP_COLORS[group.color] || '#6b7280';
  const label = GROUP_TYPE_LABELS[group.type];

  return (
    <div className="animate-fade-in border border-gray-200 rounded-lg overflow-hidden mb-2">
      <div className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="font-medium text-sm text-gray-800 truncate">{group.name}</span>
          <span className="text-xs text-gray-400 flex-shrink-0">{label?.en || group.type}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">{group.tabs.length}</span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50">
          {group.tabs.map((tab) => (
            <div key={tab.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white transition-colors animate-slide-in">
              {tab.favIconUrl ? (
                <img src={tab.favIconUrl} alt="" className="w-4 h-4 flex-shrink-0 rounded-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className="w-4 h-4 bg-gray-200 rounded-sm flex-shrink-0" />
              )}
              <a href="#" className="text-xs text-gray-600 hover:text-blue-600 truncate flex-1 text-left"
                onClick={(e) => { e.preventDefault(); chrome.tabs.update(tab.id, { active: true }); }}
                title={tab.title}>{tab.title || 'Untitled'}</a>
              <button onClick={(e) => { e.stopPropagation(); sendMessage('CLOSE_TAB', { tabId: tab.id }); }}
                className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Close tab">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <div className="px-3 py-2 border-t border-gray-100">
            <button onClick={() => onCloseGroup(group.tabs.map(t => t.id))}
              className="text-xs text-red-500 hover:text-red-700 transition-colors font-medium">
              Close all ({group.tabs.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Popup() {
  const [groups, setGroups] = useState<TabGroup[]>([]);
  const [tabCount, setTabCount] = useState(0);
  const [tabLimit, setTabLimit] = useState(15);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, countRes] = await Promise.all([sendMessage('GET_TAB_GROUPS'), sendMessage('GET_TAB_COUNT')]);
      if (groupsRes?.groups) setGroups(groupsRes.groups);
      if (countRes?.count != null) { setTabCount(countRes.count); if (countRes.limit != null) setTabLimit(countRes.limit); }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleRefresh() {
    setLoading(true);
    try {
      const result = await sendMessage('CLASSIFY_TABS');
      if (result?.groups) setGroups(result.groups);
      const countRes = await sendMessage('GET_TAB_COUNT');
      if (countRes?.count != null) { setTabCount(countRes.count); if (countRes.limit != null) setTabLimit(countRes.limit); }
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSession() {
    setSaving(true);
    await sendMessage('SAVE_SESSION', { name: `Session ${new Date().toLocaleString()}` });
    setSaving(false);
  }

  async function handleCloseGroup(tabIds: number[]) {
    await sendMessage('CLOSE_GROUP_TABS', { tabIds });
    setTimeout(loadData, 500);
  }

  const overLimit = tabCount >= tabLimit;

  return (
    <div className="w-[360px] min-h-[480px] max-h-[600px] bg-white flex flex-col">
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">Tab Manager AI</h1>
              <p className="text-[10px] text-gray-400">Smart tab organization</p>
            </div>
          </div>
          <button onClick={handleRefresh}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Refresh">
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            overLimit ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
            <span className={`w-2 h-2 rounded-full ${overLimit ? 'bg-red-500 animate-pulse-dot' : 'bg-blue-500'}`} />
            {tabCount} tabs open{overLimit ? ' — Limit!' : ''}
          </div>
          <div className="text-xs text-gray-400">{groups.length} groups</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-400">Analyzing tabs...</span>
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-1">No tabs to organize</p>
            <p className="text-xs text-gray-400">Open some tabs and they'll appear here</p>
          </div>
        ) : (
          groups.map((group) => (
            <GroupCard key={group.id} group={group} onCloseGroup={handleCloseGroup} />
          ))
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-2">
          <button onClick={handleSaveSession} disabled={saving || groups.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-medium rounded-lg transition-colors">
            {saving ? (
              <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save Session
              </>
            )}
          </button>
          <button onClick={() => chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })}
            className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-lg transition-colors">
            Full View
          </button>
        </div>
      </div>
    </div>
  );
}
