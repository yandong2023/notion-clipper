/**
 * Content extraction utilities
 */

import type { PageMetadata } from "../types";

/**
 * Extract page metadata from current document
 */
export function extractPageMetadata(): PageMetadata {
  const title = document.title?.trim() || "Untitled";
  const url = window.location.href;
  const domain = window.location.hostname;
  
  // Extract description
  const description = extractDescription();
  
  // Extract author
  const author = extractAuthor();
  
  // Extract published time
  const publishedTime = extractPublishedTime();
  
  // Extract favicon
  const favicon = extractFavicon();

  return {
    title: truncate(title, 200),
    url,
    description: description ? truncate(description, 500) : undefined,
    author,
    publishedTime,
    domain,
    favicon
  };
}

/**
 * Extract description from meta tags
 */
function extractDescription(): string | undefined {
  // Priority 1: meta description
  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content');
  if (metaDesc) return metaDesc.trim();
  
  // Priority 2: Open Graph
  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
  if (ogDesc) return ogDesc.trim();
  
  // Priority 3: Twitter Card
  const twitterDesc = document.querySelector('meta[name="twitter:description"]')?.getAttribute('content');
  if (twitterDesc) return twitterDesc.trim();
  
  // Priority 4: First paragraph
  const firstParagraph = document.querySelector('article p, main p, .content p, #content p');
  if (firstParagraph) {
    const text = firstParagraph.textContent?.trim();
    if (text && text.length > 50) return text;
  }
  
  return undefined;
}

/**
 * Extract author from meta tags
 */
function extractAuthor(): string | undefined {
  const author = document.querySelector('meta[name="author"]')?.getAttribute('content') ||
    document.querySelector('meta[property="article:author"]')?.getAttribute('content');
  return author?.trim();
}

/**
 * Extract published time from meta tags
 */
function extractPublishedTime(): string | undefined {
  const time = document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
    document.querySelector('meta[name="publishedDate"]')?.getAttribute('content') ||
    document.querySelector('time[datetime]')?.getAttribute('datetime');
  return time?.trim();
}

/**
 * Extract favicon URL
 */
function extractFavicon(): string | undefined {
  const favicon = document.querySelector('link[rel="icon"]')?.getAttribute('href') ||
    document.querySelector('link[rel="shortcut icon"]')?.getAttribute('href');
  
  if (favicon) {
    // Resolve relative URLs
    if (favicon.startsWith('http')) return favicon;
    if (favicon.startsWith('//')) return window.location.protocol + favicon;
    if (favicon.startsWith('/')) return window.location.origin + favicon;
    return window.location.origin + '/' + favicon;
  }
  
  return window.location.origin + '/favicon.ico';
}

/**
 * Calculate estimated read time
 */
export function calculateReadTime(text: string | undefined): number {
  if (!text) return 1;
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / 200); // 200 words per minute
  return Math.max(1, minutes);
}

/**
 * Check if content is valuable (not just empty or too short)
 */
export function isValuableContent(metadata: PageMetadata): boolean {
  if (!metadata.description || metadata.description.length < 50) return false;
  if (metadata.title === 'Untitled' || metadata.title.length < 5) return false;
  return true;
}

/**
 * Truncate text to max length
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
