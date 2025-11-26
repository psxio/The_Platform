// Shadow Collection Bulk Renderer
// Renders 4444 PFPs as black silhouettes with full metadata for future reveal

import { renderShadowPFP } from './shadow-pfp-renderer'
import { createMetadataJSON, type GeneratedPFP } from './bulk-pfp-generator'

export interface ShadowRenderProgress {
  current: number
  total: number
  percentage: number
  estimatedTimeRemaining: number
}

export interface ShadowRenderOptions {
  width: number
  height: number
  format: 'png' | 'webp'
  quality: number
  onProgress?: (progress: ShadowRenderProgress) => void
}

/**
 * Render and package shadow collection as ZIP with metadata
 */
export async function renderShadowCollectionToZIP(
  pfps: GeneratedPFP[],
  options: ShadowRenderOptions
): Promise<Blob> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  // Create folders
  const shadowsFolder = zip.folder('shadows') // Black silhouettes
  const metadataFolder = zip.folder('metadata') // Full trait data for reveal
  const revealDataFolder = zip.folder('reveal_data') // Hidden full trait info

  if (!shadowsFolder || !metadataFolder || !revealDataFolder) {
    throw new Error('Failed to create ZIP folders')
  }

  const startTime = Date.now()
  let completed = 0

  // Process each PFP
  for (const pfp of pfps) {
    try {
      // 1. Render shadow silhouette
      const shadowBlob = await renderShadowPFP(pfp.traits, options)
      const shadowBuffer = await shadowBlob.arrayBuffer()
      shadowsFolder.file(`${pfp.id}.png`, shadowBuffer, { binary: true })

      // 2. Save metadata with shadow image reference
      const shadowMetadata = {
        ...pfp.metadata,
        name: `PSX Shadow #${pfp.id}`,
        description: `PSX Shadow #${pfp.id} - Mystery PFP awaiting reveal`,
        image: `${pfp.id}.png`, // Points to shadow image
      }
      metadataFolder.file(`${pfp.id}.json`, JSON.stringify(shadowMetadata, null, 2))

      // 3. Save full trait data for future reveal (hidden from public)
      const revealData = {
        id: pfp.id,
        traits: pfp.traits,
        fullMetadata: pfp.metadata, // Original metadata with all traits
        shadowImageUsed: `shadows/${pfp.id}.png`,
        revealInstructions: 'Use this data to update metadata and reveal full PFP after mint',
      }
      revealDataFolder.file(`${pfp.id}.json`, JSON.stringify(revealData, null, 2))

      completed++

      // Update progress
      if (options.onProgress) {
        const elapsedSeconds = (Date.now() - startTime) / 1000
        const avgTimePerPFP = elapsedSeconds / completed
        const remaining = pfps.length - completed

        options.onProgress({
          current: completed,
          total: pfps.length,
          percentage: (completed / pfps.length) * 100,
          estimatedTimeRemaining: avgTimePerPFP * remaining,
        })
      }

      // Yield control every 10 images
      if (completed % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    } catch (error) {
      console.error(`Failed to process shadow PFP ${pfp.id}:`, error)
      throw error
    }
  }

  // Generate ZIP
  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}

/**
 * Format time remaining in human-readable format
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${minutes}m ${secs}s`
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
