import React, { useState } from 'react';
import { Search, Download, Terminal, Filter, Eye } from 'lucide-react';
import { AutomationLog } from '../types/automation';

interface AutomationLogsProps {
  logs: AutomationLog[];
}

export const AutomationLogs: React.FC<AutomationLogsProps> = ({ logs }) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.jobId && log.jobId.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesLevel && matchesSearch;
  });

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `peak_automation_logs_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
            <input
              type="text"
              placeholder="Search action or message..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 border border-zinc-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-900"
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            {['ALL', 'INFO', 'SUCCESS', 'WARNING', 'ERROR'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  filterLevel === lvl
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleExportJSON}
          className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export JSON
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Message</th>
                <th className="py-3 px-4">Job ID</th>
                <th className="py-3 px-4 text-right">Snap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400 font-sans">
                    No logs recorded.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                          log.level === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.level === 'ERROR'
                            ? 'bg-red-100 text-red-800'
                            : log.level === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-900">{log.action}</td>
                    <td className="py-3 px-4 text-zinc-600 max-w-md truncate">{log.message}</td>
                    <td className="py-3 px-4 text-zinc-400 text-[10px]">{log.jobId?.slice(0, 8)}...</td>
                    <td className="py-3 px-4 text-right">
                      {log.screenshot ? (
                        <button
                          onClick={() => setSelectedScreenshot(log.screenshot!)}
                          className="p-1 hover:bg-zinc-200 text-zinc-700 rounded"
                          title="View Screenshot"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-zinc-300">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screenshot Preview Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedScreenshot(null)}>
          <div className="bg-zinc-900 p-4 rounded-xl max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center text-white mb-2 text-xs">
              <span>Log Capture Frame</span>
              <button onClick={() => setSelectedScreenshot(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <img src={selectedScreenshot} alt="Log screenshot" className="w-full rounded border border-zinc-800" />
          </div>
        </div>
      )}
    </div>
  );
};
