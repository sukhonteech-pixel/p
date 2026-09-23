import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Download,
  Clock,
  Layers,
  Check,
  X,
  ArrowRight,
  ArrowDown,
  Eye,
  FileText,
  Building2,
  Phone,
  Image as ImageIcon,
  AlertOctagon,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { api } from '../services/api';
import { AutomationJob, Device } from '../types/automation';
import {
  parseExcelFile,
  generateTemplateExcel,
  exportBatchSummaryExcel,
  ParsedPropertyRow,
} from '../utils/excelHelper';

interface BatchAutomationProps {
  onBatchStarted?: () => void;
  onNavigateToProperties?: () => void;
  onSelectJobDetail?: (jobId: string) => void;
  devices?: Device[];
}

export const BatchAutomation: React.FC<BatchAutomationProps> = ({
  onBatchStarted,
  onNavigateToProperties,
  onSelectJobDetail,
  devices = [],
}) => {
  // Main view state
  // 1 = UPLOAD & PARSE
  // 2 = PREVIEW & VALIDATE (แสดงรายการที่พบ)
  // 3 = RUNNING AUTOMATION (ทำทีละทรัพย์ -> Prime Global Asset -> ค้นหารหัส -> ดึงข้อมูล + รูป -> บันทึก PEAK -> ไปทรัพย์ถัดไป)
  // 4 = SUMMARY REPORT (สรุปผลทั้งหมด)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // File and parsed rows
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedPropertyRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string>('dev-office-pc-01');

  // Execution State
  const [batchJobs, setBatchJobs] = useState<AutomationJob[]>([]);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState<number>(0);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [batchCompleted, setBatchCompleted] = useState<boolean>(false);

  // Stats
  const [totalPhotosSaved, setTotalPhotosSaved] = useState<number>(0);
  const [totalLandlordsSaved, setTotalLandlordsSaved] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  // Check if properties already exist in PEAK database when rows are loaded
  useEffect(() => {
    if (parsedRows.length === 0) return;

    let isMounted = true;
    (async () => {
      try {
        const existingData = await api.getProperties();
        const existingSet = new Set(
          (existingData || []).map((p: any) => p.property.property_no.toUpperCase())
        );

        if (isMounted) {
          setParsedRows((prev) =>
            prev.map((row) => {
              if (row.status === 'READY' && existingSet.has(row.propertyNo)) {
                return {
                  ...row,
                  status: 'EXISTING',
                  errorMessage: 'มีใน PEAK แล้ว (จะทำการอัปเดตข้อมูล)',
                };
              }
              return row;
            })
          );
        }
      } catch (err) {
        console.error('Error checking existing properties:', err);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [parsedRows.length]);

  // Handle file drop or selection
  const handleFileChange = async (file: File) => {
    if (!file) return;
    try {
      setIsParsing(true);
      setFileName(file.name);
      const buffer = await file.arrayBuffer();
      const result = parseExcelFile(buffer);
      setParsedRows(result.rows);
      setCurrentStep(2); // Proceed to preview and validation (ตรวจสอบข้อมูล & แสดงรายการที่พบ)
    } catch (err) {
      console.error('Failed to parse Excel file:', err);
      alert('ไม่สามารถอ่านไฟล์นี้ได้ กรุณาใช้ไฟล์ .xlsx, .xls หรือ .csv');
    } finally {
      setIsParsing(false);
    }
  };

  // Generate and download template Excel
  const handleDownloadTemplate = () => {
    const blob = generateTemplateExcel();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PEAK_Property_List_Template.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Load sample dataset for instant one-click testing
  const handleLoadSampleData = () => {
    const blob = generateTemplateExcel();
    const sampleFile = new File([blob], 'Prime_Global_Asset_Batch_Sample.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    handleFileChange(sampleFile);
  };

  // Toggle selection
  const toggleRowSelect = (index: number) => {
    setParsedRows((prev) =>
      prev.map((row) => (row.index === index ? { ...row, selected: !row.selected } : row))
    );
  };

  const toggleSelectAll = (select: boolean) => {
    setParsedRows((prev) =>
      prev.map((row) => (row.status !== 'INVALID' ? { ...row, selected: select } : row))
    );
  };

  // START AUTOMATION PIPELINE (กด START -> ทำทีละทรัพย์)
  const handleStartBatch = async () => {
    setApiError(null);
    const selectedProperties = parsedRows
      .filter((r) => r.selected && r.status !== 'INVALID')
      .map((r) => r.propertyNo);

    if (selectedProperties.length === 0) {
      setApiError('กรุณาเลือกอย่างน้อย 1 รายการเพื่อเริ่มระบบ Automation');
      return;
    }

    setIsStarting(true);

    try {
      // 1. Call API FIRST - DO NOT setCurrentStep(3) or setIsBatchRunning(true) before createBatch succeeds!
      const res = await api.createBatch({
        propertyNos: selectedProperties,
        deviceId: selectedDevice,
      });

      // 2. Validate response - if no jobs, do not proceed
      if (!res || !Array.isArray(res.jobs) || res.jobs.length === 0) {
        throw new Error('ไม่สามารถเริ่ม Automation ได้: เซิร์ฟเวอร์ไม่ส่งรายการงานที่พร้อมดำเนินการกลับมา');
      }

      // 3. Only when createBatch succeeds and jobs.length > 0
      setBatchJobs(res.jobs);
      setCurrentProcessingIndex(0);
      setIsBatchRunning(true);
      setCurrentStep(3); // Transition to Step 3 ONLY AFTER SUCCESS
      setBatchCompleted(false);

      if (onBatchStarted) {
        onBatchStarted();
      }

      // 4. Start polling sequential jobs
      pollBatchExecution(res.jobs.map((j) => j.id));
    } catch (err: any) {
      console.error('Failed to start batch:', err);
      const msg = err?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์';
      setApiError(msg);
      setIsBatchRunning(false);
      setCurrentStep(2); // Stay in Step 2 with clear error
    } finally {
      setIsStarting(false);
    }
  };

  // Polling loop to track each property as it executes sequentially
  const pollBatchExecution = (jobIds: string[]) => {
    // Clear any previous interval before starting a new one
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const updatedJobs: AutomationJob[] = [];
        let allDone = true;
        let activeIdx = 0;
        let photosCountAcc = 0;
        let landlordsCountAcc = 0;

        for (let i = 0; i < jobIds.length; i++) {
          const id = jobIds[i];
          const jobRes = await api.getJob(id);
          const j = jobRes.job;
          updatedJobs.push(j);

          if (
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
            ].includes(j.status)
          ) {
            activeIdx = i;
            allDone = false;
          } else if (j.status === 'QUEUED') {
            allDone = false;
          }

          if (j.status === 'COMPLETED') {
            // Count actual photos received from automation - NEVER fallback to 12!
            const realPhotos = j.resultData?.photosCount ?? j.resultData?.photos?.length ?? 0;
            photosCountAcc += realPhotos;
            if (j.resultData?.landlord?.phone_no_1) {
              landlordsCountAcc++;
            }
          }
        }

        setBatchJobs(updatedJobs);
        setCurrentProcessingIndex(activeIdx);
        setTotalPhotosSaved(photosCountAcc);
        setTotalLandlordsSaved(landlordsCountAcc);

        if (allDone) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          setIsBatchRunning(false);
          setBatchCompleted(true);
          setCurrentStep(4); // Move to summary (สรุปผลทั้งหมด)
        }
      } catch (e) {
        console.error('Error polling batch status:', e);
      }
    }, 1200);
  };

  // Export finished summary to Excel
  const handleExportSummary = () => {
    const blob = exportBatchSummaryExcel(batchJobs);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PEAK_Automation_Batch_Report_${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const selectedCount = parsedRows.filter((r) => r.selected && r.status !== 'INVALID').length;
  const readyCount = parsedRows.filter((r) => r.status === 'READY').length;
  const existingCount = parsedRows.filter((r) => r.status === 'EXISTING').length;
  const duplicateCount = parsedRows.filter((r) => r.status === 'DUPLICATE').length;
  const invalidCount = parsedRows.filter((r) => r.status === 'INVALID').length;

  const activeJob = batchJobs[currentProcessingIndex] || null;

  // Active micro-step determination for the 11-step diagram
  const getMicroStepIndex = () => {
    if (currentStep === 1) return 0; // อัปโหลด Excel
    if (currentStep === 2) {
      if (selectedCount > 0) return 3; // แสดงรายการที่พบ
      return 2; // ตรวจสอบข้อมูล
    }
    if (currentStep === 3) {
      const prog = activeJob?.progress || 0;
      if (prog < 20) return 6; // Prime Global Asset
      if (prog < 45) return 7; // ค้นหารหัส
      if (prog < 75) return 8; // ดึงข้อมูล + รูป
      if (prog < 95) return 9; // บันทึก PEAK
      return 10; // ไปทรัพย์ถัดไป
    }
    if (currentStep === 4) return 11; // สรุปผลทั้งหมด
    return 0;
  };

  const microIdx = getMicroStepIndex();

  const workflowStepsList = [
    { id: 0, title: 'อัปโหลด Excel', desc: 'เลือกไฟล์ .xlsx / .csv' },
    { id: 1, title: 'ระบบอ่าน Property No.', desc: 'แยกคอลัมน์รหัสทรัพย์' },
    { id: 2, title: 'ตรวจสอบข้อมูล', desc: 'ตรวจรูปแบบและรายการซ้ำ' },
    { id: 3, title: 'แสดงรายการที่พบ', desc: 'ตารางเลือกรายการ' },
    { id: 4, title: 'กด START', desc: 'สั่งการระบบ Automation' },
    { id: 5, title: 'Automation ทำทีละทรัพย์', desc: 'Sequential Queue' },
    { id: 6, title: 'Prime Global Asset', desc: 'Focus หน้าต่าง Desktop' },
    { id: 7, title: 'ค้นหารหัส', desc: 'ป้อนรหัส & ค้นหาในโปรแกรม' },
    { id: 8, title: 'ดึงข้อมูล + รูป', desc: 'ราคา, เบอร์เจ้าของ, รูปภาพ' },
    { id: 9, title: 'บันทึก PEAK', desc: 'Supabase & Database' },
    { id: 10, title: 'ไปทรัพย์ถัดไป', desc: 'ประมวลผลรายการต่อไป' },
    { id: 11, title: 'สรุปผลทั้งหมด', desc: 'รายงานผลสำเร็จ & ส่งออก' },
  ];

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 11-STEP EXACT WORKFLOW DIAGRAM CARD (FLOWCHART WITH ARROWS)               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-red-900 text-white">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wide">
                กระบวนการทำงาน Automation เต็มรูปแบบ (Excel Batch Pipeline)
              </h2>
              <p className="text-xs text-zinc-500">
                ระบบดำเนินการอัตโนมัติทีละขั้นตอนตามโฟลว์ที่กำหนดโดยไม่ต้องคลิกด้วยตนเอง
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-800">
            สถานะปัจจุบัน: {workflowStepsList[microIdx]?.title}
          </span>
        </div>

        {/* Visual Diagram Matrix with Arrows */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
          {workflowStepsList.map((step, idx) => {
            const isCompleted = microIdx > idx;
            const isCurrent = microIdx === idx;

            return (
              <div
                key={step.id}
                className={`relative p-3 rounded-lg border transition-all ${
                  isCompleted
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 font-semibold'
                    : isCurrent
                    ? 'bg-red-900 text-white border-red-950 shadow-sm ring-2 ring-red-900/30'
                    : 'bg-zinc-50/70 border-zinc-200 text-zinc-500'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isCurrent
                        ? 'bg-white text-red-950'
                        : isCompleted
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-zinc-200 text-zinc-600'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  ) : null}
                </div>

                <p className="font-bold text-[11px] leading-tight mt-1">{step.title}</p>
                <p
                  className={`text-[10px] mt-0.5 leading-tight ${
                    isCurrent ? 'text-zinc-200' : 'text-zinc-400'
                  }`}
                >
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: อัปโหลด Excel & ระบบอ่าน Property No.                            */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-red-900" />
                <h3 className="text-base font-bold text-zinc-900">
                  ขั้นตอนที่ 1: อัปโหลด Excel เพื่อให้ระบบอ่าน Property No.
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                เลือกไฟล์สเปรดชีตของคุณ ระบบจะตรวจจับคอลัมน์รหัสทรัพย์และวิเคราะห์ข้อมูลทันที
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-xs font-semibold px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-zinc-600" />
                ดาวน์โหลดเทมเพลต Excel
              </button>
              <button
                type="button"
                onClick={handleLoadSampleData}
                className="text-xs font-bold px-3.5 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                โหลดชุดตัวอย่าง (VN568, KT324, CL2237...)
              </button>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileChange(file);
            }}
            className="border-2 border-dashed border-zinc-300 hover:border-red-900 rounded-2xl p-10 text-center cursor-pointer transition-all bg-zinc-50/50 hover:bg-red-50/20 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileChange(f);
              }}
            />
            <div className="w-16 h-16 rounded-2xl bg-white border border-zinc-200 shadow-sm flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-8 h-8 text-red-900" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900">
              คลิกเพื่อเลือกไฟล์ Excel หรือลากไฟล์มาวางที่นี่
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              รองรับไฟล์ <span className="font-mono font-bold">.xlsx</span>,{' '}
              <span className="font-mono font-bold">.xls</span> และ{' '}
              <span className="font-mono font-bold">.csv</span>
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-[11px] text-zinc-500 bg-white px-3 py-1 rounded-full border border-zinc-200">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>ตรวจจับหัวตารางอัตโนมัติ: Property No, รหัสทรัพย์, Code, ID</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: ตรวจสอบข้อมูล & แสดงรายการที่พบ & กด START                         */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-red-900" />
                <h3 className="text-base font-bold text-zinc-900">
                  ขั้นตอนที่ 2-4: ตรวจสอบข้อมูล และ แสดงรายการทรัพย์ที่พบ
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                ไฟล์: <span className="font-mono font-bold text-zinc-800">{fileName}</span> — พบ{' '}
                <strong className="text-zinc-900">{parsedRows.length}</strong> รายการ
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-semibold px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors"
              >
                เลือกไฟล์ใหม่
              </button>

              <button
                id="btn-trigger-start-automation"
                type="button"
                onClick={handleStartBatch}
                disabled={selectedCount === 0 || isStarting}
                className={`text-xs font-bold px-6 py-2.5 rounded-lg uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all ${
                  selectedCount === 0 || isStarting
                    ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                    : 'bg-red-900 hover:bg-red-800 text-white cursor-pointer active:scale-98'
                }`}
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    กำลังเริ่มระบบ...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    กด START ({selectedCount} ทรัพย์)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* API Error State Banner */}
          {apiError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between gap-3 text-red-900 animate-fadeIn">
              <div className="flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-red-950 text-sm">ไม่สามารถเริ่ม Automation ได้</p>
                  <p className="mt-1 text-red-800 leading-relaxed">{apiError}</p>
                  {apiError.includes('Agent') && (
                    <div className="mt-2 text-[11px] font-medium text-red-900 bg-red-100/70 p-2.5 rounded-lg border border-red-200">
                      คำแนะนำ: กรุณาเปิดโปรแกรม <strong>PEAK Automation Agent</strong> บนเครื่อง Windows และตรวจสอบให้แน่ใจว่า Agent ออนไลน์ก่อนเริ่มทำงาน
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApiError(null)}
                className="p-1 text-red-400 hover:text-red-700 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Summary Metric Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <span className="text-[11px] text-zinc-500 font-semibold block">อ่านได้ทั้งหมด</span>
              <span className="text-xl font-bold font-mono text-zinc-900">{parsedRows.length}</span>
            </div>

            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
              <span className="text-[11px] text-emerald-800 font-semibold block">พร้อมนำเข้า (ใหม่)</span>
              <span className="text-xl font-bold font-mono text-emerald-700">{readyCount}</span>
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl">
              <span className="text-[11px] text-amber-800 font-semibold block">มีใน PEAK (จะอัปเดต)</span>
              <span className="text-xl font-bold font-mono text-amber-700">{existingCount}</span>
            </div>

            <div className="p-3 bg-orange-50/60 border border-orange-200 rounded-xl">
              <span className="text-[11px] text-orange-800 font-semibold block">รหัสซ้ำในไฟล์ (ตัดออก)</span>
              <span className="text-xl font-bold font-mono text-orange-700">{duplicateCount}</span>
            </div>

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
              <span className="text-[11px] text-zinc-500 font-semibold block">เวลาโดยประมาณ</span>
              <span className="text-xl font-bold font-mono text-zinc-900">
                ~{Math.max(1, Math.round(selectedCount * 0.25))} นาที
              </span>
            </div>
          </div>

          {/* Table of Found Properties */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleSelectAll(true)}
                  className="text-red-900 font-bold hover:underline"
                >
                  เลือกทั้งหมด
                </button>
                <span className="text-zinc-300">|</span>
                <button
                  type="button"
                  onClick={() => toggleSelectAll(false)}
                  className="text-zinc-600 hover:text-zinc-900 font-semibold"
                >
                  ยกเลิกทั้งหมด
                </button>
              </div>
              <span className="text-zinc-500 font-medium">
                เลือกดำเนินการ: <strong className="text-zinc-900">{selectedCount}</strong> รายการ
              </span>
            </div>

            <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">เลือก</th>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Property No.</th>
                    <th className="py-3 px-4">Project Name / โครงการ</th>
                    <th className="py-3 px-4">สถานะการตรวจสอบ</th>
                    <th className="py-3 px-4">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {parsedRows.map((row) => (
                    <tr
                      key={row.index}
                      className={`hover:bg-zinc-50/80 transition-colors ${
                        row.selected ? 'bg-red-50/20' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={row.status === 'INVALID'}
                          onChange={() => toggleRowSelect(row.index)}
                          className="w-4 h-4 rounded text-red-900 focus:ring-red-900 border-zinc-300"
                        />
                      </td>
                      <td className="py-3 px-4 text-zinc-400 font-mono">{row.index}</td>
                      <td className="py-3 px-4 font-mono font-bold text-zinc-900">
                        <span className="px-2 py-0.5 rounded bg-zinc-100 text-red-950 font-bold">
                          {row.propertyNo}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-800 font-medium">
                        {row.projectName || '—'}
                      </td>
                      <td className="py-3 px-4">
                        {row.status === 'READY' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            ข้อมูลถูกต้อง
                          </span>
                        )}
                        {row.status === 'EXISTING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            พบใน PEAK แล้ว
                          </span>
                        )}
                        {row.status === 'DUPLICATE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800">
                            รหัสซ้ำในไฟล์
                          </span>
                        )}
                        {row.status === 'INVALID' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                            <X className="w-3.5 h-3.5" />
                            รูปแบบผิดพลาด
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 text-[11px]">
                        {row.errorMessage ||
                          (row.status === 'READY' ? 'จะดึงข้อมูล & รูปภาพ' : '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: Automation ทำทีละทรัพย์ -> Prime Global Asset -> ค้นหารหัส        */}
      {/* -> ดึงข้อมูล + รูป -> บันทึก PEAK -> ไปทรัพย์ถัดไป                         */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-6">
          {/* Active Processing Card */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-red-900 text-white rounded">
                    กำลังประมวลผลทรัพย์ที่ {batchJobs.length > 0 ? currentProcessingIndex + 1 : 0} จาก {batchJobs.length}
                  </span>
                  <h3 className="text-base font-extrabold text-zinc-900 font-mono">
                    Target Property: {activeJob?.propertyNo || (batchJobs.length > 0 ? batchJobs[0].propertyNo : 'ไม่มีงานในคิว')}
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  กำลังสั่งการโปรแกรม Prime Global Asset บน Windows Workstation ผ่าน UI Automation
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                  Automation In Progress
                </span>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="mt-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-zinc-700">
                  ความคืบหน้ารวม:{' '}
                  {batchJobs.filter((j) => j.status === 'COMPLETED').length} / {batchJobs.length}{' '}
                  ทรัพย์
                </span>
                <span className="font-mono text-red-950 font-extrabold text-sm">
                  {Math.round(
                    (batchJobs.filter((j) => j.status === 'COMPLETED').length /
                      Math.max(batchJobs.length, 1)) *
                      100
                  )}
                  %
                </span>
              </div>

              <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden p-0.5 border border-zinc-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-red-800 to-red-950 transition-all duration-500"
                  style={{
                    width: `${Math.max(
                      (batchJobs.filter((j) => j.status === 'COMPLETED').length /
                        Math.max(batchJobs.length, 1)) *
                        100,
                      8
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Sub-steps Flowchart for Current Property */}
            <div className="mt-6 pt-5 border-t border-zinc-100">
              <span className="text-xs font-bold text-zinc-700 uppercase tracking-wide block mb-3">
                ขั้นตอนการดำเนินการกับ Prime Global Asset ในทรัพย์นี้ ({activeJob?.propertyNo})
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                {[
                  { name: '1. Prime Global Asset', desc: 'Focus หน้าต่างโปรแกรม', thresh: 15 },
                  { name: '2. ค้นหารหัส', desc: `ค้นหา ${activeJob?.propertyNo}`, thresh: 35 },
                  { name: '3. ดึงข้อมูล + รูป', desc: 'ราคา, เบอร์, รูปภาพ', thresh: 75 },
                  { name: '4. บันทึก PEAK', desc: 'Supabase & Database', thresh: 90 },
                  { name: '5. ไปทรัพย์ถัดไป', desc: 'สลับคิวอัตโนมัติ', thresh: 98 },
                ].map((st, i) => {
                  const prog = activeJob?.progress || 0;
                  const isDone = prog >= st.thresh || activeJob?.status === 'COMPLETED';
                  const isCurrent = !isDone && prog >= (i * 18);

                  return (
                    <div
                      key={st.name}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        isDone
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold'
                          : isCurrent
                          ? 'bg-red-50 border-red-300 text-red-950 font-bold animate-pulse'
                          : 'bg-zinc-50 border-zinc-200/60 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center justify-center mb-1">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : isCurrent ? (
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-red-900 border-t-transparent animate-spin" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-zinc-300" />
                        )}
                      </div>
                      <p className="text-[11px] font-bold">{st.name}</p>
                      <p className="text-[10px] opacity-75 mt-0.5">{st.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sequential Queue Table */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                คิวการทำทีละทรัพย์ (Sequential Queue Status)
              </h4>
              <span className="text-xs text-zinc-500 font-medium">
                ประมวลผลตามลำดับอัตโนมัติ ไม่ต้องคลิกเอง
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Property No.</th>
                    <th className="py-3 px-4">สถานะ</th>
                    <th className="py-3 px-4">ขั้นตอนปัจจุบัน</th>
                    <th className="py-3 px-4">รูปภาพ / เบอร์โทรที่ได้</th>
                    <th className="py-3 px-4 text-right">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {batchJobs.map((job, idx) => {
                    const isCurrent =
                      idx === currentProcessingIndex &&
                      job.status !== 'COMPLETED' &&
                      job.status !== 'FAILED';
                    return (
                      <tr
                        key={job.id}
                        className={`transition-colors ${
                          isCurrent
                            ? 'bg-red-50/40 font-semibold'
                            : job.status === 'COMPLETED'
                            ? 'hover:bg-emerald-50/30'
                            : 'hover:bg-zinc-50'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono text-zinc-400">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-red-950 px-2 py-0.5 rounded bg-zinc-100">
                            {job.propertyNo}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {job.status === 'COMPLETED' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              COMPLETED
                            </span>
                          )}
                          {job.status === 'FAILED' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                              <AlertCircle className="w-3 h-3" />
                              FAILED
                            </span>
                          )}
                          {[
                            'CONNECTING',
                            'RUNNING',
                            'READING_PROPERTY',
                            'READING_LANDLORD',
                            'READING_PRICE',
                            'READING_PHOTOS',
                            'UPLOADING_PHOTOS',
                            'SAVING_DATABASE',
                            'VERIFYING',
                          ].includes(job.status) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                              PROCESSING
                            </span>
                          )}
                          {job.status === 'QUEUED' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600">
                              <Clock className="w-3 h-3" />
                              WAITING
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-700">
                          {job.currentStep} ({job.progress}%)
                        </td>
                        <td className="py-3.5 px-4 text-zinc-600">
                          {job.resultData?.photosCount ?? job.resultData?.photos?.length ? (
                            <span className="font-mono text-emerald-700 font-bold">
                              {job.resultData.photosCount ?? job.resultData?.photos?.length} รูป |{' '}
                              {job.resultData?.landlord?.phone_no_1 || '—'}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {onSelectJobDetail && job.status === 'COMPLETED' && (
                            <button
                              onClick={() => onSelectJobDetail(job.id)}
                              className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded font-semibold text-xs transition-colors"
                            >
                              ดูผลลัพธ์
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: สรุปผลทั้งหมด (FINAL SUMMARY REPORT & ACTIONS)                   */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Success Banner */}
          <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-emerald-950">
                  ขั้นตอนที่ 12: สรุปผลทั้งหมด (Batch Automation Complete)
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  ระบบได้สั่งการโปรแกรม Prime Global Asset ดึงข้อมูล รูปภาพ และบันทึกลง PEAK เรียบร้อยทุกรายการ
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportSummary}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              ส่งออกรายงาน Excel (.xlsx)
            </button>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
              <span className="text-xs font-semibold text-zinc-500 uppercase">ประมวลผลทั้งหมด</span>
              <p className="text-2xl font-black font-mono text-zinc-900 mt-1">
                {batchJobs.length} <span className="text-xs font-medium text-zinc-400">ทรัพย์</span>
              </p>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <span className="text-xs font-semibold text-emerald-800 uppercase">สำเร็จ</span>
              <p className="text-2xl font-black font-mono text-emerald-700 mt-1">
                {batchJobs.filter((j) => j.status === 'COMPLETED').length}{' '}
                <span className="text-xs font-medium text-emerald-600">ทรัพย์</span>
              </p>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
              <span className="text-xs font-semibold text-zinc-500 uppercase">รูปภาพที่บันทึก</span>
              <p className="text-2xl font-black font-mono text-red-950 mt-1">
                {totalPhotosSaved}{' '}
                <span className="text-xs font-medium text-zinc-400">รูป (Supabase)</span>
              </p>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
              <span className="text-xs font-semibold text-zinc-500 uppercase">เบอร์โทรเจ้าของทรัพย์</span>
              <p className="text-2xl font-black font-mono text-zinc-900 mt-1">
                {totalLandlordsSaved}{' '}
                <span className="text-xs font-medium text-zinc-400">เบอร์</span>
              </p>
            </div>
          </div>

          {/* Results Table */}
          <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-900 uppercase">
                รายการทรัพย์ที่บันทึกลงฐานข้อมูล PEAK
              </h4>
              <span className="text-xs text-zinc-500">พร้อมเปิดตรวจสอบข้อมูลได้ทันที</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100/70 text-zinc-600 font-semibold border-b border-zinc-200 uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Job No.</th>
                    <th className="py-3 px-4">Property No.</th>
                    <th className="py-3 px-4">เจ้าของทรัพย์ (Landlord)</th>
                    <th className="py-3 px-4">เบอร์โทรติดต่อ</th>
                    <th className="py-3 px-4">จำนวนรูปภาพ</th>
                    <th className="py-3 px-4">สถานะ</th>
                    <th className="py-3 px-4 text-right">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {batchJobs.map((job, idx) => (
                    <tr key={job.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-zinc-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono text-zinc-600">{job.jobNo}</td>
                      <td className="py-3 px-4 font-mono font-bold text-red-950">
                        {job.propertyNo}
                      </td>
                      <td className="py-3 px-4 font-semibold text-zinc-800">
                        {job.resultData?.landlord?.name || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-red-900 font-bold">
                        {job.resultData?.landlord?.phone_no_1 || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-700">
                        {job.resultData?.photosCount ?? job.resultData?.photos?.length ?? 0} รูป
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Check className="w-3 h-3" />
                          SUCCESS
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {onSelectJobDetail && (
                          <button
                            onClick={() => onSelectJobDetail(job.id)}
                            className="text-xs font-semibold px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded transition-colors"
                          >
                            ดูข้อมูล
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => {
                setCurrentStep(1);
                setParsedRows([]);
                setBatchJobs([]);
              }}
              className="text-xs font-semibold px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              เริ่มนำเข้าไฟล์ Excel ชุดใหม่
            </button>

            {onNavigateToProperties && (
              <button
                type="button"
                onClick={onNavigateToProperties}
                className="text-xs font-bold px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Building2 className="w-4 h-4" />
                เปิดดูรายการทรัพย์ที่บันทึกใน PEAK (Synced Properties)
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
