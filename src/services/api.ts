import { AutomationJob, AutomationLog, Device, JobOptions } from '../types/automation';

export const api = {
  // Health
  async getHealth() {
    const res = await fetch('/api/automation/health');
    return res.json();
  },

  // Devices
  async getDevices(): Promise<Device[]> {
    const res = await fetch('/api/automation/devices');
    return res.json();
  },

  async pairDevice(data: { name: string; os?: string; ipAddress?: string; primeDetected?: boolean }): Promise<Device> {
    const res = await fetch('/api/automation/devices/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async revokeDevice(id: string) {
    const res = await fetch(`/api/automation/devices/${id}/revoke`, { method: 'POST' });
    return res.json();
  },

  async testDevice(id: string) {
    const res = await fetch(`/api/automation/devices/${id}/test`, { method: 'POST' });
    return res.json();
  },

  // Jobs
  async getJobs(): Promise<AutomationJob[]> {
    const res = await fetch('/api/automation/jobs');
    return res.json();
  },

  async getJob(id: string): Promise<{ job: AutomationJob; logs: AutomationLog[] }> {
    const res = await fetch(`/api/automation/jobs/${id}`);
    return res.json();
  },

  async createJob(data: {
    propertyNo: string;
    deviceId?: string;
    options?: Partial<JobOptions>;
    dryRun?: boolean;
  }): Promise<AutomationJob> {
    const res = await fetch('/api/automation/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async pauseJob(id: string) {
    const res = await fetch(`/api/automation/jobs/${id}/pause`, { method: 'POST' });
    return res.json();
  },

  async resumeJob(id: string) {
    const res = await fetch(`/api/automation/jobs/${id}/resume`, { method: 'POST' });
    return res.json();
  },

  async cancelJob(id: string) {
    const res = await fetch(`/api/automation/jobs/${id}/cancel`, { method: 'POST' });
    return res.json();
  },

  async emergencyStop(id: string) {
    const res = await fetch(`/api/automation/jobs/${id}/emergency-stop`, { method: 'POST' });
    return res.json();
  },

  async retryJob(id: string): Promise<AutomationJob> {
    const res = await fetch(`/api/automation/jobs/${id}/retry`, { method: 'POST' });
    return res.json();
  },

  async createBatch(data: {
    propertyNos: string[];
    deviceId?: string;
    options?: Partial<JobOptions>;
    dryRun?: boolean;
  }): Promise<{ count: number; jobs: AutomationJob[] }> {
    const res = await fetch('/api/automation/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  // Logs
  async getLogs(jobId?: string): Promise<AutomationLog[]> {
    const url = jobId ? `/api/automation/logs?jobId=${encodeURIComponent(jobId)}` : '/api/automation/logs';
    const res = await fetch(url);
    return res.json();
  },

  // Synced Properties in PEAK Database
  async getProperties() {
    const res = await fetch('/api/automation/properties');
    return res.json();
  },

  async getProperty(propertyNo: string) {
    const res = await fetch(`/api/automation/properties/${encodeURIComponent(propertyNo)}`);
    return res.json();
  },
};
