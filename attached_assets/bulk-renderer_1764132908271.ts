// Batch PFP Rendering System for NFT Collections
// Renders thousands of PFPs efficiently with progress tracking

import { imageLoader } from './pfp-image-loader';
import { TRAIT_LAYER_ORDER, getTraitPath, TRAIT_OPTIONS } from './pfp-traits';

export interface RenderProgress {
  current: number;
  total: number;
  percentage: number;
  estimatedTimeRemaining: number; // seconds
}

export interface RenderOptions {
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  quality: number; // 0-1 for jpeg
  onProgress?: (progress: RenderProgress) => void;
}

/**
 * Render a single PFP to a blob
 */
export async function renderPFPToBlob(
  traits: Record<string, string>,
  options: RenderOptions
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  
  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Render layers in order
  for (const layer of TRAIT_LAYER_ORDER) {
    const traitName = traits[layer];
    if (!traitName || traitName === 'None') continue;
    
    try {
      // Find the trait option to get the filename
      const traitOption = TRAIT_OPTIONS[layer].find(t => t.name === traitName);
      if (!traitOption || !traitOption.fileName) continue;
      
      const imagePath = getTraitPath(layer, traitOption.fileName);
      const img = await imageLoader.load(imagePath);
      if (img) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    } catch (error) {
      console.warn(`Failed to load ${layer}/${traitName}:`, error);
    }
  }
  
  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      options.format === 'jpeg' ? 'image/jpeg' : 'image/png',
      options.quality
    );
  });
}

/**
 * Render and stream PFPs directly to ZIP to avoid memory issues
 * Processes in small batches and immediately adds to ZIP
 */
export async function renderAndStreamToZIP(
  pfps: Array<{ id: number; traits: Record<string, string> }>,
  metadata: Array<{ id: number; json: string }>,
  options: RenderOptions
): Promise<Blob> {
  // Dynamic import of JSZip
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  // Create folders
  const imagesFolder = zip.folder('images');
  const jsonFolder = zip.folder('json');
  if (!imagesFolder || !jsonFolder) {
    throw new Error('Failed to create ZIP folders');
  }
  
  // Add all metadata first (lightweight)
  metadata.forEach(({ id, json }) => {
    jsonFolder.file(`${id}`, json);
  });
  
  const startTime = Date.now();
  const batchSize = 3; // Very small batches to minimize memory usage
  let completed = 0;
  
  // Process images in small batches
  for (let i = 0; i < pfps.length; i += batchSize) {
    const batch = pfps.slice(i, Math.min(i + batchSize, pfps.length));
    
    // Render and immediately convert to ArrayBuffer one at a time
    for (const pfp of batch) {
      try {
        // Render to blob
        const blob = await renderPFPToBlob(pfp.traits, options);
        
        // Immediately convert to ArrayBuffer and add to ZIP
        // This ensures data is captured before blob reference expires
        const arrayBuffer = await blob.arrayBuffer();
        
        // Verify we got valid data
        if (arrayBuffer.byteLength === 0) {
          throw new Error(`Empty image data for PFP ${pfp.id}`);
        }
        
        // Add to ZIP with ArrayBuffer (not blob reference)
        imagesFolder.file(`${pfp.id}.png`, arrayBuffer, { binary: true });
        
        completed++;
        
        // Update progress after each image
        if (options.onProgress) {
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          const avgTimePerPFP = elapsedSeconds / completed;
          const remaining = pfps.length - completed;
          
          options.onProgress({
            current: completed,
            total: pfps.length,
            percentage: (completed / pfps.length) * 100,
            estimatedTimeRemaining: avgTimePerPFP * remaining,
          });
        }
      } catch (error) {
        console.error(`Failed to process PFP ${pfp.id}:`, error);
        throw error;
      }
    }
    
    // Small delay to let GC work between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Generate final ZIP
  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

/**
 * Deprecated - Use renderAndStreamToZIP instead for better memory efficiency
 */
export async function createScatterArtZIP(
  images: Array<{ id: number; blob: Blob }>,
  metadata: Array<{ id: number; json: string }>
): Promise<Blob> {
  // Dynamic import of JSZip
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  // Create images folder
  const imagesFolder = zip.folder('images');
  if (!imagesFolder) throw new Error('Failed to create images folder');
  
  images.forEach(({ id, blob }) => {
    imagesFolder.file(`${id}.png`, blob);
  });
  
  // Create json folder
  const jsonFolder = zip.folder('json');
  if (!jsonFolder) throw new Error('Failed to create json folder');
  
  metadata.forEach(({ id, json }) => {
    // NO .json extension per scatter.art requirements
    jsonFolder.file(`${id}`, json);
  });
  
  // Generate ZIP
  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format time in human-readable format
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}
