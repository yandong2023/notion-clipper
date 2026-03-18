/**
 * Popup UI - React Component
 */

import React, { useState, useEffect } from "react";
import type { PageMetadata, NotionDatabase, SaveConfig, SaveResult } from "../types";
import { extractPageMetadata, calculateReadTime, isValuableContent, generateId } from "../utils/content";
import { getConfig, saveConfig, getNotionToken, isUrlSaved, addToHistory, addToQueue } from "../utils/storage";
import { getDatabases, createPage, validateToken } from "../utils/notion-api";

import "./style.css";

export default function Popup() {
  const [metadata, setMetadata] = useState<PageMetadata | null>(null);
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [selectedDb, setSelectedDb] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setIsLoading(true);
    
    try {
      // Check authentication
      const token = await getNotionToken();
      if (token) {
        const isValid = await validateToken(token);
        setIsAuthenticated(isValid);
        
        if (isValid) {
          // Load databases
          await loadDatabases(token);
        }
      }
      
      // Extract page metadata
      await extractPageInfo();
    } catch (error) {
      console.error("Initialization error:", error);
      setMessage({ type: "error", text: "Failed to initialize" });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDatabases(token: string) {
    try {
      const config = await getConfig();
      
      // Use cached databases if available and recent
      if (config.databases.length > 0 && config.lastSyncAt && Date.now() - config.lastSyncAt < 24 * 60 * 60 * 1000) {
        setDatabases(config.databases);
        if (config.defaultDatabaseId) {
          setSelectedDb(config.defaultDatabaseId);
        }
        return;
      }
      
      // Fetch from API
      const dbs = await getDatabases(token);
      setDatabases(dbs);
      
      // Save to config
      config.databases = dbs;
      config.lastSyncAt = Date.now();
      await saveConfig(config);
      
      // Select default
      if (dbs.length > 0) {
        setSelectedDb(config.defaultDatabaseId || dbs[0].id);
      }
    } catch (error) {
      console.error("Failed to load databases:", error);
      setMessage({ type: "error", text: "Failed to load databases" });
    }
  }

  async function extractPageInfo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      
      // Send message to content script
      const response = await chrome.tabs.sendMessage(tab.id, { action: "extractMetadata" });
      
      if (response?.metadata) {
        setMetadata(response.metadata);
        
        // Check if already saved
        const saved = await isUrlSaved(response.metadata.url);
        setAlreadySaved(saved);
      }
    } catch (error) {
      console.error("Failed to extract metadata:", error);
      // Fallback: try to get basic info from tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        setMetadata({
          title: tab.title || "Untitled",
          url: tab.url || "",
          domain: new URL(tab.url || "").hostname
        });
      }
    }
  }

  async function handleSave() {
    if (!metadata || !selectedDb) return;
    
    setIsSaving(true);
    setMessage(null);
    
    try {
      const token = await getNotionToken();
      if (!token) {
        setMessage({ type: "error", text: "Not authenticated with Notion" });
        return;
      }
      
      const config: SaveConfig = {
        databaseId: selectedDb,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        priority,
        note,
        readTime: metadata.readTime
      };
      
      const result = await createPage(token, metadata, config);
      
      if (result.success) {
        setMessage({ type: "success", text: "Saved to Notion!" });
        await addToHistory(metadata.url, metadata.title, result.pageId);
        
        // Save as default database
        const cfg = await getConfig();
        cfg.defaultDatabaseId = selectedDb;
        await saveConfig(cfg);
        
        // Close popup after success
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        // Queue for retry
        const queueItem = {
          id: generateId(),
          metadata,
          config,
          retryCount: 0,
          createdAt: Date.now()
        };
        await addToQueue(queueItem);
        
        setMessage({ type: "success", text: "Queued for sync" });
      }
    } catch (error) {
      console.error("Save error:", error);
      setMessage({ type: "error", text: "Failed to save" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAuth() {
    // Open Notion OAuth flow
    const clientId = "YOUR_NOTION_CLIENT_ID"; // Replace with your client ID
    const redirectUri = chrome.identity.getRedirectURL();
    const authUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, async (redirectUrl) => {
      if (redirectUrl) {
        // Extract code and exchange for token
        const url = new URL(redirectUrl);
        const code = url.searchParams.get("code");
        
        if (code) {
          // Exchange code for token (you need to implement this on your backend)
          setMessage({ type: "success", text: "Authorization successful!" });
          await initialize();
        }
      }
    });
  }

  if (isLoading) {
    return (<div className="popup-container">
      <div className="loading">Loading...</div>
    </div>);
  }

  if (!isAuthenticated) {
    return (
    <div className="popup-container">
      <div className="header">
        <h1>Notion Clipper</h1>
      </div>
      <div className="auth-section">
        <p>Connect to Notion to start saving pages</p>
        <button className="auth-button" onClick={handleAuth}>
          Connect to Notion
        </button>
      </div>
    </div>);
  }

  return (
    <div className="popup-container">
      <div className="header">
        <h1>Notion Clipper</h1>
        {alreadySaved && <span className="saved-badge">Saved</span>}
      </div>

      {metadata && (
        <div className="page-preview">
          <div className="page-title">{metadata.title}</div>
          <div className="page-domain">{metadata.domain}</div>
          {metadata.description && (
            <div className="page-description">{metadata.description.slice(0, 150)}...</div>
          )}
          {metadata.readTime && (
            <div className="read-time">{metadata.readTime} min read</div>
          )}
        </div>
      )}

      <div className="form-section">
        <label>Save to:</label>
        <select 
          value={selectedDb} 
          onChange={(e) => setSelectedDb(e.target.value)}
          disabled={isSaving}
        >
          {databases.map(db => (
            <option key={db.id} value={db.id}>{db.title}</option>
          ))}
        </select>

        <label>Tags (comma separated):</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="article, research, todo"
          disabled={isSaving}
        />

        <label>Priority:</label>
        <div className="priority-buttons">
          {["low", "medium", "high"].map((p) => (
            <button
              key={p}
              className={priority === p ? "active" : ""}
              onClick={() => setPriority(p as any)}
              disabled={isSaving}
            >
              {p}
            </button>
          ))}
        </div>

        <label>Note:</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why are you saving this?"
          rows={2}
          disabled={isSaving}
        />
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <button 
        className="save-button"
        onClick={handleSave}
        disabled={isSaving || !selectedDb}
      >
        {isSaving ? "Saving..." : alreadySaved ? "Save Again" : "Save to Notion"}
      </button>
    </div>
  );
}
