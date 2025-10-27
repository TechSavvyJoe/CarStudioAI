import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageCard } from './components/ImageCard';
import { processImageBatch, retouchImage, analyzeImageContent } from './services/geminiService';
import type { ImageFile, BatchHistoryEntry, DealershipBackground, VehicleType, Spin360Set } from './types';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { ErrorIcon } from './components/icons/ErrorIcon';
import { Spinner } from './components/Spinner';
import { ProgressBar } from './components/ProgressBar';
import { QueueStatus } from './components/QueueStatus';
import { PauseIcon } from './components/icons/PauseIcon';
import { PlayIcon } from './components/icons/PlayIcon';
import { 
  getImages, 
  saveImages, 
  clearImages, 
  getHistory, 
  addHistoryEntry, 
  deleteHistoryEntry,
  getDealershipBackground,
  saveDealershipBackground,
  clearDealershipBackground
} from './utils/db';
import { HistoryPanel } from './components/HistoryPanel';
import { CameraCapture } from './components/camera/CameraCapture';
import { Spin360Capture } from './components/spin360/Spin360Capture';
import { ImageViewer } from './components/ImageViewer';
import { StartShoot } from './components/StartShoot';
import { CameraIcon } from './components/icons/CameraIcon';
import { UploadIcon } from './components/icons/UploadIcon';
import { HistoryButton } from './components/HistoryButton';
import { BackgroundUpload } from './components/BackgroundUpload';
import { ProjectsView } from './components/ProjectsView';

// Type definition for JSZip library loaded from CDN
// This is a simplified interface covering the methods we actually use
interface JSZipInstance {
  file(name: string, data: Blob | string | ArrayBuffer): JSZipInstance;
  files: { [key: string]: any };
  generateAsync: (options: { type: 'blob' }, onProgress?: (metadata: { percent: number }) => void) => Promise<Blob>;
}

interface JSZipConstructor {
  new (): JSZipInstance;
}

// Declare JSZip for use from the script tag in index.html
declare var JSZip: JSZipConstructor;

const getFileExtensionFromMimeType = (mimeType: string): string => {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      // Fallback for other image types, defaulting to jpg
      return 'jpg';
  }
};


// FIX: Removed React.FC type annotation to fix component type inference error.
const App = () => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [batchName, setBatchName] = useState<string>('processed-car-photos');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [batchHistory, setBatchHistory] = useState<BatchHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [is360CameraOpen, setIs360CameraOpen] = useState(false);
  const [selected360VehicleType, setSelected360VehicleType] = useState<VehicleType>('sedan');
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [dealershipBackground, setDealershipBackground] = useState<DealershipBackground | null>(null);
  const [viewMode, setViewMode] = useState<'projects' | 'queue'>('projects'); // New: View switcher
  
  const pauseRef = useRef(isPaused);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    pauseRef.current = isPaused;
  }, [isPaused]);
  
  // Load initial state from IndexedDB on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadError(null);
        // For a clean migration, clear old localStorage keys if they exist
        localStorage.removeItem('imageList');
        localStorage.removeItem('batchHistory');
        localStorage.removeItem('apiPlan');

        const [dbImages, dbHistory, dbBackground] = await Promise.all([
          getImages(),
          getHistory(),
          getDealershipBackground(),
        ]);
        setImages(dbImages);
        setBatchHistory(dbHistory);
        setDealershipBackground(dbBackground);

      } catch (error) {
        console.error("Failed to load data from IndexedDB:", error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load your saved data';
        setLoadError(`Unable to load data: ${errorMessage}. If this persists, try clearing your browser cache.`);
        // Set empty state but allow app to continue functioning
        setImages([]);
        setBatchHistory([]);
        setDealershipBackground(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);
  
  // Cleanup blob URLs on component unmount ONLY
  // Do NOT add dependencies - we only want to clean up when the component unmounts
  // This prevents revoking URLs while they're still being used by the ImageViewer
  useEffect(() => {
    return () => {
      images.forEach(image => {
        if (image.originalUrl) URL.revokeObjectURL(image.originalUrl);
        if (image.processedUrl) URL.revokeObjectURL(image.processedUrl);
      });
      if (dealershipBackground?.url) {
        URL.revokeObjectURL(dealershipBackground.url);
      }
    };
  }, []);
  
  // Keyboard navigation for ImageViewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentImageIndex === null) return;

      if (e.key === 'ArrowRight') {
        setCurrentImageIndex(prev => (prev! + 1) % images.length);
      } else if (e.key === 'ArrowLeft') {
        setCurrentImageIndex(prev => (prev! - 1 + images.length) % images.length);
      } else if (e.key === 'Escape') {
        setCurrentImageIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentImageIndex, images.length]);


  // FIX: Replaced the buggy `handleSetImages` with a new `updateAndPersistImages` callback.
  // This function safely handles updating component state and persisting to IndexedDB
  // by using the functional form of `setImages`, which prevents stale closure issues.
  const updateAndPersistImages = useCallback((updater: React.SetStateAction<ImageFile[]>) => {
    setImages(currentImages => {
      const newImages = typeof updater === 'function' ? updater(currentImages) : updater;
      // Persist to DB. We don't need to await this for UI updates to proceed.
      saveImages(newImages).catch(err => {
        console.error("Failed to save images to IndexedDB:", err);
      });
      return newImages;
    });
  }, []); // Empty dependency array ensures this function is stable.
  
  const startProcessing = useCallback(async (imagesToProcess: ImageFile[]) => {
     setIsProcessing(true);
     setIsPaused(false); // Ensure queue is not paused on new upload

     try {
       await processImageBatch(
         imagesToProcess, 
         (updatedImage) => {
           // The onUpdate callback from the service now uses our safe state updater.
           updateAndPersistImages((prevImages) =>
             prevImages.map((img) =>
               img.id === updatedImage.id ? updatedImage : img
             )
           );
         },
         pauseRef,
         dealershipBackground || undefined
       );
     } catch (error) {
       console.error('An unexpected error occurred during batch processing:', error);
     } finally {
       setIsProcessing(false);
     }
  }, [updateAndPersistImages, dealershipBackground]);

  const handleFilesSelected = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    // Create image files with pending analysis
    const newImageFiles: ImageFile[] = fileArray.map(file => ({
      id: `${file.name}-${Date.now()}`,
      originalFile: file,
      originalUrl: URL.createObjectURL(file),
      processedUrl: null,
      status: 'pending',
      error: null,
      aiGeneratedName: undefined, // Will be filled after analysis
    }));

    if (newImageFiles.length > 0) {
      setCurrentBatchId(null); // New upload means it's an unsaved batch
      updateAndPersistImages(prev => [...prev, ...newImageFiles]);
      
      // Analyze images in batches of 5 to avoid rate limits
      const BATCH_SIZE = 5;
      console.log(`📊 Analyzing ${newImageFiles.length} images in batches of ${BATCH_SIZE}...`);
      
      const analyzeBatch = async (startIdx: number) => {
        const endIdx = Math.min(startIdx + BATCH_SIZE, newImageFiles.length);
        const batchPromises = [];
        
        for (let i = startIdx; i < endIdx; i++) {
          const imageFile = newImageFiles[i];
          batchPromises.push(
            (async () => {
              try {
                const descriptiveName = await analyzeImageContent(fileArray[i]);
                updateAndPersistImages(prev => 
                  prev.map(img => 
                    img.id === imageFile.id 
                      ? { ...img, aiGeneratedName: descriptiveName }
                      : img
                  )
                );
              } catch (error) {
                console.error(`Failed to analyze image ${imageFile.id}:`, error);
              }
            })()
          );
        }
        
        await Promise.all(batchPromises);
        
        // Process next batch if there are more images
        if (endIdx < newImageFiles.length) {
          await analyzeBatch(endIdx);
        }
      };
      
      // Start batch analysis in background (don't wait)
      analyzeBatch(0).catch(err => 
        console.error('Batch analysis failed:', err)
      );
      
      await startProcessing(newImageFiles);
    }
  }, [updateAndPersistImages, startProcessing]);
  
  const handleImagesCaptured = useCallback(async (capturedFiles: File[]) => {
    setIsCameraOpen(false);
    const newImageFiles: ImageFile[] = capturedFiles.map((file) => ({
      id: `${file.name}-${Date.now()}`,
      originalFile: file,
      originalUrl: URL.createObjectURL(file),
      processedUrl: null,
      status: 'pending',
      error: null,
      aiGeneratedName: undefined, // Will be filled after analysis
    }));

    setCurrentBatchId(null); // New capture means it's an unsaved batch
    updateAndPersistImages(prev => [...prev, ...newImageFiles]);
    
    // Analyze captured images in batches of 5 to avoid rate limits
    const BATCH_SIZE = 5;
    console.log(`📊 Analyzing ${newImageFiles.length} captured images in batches of ${BATCH_SIZE}...`);
    
    const analyzeBatch = async (startIdx: number) => {
      const endIdx = Math.min(startIdx + BATCH_SIZE, newImageFiles.length);
      const batchPromises = [];
      
      for (let i = startIdx; i < endIdx; i++) {
        const imageFile = newImageFiles[i];
        batchPromises.push(
          (async () => {
            try {
              const descriptiveName = await analyzeImageContent(capturedFiles[i]);
              updateAndPersistImages(prev => 
                prev.map(img => 
                  img.id === imageFile.id 
                    ? { ...img, aiGeneratedName: descriptiveName }
                    : img
                )
              );
            } catch (error) {
              console.error(`Failed to analyze captured image ${imageFile.id}:`, error);
            }
          })()
        );
      }
      
      await Promise.all(batchPromises);
      
      // Process next batch if there are more images
      if (endIdx < newImageFiles.length) {
        await analyzeBatch(endIdx);
      }
    };
    
    // Start batch analysis in background (don't wait)
    analyzeBatch(0).catch(err => 
      console.error('Batch analysis failed:', err)
    );
    
    await startProcessing(newImageFiles);
  }, [updateAndPersistImages, startProcessing]);

  const handle360Complete = useCallback(async (spin360Set: Spin360Set) => {
    setIs360CameraOpen(false);
    
    // Add all captured 360 images to the queue
    updateAndPersistImages(prev => [...prev, ...spin360Set.images]);
    
    // Analyze 360 images to add angle-specific names
    const analysisPromises = spin360Set.images.map(async (imageFile) => {
      try {
        const descriptiveName = await analyzeImageContent(imageFile.originalFile);
        // Update with AI-generated name that includes angle info
        updateAndPersistImages(prev => 
          prev.map(img => 
            img.id === imageFile.id 
              ? { ...img, aiGeneratedName: `${descriptiveName}-${imageFile.spin360Angle}deg` }
              : img
          )
        );
      } catch (error) {
        console.error(`Failed to analyze 360 image ${imageFile.id}:`, error);
      }
    });
    
    // Don't wait for analysis to complete
    Promise.all(analysisPromises).catch(err => 
      console.error('Some 360 image analyses failed:', err)
    );
    
    // Start processing the 360 images
    await startProcessing(spin360Set.images);
  }, [updateAndPersistImages, startProcessing]);


  const handleReprocessImage = useCallback(async (imageId: string) => {
    const imageToReprocess = images.find(img => img.id === imageId);
    if (!imageToReprocess || isProcessing) return;
    
    // Reset image to pending state with cleared processed URL
    const resetImage: ImageFile = {
      ...imageToReprocess,
      status: 'pending',
      processedUrl: null,
      error: null
    };
    
    // Clean up old processed blob URL
    if (imageToReprocess.processedUrl) {
      URL.revokeObjectURL(imageToReprocess.processedUrl);
    }
    
    // Update state with reset image
    updateAndPersistImages(prevImages =>
      prevImages.map(img =>
        img.id === imageId ? resetImage : img
      )
    );

    setIsProcessing(true);
    setIsPaused(false);

    try {
      // Re-use the batch processor with the reset image
      await processImageBatch(
        [resetImage], 
        (updatedImage) => {
           updateAndPersistImages((prevImages) =>
             prevImages.map((img) =>
               img.id === updatedImage.id ? updatedImage : img
             )
           );
        },
        pauseRef,
        dealershipBackground || undefined
      );
    } catch (error) {
      console.error(`An unexpected error occurred during re-processing image ${imageId}:`, error);
      // The service's onUpdate callback handles setting the error state on the image.
    } finally {
      setIsProcessing(false);
    }
  }, [images, isProcessing, updateAndPersistImages, dealershipBackground]);
  
  const handleRetouchImage = useCallback(async (imageId: string, prompt: string) => {
    const imageToRetouch = images.find(img => img.id === imageId);
    if (!imageToRetouch || imageToRetouch.status !== 'completed') return;

    updateAndPersistImages(prevImages =>
      prevImages.map(img =>
        img.id === imageId
          ? { ...img, status: 'retouching', error: null }
          : img
      )
    );

    try {
      await retouchImage(
        imageToRetouch,
        prompt,
        (updatedImage) => {
          // Close the viewer if the currently viewed image is the one being retouched
          if (currentImageIndex !== null && images[currentImageIndex]?.id === updatedImage.id && updatedImage.status !== 'retouching') {
            setCurrentImageIndex(null); 
          }
          updateAndPersistImages((prevImages) => {
            const freshImages = prevImages.map((img) =>
              img.id === updatedImage.id ? updatedImage : img
            );
            // Re-open viewer to the image once done
            if(updatedImage.status === 'completed' || updatedImage.status === 'failed') {
               const newIndex = freshImages.findIndex(img => img.id === updatedImage.id);
               if (newIndex !== -1) setCurrentImageIndex(newIndex);
            }
            return freshImages;
          });
        }
      );
    } catch (error) {
      console.error(`An unexpected error occurred during retouching image ${imageId}:`, error);
    }
  }, [images, updateAndPersistImages, currentImageIndex]);

  const handleBackgroundSelected = useCallback(async (file: File) => {
    const newBackground: DealershipBackground = {
      id: `bg-${Date.now()}`,
      file: file,
      url: URL.createObjectURL(file),
      name: file.name,
      uploadedAt: Date.now(),
    };
    
    setDealershipBackground(newBackground);
    
    try {
      await saveDealershipBackground(newBackground);
    } catch (error) {
      console.error('Failed to save dealership background:', error);
    }
  }, []);

  const handleBackgroundRemoved = useCallback(async () => {
    if (dealershipBackground?.url) {
      URL.revokeObjectURL(dealershipBackground.url);
    }
    
    setDealershipBackground(null);
    
    try {
      await clearDealershipBackground();
    } catch (error) {
      console.error('Failed to clear dealership background:', error);
    }
  }, [dealershipBackground]);

  const handleSaveToHistory = async () => {
    const processedImagesExist = images.some(img => img.status === 'completed' || img.status === 'failed');
    if (!processedImagesExist) return;

    if (window.confirm('Do you want to save the current batch to your history before clearing it?')) {
        const finalBatchName = batchName.trim() || `Batch from ${new Date().toLocaleDateString()}`;
        
        const newHistoryEntry: BatchHistoryEntry = {
            id: `batch-${Date.now()}`,
            name: finalBatchName,
            timestamp: Date.now(),
            imageCount: images.length,
            images: images,
        };

        await addHistoryEntry(newHistoryEntry);
        setBatchHistory(prev => [newHistoryEntry, ...prev]);
        setCurrentBatchId(newHistoryEntry.id); // Set the newly saved batch as current
        return true; // Indicate that save was successful
    }
    return false; // Indicate user cancelled
  };

  const handleClearAll = async () => {
    if (images.length > 0) {
      await handleSaveToHistory();
    }
    
    images.forEach(image => {
      if (image.originalUrl) URL.revokeObjectURL(image.originalUrl);
      if (image.processedUrl) URL.revokeObjectURL(image.processedUrl);
    });
    
    // This now safely clears state and persists to the DB by saving an empty array.
    updateAndPersistImages([]);
    // FIX: Removed redundant explicit call to `clearImages()`, as `updateAndPersistImages([])` 
    // effectively does the same thing by calling `saveImages([])`.

    setDownloadError(null);
    setIsProcessing(false);
    setIsPaused(false);
    setCurrentBatchId(null); // Clear the current batch indicator
  };

  const handleTogglePause = () => {
    setIsPaused(prevState => !prevState);
  };
  
  const handleLoadBatch = async (batchId: string) => {
    if (images.length > 0 && !window.confirm('This will replace your current queue. Are you sure you want to proceed?')) {
        return;
    }

    // Clean up existing blob URLs before loading new batch
    images.forEach(image => {
      if (image.originalUrl) URL.revokeObjectURL(image.originalUrl);
      if (image.processedUrl) URL.revokeObjectURL(image.processedUrl);
    });

    const batchToLoad = batchHistory.find(b => b.id === batchId);
    if (batchToLoad) {
        // Recreate blob URLs from the File objects stored in IndexedDB
        const imagesWithUrls = batchToLoad.images.map(img => {
          let processedUrl: string | null = null;

          // Safely convert processedUrl data URL to blob
          if (img.processedUrl) {
            try {
              processedUrl = URL.createObjectURL(dataUrlToBlob(img.processedUrl));
            } catch (err) {
              console.error('Failed to restore processed image:', err);
              // Continue without processed URL - original is still available
            }
          }

          return {
            ...img,
            originalUrl: URL.createObjectURL(img.originalFile),
            processedUrl
          };
        });

        updateAndPersistImages(imagesWithUrls);
        setBatchName(batchToLoad.name);
        setCurrentBatchId(batchToLoad.id);
        setIsHistoryPanelOpen(false);
    }
  };

  // Helper to convert data URL to Blob for recreating object URLs
  const dataUrlToBlob = (dataUrl: string): Blob => {
    try {
      const arr = dataUrl.split(',');
      if (arr.length !== 2) {
        throw new Error('Invalid data URL format');
      }

      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch?.[1] || 'image/jpeg';

      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }

      return new Blob([u8arr], { type: mime });
    } catch (err) {
      console.error('Error converting data URL to blob:', err);
      throw new Error(`Failed to parse image data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };


  const handleDeleteBatch = async (batchId: string) => {
      if (window.confirm('Are you sure you want to permanently delete this batch from your history? This action cannot be undone.')) {
          await deleteHistoryEntry(batchId);
          setBatchHistory(prev => prev.filter(b => b.id !== batchId));
          if (currentBatchId === batchId) {
              setCurrentBatchId(null);
          }
      }
  };

  // New handlers for Projects view
  const handleOpenProject = async (projectId: string) => {
    await handleLoadBatch(projectId);
    setViewMode('queue'); // Switch to queue view after opening project
  };

  const handleNewProject = () => {
    if (images.length > 0) {
      if (!window.confirm('This will clear your current queue. Make sure to save first! Continue?')) {
        return;
      }
      handleClearAll();
    }
    setViewMode('queue'); // Switch to queue view for new project
  };


  const handleDownloadAll = async () => {
    setDownloadError(null);
    const completedImages = images.filter(
      (img) => img.status === 'completed' && img.processedUrl
    );
    if (completedImages.length === 0) {
      alert('There are no completed images to download.');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    const finalBatchName = batchName.trim() || 'processed-car-photos';
    const zipFileName = `${finalBatchName}.zip`;
    const downloadAbortController = new AbortController();

    try {
      const zip = new JSZip();
      let failedCount = 0;

      // Use allSettled to track failures but continue processing
      const results = await Promise.allSettled(
        completedImages.map(async (image, index) => {
          try {
            const response = await fetch(image.processedUrl!, {
              signal: downloadAbortController.signal
            });
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }
            const blob = await response.blob();
            const extension = getFileExtensionFromMimeType(blob.type);
            
            // Build filename: BatchName-AI-Description or BatchName-Number if no AI name
            let fileName: string;
            if (batchName.trim()) {
              const aiName = image.aiGeneratedName || `Image-${index + 1}`;
              fileName = `${batchName.trim()}-${aiName}.${extension}`;
            } else {
              fileName = `Image-${index + 1}.${extension}`;
            }
            
            zip.file(fileName, blob);
            return fileName;
          } catch (err) {
            if (downloadAbortController.signal.aborted) {
              throw new Error('Download cancelled');
            }
            throw err;
          }
        })
      );

      // Count failures and log them
      results.forEach((result: PromiseSettledResult<string>, index: number) => {
        if (result.status === 'rejected') {
          failedCount++;
          console.error(`Failed to add image ${index + 1} to zip:`, result.reason);
        }
      });

      // Warn user if some files failed
      if (failedCount > 0) {
        console.warn(`${failedCount} of ${completedImages.length} images failed to download`);
      }

      // Only proceed if at least one file was added
      if (Object.keys(zip.files).length === 0) {
        setDownloadError('No images could be added to the zip file. Please try again.');
        return;
      }

      const content = await zip.generateAsync(
        { type: 'blob' },
        (metadata: { percent: number }) => {
          setDownloadProgress(metadata.percent);
        }
      );

      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Show success message if some failed
      if (failedCount > 0) {
        setDownloadError(`${failedCount} image(s) skipped due to download errors.`);
      }

    } catch (error) {
      console.error("Failed to create zip file:", error);
      setDownloadError('An error occurred while creating the zip file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const progress = useMemo(() => {
    if (images.length === 0) return 0;
    const finishedCount = images.filter(
      (img) => img.status === 'completed' || img.status === 'failed'
    ).length;
    return (finishedCount / images.length) * 100;
  }, [images]);

  const queueStats = useMemo(() => {
    const total = images.length;
    const completed = images.filter(img => img.status === 'completed').length;
    const failed = images.filter(img => img.status === 'failed').length;
    const pending = total - completed - failed;
    return { total, completed, failed, pending };
  }, [images]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Spinner className="w-12 h-12 text-blue-400 mx-auto" />
          <p className="mt-4 text-lg">Loading your studio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <Header viewMode={viewMode} onViewChange={setViewMode} />
      {loadError && (
        <div className="bg-red-900/20 border-t-2 border-b-2 border-red-600 px-4 py-3">
          <div className="container mx-auto flex items-start gap-3">
            <ErrorIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-400">{loadError}</p>
              <button
                onClick={() => setLoadError(null)}
                className="text-xs text-red-300 hover:text-red-200 mt-1 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Conditional rendering based on view mode */}
      {viewMode === 'projects' ? (
        <ProjectsView
          projects={batchHistory}
          currentProjectId={currentBatchId}
          onOpenProject={handleOpenProject}
          onDeleteProject={handleDeleteBatch}
          onNewProject={handleNewProject}
        />
      ) : (
        <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto bg-gray-800/50 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 border border-gray-700">
          
          {images.length === 0 ? (
            <StartShoot 
              onStart={() => setIsCameraOpen(true)}
              onStart360={() => setIs360CameraOpen(true)}
              onFilesSelected={handleFilesSelected}
              isProcessing={isProcessing}
              dealershipBackground={dealershipBackground}
              onBackgroundSelected={handleBackgroundSelected}
              onBackgroundRemoved={handleBackgroundRemoved}
            />
          ) : (
            <div>
               <div className="flex flex-col lg:flex-row justify-between items-center lg:items-start gap-4 mb-6">
                <div className="flex items-center gap-x-4">
                  <h2 className="text-2xl font-bold text-gray-200">Processing Queue</h2>
                  {isProcessing && <Spinner className="w-6 h-6 text-blue-400" />}
                </div>
                <div className="flex w-full lg:w-auto flex-col items-center lg:items-end gap-y-4">
                  <div className="w-full max-w-xs">
                    <label htmlFor="batch-name" className="block text-sm font-medium text-gray-300 text-left lg:text-right mb-1">
                      Batch Name (ZIP & Image Prefix)
                    </label>
                    <input
                      type="text"
                      id="batch-name"
                      value={batchName}
                      onChange={(e) => setBatchName(e.target.value)}
                      disabled={isProcessing || isDownloading}
                      className="w-full bg-gray-700 text-white border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
                      placeholder="e.g., 2023-Mustang-GT"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-left lg:text-right">
                      Format: {batchName.trim() ? `"${batchName.trim()}-AI-Description.jpg"` : '"AI-Description.jpg"'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2">
                     <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      multiple
                      accept="image/png, image/jpeg, image/gif, image/webp"
                      onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
                      disabled={isProcessing || isDownloading}
                      aria-label="Upload additional vehicle photos"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-x-1.5 sm:gap-x-2 text-sm sm:text-base"
                      disabled={isProcessing || isDownloading}
                      aria-label="Upload more photos"
                    >
                      <UploadIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden xs:inline">Upload More</span>
                      <span className="xs:hidden">Upload</span>
                    </button>
                    <button
                      onClick={() => setIsCameraOpen(true)}
                      className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-x-1.5 sm:gap-x-2 text-sm sm:text-base"
                      disabled={isProcessing || isDownloading}
                      aria-label="Add more photos with camera"
                    >
                      <CameraIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden xs:inline">Use Camera</span>
                      <span className="xs:hidden">Camera</span>
                    </button>
                    <button
                      onClick={handleTogglePause}
                      className={`px-3 sm:px-4 py-2 text-white rounded-lg transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-x-1.5 sm:gap-x-2 text-sm sm:text-base ${
                        isPaused ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'
                      }`}
                      disabled={(!isProcessing && images.length === 0) || isDownloading}
                      aria-label={isPaused ? 'Resume queue processing' : 'Pause queue processing'}
                    >
                      {isPaused ? <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5" /> : <PauseIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
                      <span className="hidden xs:inline">{isPaused ? 'Resume' : 'Pause'}</span>
                    </button>
                    <button
                      onClick={handleDownloadAll}
                      className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center gap-x-1.5 sm:gap-x-2 text-sm sm:text-base min-w-[90px] sm:w-36 justify-center"
                      disabled={isProcessing || isDownloading}
                      aria-label="Download all processed images as a zip file"
                    >
                      {isDownloading ? (
                        <>
                          <Spinner className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="hidden xs:inline">Zipping...</span>
                        </>
                      ) : (
                        <>
                          <DownloadIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="hidden xs:inline">Download All</span>
                          <span className="xs:hidden">All</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed text-sm sm:text-base"
                      disabled={isProcessing || isDownloading}
                      aria-label="Clear all images from the queue"
                    >
                      <span className="hidden xs:inline">Clear All</span>
                      <span className="xs:hidden">Clear</span>
                    </button>
                  </div>
                  {isDownloading && (
                    <div className="w-full max-w-xs text-right mt-2">
                      <div className="flex justify-between items-center text-sm font-medium text-gray-400 mb-1">
                        <span>Creating Zip File...</span>
                        <span>{Math.round(downloadProgress)}%</span>
                      </div>
                      <ProgressBar progress={downloadProgress} />
                    </div>
                  )}
                  {downloadError && !isDownloading && (
                    <p className="text-red-400 text-sm mt-2 flex items-center gap-x-1.5 self-center lg:self-end">
                      <ErrorIcon className="w-4 h-4" />
                      {downloadError}
                    </p>
                  )}
                </div>
              </div>
              
              <QueueStatus stats={queueStats} />

              {/* Dealership Background Section in Queue View */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-2">Dealership Background</h3>
                <BackgroundUpload
                  currentBackground={dealershipBackground}
                  onBackgroundSelected={handleBackgroundSelected}
                  onBackgroundRemoved={handleBackgroundRemoved}
                  isProcessing={isProcessing}
                />
                <p className="text-xs text-gray-400 mt-2">
                  {dealershipBackground 
                    ? 'Vehicles will be composited onto your dealership background.' 
                    : 'Upload a dealership background to composite vehicles onto your location, or leave blank for a white studio background.'}
                </p>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center text-sm font-medium text-gray-400 mb-1">
                  <span>Overall Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <ProgressBar progress={progress} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {images.map((image, index) => (
                  <ImageCard 
                    key={image.id} 
                    image={image} 
                    index={index}
                    onReprocess={handleReprocessImage}
                    onOpenViewer={setCurrentImageIndex}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      )}
      
      {/* Footer - only show in queue mode */}
      {viewMode === 'queue' && (
        <footer className="text-center py-6 text-gray-500 text-sm">
          <p>Powered by Gemini. Built for professional results.</p>
        </footer>
      )}
      
      <HistoryPanel
        isOpen={isHistoryPanelOpen}
        onClose={() => setIsHistoryPanelOpen(false)}
        history={batchHistory}
        onLoadBatch={handleLoadBatch}
        onDeleteBatch={handleDeleteBatch}
        currentBatchId={currentBatchId}
      />
      <HistoryButton 
        onClick={() => setIsHistoryPanelOpen(true)}
        count={batchHistory.length}
      />
      {isCameraOpen && (
        <CameraCapture 
          onClose={() => setIsCameraOpen(false)}
          onCaptureComplete={handleImagesCaptured}
        />
      )}
      {is360CameraOpen && (
        <Spin360Capture
          vehicleType={selected360VehicleType}
          onComplete={handle360Complete}
          onCancel={() => setIs360CameraOpen(false)}
        />
      )}
      {currentImageIndex !== null && (
        <ImageViewer
          images={images}
          currentIndex={currentImageIndex}
          onClose={() => setCurrentImageIndex(null)}
          onNavigate={setCurrentImageIndex}
          onRecreateBackground={handleReprocessImage}
          onRetouch={handleRetouchImage}
        />
      )}
    </div>
  );
};

export default App;
