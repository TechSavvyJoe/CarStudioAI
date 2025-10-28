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

      // Insert all images
      const imagesToInsert = project.images.map(image => ({
        id: image.id,
        project_id: project.id,
        original_url: image.originalUrl,
        processed_url: image.processedUrl || null,
        ai_generated_name: image.aiGeneratedName || null,
        status: image.status,
        error: image.error || null,
        spin360_index: image.spin360Index !== undefined ? image.spin360Index : null,
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

        const imageFiles: ImageFile[] = (images || []).map((img: any) => ({
          id: img.id,
          originalUrl: img.original_url,
          processedUrl: img.processed_url || undefined,
          originalFile: new File([], 'placeholder.jpg'),
          aiGeneratedName: img.ai_generated_name || undefined,
          status: img.status as ImageFile['status'],
          error: img.error || undefined,
          spin360Index: img.spin360_index !== null ? img.spin360_index : undefined,
        }));

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
