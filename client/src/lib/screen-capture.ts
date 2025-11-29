import { createWorker } from 'tesseract.js';

declare global {
  interface Window {
    ImageCapture: typeof ImageCapture;
  }
  
  class ImageCapture {
    constructor(track: MediaStreamTrack);
    grabFrame(): Promise<ImageBitmap>;
    takePhoto(): Promise<Blob>;
  }
}

export interface CaptureResult {
  imageData: string;
  thumbnailData: string;
  ocrText: string | null;
  detectedApps: string[];
  activityLevel: 'active' | 'idle' | 'unknown';
  timestamp: Date;
}

let mediaStream: MediaStream | null = null;
let ocrWorker: Tesseract.Worker | null = null;
let isInitializingOcr = false;

export async function initializeOcrWorker(): Promise<void> {
  if (ocrWorker || isInitializingOcr) return;
  
  isInitializingOcr = true;
  try {
    ocrWorker = await createWorker('eng', 1, {
      logger: () => {},
    });
    console.log('OCR worker initialized');
  } catch (error) {
    console.error('Failed to initialize OCR worker:', error);
  } finally {
    isInitializingOcr = false;
  }
}

export async function requestScreenCapture(): Promise<boolean> {
  try {
    if (mediaStream) {
      return true;
    }

    mediaStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });

    mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
      mediaStream = null;
    });

    await initializeOcrWorker();
    return true;
  } catch (error) {
    console.error('Failed to request screen capture:', error);
    return false;
  }
}

export function isScreenCaptureActive(): boolean {
  return mediaStream !== null && mediaStream.active;
}

export function stopScreenCapture(): void {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
}

export async function captureScreenshot(): Promise<CaptureResult | null> {
  if (!mediaStream || !mediaStream.active) {
    console.error('No active screen capture stream');
    return null;
  }

  try {
    const track = mediaStream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    const bitmap = await imageCapture.grabFrame();

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(bitmap, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    const thumbCanvas = document.createElement('canvas');
    const thumbWidth = 320;
    const thumbHeight = Math.round(bitmap.height * (thumbWidth / bitmap.width));
    thumbCanvas.width = thumbWidth;
    thumbCanvas.height = thumbHeight;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (!thumbCtx) return null;

    thumbCtx.drawImage(bitmap, 0, 0, thumbWidth, thumbHeight);
    const thumbnailData = thumbCanvas.toDataURL('image/jpeg', 0.6);

    let ocrText: string | null = null;
    let detectedApps: string[] = [];
    
    if (ocrWorker) {
      try {
        const result = await ocrWorker.recognize(canvas);
        ocrText = result.data.text;
        
        detectedApps = detectApplicationsFromText(ocrText);
      } catch (error) {
        console.error('OCR failed:', error);
      }
    }

    const activityLevel = detectActivityLevel(ocrText);

    bitmap.close();

    return {
      imageData,
      thumbnailData,
      ocrText,
      detectedApps,
      activityLevel,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    return null;
  }
}

export type AppCategory = 'productivity' | 'communication' | 'entertainment' | 'development' | 'social' | 'other';

export interface DetectedApp {
  name: string;
  category: AppCategory;
}

const appPatterns: Record<string, { patterns: RegExp[]; category: AppCategory }> = {
  'Visual Studio Code': { patterns: [/VS Code|VSCode|Visual Studio Code/i], category: 'development' },
  'Chrome': { patterns: [/Google Chrome|Chrome/i], category: 'productivity' },
  'Firefox': { patterns: [/Mozilla Firefox|Firefox/i], category: 'productivity' },
  'Safari': { patterns: [/Safari/i], category: 'productivity' },
  'Slack': { patterns: [/Slack/i], category: 'communication' },
  'Discord': { patterns: [/Discord/i], category: 'communication' },
  'Microsoft Teams': { patterns: [/Microsoft Teams|Teams/i], category: 'communication' },
  'Zoom': { patterns: [/Zoom Meeting|Zoom/i], category: 'communication' },
  'Terminal': { patterns: [/Terminal|bash|zsh|cmd|PowerShell/i], category: 'development' },
  'Figma': { patterns: [/Figma/i], category: 'productivity' },
  'Notion': { patterns: [/Notion/i], category: 'productivity' },
  'Microsoft Word': { patterns: [/Microsoft Word|Word/i], category: 'productivity' },
  'Microsoft Excel': { patterns: [/Microsoft Excel|Excel/i], category: 'productivity' },
  'Google Docs': { patterns: [/Google Docs/i], category: 'productivity' },
  'Google Sheets': { patterns: [/Google Sheets/i], category: 'productivity' },
  'Gmail': { patterns: [/Gmail/i], category: 'communication' },
  'Outlook': { patterns: [/Outlook/i], category: 'communication' },
  'YouTube': { patterns: [/YouTube/i], category: 'entertainment' },
  'Netflix': { patterns: [/Netflix/i], category: 'entertainment' },
  'Spotify': { patterns: [/Spotify/i], category: 'entertainment' },
  'Twitch': { patterns: [/Twitch/i], category: 'entertainment' },
  'Twitter': { patterns: [/Twitter|X\.com/i], category: 'social' },
  'LinkedIn': { patterns: [/LinkedIn/i], category: 'social' },
  'Facebook': { patterns: [/Facebook/i], category: 'social' },
  'Instagram': { patterns: [/Instagram/i], category: 'social' },
  'Reddit': { patterns: [/Reddit/i], category: 'social' },
  'GitHub': { patterns: [/GitHub/i], category: 'development' },
  'GitLab': { patterns: [/GitLab/i], category: 'development' },
  'Jira': { patterns: [/Jira/i], category: 'productivity' },
  'Trello': { patterns: [/Trello/i], category: 'productivity' },
  'Asana': { patterns: [/Asana/i], category: 'productivity' },
  'Replit': { patterns: [/Replit/i], category: 'development' },
  'AWS Console': { patterns: [/AWS|Amazon Web Services/i], category: 'development' },
  'Google Cloud': { patterns: [/Google Cloud|GCP/i], category: 'development' },
  'Azure': { patterns: [/Azure/i], category: 'development' },
  'Postman': { patterns: [/Postman/i], category: 'development' },
  'Sublime Text': { patterns: [/Sublime Text/i], category: 'development' },
  'IntelliJ': { patterns: [/IntelliJ|JetBrains/i], category: 'development' },
  'WebStorm': { patterns: [/WebStorm/i], category: 'development' },
  'PyCharm': { patterns: [/PyCharm/i], category: 'development' },
  'Cursor': { patterns: [/Cursor/i], category: 'development' },
};

function detectApplicationsFromText(text: string | null): string[] {
  if (!text) return [];

  const detected: string[] = [];
  
  for (const [app, config] of Object.entries(appPatterns)) {
    for (const pattern of config.patterns) {
      if (pattern.test(text)) {
        detected.push(app);
        break;
      }
    }
  }

  return Array.from(new Set(detected));
}

export function detectApplicationsWithCategories(text: string | null): DetectedApp[] {
  if (!text) return [];

  const detected: DetectedApp[] = [];
  
  for (const [app, config] of Object.entries(appPatterns)) {
    for (const pattern of config.patterns) {
      if (pattern.test(text)) {
        detected.push({ name: app, category: config.category });
        break;
      }
    }
  }

  return detected;
}

export function getCategoryColor(category: AppCategory): string {
  switch (category) {
    case 'productivity': return 'bg-blue-500';
    case 'communication': return 'bg-green-500';
    case 'entertainment': return 'bg-yellow-500';
    case 'development': return 'bg-purple-500';
    case 'social': return 'bg-pink-500';
    default: return 'bg-gray-500';
  }
}

export function getCategoryLabel(category: AppCategory): string {
  switch (category) {
    case 'productivity': return 'Productivity';
    case 'communication': return 'Communication';
    case 'entertainment': return 'Entertainment';
    case 'development': return 'Development';
    case 'social': return 'Social Media';
    default: return 'Other';
  }
}

function detectActivityLevel(text: string | null): 'active' | 'idle' | 'unknown' {
  if (!text) return 'unknown';

  const idlePatterns = [
    /screen saver/i,
    /lock screen/i,
    /sign in/i,
    /enter password/i,
    /desktop$/i,
  ];

  for (const pattern of idlePatterns) {
    if (pattern.test(text)) {
      return 'idle';
    }
  }

  if (text.length > 100) {
    return 'active';
  }

  return 'unknown';
}

export async function terminateOcrWorker(): Promise<void> {
  if (ocrWorker) {
    await ocrWorker.terminate();
    ocrWorker = null;
  }
}
