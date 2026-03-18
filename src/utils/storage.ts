/**
 * Storage utilities using Chrome Storage API
 */

import type { ExtensionConfig, QueueItem } from "../types";

const CONFIG_KEY = 'notion_clipper_config';
const QUEUE_KEY = 'notion_clipper_queue';

/**
 * Get extension configuration
 */
export async function getConfig(): Promise<ExtensionConfig> {
  const result = await chrome.storage.local.get(CONFIG_KEY);
  return result[CONFIG_KEY] || { databases: [] };
}

/**
 * Save extension configuration
 */
export async function saveConfig(config: ExtensionConfig): Promise<void> {
  await chrome.storage.local.set({ [CONFIG_KEY]: config });
}

/**
 * Get Notion token
 */
export async function getNotionToken(): Promise<string | undefined> {
  const config = await getConfig();
  return config.notionToken;
}

/**
 * Save Notion token
 */
export async function saveNotionToken(token: string): Promise<void> {
  const config = await getConfig();
  config.notionToken = token;
  config.lastSyncAt = Date.now();
  await saveConfig(config);
}

/**
 * Clear Notion token (logout)
 */
export async function clearNotionToken(): Promise<void> {
  const config = await getConfig();
  config.notionToken = undefined;
  config.databases = [];
  config.defaultDatabaseId = undefined;
  await saveConfig(config);
}

/**
 * Get offline queue
 */
export async function getQueue(): Promise<QueueItem[]> {
  const result = await chrome.storage.local.get(QUEUE_KEY);
  return result[QUEUE_KEY] || [];
}

/**
 * Add item to queue
 */
export async function addToQueue(item: QueueItem): Promise<void> {
  const queue = await getQueue();
  queue.push(item);
  await chrome.storage.local.set({ [QUEUE_KEY]: queue });
}

/**
 * Remove item from queue
 */
export async function removeFromQueue(itemId: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter(item => item.id !== itemId);
  await chrome.storage.local.set({ [QUEUE_KEY]: filtered });
}

/**
 * Update queue item
 */
export async function updateQueueItem(itemId: string, updates: Partial<QueueItem>): Promise<void> {
  const queue = await getQueue();
  const index = queue.findIndex(item => item.id === itemId);
  if (index >= 0) {
    queue[index] = { ...queue[index], ...updates };
    await chrome.storage.local.set({ [QUEUE_KEY]: queue });
  }
}

/**
 * Clear queue
 */
export async function clearQueue(): Promise<void> {
  await chrome.storage.local.remove(QUEUE_KEY);
}

/**
 * Get saved pages history
 */
export async function getHistory(): Promise<Array<{
  url: string;
  title: string;
  savedAt: number;
  notionPageId?: string;
}>> {
  const result = await chrome.storage.local.get('notion_clipper_history');
  return result['notion_clipper_history'] || [];
}

/**
 * Add to history
 */
export async function addToHistory(url: string, title: string, notionPageId?: string): Promise<void> {
  const history = await getHistory();
  history.unshift({
    url,
    title,
    savedAt: Date.now(),
    notionPageId
  });
  // Keep only last 100 items
  const trimmed = history.slice(0, 100);
  await chrome.storage.local.set({ 'notion_clipper_history': trimmed });
}

/**
 * Check if URL has been saved before
 */
export async function isUrlSaved(url: string): Promise<boolean> {
  const history = await getHistory();
  return history.some(item => item.url === url);
}
