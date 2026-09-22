import React from 'react';
import { Monitor, Activity, ShieldCheck, RefreshCw, Terminal, Layers } from 'lucide-react';
import { AutomationJob, AutomationLog } from '../types/automation';

interface AutomationMonitorProps {
  activeJob: AutomationJob | null;
  activeScreenshot: string | null;
  logs: AutomationLog[];
  onRefreshScreenshot: () => void;
}

export const AutomationMonitor: React.FC<AutomationMonitorProps> = ({
  activeJob,
  activeScreenshot,
  logs,
  onRefreshScreenshot,
}) => {
  const currentAction = logs[0]?.action || 'Idle / Waiting for Command';
  const currentStep = activeJob?.currentStep || 'Standby';
  const progress = activeJob?.progress || 0;
  const propertyNo = activeJob?.propertyNo || 'VN568';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-red-900 text-white">
                <Monitor className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-zinc-900">Automation Live Screen Monitor</h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Secure frame captures from Windows Desktop UI Automation Agent. Low bandwidth mode active.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Role: Authorized Admin
            </span>
            <button
              onClick={onRefreshScreenshot}
              className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Capture Frame
            </button>
          </div>
        </div>

        {/* Current Action Indicators */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
            <span className="text-[11px] font-medium text-zinc-500">Current Action</span>
            <p className="text-xs font-bold text-red-950 mt-0.5 truncate">{currentAction}</p>
          </div>

          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
            <span className="text-[11px] font-medium text-zinc-500">Current Step</span>
            <p className="text-xs font-bold text-zinc-900 mt-0.5 truncate">{currentStep}</p>
          </div>

          <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
            <span className="text-[11px] font-medium text-zinc-500">Target Property</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-xs font-mono font-bold text-zinc-900">{propertyNo}</span>
              <span className="text-xs font-mono font-bold text-red-900">{progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Screen Monitor Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Screen Capture */}
        <div className="lg:col-span-2 bg-zinc-950 rounded-xl p-3 border border-zinc-800 shadow-md">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-zinc-200 font-bold">PRIME GLOBAL ASSET [DESKTOP AGENT]</span>
            </div>
            <span className="font-mono text-zinc-500">Scale: 100% | UI Automation Tree</span>
          </div>

          <div className="mt-3 relative rounded-lg overflow-hidden bg-black flex items-center justify-center min-h-[420px]">
            {activeScreenshot ? (
              <img
                src={activeScreenshot}
                alt="Prime Global Asset Desktop Screenshot"
                className="w-full h-auto object-contain rounded"
              />
            ) : (
              <div className="text-center p-8 text-zinc-500">
                <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-xs font-semibold">Waiting for active window capture...</p>
                <p className="text-[11px] text-zinc-600 mt-1">
                  Start an automation job to stream Prime Global Asset screen frames
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Live Log Stream */}
        <div className="bg-zinc-900 text-zinc-200 rounded-xl p-4 border border-zinc-800 shadow-md flex flex-col h-[480px]">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 text-xs">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-bold font-mono text-zinc-100">Live Automation Stream</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">{logs.length} events</span>
          </div>

          <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1 text-[11px] font-mono scrollbar-thin">
            {logs.length === 0 ? (
              <p className="text-zinc-500 italic text-center pt-8">No live events captured yet.</p>
            ) : (
              logs.slice(0, 30).map((log) => (
                <div
                  key={log.id}
                  className="p-2 rounded bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span
                      className={`font-bold uppercase ${
                        log.level === 'SUCCESS'
                          ? 'text-emerald-400'
                          : log.level === 'ERROR'
                          ? 'text-red-400'
                          : log.level === 'WARNING'
                          ? 'text-amber-400'
                          : 'text-sky-400'
                      }`}
                    >
                      {log.level}
                    </span>
                  </div>
                  <div className="text-zinc-200 font-bold mt-0.5">{log.action}</div>
                  <p className="text-zinc-400 text-[10px] mt-0.5 leading-relaxed">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
