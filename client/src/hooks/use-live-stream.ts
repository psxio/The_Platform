import { useState, useEffect, useCallback, useRef } from 'react';

interface LiveStreamConfig {
  userId: string;
  role: 'worker' | 'viewer';
  targetUserId?: string;
}

interface StreamState {
  isConnected: boolean;
  isStreaming: boolean;
  viewerCount: number;
  error: string | null;
}

export function useLiveStreamWorker(userId: string) {
  const [state, setState] = useState<StreamState>({
    isConnected: false,
    isStreaming: false,
    viewerCount: 0,
    error: null,
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/live-stream`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'worker-register',
        userId
      }));
      setState(s => ({ ...s, isConnected: true, error: null }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'worker-registered':
          setState(s => ({ ...s, viewerCount: data.viewerCount }));
          break;
        case 'viewer-count':
          setState(s => ({ ...s, viewerCount: data.count }));
          break;
        case 'error':
          setState(s => ({ ...s, error: data.message }));
          break;
        case 'pong':
          break;
      }
    };

    ws.onerror = () => {
      setState(s => ({ ...s, error: 'Connection error' }));
    };

    ws.onclose = () => {
      setState(s => ({ ...s, isConnected: false, isStreaming: false }));
      setTimeout(() => {
        if (state.isStreaming) {
          connect();
        }
      }, 3000);
    };

    wsRef.current = ws;
  }, [userId, state.isStreaming]);

  const startStreaming = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 2 },
        audio: false
      });

      connect();
      
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      
      setState(s => ({ ...s, isStreaming: true }));

      wsRef.current?.send(JSON.stringify({
        type: 'stream-status',
        userId,
        isStreaming: true
      }));

      streamIntervalRef.current = setInterval(() => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        
        const canvas = canvasRef.current!;
        const scale = Math.min(800 / video.videoWidth, 600 / video.videoHeight);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = canvas.toDataURL('image/jpeg', 0.5);
          
          wsRef.current?.send(JSON.stringify({
            type: 'screen-frame',
            userId,
            frame,
            timestamp: Date.now()
          }));
        }
      }, 1000);

      stream.getTracks()[0].onended = () => {
        stopStreaming();
      };

    } catch (error) {
      console.error('Failed to start streaming:', error);
      setState(s => ({ ...s, error: 'Failed to start screen sharing' }));
    }
  }, [userId, connect]);

  const stopStreaming = useCallback(() => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }

    wsRef.current?.send(JSON.stringify({
      type: 'stream-status',
      userId,
      isStreaming: false
    }));

    setState(s => ({ ...s, isStreaming: false }));
  }, [userId]);

  const disconnect = useCallback(() => {
    stopStreaming();
    wsRef.current?.close();
    wsRef.current = null;
  }, [stopStreaming]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    startStreaming,
    stopStreaming,
    connect,
    disconnect,
  };
}

export function useLiveStreamViewer(viewerId: string, targetUserId: string) {
  const [state, setState] = useState({
    isConnected: false,
    isStreamActive: false,
    currentFrame: null as string | null,
    lastUpdate: null as number | null,
    error: null as string | null,
  });

  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/live-stream`);
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'viewer-subscribe',
        viewerId,
        targetUserId
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'subscribed':
          setState(s => ({ 
            ...s, 
            isConnected: true, 
            isStreamActive: data.isStreamActive,
            error: null 
          }));
          break;
        case 'error':
          setState(s => ({ ...s, error: data.message }));
          break;
        case 'screen-frame':
          setState(s => ({ 
            ...s, 
            currentFrame: data.frame,
            lastUpdate: data.timestamp,
            isStreamActive: true
          }));
          break;
        case 'stream-status':
          setState(s => ({ ...s, isStreamActive: data.isStreaming }));
          break;
        case 'stream-ended':
          setState(s => ({ 
            ...s, 
            isStreamActive: false,
            currentFrame: null
          }));
          break;
      }
    };

    ws.onerror = () => {
      setState(s => ({ ...s, error: 'Connection error' }));
    };

    ws.onclose = () => {
      setState(s => ({ ...s, isConnected: false }));
    };

    wsRef.current = ws;
  }, [viewerId, targetUserId]);

  const disconnect = useCallback(() => {
    wsRef.current?.send(JSON.stringify({
      type: 'viewer-unsubscribe'
    }));
    wsRef.current?.close();
    wsRef.current = null;
    setState({
      isConnected: false,
      isStreamActive: false,
      currentFrame: null,
      lastUpdate: null,
      error: null,
    });
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    ...state,
    reconnect: connect,
    disconnect,
  };
}
