import { createClient } from '@supabase/supabase-js';
import type { BatchHistoryEntry, ImageFile } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabase && supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

export class DatabaseService {
  // Helpers to convert between File/Blob/object URLs and data URLs for cross-login persistence
  private static fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }

  private static async urlToDataUrl(url: string): Promise<string> {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(blob);
    });
  }

  private static dataUrlToBlob(dataUrl: string): Blob {
    const [header, data] = dataUrl.split(',');
    const mimeMatch = header.match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const byteString = atob(data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  }

  // Save project with images
  static async saveProject(project: BatchHistoryEntry): Promise<void> {
    const db = getSupabase();
    if (!db) throw new Error('Supabase not configured');

    try {
      // Upsert project
      const { error: projectError } = await db
        .from('projects')
        .upsert({
          id: project.id,
          name: project.name,
          created_at: new Date(project.timestamp).toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (projectError) throw projectError;

      // Delete existing images for this project
      await db.from('images').delete().eq('project_id', project.id);

      // Insert all images (encode URLs to data URLs for cross-login persistence)
      const imagesToInsert = await Promise.all(project.images.map(async (image) => {
        // Original image as data URL
        let originalDataUrl: string | null = null;
        if (image.originalFile) {
          try {
            originalDataUrl = await DatabaseService.fileToDataUrl(image.originalFile);
          } catch (e) {
            console.warn('Failed reading original file, falling back to originalUrl:', e);
          }
        }
        if (!originalDataUrl && image.originalUrl) {
          try {
            if (image.originalUrl.startsWith('data:')) {
              originalDataUrl = image.originalUrl;
            } else {
              originalDataUrl = await DatabaseService.urlToDataUrl(image.originalUrl);
            }
          } catch (e) {
            console.warn('Failed converting originalUrl to data URL:', e);
          }
        }

        // Processed image as data URL (if present)
        let processedDataUrl: string | null = null;
        if (image.processedUrl) {
          try {
            if (image.processedUrl.startsWith('data:')) {
              processedDataUrl = image.processedUrl;
            } else {
              processedDataUrl = await DatabaseService.urlToDataUrl(image.processedUrl);
            }
          } catch (e) {
            console.warn('Failed converting processedUrl to data URL:', e);
          }
        }

        return {
          id: image.id,
          project_id: project.id,
          original_url: originalDataUrl,
          processed_url: processedDataUrl,
          ai_generated_name: image.aiGeneratedName || null,
          status: image.status,
          error: image.error || null,
          spin360_index: image.spin360Index !== undefined ? image.spin360Index : null,
        };
      }));

      const { error: imagesError } = await db
        .from('images')
        .insert(imagesToInsert);

      if (imagesError) throw imagesError;
    } catch (error) {
      console.error('Failed to save project to database:', error);
      throw error;
    }
  }

  // Load all projects
  static async loadProjects(): Promise<BatchHistoryEntry[]> {
    const db = getSupabase();
    if (!db) return [];

    try {
      const { data: projects, error: projectsError } = await db
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;
      if (!projects) return [];

      const result: BatchHistoryEntry[] = [];

      for (const project of projects) {
        const { data: images, error: imagesError } = await db
          .from('images')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: true });

        if (imagesError) throw imagesError;

        const imageFiles: ImageFile[] = (images || []).map((img: any) => {
          // Reconstruct original File and object URL from data URL
          let originalUrl: string | undefined = undefined;
          let originalFile: File = new File([], 'image');
          if (img.original_url) {
            try {
              const originalBlob = DatabaseService.dataUrlToBlob(img.original_url);
              originalFile = new File([originalBlob], 'original');
              originalUrl = URL.createObjectURL(originalBlob);
            } catch (e) {
              console.warn('Failed to reconstruct original image from data URL:', e);
            }
          }

          // Reconstruct processed object URL from data URL if available
          let processedUrl: string | undefined = undefined;
          if (img.processed_url) {
            try {
              const processedBlob = DatabaseService.dataUrlToBlob(img.processed_url);
              processedUrl = URL.createObjectURL(processedBlob);
            } catch (e) {
              console.warn('Failed to reconstruct processed image from data URL:', e);
            }
          }

          return {
            id: img.id,
            originalUrl,
            processedUrl,
            originalFile,
            aiGeneratedName: img.ai_generated_name || undefined,
            status: img.status as ImageFile['status'],
            error: img.error || undefined,
            spin360Index: img.spin360_index !== null ? img.spin360_index : undefined,
          } as ImageFile;
        });

        result.push({
          id: project.id,
          name: project.name,
          timestamp: new Date(project.created_at).getTime(),
          images: imageFiles,
          imageCount: imageFiles.length,
        });
      }

      return result;
    } catch (error) {
      console.error('Failed to load projects from database:', error);
      return [];
    }
  }

  // Delete project
  static async deleteProject(projectId: string): Promise<void> {
    const db = getSupabase();
    if (!db) throw new Error('Supabase not configured');

    try {
      const { error } = await db
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete project from database:', error);
      throw error;
    }
  }
}
