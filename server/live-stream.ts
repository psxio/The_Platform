import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

interface StreamClient {
  ws: WebSocket;
  userId: string;
  role: 'worker' | 'viewer';
  targetUserId?: string;
}

const streamClients = new Map<string, StreamClient>();
const workerStreams = new Map<string, { 
  workerId: string; 
  viewers: Set<string>;
  lastFrame?: string;
  lastFrameTime?: number;
}>();

export function setupLiveStreamServer(server: Server) {
  const wss = new WebSocketServer({ 
    server, 
    path: '/ws/live-stream' 
  });

  wss.on('connection', (ws, req) => {
    const clientId = Math.random().toString(36).substring(7);
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        handleMessage(ws, clientId, data);
      } catch (error) {
        console.error('Live stream WebSocket error:', error);
      }
    });

    ws.on('close', () => {
      handleDisconnect(clientId);
    });

    ws.on('error', (error) => {
      console.error('Live stream WebSocket error:', error);
      handleDisconnect(clientId);
    });
  });

  console.log('Live stream WebSocket server initialized on /ws/live-stream');
  return wss;
}

function handleMessage(ws: WebSocket, clientId: string, data: any) {
  switch (data.type) {
    case 'worker-register':
      registerWorker(ws, clientId, data.userId);
      break;
    case 'viewer-subscribe':
      subscribeViewer(ws, clientId, data.viewerId, data.targetUserId);
      break;
    case 'viewer-unsubscribe':
      unsubscribeViewer(clientId);
      break;
    case 'screen-frame':
      broadcastFrame(data.userId, data.frame, data.timestamp);
      break;
    case 'stream-status':
      updateStreamStatus(data.userId, data.isStreaming);
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
  }
}

function registerWorker(ws: WebSocket, clientId: string, userId: string) {
  streamClients.set(clientId, {
    ws,
    userId,
    role: 'worker'
  });

  if (!workerStreams.has(userId)) {
    workerStreams.set(userId, {
      workerId: userId,
      viewers: new Set()
    });
  }

  ws.send(JSON.stringify({
    type: 'worker-registered',
    clientId,
    viewerCount: workerStreams.get(userId)?.viewers.size || 0
  }));

  console.log(`Worker ${userId} registered for live streaming`);
}

function subscribeViewer(ws: WebSocket, clientId: string, viewerId: string, targetUserId: string) {
  streamClients.set(clientId, {
    ws,
    userId: viewerId,
    role: 'viewer',
    targetUserId
  });

  const stream = workerStreams.get(targetUserId);
  if (stream) {
    stream.viewers.add(clientId);
    
    if (stream.lastFrame) {
      ws.send(JSON.stringify({
        type: 'screen-frame',
        frame: stream.lastFrame,
        timestamp: stream.lastFrameTime
      }));
    }

    notifyWorkerViewerCount(targetUserId);
  }

  ws.send(JSON.stringify({
    type: 'subscribed',
    targetUserId,
    isStreamActive: !!stream
  }));

  console.log(`Viewer ${viewerId} subscribed to watch ${targetUserId}`);
}

function unsubscribeViewer(clientId: string) {
  const client = streamClients.get(clientId);
  if (client && client.role === 'viewer' && client.targetUserId) {
    const stream = workerStreams.get(client.targetUserId);
    if (stream) {
      stream.viewers.delete(clientId);
      notifyWorkerViewerCount(client.targetUserId);
    }
  }
  streamClients.delete(clientId);
}

function broadcastFrame(workerId: string, frame: string, timestamp: number) {
  const stream = workerStreams.get(workerId);
  if (!stream) return;

  stream.lastFrame = frame;
  stream.lastFrameTime = timestamp;

  stream.viewers.forEach(viewerClientId => {
    const viewer = streamClients.get(viewerClientId);
    if (viewer?.ws?.readyState === WebSocket.OPEN) {
      viewer.ws.send(JSON.stringify({
        type: 'screen-frame',
        frame,
        timestamp,
        workerId
      }));
    }
  });
}

function notifyWorkerViewerCount(workerId: string) {
  const stream = workerStreams.get(workerId);
  if (!stream) return;

  for (const [, client] of streamClients) {
    if (client.role === 'worker' && client.userId === workerId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: 'viewer-count',
        count: stream.viewers.size
      }));
      break;
    }
  }
}

function updateStreamStatus(userId: string, isStreaming: boolean) {
  const stream = workerStreams.get(userId);
  if (!stream) return;

  stream.viewers.forEach(viewerClientId => {
    const viewer = streamClients.get(viewerClientId);
    if (viewer?.ws?.readyState === WebSocket.OPEN) {
      viewer.ws.send(JSON.stringify({
        type: 'stream-status',
        isStreaming,
        workerId: userId
      }));
    }
  });
}

function handleDisconnect(clientId: string) {
  const client = streamClients.get(clientId);
  if (!client) return;

  if (client.role === 'viewer' && client.targetUserId) {
    const stream = workerStreams.get(client.targetUserId);
    if (stream) {
      stream.viewers.delete(clientId);
      notifyWorkerViewerCount(client.targetUserId);
    }
  } else if (client.role === 'worker') {
    const stream = workerStreams.get(client.userId);
    if (stream) {
      stream.viewers.forEach(viewerClientId => {
        const viewer = streamClients.get(viewerClientId);
        if (viewer?.ws?.readyState === WebSocket.OPEN) {
          viewer.ws.send(JSON.stringify({
            type: 'stream-ended',
            workerId: client.userId
          }));
        }
      });
      workerStreams.delete(client.userId);
    }
  }

  streamClients.delete(clientId);
  console.log(`Client ${clientId} disconnected from live stream`);
}

export function getActiveStreams(): { userId: string; viewerCount: number }[] {
  const streams: { userId: string; viewerCount: number }[] = [];
  
  for (const [userId, stream] of workerStreams) {
    const workerConnected = Array.from(streamClients.values()).some(
      c => c.role === 'worker' && c.userId === userId && c.ws.readyState === WebSocket.OPEN
    );
    
    if (workerConnected) {
      streams.push({
        userId,
        viewerCount: stream.viewers.size
      });
    }
  }
  
  return streams;
}
