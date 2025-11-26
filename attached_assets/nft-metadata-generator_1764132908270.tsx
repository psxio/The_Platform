"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Download, Flame, CheckCircle2, AlertCircle, Eye, Copy, Check, FileJson } from 'lucide-react'
import JSZip from 'jszip'

const COLLECTION_SIZE = 8888
const COLLECTION_NAME = "Matchstick Countdown"
const COLLECTION_DESCRIPTION = "A unique collection of 8,888 NFTs featuring the Matchstick Countdown - an interactive, ever-burning digital flame."
const MEDIA_URL = "https://matchstick-countdown-ryankagygamesto.replit.app"
const EXTERNAL_URL = "https://matchstick-countdown-ryankagygamesto.replit.app"

function generateMetadata(tokenId: number) {
  return {
    name: `${COLLECTION_NAME} #${tokenId}`,
    description: COLLECTION_DESCRIPTION,
    image: MEDIA_URL,
    animation_url: MEDIA_URL,
    external_url: EXTERNAL_URL,
    attributes: [
      { trait_type: "Burned", value: "False" },
      { trait_type: "First Lit", value: -1, display_type: "number" },
      { trait_type: "Days Lit", value: 0, display_type: "number" },
      { trait_type: "Fires Started", value: 0, display_type: "number" },
    ],
  }
}

export function NFTMetadataGenerator() {
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'generating' | 'packaging' | 'complete' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [testTokenId, setTestTokenId] = useState('1')
  const [testResult, setTestResult] = useState<object | null>(null)
  const [copied, setCopied] = useState(false)

  const testMetadata = () => {
    const tokenId = parseInt(testTokenId, 10)
    if (isNaN(tokenId) || tokenId < 1 || tokenId > COLLECTION_SIZE) {
      setError(`Token ID must be between 1 and ${COLLECTION_SIZE}`)
      setTestResult(null)
      return
    }
    setError(null)
    const metadata = generateMetadata(tokenId)
    setTestResult(metadata)
  }

  const copyMetadata = () => {
    if (testResult) {
      navigator.clipboard.writeText(JSON.stringify(testResult, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const downloadSampleJSON = () => {
    const tokenId = parseInt(testTokenId, 10) || 1
    const metadata = generateMetadata(tokenId)
    const jsonString = JSON.stringify(metadata, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${tokenId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    setStatus('complete')
    setTimeout(() => setStatus('idle'), 2000)
  }

  const generateFullCollection = async () => {
    try {
      setGenerating(true)
      setStatus('generating')
      setError(null)
      setProgress(0)
      setTestResult(null)

      const zip = new JSZip()
      const batchSize = 100

      for (let i = 1; i <= COLLECTION_SIZE; i++) {
        const metadata = generateMetadata(i)
        zip.file(`${i}.json`, JSON.stringify(metadata, null, 2))

        if (i % batchSize === 0 || i === COLLECTION_SIZE) {
          setProgress(Math.round((i / COLLECTION_SIZE) * 90))
        }
      }

      setStatus('packaging')
      setProgress(95)

      const blob = await zip.generateAsync({ type: 'blob' })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Matchstick-Countdown-Metadata-${COLLECTION_SIZE}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setProgress(100)
      setStatus('complete')
      console.log(`Downloaded ${COLLECTION_SIZE} JSON files!`)
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setStatus('error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card className="bg-black/60 border-orange-500/30 backdrop-blur-sm p-6">
      <div className="flex items-center gap-3 mb-6">
        <Flame className="h-6 w-6 text-orange-400" />
        <h2 className="text-xl font-bold text-orange-400 font-mono">NFT METADATA GENERATOR</h2>
      </div>

      <div className="space-y-6">
        <div className="text-sm text-gray-400 space-y-2">
          <p>Generate OpenSea-compatible JSON metadata for the Matchstick Countdown NFT collection.</p>
          <p className="text-orange-300/70">Collection: {COLLECTION_SIZE.toLocaleString()} tokens | Media: Interactive countdown app</p>
        </div>

        <div className="p-4 bg-orange-900/20 border border-orange-400/30 rounded-lg">
          <Label className="text-orange-300 font-mono text-sm mb-2 block">TEST METADATA</Label>
          <div className="flex flex-wrap gap-2 mb-3">
            <Input
              type="number"
              min={1}
              max={COLLECTION_SIZE}
              value={testTokenId}
              onChange={(e) => setTestTokenId(e.target.value)}
              placeholder="Token ID (1-8888)"
              className="bg-black/50 border-orange-500/30 text-white font-mono w-32"
            />
            <Button
              onClick={testMetadata}
              className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-300 font-mono"
            >
              <Eye className="mr-2 h-4 w-4" />
              Test
            </Button>
            {testResult && (
              <>
                <Button
                  onClick={copyMetadata}
                  variant="outline"
                  className="border-orange-500/30 text-orange-300 font-mono"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={downloadSampleJSON}
                  variant="outline"
                  className="border-orange-500/30 text-orange-300 font-mono"
                >
                  <FileJson className="mr-1 h-4 w-4" />
                  Download
                </Button>
              </>
            )}
          </div>
          
          {testResult && (
            <pre className="bg-black/70 p-3 rounded text-xs text-orange-200 overflow-x-auto font-mono max-h-48 overflow-y-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          )}
        </div>

        {(status === 'generating' || status === 'packaging') && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-orange-300 font-mono">
              <span>{status === 'generating' ? 'Generating JSONs...' : 'Packaging ZIP...'}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-orange-900/30" />
          </div>
        )}

        {status === 'complete' && (
          <div className="flex items-center gap-2 text-green-400 text-sm font-mono">
            <CheckCircle2 className="h-4 w-4" />
            <span>Download complete! Check your downloads folder.</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm font-mono">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={downloadSampleJSON}
            disabled={generating}
            className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-300 font-mono font-bold"
          >
            <FileJson className="mr-2 h-4 w-4" />
            Sample (1 Metadata + JSON)
          </Button>
          <Button
            onClick={generateFullCollection}
            disabled={generating}
            className="bg-orange-600/30 hover:bg-orange-600/40 border border-orange-500/50 text-orange-200 font-mono font-bold"
          >
            <Download className="mr-2 h-4 w-4" />
            Full Collection ({COLLECTION_SIZE.toLocaleString()} Metadata + JSONs)
          </Button>
        </div>

        <div className="text-xs text-gray-500 font-mono space-y-1">
          <p>Base URI: https://matchstick-countdown-ryankagygamesto.replit.app/nft/metadata/</p>
          <p>API Endpoint: /nft/metadata/[id] (1-8888)</p>
        </div>
      </div>
    </Card>
  )
}
