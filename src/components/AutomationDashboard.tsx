import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Laptop,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { AutomationJob, Device } from '../types/automation';

interface AutomationDashboardProps {
  jobs: AutomationJob[];
  devices: Device[];
  onSelectJob: (jobId: string) => void;
  onQuickStart: (propertyNo: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const AutomationDashboard: React.FC<AutomationDashboardProps> = ({
  jobs,
  devices,
  onSelectJob,
  onQuickStart,
  onNavigateTab,
}) => {
  const totalJobs = jobs.length;
  const runningJobs = jobs.filter((j) =>
    ['CONNECTING', 'RUNNING', 'READING_PROPERTY', 'READING_LANDLORD', 'READING_PRICE', 'READING_PHOTOS', 'UPLOADING_PHOTOS', 'SAVING_DATABASE', 'VERIFYING'].includes(
      j.status
    )
  ).length;
  const completedJobs = jobs.filter((j) => j.status === 'COMPLETED').length;
  const failedJobs = jobs.filter((j) => j.status === 'FAILED').length;
  const onlineDevices = devices.filter((d) => d.status === 'ONLINE').length;

  const recentJobs = jobs.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* 1. Metric Counter Blocks */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Total Jobs</span>
          <p className="text-2xl font-black text-zinc-900 mt-1 font-mono">{totalJobs}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Running</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <p className="text-2xl font-black text-zinc-900 font-mono">{runningJobs}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Completed</span>
          <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">{completedJobs}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Failed</span>
          <p className="text-2xl font-black text-red-700 mt-1 font-mono">{failedJobs}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Devices Online</span>
          <p className="text-2xl font-black text-zinc-900 mt-1 font-mono">
            {onlineDevices} <span className="text-xs font-medium text-zinc-400">/ {devices.length}</span>
          </p>
        </div>
      </div>

      {/* 2. Quick Launch Card for Test Cases */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 text-white rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-red-800 text-white text-[11px] font-bold tracking-wider uppercase">
                ONE-CLICK MVP TEST
              </span>
              <h3 className="text-sm font-bold tracking-wide">Prime Global Asset Instant Automation</h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Automates Prime Global Asset window detection, search, landlord contact capture, and 12-photo sync
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onQuickStart('VN568')}
              className="text-xs font-bold px-3.5 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Run VN568 Test Case
            </button>
            <button
              onClick={() => onQuickStart('KT324')}
              className="text-xs font-semibold px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors"
            >
              Run KT324
            </button>
          </div>
        </div>
      </div>

      {/* 3. Recent Jobs Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">Recent Automation Jobs</h3>
            <p className="text-xs text-zinc-500">Live feed of executed and queued desktop pipelines</p>
          </div>
          <button
            onClick={() => onNavigateTab('jobs')}
            className="text-xs font-bold text-red-900 hover:text-red-950 flex items-center gap-1"
          >
            View All Jobs
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Job No.</th>
                <th className="py-3 px-4">Property No.</th>
                <th className="py-3 px-4">Device</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Progress</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {recentJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-400">
                    No automation jobs executed yet. Enter a Property No. to begin.
                  </td>
                </tr>
              ) : (
                recentJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">{job.jobNo}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-red-900">{job.propertyNo}</td>
                    <td className="py-3.5 px-4 text-zinc-700">{job.deviceName || 'Office PC'}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          job.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : job.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : job.status === 'PAUSED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-24 bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-red-900 h-full rounded-full"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 font-mono">
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onSelectJob(job.id)}
                        className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 px-2 py-1 bg-zinc-100 rounded hover:bg-zinc-200 transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
