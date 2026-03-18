/**
 * Background Service Worker
 */

import { getQueue, removeFromQueue, updateQueueItem, addToHistory } from "../utils/storage";
import { createPage, getDatabases } from "../utils/notion-api";
import type { QueueItem, SaveResult } from "../types";

// Process offline queue when network is available
chrome.runtime.onStartup.addListener(() => {
  processQueue();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Notion Clipper] Extension installed');
});

// Listen for network status changes
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  
  try {
    const queue = await getQueue();
    if (queue.length === 0) return;
    
    console.log(`[Notion Clipper] Processing ${queue.length} queued items`);
    
    for (const item of queue) {
      // Skip if retried too many times
      if (item.retryCount >= 3) {
        console.warn(`[Notion Clipper] Item ${item.id} exceeded retry limit`);
        await removeFromQueue(item.id);
        continue;
      }
      
      try {
        // Get token from storage
        const { getNotionToken } = await import("../utils/storage");
        const token = await getNotionToken();
        
        if (!token) {
          console.warn('[Notion Clipper] No token available, skipping queue');
          break;
        }
        
        // Try to save
        const result = await createPage(token, item.metadata, item.config);
        
        if (result.success) {
          // Success - remove from queue and add to history
          await removeFromQueue(item.id);
          await addToHistory(item.metadata.url, item.metadata.title, result.pageId);
          
          // Show notification
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon128.png',
            title: 'Saved to Notion',
            message: `"${item.metadata.title}" has been synced`
          });
        } else {
          // Failed - increment retry count
          await updateQueueItem(item.id, { retryCount: item.retryCount + 1 });
        }
      } catch (error) {
        console.error(`[Notion Clipper] Failed to process queue item ${item.id}:`, error);
        await updateQueueItem(item.id, { retryCount: item.retryCount + 1 });
      }
    }
  } finally {
    isProcessingQueue = false;
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'processQueue') {
    processQueue().then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
  
  return false;
});

// Periodic queue processing (every 5 minutes)
chrome.alarms?.onAlarm?.addListener((alarm) => {
  if (alarm.name === 'processQueue') {
    processQueue();
  }
});

// Create alarm on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('processQueue', {
    periodInMinutes: 5
  });
});
