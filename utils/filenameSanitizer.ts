/**
 * Sanitizes filenames to prevent directory traversal and special character issues
 */

export function sanitizeBatchName(name: string): string {
  return (
    name
      // Remove path separators to prevent directory traversal
      .replace(/[/\\]/g, '_')
      // Keep only alphanumeric, hyphens, underscores
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      // Remove leading/trailing underscores and hyphens
      .replace(/^[-_]+|[-_]+$/g, '')
      // Replace consecutive underscores with single underscore
      .replace(/_+/g, '_')
      // Limit length to prevent filesystem issues
      .slice(0, 100)
  );
}

export function generateBatchFilename(batchName: string): string {
  const sanitized = sanitizeBatchName(batchName);
  const timestamp = Date.now();
  return `${sanitized}_${timestamp}.zip`;
}
