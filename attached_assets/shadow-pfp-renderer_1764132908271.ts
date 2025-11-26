// Shadow PFP Renderer - Converts PFPs to black silhouettes for mystery reveals
// Renders full character then converts to solid black shape

import { getTraitPath, TRAIT_OPTIONS, TRAIT_LAYER_ORDER, type TraitCategory } from './pfp-traits'
import { imageLoader } from './pfp-image-loader'

export interface ShadowRenderOptions {
  width: number
  height: number
  format: 'png' | 'webp'
  quality: number
}

/**
 * Render a PFP as a solid black silhouette (preserving shape, hiding all details)
 */
export async function renderShadowPFP(
  traits: Record<string, string>,
  options: ShadowRenderOptions = { width: 1024, height: 1024, format: 'png', quality: 1 }
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = options.width
  canvas.height = options.height
  const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true })

  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }

  // Step 1: Start with TRANSPARENT background (not white)
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  // Step 2: Render character layers only (skip backgrounds)
  let layersRendered = 0

  for (const category of TRAIT_LAYER_ORDER) {
    // SKIP backgrounds - they're solid images we don't want
    if (category === 'background' || category === 'backgroundAccessory') {
      continue
    }

    const traitName = traits[category]
    if (!traitName || traitName === 'None') continue

    const categoryTraits = TRAIT_OPTIONS[category as TraitCategory]
    const trait = categoryTraits.find(t => t.name === traitName)

    if (trait?.fileName) {
      try {
        const imagePath = getTraitPath(category as TraitCategory, trait.fileName)
        const img = await imageLoader.load(imagePath)
        if (img) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          layersRendered++
        } else {
          console.warn(`Image loader returned null for ${imagePath}`)
        }
      } catch (error) {
        console.warn(`Failed to load trait ${category}/${trait.fileName}:`, error)
      }
    }
  }

  console.log(`Shadow render: ${layersRendered} layers rendered`)

  // Step 3: Convert ALL character pixels to BLACK, then fill transparent areas with WHITE
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  // Threshold for detecting character pixels
  const ALPHA_THRESHOLD = 10 // Very low threshold to catch even subtle anti-aliasing
  
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] // Alpha channel
    
    if (alpha > ALPHA_THRESHOLD) {
      // Pixel is part of the character - make it FULLY OPAQUE BLACK
      data[i] = 0     // Red = black
      data[i + 1] = 0 // Green = black
      data[i + 2] = 0 // Blue = black
      data[i + 3] = 255 // FULLY OPAQUE
    } else {
      // Pixel is transparent background - make it WHITE
      data[i] = 255   // Red = white
      data[i + 1] = 255 // Green = white
      data[i + 2] = 255 // Blue = white
      data[i + 3] = 255 // FULLY OPAQUE
    }
  }

  ctx.putImageData(imageData, 0, 0)

  // Step 3: Export as blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create blob from canvas'))
        }
      },
      `image/${options.format}`,
      options.quality
    )
  })
}

/**
 * Batch render shadow PFPs with progress tracking
 */
export async function batchRenderShadowPFPs(
  pfps: Array<{ id: number; traits: Record<string, string> }>,
  options: ShadowRenderOptions,
  onProgress?: (current: number, total: number) => void
): Promise<Map<number, Blob>> {
  const results = new Map<number, Blob>()

  for (let i = 0; i < pfps.length; i++) {
    const pfp = pfps[i]
    const blob = await renderShadowPFP(pfp.traits, options)
    results.set(pfp.id, blob)

    if (onProgress) {
      onProgress(i + 1, pfps.length)
    }

    // Small delay to prevent blocking
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  return results
}
