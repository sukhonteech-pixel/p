import React from 'react';
import { ShieldCheck, Cpu, HardDrive, Database, Activity, RefreshCw } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onlineDevicesCount: number;
  health: {
    database: string;
    storage: string;
    server: string;
    agent: string;
  };
  wsConnected: boolean;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onlineDevicesCount,
  health,
  wsConnected,
  onRefresh,
}) => {
  const navItems = [
    { id: 'automation', label: 'Property Automation' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'monitor', label: 'Live Monitor' },
    { id: 'jobs', label: 'Jobs & History' },
    { id: 'batch', label: 'Batch Excel Automation' },
    { id: 'properties', label: 'Synced Properties' },
    { id: 'devices', label: 'Devices' },
    { id: 'logs', label: 'Logs' },
  ];

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-40 shadow-xs">
      {/* Top Status Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-red-900 to-red-950 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-zinc-900 text-lg uppercase">
                  PEAK
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-900 tracking-wide">
                  AUTOMATION
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-medium">
                Prime Global Asset Desktop Orchestration Suite
              </p>
            </div>
          </div>

          {/* System Health Indicators */}
          <div className="hidden md:flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>Database: {health.database}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700">
              <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
              <span>Storage: {health.storage}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700">
              <Cpu className="w-3.5 h-3.5 text-emerald-600" />
              <span>Agent: {health.agent}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-700">
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span>{wsConnected ? 'Live WebSocket' : 'Connecting...'}</span>
            </div>

            <button
              onClick={onRefresh}
              title="Refresh Data"
              className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-600 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Submenu */}
      <div className="border-t border-zinc-100 bg-zinc-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-all ${
                    active
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};
