
import type { ImageFile, ImageStatus, BatchHistoryEntry, DealershipBackground } from '../types';
import { logger } from './logger';

const DB_NAME = 'AutoBackgroundStudioDB';
const DB_VERSION = 2;
const IMAGES_STORE_NAME = 'images';
const HISTORY_STORE_NAME = 'batchHistory';
const BACKGROUND_STORE_NAME = 'dealershipBackground';

// Check if IndexedDB is available (fails in private browsing on some browsers)
const isIndexedDBAvailable = (): boolean => {
  try {
    return typeof window !== 'undefined' && !!window.indexedDB;
  } catch (e) {
    return false;
  }
};

const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is available
    if (!isIndexedDBAvailable()) {
      reject('IndexedDB is not available in this browser. Please disable private browsing or use a different browser.');
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IMAGES_STORE_NAME)) {
        db.createObjectStore(IMAGES_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
        db.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(BACKGROUND_STORE_NAME)) {
        db.createObjectStore(BACKGROUND_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject(`Database error: ${(event.target as IDBOpenDBRequest).error?.message}`);
    };
  });
}

async function prepareForStorage(images: ImageFile[]): Promise<any[]> {
    return Promise.all(images.map(async (image) => {
        const storableImage = { ...image };
        if (storableImage.processedUrl && storableImage.processedUrl.startsWith('blob:')) {
            try {
                const response = await fetch(storableImage.processedUrl);
                const blob = await response.blob();
                storableImage.processedUrl = await blobToDataUrl(blob);
            } catch (error) {
                logger.error("Could not convert blob URL to data URL for storage:", error);
                storableImage.processedUrl = null;
            }
        }
        return storableImage;
    }));
}

function restoreFromStorage(images: any[]): ImageFile[] {
    return images.map(image => {
        const restoredImage = { ...image };
        restoredImage.originalUrl = URL.createObjectURL(image.originalFile);

        // Safely convert data URL back to blob URL with validation
        if (restoredImage.processedUrl && restoredImage.processedUrl.startsWith('data:')) {
            try {
                const parts = restoredImage.processedUrl.split(',');
                if (parts.length !== 2) {
                    logger.warn('Invalid data URL format, skipping processed image');
                    restoredImage.processedUrl = null;
                } else {
                    const byteString = atob(parts[1]);
                    const mimeMatch = restoredImage.processedUrl.split(',')[0].match(/:(.*?);/);
                    const mimeString = mimeMatch?.[1] || 'image/jpeg';
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    const blob = new Blob([ab], { type: mimeString });
                    restoredImage.processedUrl = URL.createObjectURL(blob);
                }
            } catch (error) {
                logger.error('Failed to restore processed image from data URL:', error);
                restoredImage.processedUrl = null;
            }
        }

        // Reset in-progress statuses on load
        if (['processing', 'queued', 'paused'].includes(restoredImage.status)) {
            restoredImage.status = 'pending';
        }
        return restoredImage;
    });
}

export async function saveImages(images: ImageFile[]): Promise<void> {
    const db = await openDatabase();
    const storableImages = await prepareForStorage(images);
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IMAGES_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(IMAGES_STORE_NAME);
        store.clear();
        storableImages.forEach(image => store.put(image));
        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(`Save images transaction failed: ${(event.target as IDBRequest).error?.message}`);
    });
}

export async function getImages(): Promise<ImageFile[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IMAGES_STORE_NAME, 'readonly');
        const store = transaction.objectStore(IMAGES_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
             resolve(restoreFromStorage(request.result));
        };
        request.onerror = (event) => reject(`Get images failed: ${(event.target as IDBRequest).error?.message}`);
    });
}

export async function clearImages(): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(IMAGES_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(IMAGES_STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(`Clear images failed: ${(event.target as IDBRequest).error?.message}`);
    });
}


export async function addHistoryEntry(entry: BatchHistoryEntry): Promise<void> {
    const db = await openDatabase();
    const storableEntry = { ...entry };
    storableEntry.images = await prepareForStorage(entry.images);

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(HISTORY_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(HISTORY_STORE_NAME);
        const request = store.put(storableEntry);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(`Add history failed: ${(event.target as IDBRequest).error?.message}`);
    });
}

export async function getHistory(): Promise<BatchHistoryEntry[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(HISTORY_STORE_NAME, 'readonly');
        const store = transaction.objectStore(HISTORY_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
            const history = request.result.map((entry: any) => ({
                ...entry,
                images: restoreFromStorage(entry.images)
            })).sort((a, b) => b.timestamp - a.timestamp); // Sort by most recent
            resolve(history);
        };
        request.onerror = (event) => reject(`Get history failed: ${(event.target as IDBRequest).error?.message}`);
    });
}

export async function deleteHistoryEntry(id: string): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(HISTORY_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(HISTORY_STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(`Delete history failed: ${(event.target as IDBRequest).error?.message}`);
    });
}

// Dealership Background Functions
export async function saveDealershipBackground(background: DealershipBackground): Promise<void> {
    const db = await openDatabase();
    const storableBackground = { ...background };
    
    // Convert blob URL to data URL for storage
    if (storableBackground.url && storableBackground.url.startsWith('blob:')) {
        try {
            const response = await fetch(storableBackground.url);
            const blob = await response.blob();
            storableBackground.url = await blobToDataUrl(blob);
        } catch (error) {
            logger.error("Could not convert blob URL to data URL for background storage:", error);
        }
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(BACKGROUND_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(BACKGROUND_STORE_NAME);
        const request = store.put(storableBackground);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(`Save background failed: ${(event.target as IDBRequest).error?.message}`);
    });
}

export async function getDealershipBackground(): Promise<DealershipBackground | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(BACKGROUND_STORE_NAME, 'readonly');
        const store = transaction.objectStore(BACKGROUND_STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => {
            const results = request.result;
            if (results.length === 0) {
                resolve(null);
            } else {
                const background = results[0];
                // Convert data URL back to blob URL
                if (background.url && background.url.startsWith('data:')) {
                    const byteString = atob(background.url.split(',')[1]);
                    const mimeString = background.url.split(',')[0].split(':')[1].split(';')[0];
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    const blob = new Blob([ab], { type: mimeString });
                    background.url = URL.createObjectURL(blob);
                }
                resolve(background);
            }
        };
        request.onerror = (event) => reject(`Get background failed: ${(event.target as IDBRequest).error?.message}`);
    });
}

export async function clearDealershipBackground(): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(BACKGROUND_STORE_NAME, 'readwrite');
        const store = transaction.objectStore(BACKGROUND_STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(`Clear background failed: ${(event.target as IDBRequest).error?.message}`);
    });
}
