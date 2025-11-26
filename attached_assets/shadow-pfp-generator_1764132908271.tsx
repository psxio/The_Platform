"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Download, Moon, CheckCircle2, AlertCircle } from 'lucide-react'
import { 
  generateUniqueCollections, 
  validateScatterArtCollection,
  type GeneratedPFP 
} from '@/lib/bulk-pfp-generator'
import { 
  renderShadowCollectionToZIP,
  downloadBlob,
  formatTime,
  type ShadowRenderProgress 
} from '@/lib/shadow-bulk-renderer'
import { renderShadowPFP } from '@/lib/shadow-pfp-renderer'
import { generateEmptyMetadataZIP, downloadBlob as downloadEmpty } from '@/lib/empty-metadata-generator'

export function ShadowPFPGenerator() {
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<ShadowRenderProgress | null>(null)
  const [status, setStatus] = useState<'idle' | 'generating' | 'rendering' | 'packaging' | 'complete' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const generatePreview = async () => {
    try {
      setGenerating(true)
      setStatus('rendering')
      setError(null)

      // Generate 1 random PFP and render as shadow
      const pfps = generateUniqueCollections(1)
      const shadowBlob = await renderShadowPFP(pfps[0].traits, {
        width: 512,
        height: 512,
        format: 'png',
        quality: 1,
      })

      // Create preview URL
      const url = URL.createObjectURL(shadowBlob)
      setPreviewUrl(url)

      setStatus('complete')
      console.log('✅ Shadow preview generated!')
    } catch (err) {
      console.error('Preview generation error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setStatus('error')
    } finally {
      setGenerating(false)
    }
  }

  const generateEmptyMetadata = async (count: number = 4444) => {
    try {
      setGenerating(true)
      setStatus('packaging')
      setError(null)
      setPreviewUrl(null)

      // Generate empty metadata JSONs (no traits, just structure)
      const zipBlob = await generateEmptyMetadataZIP(count)

      // Download
      downloadEmpty(zipBlob, `PSX-Empty-Metadata-${count}.zip`)

      setStatus('complete')
      console.log(`✅ Generated ${count} empty metadata JSONs!`)
    } catch (err) {
      console.error('Empty metadata generation error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setStatus('error')
    } finally {
      setGenerating(false)
    }
  }

  const generateShadowCollection = async (count: number = 4444) => {
    try {
      setGenerating(true)
      setStatus('generating')
      setError(null)
      setProgress(null)
      setPreviewUrl(null) // Clear preview when generating full collection

      // Step 1: Generate unique combinations
      setStatus('generating')
      const pfps = generateUniqueCollections(count)

      console.log(`✅ Generated ${count} unique PFP combinations`)

      // Validate
      const validation = validateScatterArtCollection(pfps)
      if (!validation.valid) {
        throw new Error(`Collection validation failed: ${validation.errors.join(', ')}`)
      }

      // Step 2: Render all as shadow silhouettes and package with metadata
      setStatus('rendering')
      const zipBlob = await renderShadowCollectionToZIP(pfps, {
        width: 1024,
        height: 1024,
        format: 'png',
        quality: 1,
        onProgress: (p) => setProgress(p),
      })

      // Step 3: Download
      downloadBlob(zipBlob, `PSX-Shadow-Collection-${count}.zip`)

      setStatus('complete')
      setProgress(null)
      console.log('✅ Shadow collection complete!')
    } catch (err) {
      console.error('Shadow generation error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setStatus('error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card className="border-purple-500/20 bg-black/40 p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="border-b border-purple-500/20 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <Moon className="w-6 h-6 text-purple-400" />
            <h3 className="text-xl font-bold text-purple-400">
              Shadow Collection Generator
            </h3>
          </div>
          <p className="text-sm text-gray-400">
            Generate 4444 mystery shadow PFPs for reveal mechanics
          </p>
          <p className="text-xs text-purple-400/80 mt-2">
            🌑 All PFPs rendered as black silhouettes with full metadata saved for future reveal
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/60 border border-purple-500/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">4,444</div>
            <div className="text-xs text-gray-400">Shadow PFPs</div>
          </div>
          <div className="bg-black/60 border border-purple-500/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">1024×1024</div>
            <div className="text-xs text-gray-400">Resolution</div>
          </div>
        </div>

        {/* Progress */}
        {progress && status === 'rendering' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                Rendering Shadows: {progress.current} / {progress.total}
              </span>
              <span className="text-purple-400">
                {Math.round(progress.percentage)}% • {formatTime(progress.estimatedTimeRemaining)} left
              </span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
            <p className="text-xs text-gray-500 text-center">
              Converting to black silhouettes...
            </p>
          </div>
        )}

        {/* Status Messages */}
        {status === 'generating' && !progress && (
          <div className="flex items-center gap-2 text-purple-400 text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-400 border-t-transparent" />
            <span>Generating unique trait combinations...</span>
          </div>
        )}

        {status === 'complete' && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Shadow collection downloaded! Check your downloads folder.</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Preview Section */}
        {previewUrl && (
          <div className="p-4 bg-purple-400/5 border border-purple-400/30 rounded-lg">
            <p className="text-sm text-purple-400 font-semibold mb-3 text-center">
              🌑 Shadow Preview
            </p>
            <div className="flex justify-center">
              <img 
                src={previewUrl} 
                alt="Shadow PFP Preview" 
                className="w-64 h-64 border-2 border-purple-400/30 rounded bg-white/5"
              />
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Black silhouette ready for minting!
            </p>
          </div>
        )}

        {/* What's Included */}
        <div className="p-4 bg-purple-400/10 border border-purple-400/20 rounded">
          <p className="text-xs text-purple-400 font-semibold mb-2">📦 ZIP Contents:</p>
          <ul className="text-xs text-gray-300 space-y-1">
            <li>• <strong>/shadows/</strong> - 4444 black silhouette PNGs (for minting)</li>
            <li>• <strong>/metadata/</strong> - NFT metadata JSONs pointing to shadow images</li>
            <li>• <strong>/reveal_data/</strong> - Full trait data for future reveal (KEEP PRIVATE)</li>
          </ul>
        </div>

        {/* Preview Button */}
        <Button
          onClick={generatePreview}
          disabled={generating}
          variant="outline"
          className="w-full border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400 font-semibold py-4"
        >
          {generating && status === 'rendering' && !progress ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent" />
              Rendering Preview...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Moon className="w-4 h-4" />
              Preview: Generate 1 Shadow
            </span>
          )}
        </Button>

        {/* Empty Metadata Button */}
        <Button
          onClick={() => generateEmptyMetadata(4444)}
          disabled={generating}
          variant="outline"
          className="w-full border-green-500/30 hover:bg-green-500/10 text-green-400 font-bold py-5 text-base"
        >
          {generating && status === 'packaging' ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-400 border-t-transparent" />
              Packaging...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Empty Metadata: 4444 JSONs (scatter.art ready)
            </span>
          )}
        </Button>

        {/* Generate Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={() => generateShadowCollection(50)}
            disabled={generating}
            variant="outline"
            className="border-purple-500/30 hover:bg-purple-500/10 text-purple-400 font-bold py-6 text-base"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-400 border-t-transparent" />
                Generating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Moon className="w-4 h-4" />
                Test: 50 Shadows
              </span>
            )}
          </Button>

          <Button
            onClick={() => generateShadowCollection(4444)}
            disabled={generating}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-6 text-base"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Generating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Moon className="w-5 h-5" />
                Full: 4444 Shadows
              </span>
            )}
          </Button>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-yellow-400/10 border border-yellow-400/20 rounded">
          <p className="text-xs text-yellow-400 font-semibold mb-1">
            ⚠️ Workflow for Reveal Mechanic:
          </p>
          <ol className="text-xs text-gray-300 space-y-1 list-decimal list-inside">
            <li>Mint collection using shadow images (black silhouettes)</li>
            <li>Keep <code className="text-purple-400">/reveal_data/</code> folder PRIVATE</li>
            <li>At reveal time, update metadata to show full PFPs using reveal data</li>
            <li>NFTs transform from shadows to full colored characters!</li>
          </ol>
        </div>
      </div>
    </Card>
  )
}
