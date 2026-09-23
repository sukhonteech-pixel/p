import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { automationStore } from './server/store';
import { AutomationEngine } from './server/engine';

const app = express();
const PORT = 3000;

app.use(express.json());

// Set up HTTP Server and WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Store all connected WebSocket clients (dashboard UI + desktop agents)
const connectedClients = new Set<WebSocket>();

// Agent device socket registry (device.id -> WebSocket) and reverse mapping
const agentSockets = new Map<string, WebSocket>();
const socketToDevice = new Map<WebSocket, string>();

function broadcast(event: string, payload: any) {
  const message = JSON.stringify({ event, payload });
  connectedClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (err) {
        console.error('Error broadcasting WS message:', err);
      }
    }
  });
}

// Instantiate Automation Engine with real agent socket getter
const engine = new AutomationEngine(broadcast, (deviceId: string) => {
  return agentSockets.get(deviceId);
});

// WebSocket Connection Management
wss.on('connection', (ws, req) => {
  connectedClients.add(ws);

  // Parse connection metadata from URL and headers
  const reqUrl = req.url || '';
  const host = req.headers.host || 'localhost';
  let clientType = 'dashboard';
  let queryDeviceId: string | null = null;

  try {
    const parsedUrl = new URL(reqUrl, `http://${host}`);
    clientType = parsedUrl.searchParams.get('clientType') || 'dashboard';
    queryDeviceId = parsedUrl.searchParams.get('deviceId');
  } catch {
    // fallback
  }

  const tokenHeader = req.headers['x-device-token'];
  const nameHeader = req.headers['x-device-name'];
  if (tokenHeader || nameHeader) {
    clientType = 'agent';
  }

  // If connected as a Windows Agent
  if (clientType === 'agent') {
    const deviceId = queryDeviceId || 'dev-office-pc-01';
    agentSockets.set(deviceId, ws);
    socketToDevice.set(ws, deviceId);
    const updatedDevice = automationStore.updateDeviceHeartbeat(deviceId, true);
    console.log(`[WS] Windows Agent connected: ${deviceId} (${updatedDevice?.name || 'Device'})`);
    broadcast('device.connected', { deviceId, device: updatedDevice });
    broadcast('device.heartbeat', { device: updatedDevice, deviceId, status: 'ONLINE', primeDetected: true });
  }

  // Send initial handshake state to the connected client
  ws.send(
    JSON.stringify({
      event: 'connected',
      payload: {
        timestamp: new Date().toISOString(),
        devices: automationStore.getDevices(),
        clientType,
      },
    })
  );

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      const { event, payload } = parsed;

      // 1. Agent Handshake / Registration
      if (event === 'agent.handshake') {
        const deviceId = payload?.deviceId || payload?.id || queryDeviceId || 'dev-office-pc-01';
        agentSockets.set(deviceId, ws);
        socketToDevice.set(ws, deviceId);
        const device = automationStore.updateDeviceHeartbeat(deviceId, payload?.primeDetected ?? true);
        console.log(`[Agent Handshake] Device ${deviceId} paired and status is ONLINE`);
        broadcast('device.connected', { deviceId, device });
        broadcast('device.heartbeat', { device, deviceId, status: 'ONLINE', primeDetected: device?.primeDetected });
      }

      // 2. Real Heartbeat from Windows Agent
      else if (event === 'device.heartbeat') {
        const deviceId = payload?.deviceId || payload?.id || socketToDevice.get(ws) || 'dev-office-pc-01';
        agentSockets.set(deviceId, ws);
        socketToDevice.set(ws, deviceId);
        const device = automationStore.updateDeviceHeartbeat(deviceId, payload?.primeDetected ?? true);
        broadcast('device.heartbeat', { device, deviceId, status: 'ONLINE', primeDetected: device?.primeDetected });
      }

      // 3. Real Agent Execution Events
      else if (event === 'agent.step' || event === 'job.progress') {
        engine.handleAgentStep(payload);
      } else if (event === 'agent.log' || event === 'job.log') {
        engine.handleAgentLog(payload);
      } else if (event === 'agent.data' || event === 'job.screenshot') {
        engine.handleAgentData(payload);
      } else if (event === 'agent.completed' || event === 'job.completed') {
        engine.handleAgentCompleted(payload);
      } else if (event === 'agent.error' || event === 'job.failed') {
        engine.handleAgentFailed(payload);
      }

      // 4. Dashboard User Actions
      else if (event === 'job.start_request') {
        engine.runJob(payload.jobId);
      }
    } catch (e) {
      console.error('WebSocket parse error:', e);
    }
  });

  // Handle Disconnect
  const handleDisconnect = () => {
    connectedClients.delete(ws);
    const mappedDeviceId = socketToDevice.get(ws);
    if (mappedDeviceId) {
      agentSockets.delete(mappedDeviceId);
      socketToDevice.delete(ws);
      const offlineDev = automationStore.setDeviceOffline(mappedDeviceId);
      console.log(`[WS] Windows Agent disconnected (${mappedDeviceId}). Status set to OFFLINE.`);
      if (offlineDev) {
        broadcast('device.offline', { deviceId: mappedDeviceId, device: offlineDev });
        broadcast('device.heartbeat', { device: offlineDev, deviceId: mappedDeviceId, status: 'OFFLINE' });
      }
    }
  };

  ws.on('close', handleDisconnect);
  ws.on('error', (err) => {
    console.error('WebSocket client error:', err);
    handleDisconnect();
  });
});

// Real Heartbeat Timeout Monitor: Check every 3 seconds
// If no heartbeat from agent for > 15 seconds, mark device OFFLINE
setInterval(() => {
  const timedOutDevices = automationStore.checkHeartbeatTimeouts(15000);
  for (const dev of timedOutDevices) {
    console.log(`[Heartbeat Timeout] Device ${dev.id} timed out (>15s without heartbeat). Marked OFFLINE.`);
    const socket = agentSockets.get(dev.id);
    if (socket) {
      agentSockets.delete(dev.id);
      socketToDevice.delete(socket);
    }
    broadcast('device.offline', { deviceId: dev.id, device: dev });
    broadcast('device.heartbeat', { device: dev, deviceId: dev.id, status: 'OFFLINE' });
  }
}, 3000);

// ==============================================================================
// REST API ENDPOINTS
// ==============================================================================

// 1. Health Check
app.get('/api/automation/health', (req, res) => {
  const devices = automationStore.getDevices();
  const onlineDevices = devices.filter((d) => d.status === 'ONLINE');
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    components: {
      database: 'OK',
      storage: 'OK',
      server: 'OK',
      webSocket: connectedClients.size > 0 ? 'ACTIVE' : 'IDLE',
      agent: onlineDevices.length > 0 ? 'ONLINE' : 'OFFLINE',
      queue: 'READY',
    },
    onlineDevicesCount: onlineDevices.length,
    activeJobsCount: automationStore.getJobs().filter((j) => ['RUNNING', 'CONNECTING', 'READING_PROPERTY'].includes(j.status)).length,
  });
});

// 2. Devices
app.get('/api/automation/devices', (req, res) => {
  res.json(automationStore.getDevices());
});

app.post('/api/automation/devices/pair', (req, res) => {
  const { name, os, ipAddress, primeDetected } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Device name is required' });
  }
  const device = automationStore.pairDevice({ name, os, ipAddress, primeDetected });
  broadcast('device.connected', device);
  res.status(201).json(device);
});

app.post('/api/automation/devices/:id/revoke', (req, res) => {
  const revoked = automationStore.revokeDevice(req.params.id);
  if (!revoked) {
    return res.status(404).json({ error: 'Device not found' });
  }
  const socket = agentSockets.get(req.params.id);
  if (socket) {
    agentSockets.delete(req.params.id);
    socketToDevice.delete(socket);
  }
  broadcast('device.disconnected', { id: req.params.id });
  res.json({ success: true, revoked });
});

app.post('/api/automation/devices/:id/test', (req, res) => {
  const device = automationStore.getDeviceById(req.params.id);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }
  const socket = agentSockets.get(device.id);
  const isOnline = device.status === 'ONLINE' && socket && socket.readyState === WebSocket.OPEN;

  res.json({
    success: isOnline,
    latencyMs: isOnline ? 12 : null,
    device: {
      ...device,
      status: isOnline ? 'ONLINE' : 'OFFLINE',
    },
  });
});

// 3. Jobs Management
app.get('/api/automation/jobs', (req, res) => {
  res.json(automationStore.getJobs());
});

app.post('/api/automation/jobs', (req, res) => {
  const { propertyNo, deviceId, options, dryRun } = req.body;
  if (!propertyNo) {
    return res.status(400).json({ error: 'propertyNo is required' });
  }

  const targetDeviceId = deviceId || 'dev-office-pc-01';
  const device = automationStore.getDeviceById(targetDeviceId);
  const agentWs = agentSockets.get(targetDeviceId);
  const isAgentOnline = device?.status === 'ONLINE' && agentWs && agentWs.readyState === WebSocket.OPEN;

  if (!isAgentOnline) {
    return res.status(400).json({
      error: `ไม่สามารถเริ่ม Automation ได้: Windows Agent (${device?.name || targetDeviceId}) ออฟไลน์ กรุณาเปิดโปรแกรม PEAK Automation Agent บน Windows ก่อนเริ่มระบบ`,
      errorCode: 'AGENT_OFFLINE',
    });
  }

  const job = automationStore.createJob({
    propertyNo,
    deviceId: targetDeviceId,
    options: options || {
      propertyInfo: true,
      landlordInfo: true,
      priceInfo: true,
      photos: true,
      videos: false,
      occupancyStatus: false,
      followup: false,
      viewingRecords: false,
    },
    dryRun: !!dryRun,
  });

  broadcast('job.created', job);

  // Run job via Automation Engine
  engine.runJob(job.id);

  res.status(201).json(job);
});

app.get('/api/automation/jobs/:id', (req, res) => {
  const job = automationStore.getJobById(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  const logs = automationStore.getLogs(job.id);
  res.json({ job, logs });
});

app.post('/api/automation/jobs/:id/start', (req, res) => {
  const job = automationStore.getJobById(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  engine.runJob(job.id);
  res.json({ success: true, message: 'Job execution started' });
});

app.post('/api/automation/jobs/:id/pause', (req, res) => {
  const paused = engine.pauseJob(req.params.id);
  res.json({ success: paused });
});

app.post('/api/automation/jobs/:id/resume', (req, res) => {
  const resumed = engine.resumeJob(req.params.id);
  res.json({ success: resumed });
});

app.post('/api/automation/jobs/:id/cancel', (req, res) => {
  const cancelled = engine.cancelJob(req.params.id, false);
  res.json({ success: cancelled });
});

app.post('/api/automation/jobs/:id/emergency-stop', (req, res) => {
  const stopped = engine.cancelJob(req.params.id, true);
  res.json({ success: stopped, message: 'Emergency halt signal sent to agent' });
});

app.post('/api/automation/jobs/:id/retry', (req, res) => {
  const oldJob = automationStore.getJobById(req.params.id);
  if (!oldJob) {
    return res.status(404).json({ error: 'Job not found' });
  }
  const newJob = automationStore.createJob({
    propertyNo: oldJob.propertyNo,
    deviceId: oldJob.deviceId,
    options: oldJob.options,
    dryRun: oldJob.dryRun,
  });
  engine.runJob(newJob.id);
  res.status(201).json(newJob);
});

// 4. Batch Jobs
app.post('/api/automation/batch', (req, res) => {
  const { propertyNos, deviceId, options, dryRun } = req.body;
  if (!propertyNos || !Array.isArray(propertyNos) || propertyNos.length === 0) {
    return res.status(400).json({ error: 'propertyNos array is required' });
  }

  const targetDeviceId = deviceId || 'dev-office-pc-01';
  const device = automationStore.getDeviceById(targetDeviceId);
  const agentWs = agentSockets.get(targetDeviceId);
  const isAgentOnline = device?.status === 'ONLINE' && agentWs && agentWs.readyState === WebSocket.OPEN;

  if (!isAgentOnline) {
    return res.status(400).json({
      error: `ไม่สามารถเริ่ม Batch Automation ได้: Windows Agent (${device?.name || targetDeviceId}) ออฟไลน์ กรุณาเปิดโปรแกรม PEAK Automation Agent บน Windows ก่อนเริ่มระบบ`,
      errorCode: 'AGENT_OFFLINE',
    });
  }

  const createdJobs = [];
  for (const pNo of propertyNos) {
    const cleanNo = String(pNo).trim();
    if (cleanNo) {
      const job = automationStore.createJob({
        propertyNo: cleanNo,
        deviceId: targetDeviceId,
        options: options || {
          propertyInfo: true,
          landlordInfo: true,
          priceInfo: true,
          photos: true,
          videos: false,
          occupancyStatus: false,
          followup: false,
          viewingRecords: false,
        },
        dryRun: !!dryRun,
      });
      createdJobs.push(job);
    }
  }

  // Sequentially execute jobs through engine
  (async () => {
    for (const job of createdJobs) {
      await engine.runJob(job.id);
    }
  })();

  res.status(201).json({ count: createdJobs.length, jobs: createdJobs });
});

// 5. Logs
app.get('/api/automation/logs', (req, res) => {
  const { jobId } = req.query;
  res.json(automationStore.getLogs(jobId as string | undefined));
});

// 6. Properties in Synced Database
app.get('/api/automation/properties', (req, res) => {
  res.json(automationStore.getAllProperties());
});

app.get('/api/automation/properties/:propertyNo', (req, res) => {
  const data = automationStore.getProperty(req.params.propertyNo);
  if (!data) {
    return res.status(404).json({ error: 'Property not found in synced database' });
  }
  res.json(data);
});

// ==============================================================================
// VITE MIDDLEWARE OR STATIC SERVER
// ==============================================================================
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[PEAK Automation Server] Running on http://0.0.0.0:${PORT}`);
  });
}

start();
