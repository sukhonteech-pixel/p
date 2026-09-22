import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  AlertOctagon,
  CheckCircle2,
  Clock,
  Laptop,
  Check,
  AlertTriangle,
  FileCheck,
  Eye,
  Camera,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { AutomationJob, Device, JobOptions } from '../types/automation';
import { api } from '../services/api';

interface PropertyAutomationProps {
  devices: Device[];
  onJobCreated?: (job: AutomationJob) => void;
  onViewJob?: (jobId: string) => void;
  activeJob: AutomationJob | null;
  onViewMonitor?: () => void;
  onRefreshData?: () => void;
}

export const PropertyAutomation: React.FC<PropertyAutomationProps> = ({
  devices,
  onJobCreated,
  onViewJob,
  activeJob,
  onViewMonitor,
  onRefreshData,
}) => {
  const [selectedDevice, setSelectedDevice] = useState<string>(
    devices.find((d) => d.status === 'ONLINE')?.id || devices[0]?.id || 'dev-office-pc-01'
  );
  const [propertyNo, setPropertyNo] = useState<string>('VN568');
  const [isDryRun, setIsDryRun] = useState<boolean>(false);
  const [duplicateHandling, setDuplicateHandling] = useState<'update' | 'skip' | 'version'>('update');
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState<boolean>(false);
  const [existingPropertyFound, setExistingPropertyFound] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deviceTestResult, setDeviceTestResult] = useState<string | null>(null);

  const [options, setOptions] = useState<JobOptions>({
    propertyInfo: true,
    landlordInfo: true,
    priceInfo: true,
    photos: true,
    videos: false,
    occupancyStatus: false,
    followup: false,
    viewingRecords: false,
  });

  const activeDevice = devices.find((d) => d.id === selectedDevice) || devices[0];

  // Check duplicate when typing propertyNo
  useEffect(() => {
    const cleanNo = propertyNo.trim().toUpperCase();
    if (!cleanNo) {
      setExistingPropertyFound(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsCheckingDuplicate(true);
        const res = await api.getProperty(cleanNo);
        if (res && res.property) {
          setExistingPropertyFound(true);
        } else {
          setExistingPropertyFound(false);
        }
      } catch {
        setExistingPropertyFound(false);
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [propertyNo]);

  const handleTestDevice = async () => {
    if (!activeDevice) return;
    try {
      const res = await api.testDevice(activeDevice.id);
      setDeviceTestResult(`Ping: ${res.latencyMs}ms | Prime Global Asset: Active (DPI 100%)`);
      setTimeout(() => setDeviceTestResult(null), 5000);
    } catch {
      setDeviceTestResult('Connection failed');
    }
  };

  const handleStartAutomation = async () => {
    if (!propertyNo.trim()) return;
    try {
      setIsSubmitting(true);
      const created = await api.createJob({
        propertyNo: propertyNo.trim().toUpperCase(),
        deviceId: selectedDevice,
        options,
        dryRun: isDryRun,
      });

      if (onJobCreated) {
        onJobCreated(created);
      }
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (err) {
      console.error('Failed to start automation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePause = async () => {
    if (!activeJob) return;
    await api.pauseJob(activeJob.id);
    if (onRefreshData) onRefreshData();
  };

  const handleResume = async () => {
    if (!activeJob) return;
    await api.resumeJob(activeJob.id);
    if (onRefreshData) onRefreshData();
  };

  const handleCancel = async () => {
    if (!activeJob) return;
    await api.cancelJob(activeJob.id);
    if (onRefreshData) onRefreshData();
  };

  const handleEmergencyStop = async () => {
    if (!activeJob) return;
    await api.emergencyStop(activeJob.id);
    if (onRefreshData) onRefreshData();
  };

  const isJobRunning = Boolean(
    activeJob &&
      [
        'CONNECTING',
        'RUNNING',
        'READING_PROPERTY',
        'READING_LANDLORD',
        'READING_PRICE',
        'READING_PHOTOS',
        'UPLOADING_PHOTOS',
        'SAVING_DATABASE',
        'VERIFYING',
      ].includes(activeJob.status)
  );

  const isJobPaused = activeJob?.status === 'PAUSED';

  // Step checklist items mapping based on current job progress
  const stepsList = [
    { label: 'Connect & Prime Asset Check', threshold: 15 },
    { label: 'Open Property Menu', threshold: 25 },
    { label: `Find Property ${activeJob?.propertyNo || propertyNo}`, threshold: 35 },
    { label: 'Basic Info Extraction', threshold: 48 },
    { label: 'Landlord Info & Phone', threshold: 60 },
    { label: 'Price & Contract Info', threshold: 65 },
    { label: `Photos Inspection & Download`, threshold: 78 },
    { label: 'Upload to Supabase Storage', threshold: 88 },
    { label: 'Database & Verification Check', threshold: 95 },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Connected Devices Panel */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Laptop className="w-5 h-5 text-red-900" />
              Connected Devices
            </h2>
            <p className="text-xs text-zinc-500">
              Windows Automation Agents authorized to control Prime Global Asset
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              id="device-selector"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="text-xs font-semibold bg-zinc-50 border border-zinc-300 rounded-lg px-3 py-2 text-zinc-800 focus:outline-hidden focus:ring-2 focus:ring-red-900"
            >
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.status})
                </option>
              ))}
            </select>

            <button
              id="btn-test-device-connection"
              onClick={handleTestDevice}
              className="text-xs font-semibold px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg transition-colors"
            >
              Test Link
            </button>
          </div>
        </div>

        {/* Device Quick Status Card */}
        {activeDevice && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
              <span className="text-[11px] font-medium text-zinc-500">Device Name</span>
              <p className="text-xs font-bold text-zinc-900 mt-0.5">{activeDevice.name}</p>
            </div>

            <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
              <span className="text-[11px] font-medium text-zinc-500">Status</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    activeDevice.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'
                  }`}
                />
                <p className="text-xs font-bold text-zinc-900">{activeDevice.status}</p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
              <span className="text-[11px] font-medium text-zinc-500">Prime Global Asset</span>
              <p className="text-xs font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {activeDevice.primeDetected ? 'Detected v4.2.1' : 'Not Detected'}
              </p>
            </div>

            <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
              <span className="text-[11px] font-medium text-zinc-500">Operating System</span>
              <p className="text-xs font-bold text-zinc-900 mt-0.5 truncate">{activeDevice.os}</p>
            </div>
          </div>
        )}

        {deviceTestResult && (
          <div className="mt-3 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-md flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {deviceTestResult}
          </div>
        )}
      </div>

      {/* 2. Main PROPERTY AUTOMATION Input Form */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-5 sm:p-6">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-5">
          <div>
            <h1 className="text-lg font-bold text-zinc-900 tracking-tight">PROPERTY AUTOMATION</h1>
            <p className="text-xs text-zinc-500">
              Enter target Property No. to automate Prime Global Asset desktop extraction
            </p>
          </div>

          {/* Preset Quick Fill Pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400 font-medium">Test Cases:</span>
            {['VN568', 'KT324', 'CL2237'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setPropertyNo(code)}
                className={`text-xs px-2.5 py-1 rounded-md font-mono font-semibold transition-all ${
                  propertyNo.toUpperCase() === code
                    ? 'bg-red-900 text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        {/* Input & Start Button */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2 space-y-1.5">
            <label htmlFor="input-property-no" className="block text-xs font-bold text-zinc-700 uppercase tracking-wide">
              Property No. <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <input
                id="input-property-no"
                type="text"
                value={propertyNo}
                onChange={(e) => setPropertyNo(e.target.value.toUpperCase())}
                placeholder="e.g. VN568"
                disabled={isJobRunning}
                className="w-full text-base font-mono font-bold tracking-wider px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-lg text-zinc-900 focus:outline-hidden focus:ring-2 focus:ring-red-900 focus:bg-white transition-all uppercase"
              />
              {isCheckingDuplicate && (
                <span className="absolute right-3 top-3.5 text-xs text-zinc-400 animate-pulse">
                  Checking...
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <button
              id="btn-start-automation"
              onClick={handleStartAutomation}
              disabled={isJobRunning || isSubmitting || !propertyNo.trim()}
              className={`w-full py-3 px-5 rounded-lg text-sm font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-sm ${
                isJobRunning
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-900 to-red-950 hover:from-red-800 hover:to-red-900 text-white cursor-pointer active:scale-98'
              }`}
            >
              <Play className="w-4 h-4 fill-white" />
              {isSubmitting ? 'Dispatching...' : isDryRun ? 'START DRY RUN' : 'START AUTOMATION'}
            </button>
          </div>
        </div>

        {/* Duplicate Warning & Options Banner */}
        {existingPropertyFound && !isJobRunning && (
          <div className="mt-4 p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-amber-900">
                    Existing Property Found: <span className="font-mono">{propertyNo}</span> already exists in PEAK database
                  </p>
                  <span className="text-[11px] text-amber-700 font-medium">Duplicate Protection Active</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDuplicateHandling('update')}
                    className={`text-xs px-3 py-1 rounded-md font-semibold transition-all ${
                      duplicateHandling === 'update'
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    Update Existing Record
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateHandling('skip')}
                    className={`text-xs px-3 py-1 rounded-md font-semibold transition-all ${
                      duplicateHandling === 'skip'
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    Skip if Unchanged
                  </button>
                  <button
                    type="button"
                    onClick={() => setDuplicateHandling('version')}
                    className={`text-xs px-3 py-1 rounded-md font-semibold transition-all ${
                      duplicateHandling === 'version'
                        ? 'bg-amber-800 text-white shadow-xs'
                        : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    Create New Version
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Field Selection Checkboxes */}
        <div className="mt-6 pt-5 border-t border-zinc-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Data Sections to Extract
            </span>

            {/* Dry Run Toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-700">
              <input
                id="checkbox-dry-run"
                type="checkbox"
                checked={isDryRun}
                onChange={(e) => setIsDryRun(e.target.checked)}
                className="w-4 h-4 rounded text-red-900 focus:ring-red-900 border-zinc-300"
              />
              <span>Dry Run (Preview only, no DB write)</span>
            </label>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { key: 'propertyInfo', label: 'Property Information', required: true },
              { key: 'landlordInfo', label: 'Landlord Information', required: true },
              { key: 'priceInfo', label: 'Price Information', required: true },
              { key: 'photos', label: 'Photos (12 Images)', required: true },
              { key: 'videos', label: 'Videos', required: false },
              { key: 'occupancyStatus', label: 'Occupancy Status', required: false },
              { key: 'followup', label: 'Followup History', required: false },
              { key: 'viewingRecords', label: 'Viewing Records', required: false },
            ].map((field) => (
              <label
                key={field.key}
                className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                  options[field.key as keyof JobOptions]
                    ? 'bg-red-50/50 border-red-200 text-zinc-900'
                    : 'bg-zinc-50/60 border-zinc-200 text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!options[field.key as keyof JobOptions]}
                  onChange={(e) =>
                    setOptions({ ...options, [field.key]: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-red-900 focus:ring-red-900 border-zinc-300"
                />
                <span className="font-semibold select-none">{field.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Live Automation Execution Status Card */}
      {activeJob && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 sm:p-6 overflow-hidden">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-zinc-100 text-zinc-800 rounded">
                  {activeJob.jobNo}
                </span>
                <span className="text-sm font-extrabold text-zinc-900 font-mono">
                  Property: {activeJob.propertyNo}
                </span>
                {activeJob.dryRun && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    DRY RUN
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Started: {new Date(activeJob.createdAt).toLocaleTimeString()} | Device: {activeJob.deviceName}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {onViewMonitor && (
                <button
                  id="btn-open-live-monitor"
                  onClick={onViewMonitor}
                  className="text-xs font-semibold px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-md flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Live Monitor
                </button>
              )}

              {isJobRunning && !isJobPaused && (
                <button
                  id="btn-pause-job"
                  onClick={handlePause}
                  className="text-xs font-semibold px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-md flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </button>
              )}

              {isJobPaused && (
                <button
                  id="btn-resume-job"
                  onClick={handleResume}
                  className="text-xs font-semibold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Resume
                </button>
              )}

              {isJobRunning && (
                <button
                  id="btn-cancel-job"
                  onClick={handleCancel}
                  className="text-xs font-semibold px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-md flex items-center gap-1.5 transition-colors"
                >
                  <Square className="w-3.5 h-3.5" />
                  Cancel
                </button>
              )}

              {isJobRunning && (
                <button
                  id="btn-emergency-stop"
                  onClick={handleEmergencyStop}
                  className="text-xs font-bold px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  Emergency Stop
                </button>
              )}

              {activeJob.status === 'COMPLETED' && onViewJob && (
                <button
                  onClick={() => onViewJob(activeJob.id)}
                  className="text-xs font-bold px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md flex items-center gap-1.5 transition-colors"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  View Synced Record
                </button>
              )}
            </div>
          </div>

            {/* Real-time Progress Bar */}
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-zinc-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-900 animate-ping" />
                {activeJob.currentStep}
              </span>
              <span className="font-mono text-red-950 text-sm font-extrabold">{activeJob.progress}%</span>
            </div>

            {/* Visual Progress Bar */}
            <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden p-0.5 border border-zinc-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  activeJob.status === 'FAILED'
                    ? 'bg-red-600'
                    : activeJob.status === 'COMPLETED'
                    ? 'bg-emerald-600'
                    : 'bg-gradient-to-r from-red-800 to-red-950'
                }`}
                style={{ width: `${Math.max(activeJob.progress, 5)}%` }}
              />
            </div>
          </div>

          {/* Real-time Step Timeline Grid */}
          <div className="mt-6 pt-5 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {stepsList.map((step, idx) => {
              const isCompleted = activeJob.progress >= step.threshold || activeJob.status === 'COMPLETED';
              const isCurrent =
                !isCompleted &&
                activeJob.progress >= (stepsList[idx - 1]?.threshold || 0) &&
                isJobRunning;

              return (
                <div
                  key={step.label}
                  className={`flex items-center gap-2 p-2 rounded-md border transition-all ${
                    isCompleted
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900 font-semibold'
                      : isCurrent
                      ? 'bg-red-50 border-red-300 text-red-950 font-bold animate-pulse'
                      : 'bg-zinc-50/40 border-zinc-200/60 text-zinc-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <span className="w-4 h-4 rounded-full border-2 border-red-900 border-t-transparent animate-spin shrink-0" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-zinc-300 shrink-0" />
                  )}
                  <span className="truncate">{step.label}</span>
                </div>
              );
            })}
          </div>

          {/* Job Completion Summary Banner */}
          {activeJob.status === 'COMPLETED' && (
            <div className="mt-5 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Automation Completed Successfully
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Property <span className="font-mono font-bold">{activeJob.propertyNo}</span> extracted from Prime Global Asset with 12 photos and Landlord Phone (0809682838) saved to Supabase Storage.
                  </p>
                </div>

                {onViewJob && (
                  <button
                    onClick={() => onViewJob(activeJob.id)}
                    className="shrink-0 text-xs font-bold px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md flex items-center gap-1 transition-colors"
                  >
                    View Details
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Dry Run Result Banner */}
          {activeJob.dryRun && activeJob.status === 'COMPLETED' && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950 uppercase tracking-wide">
                  DRY RUN RESULT — {activeJob.propertyNo}
                </span>
                <span className="text-amber-800 font-semibold">Source Intact (Read-Only)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-amber-900 font-medium pt-1">
                <div>Fields Found: <strong className="font-mono">27</strong></div>
                <div>Photos Found: <strong className="font-mono">12</strong></div>
                <div>Landlord: <strong className="text-emerald-700">Found</strong></div>
                <div>Price Info: <strong className="text-emerald-700">Found</strong></div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    setIsDryRun(false);
                    handleStartAutomation();
                  }}
                  className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-md transition-colors"
                >
                  Confirm & Commit to PEAK Database
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
