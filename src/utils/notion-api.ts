/**
 * Notion API Client
 */

import type { 
  NotionDatabase, 
  DatabaseProperty, 
  PageMetadata, 
  SaveConfig, 
  SaveResult,
  NotionAPIError 
} from "../types";

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_API_VERSION = '2022-06-28';

// Rate limiter
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private minInterval = 350; // 350ms between requests (max 3 req/sec)

  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minInterval) {
        await sleep(this.minInterval - timeSinceLastRequest);
      }

      const fn = this.queue.shift();
      if (fn) {
        this.lastRequestTime = Date.now();
        await fn();
      }
    }

    this.processing = false;
  }
}

const rateLimiter = new RateLimiter();

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make authenticated request to Notion API
 */
async function notionRequest(
  token: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  return rateLimiter.enqueue(async () => {
    const url = `${NOTION_API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': NOTION_API_VERSION,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw {
        code: error.code || 'unknown_error',
        message: error.message || `HTTP ${response.status}`,
        status: response.status
      } as NotionAPIError;
    }

    return response.json();
  });
}

/**
 * Get list of databases accessible by the integration
 */
export async function getDatabases(token: string): Promise<NotionDatabase[]> {
  try {
    const response = await notionRequest(token, '/search', {
      method: 'POST',
      body: JSON.stringify({
        filter: {
          value: 'database',
          property: 'object'
        }
      })
    });

    return response.results.map((db: any) => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || 'Untitled',
      properties: Object.entries(db.properties).map(([name, prop]: [string, any]) => ({
        name,
        type: prop.type
      }))
    }));
  } catch (error) {
    console.error('Failed to fetch databases:', error);
    throw error;
  }
}

/**
 * Get database schema
 */
export async function getDatabaseSchema(token: string, databaseId: string): Promise<DatabaseProperty[]> {
  try {
    const response = await notionRequest(token, `/databases/${databaseId}`);
    
    return Object.entries(response.properties).map(([name, prop]: [string, any]) => ({
      name,
      type: prop.type
    }));
  } catch (error) {
    console.error('Failed to fetch database schema:', error);
    throw error;
  }
}

/**
 * Create a page in Notion database
 */
export async function createPage(
  token: string,
  metadata: PageMetadata,
  config: SaveConfig
): Promise<SaveResult> {
  try {
    // Build page properties
    const properties: any = {
      'Name': {
        title: [
          {
            text: {
              content: metadata.title
            }
          }
        ]
      },
      'URL': {
        url: metadata.url
      }
    };

    // Add description if available
    if (metadata.description) {
      // Try to find a "Description" or "Summary" property
      // For now, we'll add it as a paragraph in the page content
    }

    // Add tags if provided
    if (config.tags && config.tags.length > 0) {
      properties['Tags'] = {
        multi_select: config.tags.map(tag => ({ name: tag }))
      };
    }

    // Add priority if provided
    if (config.priority) {
      properties['Priority'] = {
        select: { name: config.priority }
      };
    }

    // Add read time if provided
    if (config.readTime) {
      properties['Read Time'] = {
        number: config.readTime
      };
    }

    // Build page content
    const children: any[] = [];

    // Add note if provided
    if (config.note) {
      children.push({
        object: 'block',
        type: 'quote',
        quote: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: config.note
              }
            }
          ]
        }
      });
    }

    // Add description
    if (metadata.description) {
      children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: metadata.description
              }
            }
          ]
        }
      });
    }

    // Add link to original page
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: 'Source: ',
              link: null
            }
          },
          {
            type: 'text',
            text: {
              content: metadata.url,
              link: {
                url: metadata.url
              }
            }
          }
        ]
      }
    });

    const body: any = {
      parent: {
        database_id: config.databaseId
      },
      properties,
      children
    };

    // Add icon if favicon available
    if (metadata.favicon) {
      body.icon = {
        type: 'external',
        external: {
          url: metadata.favicon
        }
      };
    }

    const response = await notionRequest(token, '/pages', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return {
      success: true,
      pageId: response.id,
      url: response.url
    };
  } catch (error) {
    console.error('Failed to create page:', error);
    return {
      success: false,
      error: (error as NotionAPIError).message || 'Unknown error'
    };
  }
}

/**
 * Check if token is valid
 */
export async function validateToken(token: string): Promise<boolean> {
  try {
    await notionRequest(token, '/users/me');
    return true;
  } catch {
    return false;
  }
}
