import { DatabaseService } from '../services/database';
import type { BatchHistoryEntry } from '../types';

// Import existing IndexedDB functions
import * as IndexedDBUtils from './db';

let useDatabase = true; // Try database first

export async function saveBatchHistory(entry: BatchHistoryEntry): Promise<void> {
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
  return IndexedDBUtils.saveBatchHistory(entry);
}

export async function loadBatchHistory(): Promise<BatchHistoryEntry[]> {
  if (useDatabase) {
    try {
      const projects = await DatabaseService.loadProjects();
      if (projects.length > 0) {
        return projects;
      }
      // If database is empty, try loading from IndexedDB and migrating
      const localProjects = await IndexedDBUtils.loadBatchHistory();
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
  return IndexedDBUtils.loadBatchHistory();
}

export async function deleteBatchHistory(id: string): Promise<void> {
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
  return IndexedDBUtils.deleteBatchHistory(id);
}

// Re-export other functions from IndexedDB utils
export const {
  saveImages,
  loadImages,
  updateImageStatus,
  clearAllImages,
  saveDealershipBackground,
  loadDealershipBackground,
  deleteDealershipBackground,
} = IndexedDBUtils;
