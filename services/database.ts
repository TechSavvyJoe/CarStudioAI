import { sql } from '@vercel/postgres';
import type { BatchHistoryEntry, ImageFile } from '../types';

export class DatabaseService {
  // Save project with images
  static async saveProject(project: BatchHistoryEntry): Promise<void> {
    try {
      // Insert or update project
      await sql`
        INSERT INTO projects (id, name, created_at, updated_at)
        VALUES (${project.id}, ${project.name}, ${new Date(project.timestamp).toISOString()}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          updated_at = NOW()
      `;

      // Delete existing images for this project
      await sql`DELETE FROM images WHERE project_id = ${project.id}`;

      // Insert all images
      for (const image of project.images) {
        await sql`
          INSERT INTO images (
            id, project_id, original_url, processed_url, ai_generated_name,
            status, error, spin360_index, created_at, updated_at
          ) VALUES (
            ${image.id},
            ${project.id},
            ${image.originalUrl},
            ${image.processedUrl || null},
            ${image.aiGeneratedName || null},
            ${image.status},
            ${image.error || null},
            ${image.spin360Index !== undefined ? image.spin360Index : null},
            NOW(),
            NOW()
          )
        `;
      }
    } catch (error) {
      console.error('Failed to save project to database:', error);
      throw error;
    }
  }

  // Load all projects
  static async loadProjects(): Promise<BatchHistoryEntry[]> {
    try {
      const { rows: projects } = await sql`
        SELECT id, name, created_at
        FROM projects
        ORDER BY created_at DESC
      `;

      const result: BatchHistoryEntry[] = [];

      for (const project of projects) {
        const { rows: images } = await sql`
          SELECT *
          FROM images
          WHERE project_id = ${project.id}
          ORDER BY created_at ASC
        `;

        const imageFiles: ImageFile[] = images.map(img => ({
          id: img.id,
          originalUrl: img.original_url,
          processedUrl: img.processed_url || undefined,
          originalFile: new File([], 'placeholder.jpg'), // Placeholder since we can't reconstruct File object
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
    try {
      await sql`DELETE FROM projects WHERE id = ${projectId}`;
    } catch (error) {
      console.error('Failed to delete project from database:', error);
      throw error;
    }
  }

  // Initialize database (create tables if they don't exist)
  static async initialize(): Promise<void> {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS images (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          original_url TEXT NOT NULL,
          processed_url TEXT,
          ai_generated_name TEXT,
          status TEXT NOT NULL,
          error TEXT,
          spin360_index INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_images_project_id ON images(project_id)
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_images_spin360 ON images(spin360_index) WHERE spin360_index IS NOT NULL
      `;

      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }
}
