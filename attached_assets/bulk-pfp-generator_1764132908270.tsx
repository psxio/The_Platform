"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Download, Zap, CheckCircle2, AlertCircle } from 'lucide-react'
import { 
  generateUniqueCollections, 
  createMetadataJSON,
  validateScatterArtCollection,
  type GeneratedPFP 
} from '@/lib/bulk-pfp-generator'
import { 
  renderAndStreamToZIP,
  downloadBlob,
  formatTime,
  type RenderProgress 
} from '@/lib/bulk-renderer'

export function BulkPFPGenerator() {
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<RenderProgress | null>(null)
  const [status, setStatus] = useState<'idle' | 'generating' | 'rendering' | 'packaging' | 'complete' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [collection, setCollection] = useState<GeneratedPFP[] | null>(null)
  const [lastGeneratedCount, setLastGeneratedCount] = useState<number>(4444)

  const generateCollection = async (count: number = 4444) => {
    try {
      setGenerating(true)
      setStatus('generating')
      setError(null)
      setProgress(null)
      setLastGeneratedCount(count)

      // Step 1: Generate unique combinations
      setStatus('generating')
      const pfps = generateUniqueCollections(count)
      setCollection(pfps)

      // Validate
      const validation = validateScatterArtCollection(pfps)
      if (!validation.valid) {
        throw new Error(`Collection validation failed: ${validation.errors.join(', ')}`)
      }

      // Step 2: Create metadata (lightweight)
      const metadata = pfps.map(pfp => ({
        id: pfp.id,
        json: createMetadataJSON(pfp),
      }))

      // Step 3: Render and stream to ZIP (memory efficient)
      setStatus('rendering')
      const zipBlob = await renderAndStreamToZIP(
        pfps.map(p => ({ id: p.id, traits: p.traits })),
        metadata,
        {
          width: 1024,
          height: 1024,
          format: 'png',
          quality: 1,
          onProgress: (p) => setProgress(p),
        }
      )
      
      // Step 4: Download
      downloadBlob(zipBlob, `PSX-Collection-${count}.zip`)
      
      setStatus('complete')
      setProgress(null)
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setStatus('error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card className="border-cyan-500/20 bg-black/40 p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="border-b border-cyan-500/20 pb-4">
          <h3 className="text-xl font-bold text-cyan-400 mb-2">
            Bulk NFT Collection Generator
          </h3>
          <p className="text-sm text-gray-400">
            Generate unique PFPs ready for scatter.art minting
          </p>
          <p className="text-xs text-yellow-400/80 mt-1">
            💡 Start with the 100-image test collection to verify functionality
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/60 border border-cyan-500/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-cyan-400">{lastGeneratedCount.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Collection Size</div>
          </div>
          <div className="bg-black/60 border border-cyan-500/10 rounded-lg p-4">
            <div className="text-2xl font-bold text-cyan-400">1024×1024</div>
            <div className="text-xs text-gray-400">Resolution</div>
          </div>
        </div>

        {/* Progress */}
        {progress && status === 'rendering' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                Rendering: {progress.current} / {progress.total}
              </span>
              <span className="text-cyan-400">
                {Math.round(progress.percentage)}% • {formatTime(progress.estimatedTimeRemaining)} left
              </span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
          </div>
        )}

        {/* Status Messages */}
        {status === 'generating' && (
          <div className="flex items-center gap-2 text-sm text-yellow-400 bg-yellow-400/10 p-3 rounded">
            <Zap className="w-4 h-4 animate-pulse" />
            Generating {lastGeneratedCount.toLocaleString()} unique trait combinations...
          </div>
        )}


        {status === 'complete' && (
          <div className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 p-3 rounded">
            <CheckCircle2 className="w-4 h-4" />
            Collection generated! ZIP file downloaded successfully.
          </div>
        )}

        {status === 'error' && error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 p-3 rounded">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Collection Info */}
        {collection && status === 'complete' && (
          <div className="bg-black/60 border border-cyan-500/10 rounded-lg p-4 space-y-2">
            <div className="text-sm font-semibold text-cyan-400">✓ Package Contents:</div>
            <div className="text-xs text-gray-400 space-y-1 font-mono">
              <div>└── images/</div>
              <div>    ├── 1.png → {lastGeneratedCount}.png (1024×1024)</div>
              <div>└── json/</div>
              <div>    ├── 1 → {lastGeneratedCount} (metadata, no .json ext)</div>
            </div>
            <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-cyan-500/10">
              Ready to upload to scatter.art uploader
            </div>
          </div>
        )}

        {/* Generate Buttons */}
        <div className="space-y-2">
          <Button
            onClick={() => generateCollection(100)}
            disabled={generating}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 animate-pulse" />
                {status === 'generating' && 'Generating Combinations...'}
                {status === 'rendering' && `Rendering & Packaging ${progress?.current || 0}/${progress?.total || 100}...`}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Test: Generate 100 Collection
              </span>
            )}
          </Button>
          
          <Button
            onClick={() => generateCollection(4000)}
            disabled={generating}
            className="w-full bg-purple-500 hover:bg-purple-600 text-black font-bold"
          >
            {generating && lastGeneratedCount === 4000 ? (
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 animate-pulse" />
                {status === 'generating' && 'Generating Combinations...'}
                {status === 'rendering' && `Rendering & Packaging ${progress?.current || 0}/4000...`}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Generate 4000 Collection
              </span>
            )}
          </Button>
          
          <Button
            onClick={() => generateCollection(4444)}
            disabled={generating}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold"
          >
            {generating && lastGeneratedCount === 4444 ? (
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4 animate-pulse" />
                {status === 'generating' && 'Generating Combinations...'}
                {status === 'rendering' && `Rendering & Packaging ${progress?.current || 0}/4444...`}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Generate Full 4444 Collection
              </span>
            )}
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-cyan-500/20">
          <div className="font-semibold text-cyan-400">Next Steps:</div>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Upload ZIP to scatter.art uploader</li>
            <li>Choose NFT.Storage or Instareveal</li>
            <li>Get your baseURI from scatter.art</li>
            <li>Deploy collection contract on Base</li>
            <li>Set baseURI in your contract</li>
          </ol>
        </div>
      </div>
    </Card>
  )
}
