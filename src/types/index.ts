/**
 * Notion Clipper Type Definitions
 */

// 页面元数据
export interface PageMetadata {
  title: string;
  url: string;
  description?: string;
  author?: string;
  publishedTime?: string;
  domain: string;
  favicon?: string;
}

// Notion 数据库
export interface NotionDatabase {
  id: string;
  title: string;
  properties: DatabaseProperty[];
}

// 数据库属性
export interface DatabaseProperty {
  name: string;
  type: string;
}

// 保存配置
export interface SaveConfig {
  databaseId: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  note?: string;
  readTime?: number;
}

// 保存结果
export interface SaveResult {
  success: boolean;
  pageId?: string;
  url?: string;
  error?: string;
  queued?: boolean;
}

// 插件配置
export interface ExtensionConfig {
  notionToken?: string;
  defaultDatabaseId?: string;
  databases: NotionDatabase[];
  lastSyncAt?: number;
}

// 离线队列项
export interface QueueItem {
  id: string;
  metadata: PageMetadata;
  config: SaveConfig;
  retryCount: number;
  createdAt: number;
}

// API 错误
export interface NotionAPIError {
  code: string;
  message: string;
  status?: number;
}
