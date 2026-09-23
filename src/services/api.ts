import { AutomationJob, AutomationLog, Device, JobOptions } from '../types/automation';

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: any;

  constructor(message: string, status: number, code?: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err: any) {
    throw new ApiError(
      `ไม่สามารถเชื่อมต่อ Server ได้: ${err?.message || 'Network request failed'}`,
      0,
      'NETWORK_ERROR'
    );
  }

  let body: any = null;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      body = await res.json();
    } catch {
      body = null;
    }
  } else {
    try {
      body = await res.text();
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const errorMsg =
      (body && typeof body === 'object' && (body.message || body.error)) ||
      res.statusText ||
      `HTTP Error ${res.status}`;
    const errorCode =
      body && typeof body === 'object' && typeof body.error === 'string'
        ? body.error
        : `HTTP_${res.status}`;
    throw new ApiError(errorMsg, res.status, errorCode, body);
  }

  return body as T;
}

export const api = {
  // Health
  async getHealth() {
    return request<any>('/api/automation/health');
  },

  // Devices
  async getDevices(): Promise<Device[]> {
    return request<Device[]>('/api/automation/devices');
  },

  async pairDevice(data: { name: string; os?: string; ipAddress?: string; primeDetected?: boolean }): Promise<Device> {
    return request<Device>('/api/automation/devices/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async revokeDevice(id: string) {
    return request<any>(`/api/automation/devices/${id}/revoke`, { method: 'POST' });
  },

  async testDevice(id: string) {
    return request<any>(`/api/automation/devices/${id}/test`, { method: 'POST' });
  },

  // Jobs
  async getJobs(): Promise<AutomationJob[]> {
    return request<AutomationJob[]>('/api/automation/jobs');
  },

  async getJob(id: string): Promise<{ job: AutomationJob; logs: AutomationLog[] }> {
    return request<{ job: AutomationJob; logs: AutomationLog[] }>(`/api/automation/jobs/${id}`);
  },

  async createJob(data: {
    propertyNo: string;
    deviceId?: string;
    options?: Partial<JobOptions>;
    dryRun?: boolean;
  }): Promise<AutomationJob> {
    return request<AutomationJob>('/api/automation/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async pauseJob(id: string) {
    return request<any>(`/api/automation/jobs/${id}/pause`, { method: 'POST' });
  },

  async resumeJob(id: string) {
    return request<any>(`/api/automation/jobs/${id}/resume`, { method: 'POST' });
  },

  async cancelJob(id: string) {
    return request<any>(`/api/automation/jobs/${id}/cancel`, { method: 'POST' });
  },

  async emergencyStop(id: string) {
    return request<any>(`/api/automation/jobs/${id}/emergency-stop`, { method: 'POST' });
  },

  async retryJob(id: string): Promise<AutomationJob> {
    return request<AutomationJob>(`/api/automation/jobs/${id}/retry`, { method: 'POST' });
  },

  async createBatch(data: {
    propertyNos: string[];
    deviceId?: string;
    options?: Partial<JobOptions>;
    dryRun?: boolean;
  }): Promise<{ count: number; jobs: AutomationJob[] }> {
    const result = await request<{ count: number; jobs: AutomationJob[] }>('/api/automation/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!result || !Array.isArray(result.jobs) || result.jobs.length === 0 || !result.count || result.count === 0) {
      throw new ApiError(
        'การสร้าง Batch ไม่สำเร็จ: ไม่ได้รับรายการงานที่พร้อมประมวลผลจากเซิร์ฟเวอร์',
        500,
        'EMPTY_BATCH_RESPONSE',
        result
      );
    }

    return result;
  },

  // Logs
  async getLogs(jobId?: string): Promise<AutomationLog[]> {
    const url = jobId ? `/api/automation/logs?jobId=${encodeURIComponent(jobId)}` : '/api/automation/logs';
    return request<AutomationLog[]>(url);
  },

  // Synced Properties in PEAK Database
  async getProperties() {
    return request<any>('/api/automation/properties');
  },

  async getProperty(propertyNo: string) {
    return request<any>(`/api/automation/properties/${encodeURIComponent(propertyNo)}`);
  },
};

