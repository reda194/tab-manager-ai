import type { MessageType, TabGroup, Session, ExtensionSettings } from '../shared/types';

export interface MessageResponse {
  groups?: TabGroup[];
  sessions?: Session[];
  settings?: ExtensionSettings;
  count?: number;
  limit?: number;
  success?: boolean;
  error?: string;
  received?: boolean;
}

export function sendMessage(type: MessageType, payload?: unknown): Promise<MessageResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, resolve);
  });
}
