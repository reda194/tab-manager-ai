// ==================== Tab Types ====================
export interface TabInfo {
  id: number;
  url: string;
  title: string;
  favIconUrl?: string;
  groupId?: number;
  windowId?: number;
  lastAccessed?: number;
  contentSnippet?: string;
}

// ==================== Group/Project Types ====================
export interface TabGroup {
  id: string;
  name: string;
  nameAr?: string;
  color: GroupColor;
  tabs: TabInfo[];
  createdAt: number;
  type: GroupType;
}

export type GroupColor = 
  | 'blue' | 'red' | 'green' | 'yellow' 
  | 'purple' | 'orange' | 'cyan' | 'pink' | 'gray';

export type GroupType = 
  | 'work' | 'research' | 'shopping' | 'social' 
  | 'entertainment' | 'news' | 'development' 
  | 'documentation' | 'communication' | 'other';

// ==================== Session Types ====================
export interface Session {
  id: string;
  name: string;
  groups: TabGroup[];
  tabCount: number;
  savedAt: number;
  restoredAt?: number;
  tags?: string[];
}

// ==================== Settings Types ====================
export interface ExtensionSettings {
  tabLimit: number;
  enableNotifications: boolean;
  enableAI: boolean;
  aiProvider: 'local' | 'anthropic';
  anthropicApiKey?: string;
  notionApiKey?: string;
  notionDatabaseId?: string;
  trelloApiKey?: string;
  trelloToken?: string;
  trelloBoardId?: string;
  language: 'en' | 'ar';
  autoGroup: boolean;
  theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  tabLimit: 15,
  enableNotifications: true,
  enableAI: false,
  aiProvider: 'local',
  language: 'en',
  autoGroup: true,
  theme: 'system',
};

// ==================== Message Types ====================
export type MessageType = 
  | 'GET_TAB_GROUPS'
  | 'GET_TAB_COUNT'
  | 'SAVE_SESSION'
  | 'RESTORE_SESSION'
  | 'DELETE_SESSION'
  | 'GET_SESSIONS'
  | 'GET_SETTINGS'
  | 'UPDATE_SETTINGS'
  | 'CLASSIFY_TABS'
  | 'CLOSE_TAB'
  | 'CLOSE_GROUP_TABS'
  | 'EXPORT_TO_NOTION'
  | 'EXPORT_TO_TRELLO'
  | 'TAB_LIMIT_REACHED'
  | 'CONTENT_EXTRACTED';

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}

// ==================== Activity Types ====================
export interface ActivityLog {
  id: string;
  action: 'opened' | 'closed' | 'grouped' | 'saved' | 'restored';
  description: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ==================== Notification Types ====================
export interface TabNotification {
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  iconUrl?: string;
}

// ==================== Group Metadata ====================
export const GROUP_COLORS: Record<GroupColor, string> = {
  blue: '#3b82f6',
  red: '#ef4444',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
  cyan: '#06b6d4',
  pink: '#ec4899',
  gray: '#6b7280',
};

export const GROUP_TYPE_LABELS: Record<GroupType, { en: string; ar: string }> = {
  work: { en: 'Work', ar: 'عمل' },
  research: { en: 'Research', ar: 'بحث' },
  shopping: { en: 'Shopping', ar: 'تسوق' },
  social: { en: 'Social', ar: 'تواصل اجتماعي' },
  entertainment: { en: 'Entertainment', ar: 'ترفيه' },
  news: { en: 'News', ar: 'أخبار' },
  development: { en: 'Development', ar: 'تطوير' },
  documentation: { en: 'Documentation', ar: 'توثيق' },
  communication: { en: 'Communication', ar: 'تواصل' },
  other: { en: 'Other', ar: 'أخرى' },
};

export const GROUP_TYPE_COLORS: Record<GroupType, GroupColor> = {
  work: 'blue',
  research: 'purple',
  shopping: 'orange',
  social: 'pink',
  entertainment: 'cyan',
  news: 'yellow',
  development: 'green',
  documentation: 'gray',
  communication: 'red',
  other: 'gray',
};
