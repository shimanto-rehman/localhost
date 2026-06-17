'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { MONTH_NAMES } from '@/lib/constants';

const ACCEPT = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_BYTES = 10 * 1024 * 1024;

type Mode = 'import' | 'export';

type UploadIssue = {
  level: 'error' | 'warning';
  message: string;
  sheet?: string;
  row?: number;
};

type UploadResult = {
  fileName: string;
  size: number;
  monthKey: string;
  receivedAt: string;
  status: 'received' | 'parsed';
  preview?: { sheets: string[]; counts?: Record<string, number> };
  issues?: UploadIssue[];
  message?: string;
};

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

type BarPhase = 'preparing' | 'progress' | 'validating' | 'complete';

/** Smooth progress bar — separate loader layer avoids mode-switch glitches */
function ProgressBar({
  phase,
  progress,
  label,
}: {
  phase: BarPhase;
  progress: number;
  label: string;
}) {
  const showLoader = phase === 'preparing' || phase === 'validating';
  const fillScale =
    phase === 'complete'
      ? 1
      : phase === 'progress' || phase === 'validating'
        ? Math.max(0, Math.min(1, progress / 100))
        : 0;

  return (
    <div
      className={`monthly-data-progress monthly-data-progress--${phase}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={phase === 'preparing' ? undefined : progress}
      aria-label={label}
    >
      <div className="monthly-data-progress__track">
        <div
          className={`monthly-data-progress__loader${showLoader ? ' is-active' : ''}`}
          aria-hidden
        />
        <div
          className="monthly-data-progress__fill"
          style={{ transform: `scaleX(${fillScale})` }}
        />
      </div>
      <span className="monthly-data-progress__text">{label}</span>
    </div>
  );
}

/** Only push a new % to React when the rounded value actually changes */
function createProgressSetter(setPct: (n: number) => void) {
  let last = -1;
  return (n: number) => {
    const v = Math.max(0, Math.min(100, Math.round(n)));
    if (v !== last) {
      last = v;
      setPct(v);
    }
  };
}

/** Upload arrow icon */
function UpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

/** Download arrow icon */
function DownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export default function ImportPage() {
  const { apartment } = useApp();
  const { toast } = useToast();

  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return Array.from({ length: 5 }, (_, i) => y - 2 + i);
  }, [now]);

  const [mode, setMode] = useState<Mode>('import');

  // -- Download (template) state
  const [downloading, setDownloading] = useState(false);
  const [downloadPct, setDownloadPct] = useState(0);
  const [downloadIndeterminate, setDownloadIndeterminate] = useState(false);

  // -- Export state
  const [exporting, setExporting] = useState(false);
  const [exportPct, setExportPct] = useState(0);
  const [exportIndeterminate, setExportIndeterminate] = useState(false);
  const [exportNoData, setExportNoData] = useState(false);

  // -- Upload state
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadValidating, setUploadValidating] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear result when month or file changes
  useEffect(() => {
    if (result && (file?.name !== result.fileName || monthKey !== result.monthKey)) {
      setResult(null);
    }
  }, [file, monthKey, result]);

  // Clear "no data" badge when the month changes
  useEffect(() => {
    setExportNoData(false);
  }, [monthKey]);

  // -- Helpers ----------------------------------------------------------------

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /**
   * Stream a download and report progress.
   * Returns 'noData' when the API responds with { noData: true }.
   */
  const streamDownload = async (
    url: string,
    fallbackName: string,
    setPct: (n: number) => void,
    setIndet: (b: boolean) => void,
  ): Promise<'ok' | 'error' | 'noData'> => {
    const pushPct = createProgressSetter(setPct);
    setIndet(true);

    const res = await fetch(url);

    if (!res.ok) {
      setIndet(false);
      pushPct(0);
      const ct = res.headers.get('Content-Type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (data.noData) return 'noData';
        toast(data.error || 'Download failed', 'error');
      } else {
        toast('Download failed', 'error');
      }
      return 'error';
    }

    const cd = res.headers.get('Content-Disposition') || '';
    const m = cd.match(/filename="?([^"]+)"?/);
    const filename = m?.[1] || fallbackName;
    const total = Number(res.headers.get('Content-Length') || 0);

    if (!res.body) {
      const blob = await res.blob();
      setIndet(false);
      pushPct(100);
      triggerDownload(blob, filename);
      return 'ok';
    }

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        if (total > 0) {
          setIndet(false);
          pushPct(Math.min(99, (received / total) * 100));
        }
      }
    }

    setIndet(false);
    pushPct(100);
    const blob = new Blob(chunks as BlobPart[], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    triggerDownload(blob, filename);
    return 'ok';
  };

  const reset = (
    setActive: (b: boolean) => void,
    setPct: (n: number) => void,
    setIndet: (b: boolean) => void,
  ) => {
    // Keep the bar visible at 100% briefly so completion is noticeable.
    setTimeout(() => {
      setActive(false);
      setPct(0);
      setIndet(false);
    }, 900);
  };

  // -- Handlers ---------------------------------------------------------------

  const handleDownload = async () => {
    if (downloading) return;
    setDownloadPct(0);
    setDownloadIndeterminate(true);
    setDownloading(true);
    try {
      const result = await streamDownload(
        `/api/import/template?monthKey=${monthKey}`,
        `LocalHost_Monthly_${monthKey}.xlsx`,
        setDownloadPct,
        setDownloadIndeterminate,
      );
      if (result === 'ok') toast('Template downloaded');
    } catch {
      toast('Could not download template', 'error');
    } finally {
      reset(setDownloading, setDownloadPct, setDownloadIndeterminate);
    }
  };

  const handleExport = async () => {
    if (exporting) return;
    setExportPct(0);
    setExportIndeterminate(true);
    setExportNoData(false);
    setExporting(true);
    try {
      const result = await streamDownload(
        `/api/import/export?monthKey=${monthKey}`,
        `LocalHost_${monthKey}_export.xlsx`,
        setExportPct,
        setExportIndeterminate,
      );
      if (result === 'ok') toast(`${monthLabel} exported`);
      if (result === 'noData') setExportNoData(true);
    } catch {
      toast('Could not export month', 'error');
    } finally {
      reset(setExporting, setExportPct, setExportIndeterminate);
    }
  };

  const validateAndSetFile = (next: File | null) => {
    if (!next) { setFile(null); return; }
    const okType =
      next.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      next.name.toLowerCase().endsWith('.xlsx');
    if (!okType) { toast('Only .xlsx files are supported', 'error'); return; }
    if (next.size > MAX_BYTES) { toast('File is too large (max 10 MB)', 'error'); return; }
    setFile(next);
    setResult(null);
  };

  const handleUpload = () => {
    if (!file || uploading) return;
    setUploading(true);
    setUploadPct(0);
    setUploadValidating(false);
    const pushPct = createProgressSetter(setUploadPct);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/import/upload');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadValidating(false);
        pushPct(Math.min(99, (e.loaded / e.total) * 100));
      }
    };
    xhr.upload.onload = () => {
      pushPct(100);
      setUploadValidating(true);
    };
    xhr.onload = () => {
      setUploadValidating(false);
      pushPct(100);
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300) {
          setResult(data as UploadResult);
          toast('File received');
        } else {
          toast(data.error || 'Upload failed', 'error');
        }
      } catch {
        toast('Upload failed', 'error');
      } finally {
        setTimeout(() => {
          setUploading(false);
          setUploadPct(0);
          setUploadValidating(false);
        }, 900);
      }
    };
    xhr.onerror = () => {
      toast('Upload failed', 'error');
      setUploading(false);
      setUploadPct(0);
      setUploadValidating(false);
    };
    const form = new FormData();
    form.append('file', file);
    form.append('monthKey', monthKey);
    xhr.send(form);
  };

  // -- Derived labels for progress bars --------------------------------------

  const downloadPhase: BarPhase = downloadIndeterminate
    ? 'preparing'
    : downloadPct >= 100
      ? 'complete'
      : 'progress';

  const exportPhase: BarPhase = exportIndeterminate
    ? 'preparing'
    : exportPct >= 100
      ? 'complete'
      : 'progress';

  const uploadPhase: BarPhase = uploadValidating
    ? 'validating'
    : uploadPct >= 100
      ? 'complete'
      : 'progress';

  const downloadBarLabel = downloadPhase === 'preparing'
    ? 'Preparing template...'
    : downloadPhase === 'complete'
      ? 'Saved to device'
      : `Downloading... ${downloadPct}%`;

  const exportBarLabel = exportPhase === 'preparing'
    ? `Generating ${monthLabel}...`
    : exportPhase === 'complete'
      ? 'Saved to device'
      : `Downloading... ${exportPct}%`;

  const uploadBarLabel = uploadPhase === 'validating'
    ? 'Validating file...'
    : uploadPhase === 'complete'
      ? 'Upload complete'
      : `Uploading... ${uploadPct}%`;

  const heroEyebrow = mode === 'import' ? 'Monthly data import' : 'Monthly data export';
  const heroTitle =
    mode === 'import'
      ? 'Bring a whole month in one upload'
      : 'Download any month as a polished Excel report';
  const heroDesc =
    mode === 'import'
      ? 'Download the Excel template, fill it in offline, then upload it here. Members are matched by their registered email - meals, market, fixed costs, the monthly bill, and other expenses for the selected month are imported in one go.'
      : 'Pick a month and we will generate the same workbook, populated with the data already in your system - perfect for archiving, sharing, or working offline.';

  return (
    <section className="page active monthly-data-page">

      {/* -- Hero ---------------------------------------------------- */}
      <header className="monthly-data-hero">
        <div className="monthly-data-hero__main">
          <div className="monthly-data-hero__eyebrow">{heroEyebrow}</div>
          <h1 className="monthly-data-hero__title">{heroTitle}</h1>
          <p className="monthly-data-hero__desc">{heroDesc}</p>
        </div>

        <div className="monthly-data-hero__controls">
          {/* Mode toggle */}
          <div className="monthly-data-mode-toggle" role="tablist" aria-label="Switch between import and export">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'import'}
              className={`monthly-data-mode-toggle__btn${mode === 'import' ? ' is-active' : ''}`}
              onClick={() => setMode('import')}
            >
              <UpIcon />
              Import
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'export'}
              className={`monthly-data-mode-toggle__btn${mode === 'export' ? ' is-active' : ''}`}
              onClick={() => setMode('export')}
            >
              <DownIcon />
              Export
            </button>
          </div>

          {/* Month picker */}
          <div className="monthly-data-month-picker" role="group" aria-label="Select month">
            <span className="monthly-data-month-picker__label">Month</span>
            <div className="monthly-data-month-picker__controls">
              <select
                className="monthly-data-select"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                aria-label="Month"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i} value={i + 1}>{name}</option>
                ))}
              </select>
              <select
                className="monthly-data-select"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                aria-label="Year"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <span className="monthly-data-month-picker__hint">
              {monthLabel}
              <span className="monthly-data-dot" aria-hidden>-</span>
              {monthKey}
            </span>
          </div>
        </div>
      </header>

      {/* -- Cards --------------------------------------------------- */}
      {mode === 'export' ? (
        <div className="monthly-data-grid monthly-data-grid--single">
          <article className="monthly-data-card">
            <div className="monthly-data-card__head">
              <div className="monthly-data-card__step">Export - {monthLabel}</div>
              <h2 className="monthly-data-card__title">Snapshot this month</h2>
              <p className="monthly-data-card__desc">
                Generate the standard template <strong>filled with live data</strong> for {monthLabel}:
                roster, meals per day, market shopping, fixed costs, electricity + adjustments, and other expenses.
              </p>
            </div>

            <ul className="monthly-data-feature-list">
              <li><span className="monthly-data-bullet" aria-hidden />Same format as the import template</li>
              <li><span className="monthly-data-bullet" aria-hidden />Members matched by email</li>
              <li><span className="monthly-data-bullet" aria-hidden />Meals as a day x member grid</li>
              <li><span className="monthly-data-bullet" aria-hidden />Read-only snapshot - nothing changes</li>
            </ul>

            {/* Progress */}
            {exporting && (
              <div className="monthly-data-progress-wrap">
                <ProgressBar
                  phase={exportPhase}
                  progress={exportPct}
                  label={exportBarLabel}
                />
              </div>
            )}

            {/* No-data empty state */}
            {exportNoData && (
              <div className="monthly-data-empty">
                <div className="monthly-data-empty__icon" aria-hidden>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p className="monthly-data-empty__title">No data for {monthLabel}</p>
                <p className="monthly-data-empty__desc">
                  There are no meal records, expenses, shopping entries, or bill data recorded for this month.
                  Pick a different month or start entering data first.
                </p>
              </div>
            )}

            <div className="monthly-data-card__foot">
              <button
                type="button"
                className={`btn btn-primary monthly-data-btn${exporting ? ' is-loading' : ''}`}
                onClick={handleExport}
                disabled={exporting}
              >
                {exporting ? <span className="monthly-data-spinner" aria-hidden /> : <DownIcon />}
                {exporting ? 'Generating...' : `Export ${monthLabel}`}
              </button>
              <span className="monthly-data-foot-hint">.xlsx - safe read-only snapshot</span>
            </div>
          </article>
        </div>
      ) : (
        <div className="monthly-data-grid">

          {/* -- Download card ------------------------------------- */}
          <article className="monthly-data-card">
            <div className="monthly-data-card__head">
              <div className="monthly-data-card__step">Step 01</div>
              <h2 className="monthly-data-card__title">Download template</h2>
              <p className="monthly-data-card__desc">
                A clean Excel workbook for <strong>{monthLabel}</strong>, pre-filled with your
                apartment details and current member roster.
              </p>
            </div>

            <ul className="monthly-data-feature-list">
              <li><span className="monthly-data-bullet" aria-hidden />Members matched by email</li>
              <li><span className="monthly-data-bullet" aria-hidden />Meals: day x member grid</li>
              <li><span className="monthly-data-bullet" aria-hidden />Live totals on every section</li>
              <li><span className="monthly-data-bullet" aria-hidden />Built-in dropdowns &amp; validation</li>
            </ul>

            {downloading && (
              <div className="monthly-data-progress-wrap">
                <ProgressBar
                  phase={downloadPhase}
                  progress={downloadPct}
                  label={downloadBarLabel}
                />
              </div>
            )}

            <div className="monthly-data-card__foot">
              <button
                type="button"
                className={`btn btn-primary monthly-data-btn${downloading ? ' is-loading' : ''}`}
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? <span className="monthly-data-spinner" aria-hidden /> : <DownIcon />}
                {downloading ? 'Preparing...' : 'Download template'}
              </button>
              <span className="monthly-data-foot-hint">.xlsx - Excel - Google Sheets - Numbers</span>
            </div>
          </article>

          {/* -- Upload card --------------------------------------- */}
          <article className="monthly-data-card">
            <div className="monthly-data-card__head">
              <div className="monthly-data-card__step">Step 02</div>
              <h2 className="monthly-data-card__title">Upload filled file</h2>
              <p className="monthly-data-card__desc">
                Drop your completed file. We&apos;ll validate it and show a preview before importing
                into <strong>{apartment?.name || 'your apartment'}</strong>.
              </p>
            </div>

            <div className="monthly-data-dropzone-wrap">
              <label
                className={`monthly-data-dropzone${dragging ? ' is-dragging' : ''}${file ? ' has-file' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) validateAndSetFile(f);
                }}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept={ACCEPT}
                  hidden
                  onChange={(e) => validateAndSetFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <div className="monthly-data-dropzone__file">
                    <div className="monthly-data-dropzone__file-icon" aria-hidden>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="monthly-data-dropzone__file-meta">
                      <div className="monthly-data-dropzone__file-name">{file.name}</div>
                      <div className="monthly-data-dropzone__file-size">{formatBytes(file.size)}</div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm monthly-data-dropzone__remove"
                      onClick={(e) => {
                        e.preventDefault();
                        setFile(null);
                        setResult(null);
                        if (inputRef.current) inputRef.current.value = '';
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="monthly-data-dropzone__empty">
                    <div className="monthly-data-dropzone__icon" aria-hidden>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <div className="monthly-data-dropzone__title">Drop your .xlsx file here</div>
                    <button
                      type="button"
                      className="monthly-data-dropzone__browse"
                      onClick={() => inputRef.current?.click()}
                    >
                      or browse from your device
                    </button>
                    <div className="monthly-data-dropzone__hint">Max 10 MB</div>
                  </div>
                )}
              </label>
            </div>

            {uploading && (
              <div className="monthly-data-progress-wrap">
                <ProgressBar
                  phase={uploadPhase}
                  progress={uploadPct}
                  label={uploadBarLabel}
                />
              </div>
            )}

            <div className="monthly-data-card__foot">
              <button
                type="button"
                className={`btn btn-primary monthly-data-btn${uploading ? ' is-loading' : ''}`}
                onClick={handleUpload}
                disabled={uploading || !file}
              >
                {uploading ? <span className="monthly-data-spinner" aria-hidden /> : <UpIcon />}
                {uploading ? 'Uploading...' : `Upload for ${monthLabel}`}
              </button>
              <span className="monthly-data-foot-hint">We validate the file before importing</span>
            </div>

            {result && (
              <div className="monthly-data-result-wrap">
                <div className="monthly-data-result" role="status">
                  <div className="monthly-data-result__head">
                    <span className="monthly-data-result__pill">Received</span>
                    <span className="monthly-data-result__title">{result.fileName}</span>
                  </div>
                  <div className="monthly-data-result__grid">
                    <div className="monthly-data-result__cell">
                      <div className="monthly-data-result__label">Month</div>
                      <div className="monthly-data-result__value">{result.monthKey}</div>
                    </div>
                    <div className="monthly-data-result__cell">
                      <div className="monthly-data-result__label">Size</div>
                      <div className="monthly-data-result__value">{formatBytes(result.size)}</div>
                    </div>
                    <div className="monthly-data-result__cell">
                      <div className="monthly-data-result__label">Sheets</div>
                      <div className="monthly-data-result__value">{result.preview?.sheets?.join(', ') || '-'}</div>
                    </div>
                  </div>
                  {result.message && <p className="monthly-data-result__msg">{result.message}</p>}
                  {result.issues && result.issues.length > 0 && (
                    <ul className="monthly-data-issues">
                      {result.issues.map((issue, idx) => (
                        <li
                          key={`${issue.sheet}-${issue.row}-${idx}`}
                          className={`monthly-data-issue monthly-data-issue--${issue.level}`}
                        >
                          <span className="monthly-data-issue__tag">
                            {issue.level === 'error' ? 'Error' : 'Warning'}
                          </span>
                          {(issue.sheet || issue.row) && (
                            <span className="monthly-data-issue__loc">
                              {issue.sheet ?? ''}{issue.row ? ` - row ${issue.row}` : ''}
                            </span>
                          )}
                          <span className="monthly-data-issue__msg">{issue.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </article>
        </div>
      )}

      {/* -- Bottom info sections --------------------------------- */}
      {mode === 'import' ? (
        <>
          <section className="monthly-data-info">
            <div className="monthly-data-info__head">
              <span className="monthly-data-info__chip">Heads up</span>
              <h3 className="monthly-data-info__title">What happens if Excel data doesn&apos;t match the system?</h3>
            </div>
            <ul className="monthly-data-info__list">
              <li>
                <strong>Unknown member email</strong> - that row is skipped and listed under &quot;Issues&quot;.
                Fix the email (or add the member in Settings) and re-upload - already imported rows aren&apos;t duplicated.
              </li>
              <li>
                <strong>Wrong month</strong> - if any row&apos;s date falls outside the selected month, it&apos;s flagged
                as a warning so you can decide whether to re-tag it.
              </li>
              <li>
                <strong>Bad value</strong> (text in an amount cell, negative meal count, etc.) - the row is rejected with a clear reason.
              </li>
              <li>
                <strong>Locked month</strong> - if the month is already locked, nothing is written and the upload is rejected
                so the existing bill stays intact.
              </li>
              <li>
                <strong>Safe by default</strong> - the importer runs inside a single transaction. If anything fails halfway,
                <em> nothing</em> is committed.
              </li>
            </ul>
          </section>

          <aside className="monthly-data-steps">
            <div className="monthly-data-steps__title">How import works</div>
            <ol className="monthly-data-steps__list">
              <li><span className="monthly-data-steps__num">1</span> Pick the month above.</li>
              <li><span className="monthly-data-steps__num">2</span> Download the template - pre-filled with your apartment.</li>
              <li><span className="monthly-data-steps__num">3</span> Fill the Roster, Meals, and Costs tabs.</li>
              <li><span className="monthly-data-steps__num">4</span> Upload here - preview before saving.</li>
            </ol>
          </aside>
        </>
      ) : (
        <aside className="monthly-data-steps">
          <div className="monthly-data-steps__title">How export works</div>
          <ol className="monthly-data-steps__list">
            <li><span className="monthly-data-steps__num">1</span> Pick any month above.</li>
            <li><span className="monthly-data-steps__num">2</span> Click &quot;Export&quot; to get the .xlsx snapshot.</li>
            <li><span className="monthly-data-steps__num">3</span> Share or archive - downloading changes nothing in the system.</li>
          </ol>
        </aside>
      )}
    </section>
  );
}


