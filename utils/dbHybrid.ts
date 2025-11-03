import { DatabaseService } from '../services/database';
import type { BatchHistoryEntry } from '../types';
import { logger } from './logger';

// Import existing IndexedDB functions
import * as IndexedDBUtils from './db';

let useDatabase = true; // Try database first
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay
const MAX_RETRY_DELAY = 30000; // 30 seconds max delay
let lastFailureTime = 0;
const RECONNECT_INTERVAL = 60000; // Try reconnecting after 1 minute

// Calculate exponential backoff delay
function getRetryDelay(attempt: number): number {
  return Math.min(RETRY_DELAY_BASE * Math.pow(2, attempt), MAX_RETRY_DELAY);
}

// Check if enough time has passed to retry database connection
function shouldRetryDatabase(): boolean {
  if (useDatabase) return true;
  const timeSinceFailure = Date.now() - lastFailureTime;
  if (timeSinceFailure > RECONNECT_INTERVAL) {
    logger.info('[dbHybrid] Attempting to reconnect to database after cooldown period');
    useDatabase = true;
    retryCount = 0;
    return true;
  }
  return false;
}

// History (Projects) API - align with utils/db.ts naming
export async function addHistoryEntry(entry: BatchHistoryEntry): Promise<void> {
  shouldRetryDatabase(); // Check if we should retry database

  if (useDatabase) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await DatabaseService.saveProject(entry);
        retryCount = 0; // Reset retry count on success
        return;
      } catch (error) {
        logger.warn(`[dbHybrid] Database save failed (attempt ${attempt + 1}/${MAX_RETRIES}):`, error);

        if (attempt < MAX_RETRIES - 1) {
          const delay = getRetryDelay(attempt);
          logger.info(`[dbHybrid] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Max retries exceeded, fall back to IndexedDB
          logger.error('[dbHybrid] Max retries exceeded, falling back to IndexedDB');
          useDatabase = false;
          lastFailureTime = Date.now();
          retryCount = MAX_RETRIES;
        }
      }
    }
  }
  // Fallback to IndexedDB
  return IndexedDBUtils.addHistoryEntry(entry);
}

export async function getHistory(): Promise<BatchHistoryEntry[]> {
  shouldRetryDatabase(); // Check if we should retry database

  if (useDatabase) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const projects = await DatabaseService.loadProjects();
        retryCount = 0; // Reset retry count on success

        if (projects.length > 0) {
          return projects;
        }
        // If database is empty, try loading from IndexedDB and migrating
        const localProjects = await IndexedDBUtils.getHistory();
        if (localProjects.length > 0) {
          logger.log(`[dbHybrid] Migrating ${localProjects.length} projects from IndexedDB to database...`);
          for (const project of localProjects) {
            await DatabaseService.saveProject(project);
          }
          return localProjects;
        }
        return [];
      } catch (error) {
        logger.warn(`[dbHybrid] Database load failed (attempt ${attempt + 1}/${MAX_RETRIES}):`, error);

        if (attempt < MAX_RETRIES - 1) {
          const delay = getRetryDelay(attempt);
          logger.info(`[dbHybrid] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Max retries exceeded, fall back to IndexedDB
          logger.error('[dbHybrid] Max retries exceeded, falling back to IndexedDB');
          useDatabase = false;
          lastFailureTime = Date.now();
          retryCount = MAX_RETRIES;
        }
      }
    }
  }
  // Fallback to IndexedDB
  return IndexedDBUtils.getHistory();
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  shouldRetryDatabase(); // Check if we should retry database

  if (useDatabase) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        await DatabaseService.deleteProject(id);
        retryCount = 0; // Reset retry count on success
        return;
      } catch (error) {
        logger.warn(`[dbHybrid] Database delete failed (attempt ${attempt + 1}/${MAX_RETRIES}):`, error);

        if (attempt < MAX_RETRIES - 1) {
          const delay = getRetryDelay(attempt);
          logger.info(`[dbHybrid] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Max retries exceeded, fall back to IndexedDB
          logger.error('[dbHybrid] Max retries exceeded, falling back to IndexedDB');
          useDatabase = false;
          lastFailureTime = Date.now();
          retryCount = MAX_RETRIES;
        }
      }
    }
  }
  // Fallback to IndexedDB
  return IndexedDBUtils.deleteHistoryEntry(id);
}

// Re-export other functions from IndexedDB utils with original names
export const saveImages = IndexedDBUtils.saveImages;
export const getImages = IndexedDBUtils.getImages;
export const clearImages = IndexedDBUtils.clearImages;

export const saveDealershipBackground = IndexedDBUtils.saveDealershipBackground;
export const getDealershipBackground = IndexedDBUtils.getDealershipBackground;
export const clearDealershipBackground = IndexedDBUtils.clearDealershipBackground;
