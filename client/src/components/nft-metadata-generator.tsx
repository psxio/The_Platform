import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Download, Sparkles, CheckCircle2, AlertCircle, Eye, Copy, Check, FileJson } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import JSZip from 'jszip'

interface CollectionConfig {
  collectionSize: number
  collectionName: string
  collectionDescription: string
  mediaUrl: string
  externalUrl: string
}

const DEFAULT_CONFIG: CollectionConfig = {
  collectionSize: 1000,
  collectionName: "My NFT Collection",
  collectionDescription: "A unique NFT collection",
  mediaUrl: "ipfs://YOUR_CID_HERE",
  externalUrl: "https://example.com"
}

function generateMetadata(tokenId: number, config: CollectionConfig) {
  return {
    name: `${config.collectionName} #${tokenId}`,
    description: config.collectionDescription,
    image: `${config.mediaUrl}/${tokenId}.png`,
    external_url: config.externalUrl,
    attributes: [
      { trait_type: "Token ID", value: tokenId.toString() },
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
  const { toast } = useToast()
  
  const [config, setConfig] = useState<CollectionConfig>(DEFAULT_CONFIG)

  const testMetadata = () => {
    const tokenId = parseInt(testTokenId, 10)
    if (isNaN(tokenId) || tokenId < 1 || tokenId > config.collectionSize) {
      setError(`Token ID must be between 1 and ${config.collectionSize}`)
      setTestResult(null)
      return
    }
    setError(null)
    const metadata = generateMetadata(tokenId, config)
    setTestResult(metadata)
  }

  const copyMetadata = () => {
    if (testResult) {
      navigator.clipboard.writeText(JSON.stringify(testResult, null, 2))
      setCopied(true)
      toast({ title: "Copied", description: "Metadata copied to clipboard" })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const downloadSampleJSON = () => {
    const tokenId = parseInt(testTokenId, 10) || 1
    const metadata = generateMetadata(tokenId, config)
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
    
    toast({ title: "Downloaded", description: `Sample metadata for token #${tokenId}` })
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

      for (let i = 1; i <= config.collectionSize; i++) {
        const metadata = generateMetadata(i, config)
        zip.file(`${i}`, JSON.stringify(metadata, null, 2))

        if (i % batchSize === 0 || i === config.collectionSize) {
          setProgress(Math.round((i / config.collectionSize) * 90))
        }
      }

      setStatus('packaging')
      setProgress(95)

      const blob = await zip.generateAsync({ type: 'blob' })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${config.collectionName.replace(/\s+/g, '-')}-Metadata-${config.collectionSize}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setProgress(100)
      setStatus('complete')
      toast({ title: "Success", description: `Generated ${config.collectionSize} metadata files!` })
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setStatus('error')
      toast({ title: "Error", description: "Failed to generate metadata", variant: "destructive" })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card data-testid="card-nft-metadata-generator">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>NFT Metadata Generator</CardTitle>
            <CardDescription>Generate OpenSea-compatible JSON metadata for your NFT collection</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="collectionName">Collection Name</Label>
            <Input
              id="collectionName"
              value={config.collectionName}
              onChange={(e) => setConfig({ ...config, collectionName: e.target.value })}
              placeholder="My NFT Collection"
              data-testid="input-collection-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="collectionSize">Collection Size</Label>
            <Input
              id="collectionSize"
              type="number"
              min={1}
              max={100000}
              value={config.collectionSize}
              onChange={(e) => setConfig({ ...config, collectionSize: parseInt(e.target.value) || 1000 })}
              data-testid="input-collection-size"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="collectionDescription">Description</Label>
          <Textarea
            id="collectionDescription"
            value={config.collectionDescription}
            onChange={(e) => setConfig({ ...config, collectionDescription: e.target.value })}
            placeholder="A unique NFT collection..."
            rows={2}
            data-testid="input-collection-description"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mediaUrl">Media Base URL (IPFS or HTTP)</Label>
            <Input
              id="mediaUrl"
              value={config.mediaUrl}
              onChange={(e) => setConfig({ ...config, mediaUrl: e.target.value })}
              placeholder="ipfs://YOUR_CID_HERE"
              data-testid="input-media-url"
            />
            <p className="text-xs text-muted-foreground">Image URLs will be: {config.mediaUrl}/1.png</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="externalUrl">External URL</Label>
            <Input
              id="externalUrl"
              value={config.externalUrl}
              onChange={(e) => setConfig({ ...config, externalUrl: e.target.value })}
              placeholder="https://example.com"
              data-testid="input-external-url"
            />
          </div>
        </div>

        <div className="p-4 bg-muted/50 border rounded-lg">
          <Label className="text-sm font-medium mb-2 block">Test Metadata Preview</Label>
          <div className="flex flex-wrap gap-2 mb-3">
            <Input
              type="number"
              min={1}
              max={config.collectionSize}
              value={testTokenId}
              onChange={(e) => setTestTokenId(e.target.value)}
              placeholder={`Token ID (1-${config.collectionSize})`}
              className="w-32"
              data-testid="input-test-token-id"
            />
            <Button
              onClick={testMetadata}
              variant="secondary"
              data-testid="button-test-metadata"
            >
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            {testResult && (
              <>
                <Button
                  onClick={copyMetadata}
                  variant="outline"
                  size="icon"
                  data-testid="button-copy-metadata"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={downloadSampleJSON}
                  variant="outline"
                  data-testid="button-download-sample"
                >
                  <FileJson className="mr-1 h-4 w-4" />
                  Download
                </Button>
              </>
            )}
          </div>
          
          {testResult && (
            <pre className="bg-background p-3 rounded text-xs overflow-x-auto font-mono max-h-48 overflow-y-auto border" data-testid="preview-metadata">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          )}
        </div>

        {(status === 'generating' || status === 'packaging') && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {status === 'generating' ? 'Generating JSONs...' : 'Packaging ZIP...'}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {status === 'complete' && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 p-3 rounded" data-testid="status-complete">
            <CheckCircle2 className="h-4 w-4" />
            <span>Download complete! Check your downloads folder.</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 p-3 rounded" data-testid="status-error">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={downloadSampleJSON}
            disabled={generating}
            variant="outline"
            data-testid="button-sample-download"
          >
            <FileJson className="mr-2 h-4 w-4" />
            Download Sample JSON
          </Button>
          <Button
            onClick={generateFullCollection}
            disabled={generating}
            data-testid="button-generate-full"
          >
            <Download className="mr-2 h-4 w-4" />
            {generating ? 'Generating...' : `Generate All ${config.collectionSize.toLocaleString()} Metadata`}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p className="font-medium">Output Format (scatter.art compatible):</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Files named 1, 2, 3... (no .json extension)</li>
            <li>OpenSea metadata standard compliant</li>
            <li>Ready for IPFS upload or hosting</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
