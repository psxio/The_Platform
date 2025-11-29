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

function detectApplicationsFromText(text: string | null): string[] {
  if (!text) return [];

  const appPatterns: Record<string, RegExp[]> = {
    'Visual Studio Code': [/VS Code|VSCode|Visual Studio Code/i],
    'Chrome': [/Google Chrome|Chrome/i],
    'Firefox': [/Mozilla Firefox|Firefox/i],
    'Safari': [/Safari/i],
    'Slack': [/Slack/i],
    'Discord': [/Discord/i],
    'Microsoft Teams': [/Microsoft Teams|Teams/i],
    'Zoom': [/Zoom Meeting|Zoom/i],
    'Terminal': [/Terminal|bash|zsh|cmd|PowerShell/i],
    'Figma': [/Figma/i],
    'Notion': [/Notion/i],
    'Microsoft Word': [/Microsoft Word|Word/i],
    'Microsoft Excel': [/Microsoft Excel|Excel/i],
    'Google Docs': [/Google Docs/i],
    'Google Sheets': [/Google Sheets/i],
    'Gmail': [/Gmail/i],
    'Outlook': [/Outlook/i],
    'YouTube': [/YouTube/i],
    'Twitter': [/Twitter|X\.com/i],
    'LinkedIn': [/LinkedIn/i],
    'GitHub': [/GitHub/i],
    'Jira': [/Jira/i],
    'Trello': [/Trello/i],
    'Asana': [/Asana/i],
  };

  const detected: string[] = [];
  
  for (const [app, patterns] of Object.entries(appPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        detected.push(app);
        break;
      }
    }
  }

  return Array.from(new Set(detected));
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
