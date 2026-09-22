import React, { useState } from 'react';
import { Search, Filter, RotateCcw, Eye, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { AutomationJob } from '../types/automation';

interface JobsListProps {
  jobs: AutomationJob[];
  onSelectJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
}

export const JobsList: React.FC<JobsListProps> = ({ jobs, onSelectJob, onRetryJob }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredJobs = jobs.filter((j) => {
    const matchesSearch =
      j.jobNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.propertyNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.deviceName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'RUNNING' &&
        ['CONNECTING', 'RUNNING', 'READING_PROPERTY', 'READING_LANDLORD', 'READING_PRICE', 'READING_PHOTOS', 'UPLOADING_PHOTOS', 'SAVING_DATABASE', 'VERIFYING'].includes(
          j.status
        )) ||
      j.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            placeholder="Search Property No. or Job No..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-900"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto scrollbar-none text-xs">
          {['ALL', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Job No.</th>
                <th className="py-3 px-4">Property No.</th>
                <th className="py-3 px-4">Device</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Step / Progress</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    No matching automation jobs found.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">{job.jobNo}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-red-950 px-2 py-0.5 bg-red-50 border border-red-200 rounded">
                        {job.propertyNo}
                      </span>
                    </td>
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
                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <div className="text-zinc-800 font-medium truncate">{job.currentStep}</div>
                      <div className="w-28 bg-zinc-200 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className="bg-red-900 h-full rounded-full"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 font-mono">
                      {new Date(job.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => onSelectJob(job.id)}
                        className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold rounded text-xs transition-colors"
                      >
                        Detail
                      </button>
                      <button
                        onClick={() => onRetryJob(job.id)}
                        title="Retry Job"
                        className="p-1 hover:bg-zinc-200 text-zinc-600 rounded transition-colors inline-flex items-center"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
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
