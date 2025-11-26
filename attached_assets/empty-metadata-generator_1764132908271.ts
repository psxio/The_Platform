// Empty Metadata Generator - Creates blank JSONs for scatter.art placeholder minting
// User can upload any black image, then update metadata later for reveal

/**
 * Generate empty metadata JSON (same structure, empty values)
 * Image references Cloudflare Workers URL for placeholder
 */
export function createEmptyMetadata(id: number) {
  return {
    name: "",
    description: "",
    image: `https://sparkling-disk-e054.itsbloodredjay.workers.dev/images/${id}.png`,
    attributes: []
  }
}

/**
 * Generate 4444 empty metadata files as ZIP
 */
export async function generateEmptyMetadataZIP(count: number = 4444): Promise<Blob> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  const metadataFolder = zip.folder('metadata')
  if (!metadataFolder) {
    throw new Error('Failed to create metadata folder')
  }

  // Generate empty metadata JSONs (no file extension)
  for (let i = 1; i <= count; i++) {
    const emptyMetadata = createEmptyMetadata(i)
    metadataFolder.file(`${i}`, JSON.stringify(emptyMetadata, null, 2))
  }

  // Generate ZIP
  return await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  })
}

/**
 * Download blob helper
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
