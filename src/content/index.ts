/**
 * Content Script - Runs in webpage context
 */

import { extractPageMetadata, calculateReadTime, isValuableContent } from "../utils/content";
import type { PageMetadata } from "../types";

// Message handlers
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractMetadata') {
    const metadata = extractPageMetadata();
    const readTime = calculateReadTime(metadata.description);
    const isValuable = isValuableContent(metadata);
    
    sendResponse({
      metadata: {
        ...metadata,
        readTime
      },
      isValuable
    });
    return true;
  }
  
  if (request.action === 'getSelectedText') {
    const selectedText = window.getSelection()?.toString();
    sendResponse({ selectedText });
    return true;
  }
  
  return false;
});

// Listen for messages from background script
console.log('[Notion Clipper] Content script loaded');
