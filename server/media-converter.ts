import ytdl from '@distube/ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import { storage } from './storage';
import type { MediaPlatform } from '@shared/schema';

const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads');

if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

interface ConversionProgress {
  percent: number;
  status: string;
}

const activeConversions = new Map<number, ConversionProgress>();

export function getConversionProgress(conversionId: number): ConversionProgress | undefined {
  return activeConversions.get(conversionId);
}

function detectPlatform(url: string): MediaPlatform {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  } else if (url.includes('soundcloud.com')) {
    return 'soundcloud';
  }
  return 'direct';
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim().replace(/\s+/g, '_').substring(0, 100);
}

async function getYouTubeInfo(url: string): Promise<{ title: string; duration: number }> {
  try {
    const info = await ytdl.getInfo(url);
    return {
      title: info.videoDetails.title,
      duration: parseInt(info.videoDetails.lengthSeconds, 10)
    };
  } catch (error) {
    console.error('Error getting YouTube info:', error);
    throw new Error('Failed to get video information. Please check the URL.');
  }
}

async function convertYouTubeToMp3(
  url: string, 
  conversionId: number,
  outputPath: string
): Promise<{ filePath: string; fileSize: number }> {
  return new Promise(async (resolve, reject) => {
    try {
      activeConversions.set(conversionId, { percent: 0, status: 'downloading' });
      
      const stream = ytdl(url, {
        quality: 'highestaudio',
        filter: 'audioonly',
      });

      let downloadedBytes = 0;
      stream.on('progress', (_, downloaded, total) => {
        downloadedBytes = downloaded;
        const percent = Math.round((downloaded / total) * 50);
        activeConversions.set(conversionId, { percent, status: 'downloading' });
      });

      stream.on('error', (error) => {
        console.error('YouTube stream error:', error);
        reject(new Error('Failed to download video. Please check the URL.'));
      });

      activeConversions.set(conversionId, { percent: 50, status: 'converting' });

      ffmpeg(stream)
        .audioBitrate(128)
        .audioCodec('libmp3lame')
        .format('mp3')
        .on('progress', (progress) => {
          const percent = 50 + Math.round((progress.percent || 0) / 2);
          activeConversions.set(conversionId, { percent, status: 'converting' });
        })
        .on('end', () => {
          activeConversions.set(conversionId, { percent: 100, status: 'completed' });
          const stats = fs.statSync(outputPath);
          resolve({ filePath: outputPath, fileSize: stats.size });
        })
        .on('error', (error) => {
          console.error('FFmpeg error:', error);
          reject(new Error('Failed to convert audio. Please try again.'));
        })
        .save(outputPath);

    } catch (error) {
      console.error('Conversion error:', error);
      reject(error);
    }
  });
}

export async function startConversion(
  userId: string,
  url: string
): Promise<{ conversionId: number; title: string; platform: MediaPlatform }> {
  const platform = detectPlatform(url);
  
  if (platform === 'soundcloud') {
    throw new Error('SoundCloud conversion is not currently supported. Please use YouTube URLs.');
  }
  
  if (platform === 'direct') {
    throw new Error('Direct URL conversion is not supported. Please use YouTube URLs.');
  }
  
  const info = await getYouTubeInfo(url);
  
  const conversion = await storage.createMediaConversion({
    userId,
    sourceUrl: url,
    platform,
    title: info.title,
    duration: info.duration,
    status: 'pending',
  });

  processConversion(conversion.id, url, info.title).catch(console.error);

  return {
    conversionId: conversion.id,
    title: info.title,
    platform,
  };
}

async function processConversion(conversionId: number, url: string, title: string): Promise<void> {
  try {
    await storage.updateMediaConversion(conversionId, { status: 'processing' });

    const safeFilename = sanitizeFilename(title) || `conversion_${conversionId}`;
    const outputPath = path.join(DOWNLOADS_DIR, `${safeFilename}_${conversionId}.mp3`);

    const result = await convertYouTubeToMp3(url, conversionId, outputPath);

    await storage.updateMediaConversion(conversionId, {
      status: 'completed',
      outputPath: result.filePath,
      fileSize: result.fileSize,
    });

    activeConversions.delete(conversionId);

  } catch (error) {
    console.error('Conversion failed:', error);
    await storage.updateMediaConversion(conversionId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
    });
    activeConversions.delete(conversionId);
  }
}

export async function downloadConvertedFile(conversionId: number, userId: string): Promise<{
  filePath: string;
  filename: string;
} | null> {
  const conversion = await storage.getMediaConversion(conversionId);
  
  if (!conversion) {
    return null;
  }
  
  if (conversion.userId !== userId) {
    return null;
  }
  
  if (conversion.status !== 'completed' || !conversion.outputPath) {
    return null;
  }
  
  if (!fs.existsSync(conversion.outputPath)) {
    return null;
  }
  
  const filename = path.basename(conversion.outputPath);
  return {
    filePath: conversion.outputPath,
    filename,
  };
}

export async function cleanupOldConversions(maxAgeHours: number = 24): Promise<number> {
  const files = fs.readdirSync(DOWNLOADS_DIR);
  const now = Date.now();
  const maxAge = maxAgeHours * 60 * 60 * 1000;
  let cleaned = 0;

  for (const file of files) {
    const filePath = path.join(DOWNLOADS_DIR, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtimeMs;
    
    if (age > maxAge) {
      fs.unlinkSync(filePath);
      cleaned++;
    }
  }

  return cleaned;
}
