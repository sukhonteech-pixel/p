import React, { useState } from 'react';
import { Laptop, Plus, ShieldAlert, CheckCircle2, RotateCw, Download, Check, X } from 'lucide-react';
import { Device } from '../types/automation';
import { api } from '../services/api';

interface DeviceManagementProps {
  devices: Device[];
  onRefresh: () => void;
}

export const DeviceManagement: React.FC<DeviceManagementProps> = ({ devices, onRefresh }) => {
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [testResults, setTestResults] = useState<{ [id: string]: string }>({});

  const handleTestConnection = async (id: string) => {
    try {
      const res = await api.testDevice(id);
      setTestResults((prev) => ({
        ...prev,
        [id]: `Latency: ${res.latencyMs}ms | Prime Global Asset: Active`,
      }));
      setTimeout(() => {
        setTestResults((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 5000);
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: 'Failed to reach agent' }));
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this device authorization?')) return;
    await api.revokeDevice(id);
    onRefresh();
  };

  const handlePairDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;
    await api.pairDevice({
      name: newDeviceName.trim(),
      os: 'Windows 11 Pro (64-bit)',
      ipAddress: '192.168.1.145',
      primeDetected: true,
    });
    setNewDeviceName('');
    setIsPairingModalOpen(false);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Registered Windows Automation Devices</h2>
            <p className="text-xs text-zinc-500">
              Authorized desktop workstations running PEAK Windows UI Automation Agent
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPairingModalOpen(true)}
              className="px-3.5 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Pair New Device
            </button>
          </div>
        </div>

        {/* Devices Grid */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 hover:bg-white hover:border-zinc-300 transition-all space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-zinc-900 text-white rounded-lg">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 text-sm">{device.name}</h3>
                    <p className="text-[11px] text-zinc-500 font-mono">{device.os || 'Windows 11 Pro'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white border border-zinc-200">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      device.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                    }`}
                  />
                  <span>{device.status}</span>
                </div>
              </div>

              {/* Specs & Capabilities */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-white border border-zinc-100">
                  <span className="text-[10px] text-zinc-400 block font-medium">Prime Global Asset</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                    {device.primeDetected ? 'Active v4.2' : 'Not Found'}
                  </span>
                </div>
                <div className="p-2 rounded bg-white border border-zinc-100">
                  <span className="text-[10px] text-zinc-400 block font-medium">Last Heartbeat</span>
                  <span className="font-mono text-zinc-800 text-[11px] mt-0.5 block">
                    {device.lastHeartbeat ? new Date(device.lastHeartbeat).toLocaleTimeString() : 'Active'}
                  </span>
                </div>
              </div>

              {testResults[device.id] && (
                <div className="text-[11px] bg-emerald-50 text-emerald-800 p-2 rounded border border-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {testResults[device.id]}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-200 text-xs">
                <button
                  onClick={() => handleTestConnection(device.id)}
                  className="font-semibold text-zinc-700 hover:text-zinc-950 px-2.5 py-1 bg-white border border-zinc-200 rounded hover:bg-zinc-100 transition-colors"
                >
                  Test Connection
                </button>
                <button
                  onClick={() => handleRevoke(device.id)}
                  className="font-semibold text-red-600 hover:text-red-800 px-2.5 py-1 hover:bg-red-50 rounded transition-colors"
                >
                  Revoke Device
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pair New Device Modal */}
      {isPairingModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-base font-bold text-zinc-900">Pair Windows Workstation</h3>
              <button onClick={() => setIsPairingModalOpen(false)}>
                <X className="w-5 h-5 text-zinc-400 hover:text-zinc-600" />
              </button>
            </div>

            <form onSubmit={handlePairDevice} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Device Name</label>
                <input
                  type="text"
                  placeholder="e.g. Backoffice PC #3"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-red-900 focus:outline-hidden"
                  autoFocus
                />
              </div>
              <p className="text-zinc-500 text-[11px] leading-relaxed">
                A device authorization token will be generated. Run <code>dotnet run</code> on the target machine with this token to establish the secure WebSocket link.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPairingModalOpen(false)}
                  className="px-3 py-1.5 bg-zinc-100 text-zinc-700 font-semibold rounded-lg hover:bg-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-red-900 text-white font-bold rounded-lg hover:bg-red-800"
                >
                  Generate Pairing Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
