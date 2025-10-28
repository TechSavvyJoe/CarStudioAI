import { DatabaseService } from '../services/database';
import type { BatchHistoryEntry } from '../types';

// Import existing IndexedDB functions
import * as IndexedDBUtils from './db';

let useDatabase = true; // Try database first

// History (Projects) API - align with utils/db.ts naming
export async function addHistoryEntry(entry: BatchHistoryEntry): Promise<void> {
  if (useDatabase) {
    try {
      await DatabaseService.saveProject(entry);
      return;
    } catch (error) {
      console.warn('Database save failed, falling back to IndexedDB:', error);
      useDatabase = false;
    }
  }
  // Fallback to IndexedDB
  return IndexedDBUtils.addHistoryEntry(entry);
}

export async function getHistory(): Promise<BatchHistoryEntry[]> {
  if (useDatabase) {
    try {
      const projects = await DatabaseService.loadProjects();
      if (projects.length > 0) {
        return projects;
      }
      // If database is empty, try loading from IndexedDB and migrating
      const localProjects = await IndexedDBUtils.getHistory();
      if (localProjects.length > 0) {
        console.log('Migrating', localProjects.length, 'projects from IndexedDB to database...');
        for (const project of localProjects) {
          await DatabaseService.saveProject(project);
        }
        return localProjects;
      }
      return [];
    } catch (error) {
      console.warn('Database load failed, falling back to IndexedDB:', error);
      useDatabase = false;
    }
  }
  // Fallback to IndexedDB
  return IndexedDBUtils.getHistory();
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  if (useDatabase) {
    try {
      await DatabaseService.deleteProject(id);
      return;
    } catch (error) {
      console.warn('Database delete failed, falling back to IndexedDB:', error);
      useDatabase = false;
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
