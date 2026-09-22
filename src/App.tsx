import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { PropertyAutomation } from './components/PropertyAutomation';
import { AutomationDashboard } from './components/AutomationDashboard';
import { AutomationMonitor } from './components/AutomationMonitor';
import { JobsList } from './components/JobsList';
import { JobDetailModal } from './components/JobDetailModal';
import { BatchAutomation } from './components/BatchAutomation';
import { DeviceManagement } from './components/DeviceManagement';
import { AutomationLogs } from './components/AutomationLogs';
import { SyncedProperties } from './components/SyncedProperties';
import { api } from './services/api';
import { useWebSocket } from './services/useWebSocket';
import { AutomationJob, AutomationLog, Device } from './types/automation';
import { FileSpreadsheet, Laptop } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('batch');
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [selectedJobIdForModal, setSelectedJobIdForModal] = useState<string | null>(null);
  const [health, setHealth] = useState({
    database: 'OK',
    storage: 'OK',
    server: 'OK',
    agent: 'ONLINE',
  });

  // Handle incoming live WebSocket events
  const handleWebSocketEvent = useCallback((event: string, payload: any) => {
    if (event === 'job.created') {
      setJobs((prev) => [payload, ...prev.filter((j) => j.id !== payload.id)]);
      setActiveJobId(payload.id);
    } else if (event === 'job.progress') {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === payload.jobId
            ? {
                ...j,
                progress: payload.progress,
                currentStep: payload.currentStep,
                status: payload.status,
              }
            : j
        )
      );
    } else if (event === 'job.log') {
      setLogs((prev) => [payload, ...prev.slice(0, 99)]);
    } else if (event === 'job.completed') {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === payload.jobId
            ? {
                ...j,
                status: 'COMPLETED',
                progress: 100,
                completedAt: new Date().toISOString(),
                resultData: {
                  property: payload.property,
                  landlord: payload.landlord,
                  photos: payload.photos || [],
                  photosCount: payload.photosCount || 12,
                },
              }
            : j
        )
      );
    } else if (event === 'job.failed' || event === 'job.cancelled') {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === payload.jobId
            ? {
                ...j,
                status: event === 'job.failed' ? 'FAILED' : 'CANCELLED',
                error: payload.error,
              }
            : j
        )
      );
    } else if (event === 'device.heartbeat' || event === 'device.connected') {
      setDevices((prev) => {
        const found = prev.find((d) => d.id === payload.deviceId || d.id === payload.id);
        if (found) {
          return prev.map((d) =>
            d.id === found.id
              ? { ...d, status: 'ONLINE', lastHeartbeat: new Date().toISOString() }
              : d
          );
        }
        return prev;
      });
    }
  }, []);

  const { isConnected: wsConnected, activeScreenshot } = useWebSocket(handleWebSocketEvent);

  // Initial Data Fetch
  const loadInitialData = useCallback(async () => {
    try {
      const [healthData, devicesData, jobsData, logsData] = await Promise.all([
        api.getHealth(),
        api.getDevices(),
        api.getJobs(),
        api.getLogs(),
      ]);

      if (healthData && healthData.components) {
        setHealth(healthData.components);
      }
      if (devicesData) setDevices(devicesData);
      if (jobsData) {
        setJobs(jobsData);
        // Find active job if any
        const active = jobsData.find((j: AutomationJob) =>
          ['CONNECTING', 'RUNNING', 'READING_PROPERTY', 'READING_LANDLORD', 'READING_PRICE', 'READING_PHOTOS', 'UPLOADING_PHOTOS', 'SAVING_DATABASE', 'VERIFYING'].includes(
            j.status
          )
        );
        if (active) setActiveJobId(active.id);
        else if (jobsData.length > 0) setActiveJobId(jobsData[0].id);
      }
      if (logsData) setLogs(logsData);
    } catch (err) {
      console.error('Initial data load error:', err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const activeJob = jobs.find((j) => j.id === activeJobId) || jobs[0] || null;

  const handleQuickStart = async (propertyNo: string) => {
    setActiveTab('automation');
    try {
      const created = await api.createJob({
        propertyNo,
        deviceId: devices[0]?.id || 'dev-office-pc-01',
      });
      setJobs((prev) => [created, ...prev]);
      setActiveJobId(created.id);
    } catch (err) {
      console.error('Quick start failed:', err);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const newJob = await api.retryJob(jobId);
      setJobs((prev) => [newJob, ...prev]);
      setActiveJobId(newJob.id);
      setActiveTab('automation');
    } catch (err) {
      console.error('Retry job failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 flex flex-col font-sans selection:bg-red-900 selection:text-white">
      {/* Header & Submenu */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onlineDevicesCount={devices.filter((d) => d.status === 'ONLINE').length}
        health={health}
        wsConnected={wsConnected}
        onRefresh={loadInitialData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Mode Switcher Bar */}
        <div className="mb-6 bg-white p-1.5 rounded-xl border border-zinc-200 shadow-2xs flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'batch'
                  ? 'bg-red-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              โฟลว์นำเข้าผ่าน Excel (Batch Workflow)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('automation')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'automation'
                  ? 'bg-red-900 text-white shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Laptop className="w-4 h-4" />
              สั่งการรายทรัพย์ (Single Mode: VN568)
            </button>
          </div>

          <div className="flex items-center gap-2 pr-2 text-xs">
            <span className="text-[11px] font-medium text-zinc-500">
              Target Desktop: <strong className="text-zinc-900">Prime Global Asset (Windows)</strong>
            </span>
          </div>
        </div>

        {activeTab === 'automation' && (
          <PropertyAutomation
            devices={devices}
            onJobCreated={(job) => {
              setJobs((prev) => [job, ...prev]);
              setActiveJobId(job.id);
            }}
            onViewJob={(jobId) => setSelectedJobIdForModal(jobId)}
            activeJob={activeJob}
            onViewMonitor={() => setActiveTab('monitor')}
            onRefreshData={loadInitialData}
          />
        )}

        {activeTab === 'dashboard' && (
          <AutomationDashboard
            jobs={jobs}
            devices={devices}
            onSelectJob={(id) => setSelectedJobIdForModal(id)}
            onQuickStart={handleQuickStart}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'monitor' && (
          <AutomationMonitor
            activeJob={activeJob}
            activeScreenshot={activeScreenshot}
            logs={logs}
            onRefreshScreenshot={loadInitialData}
          />
        )}

        {activeTab === 'jobs' && (
          <JobsList
            jobs={jobs}
            onSelectJob={(id) => setSelectedJobIdForModal(id)}
            onRetryJob={handleRetryJob}
          />
        )}

        {activeTab === 'batch' && (
          <BatchAutomation
            devices={devices}
            onBatchStarted={() => {
              loadInitialData();
            }}
            onNavigateToProperties={() => setActiveTab('properties')}
            onSelectJobDetail={(id) => setSelectedJobIdForModal(id)}
          />
        )}

        {activeTab === 'properties' && <SyncedProperties />}

        {activeTab === 'devices' && (
          <DeviceManagement devices={devices} onRefresh={loadInitialData} />
        )}

        {activeTab === 'logs' && <AutomationLogs logs={logs} />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-zinc-200 py-4 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900">PEAK AUTOMATION ENGINE</span>
            <span>•</span>
            <span>Windows UI Automation Core v1.4</span>
            <span>•</span>
            <span>Test Case: VN568 (12 Photos Verified)</span>
          </div>
          <p className="text-zinc-400 font-mono text-[11px]">
            Target: Prime Global Asset Desktop Client • Supabase Storage
          </p>
        </div>
      </footer>

      {/* Job Detail Modal */}
      {selectedJobIdForModal && (
        <JobDetailModal
          jobId={selectedJobIdForModal}
          onClose={() => setSelectedJobIdForModal(null)}
          onRetry={handleRetryJob}
        />
      )}
    </div>
  );
}
