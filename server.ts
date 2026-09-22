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

// Store connected WebSocket clients
const connectedClients = new Set<WebSocket>();

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

// Instantiate Automation Engine
const engine = new AutomationEngine(broadcast);

// WebSocket Connection Management
wss.on('connection', (ws, req) => {
  connectedClients.add(ws);

  // Send initial handshake state
  ws.send(
    JSON.stringify({
      event: 'connected',
      payload: {
        timestamp: new Date().toISOString(),
        devices: automationStore.getDevices(),
      },
    })
  );

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      const { event, payload } = parsed;

      if (event === 'device.heartbeat') {
        const device = automationStore.updateDeviceHeartbeat(payload?.id || 'dev-office-pc-01', payload?.primeDetected);
        broadcast('device.heartbeat', { device });
      } else if (event === 'job.start_request') {
        engine.runJob(payload.jobId);
      }
    } catch (e) {
      console.error('WebSocket parse error:', e);
    }
  });

  ws.on('close', () => {
    connectedClients.delete(ws);
  });

  ws.on('error', (err) => {
    console.error('WebSocket client error:', err);
    connectedClients.delete(ws);
  });
});

// Periodic device heartbeat simulator to maintain "Office PC" live state
setInterval(() => {
  automationStore.updateDeviceHeartbeat('dev-office-pc-01', true);
  broadcast('device.heartbeat', {
    deviceId: 'dev-office-pc-01',
    status: 'ONLINE',
    primeDetected: true,
    lastHeartbeat: new Date().toISOString(),
  });
}, 10000);

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
  broadcast('device.disconnected', { id: req.params.id });
  res.json({ success: true, revoked });
});

app.post('/api/automation/devices/:id/test', (req, res) => {
  const device = automationStore.getDeviceById(req.params.id);
  if (!device) {
    return res.status(404).json({ error: 'Device not found' });
  }
  automationStore.updateDeviceHeartbeat(device.id, true);
  res.json({
    success: true,
    latencyMs: 14,
    device: {
      ...device,
      status: 'ONLINE',
      primeDetected: true,
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

  const job = automationStore.createJob({
    propertyNo,
    deviceId: deviceId || 'dev-office-pc-01',
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

  // Automatically start job
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

  const createdJobs = [];
  for (const pNo of propertyNos) {
    const cleanNo = String(pNo).trim();
    if (cleanNo) {
      const job = automationStore.createJob({
        propertyNo: cleanNo,
        deviceId: deviceId || 'dev-office-pc-01',
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

  // Sequentially or queued run
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

// 6. Properties in Database
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
