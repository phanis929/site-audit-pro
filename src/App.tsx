/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar.js';
import { AuditInputForm } from './components/AuditInputForm.js';
import { ProgressIndicator } from './components/ProgressIndicator.js';
import { ReportView } from './components/ReportView.js';
import { AuditReport, AuditRequestPayload, ProgressUpdate } from './types.js';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [presetUrl, setPresetUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressUpdate>({
    stage: 'idle',
    message: '',
    progressPercent: 0,
  });

  const eventSourceRef = useRef<EventSource | null>(null);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleStartAudit = async (payload: AuditRequestPayload) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    setReport(null);

    // Extract domain for display
    let domain = payload.url.replace(/^https?:\/\//i, '').split('/')[0];
    setCurrentDomain(domain);

    setProgress({
      stage: 'discovering',
      message: `Connecting to ${domain} and initiating discovery scan...`,
      progressPercent: 10,
    });

    try {
      // 1. Send audit request to backend
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const result = await response.json();

      // If cached, return immediately
      if (result.cached && result.report) {
        setReport(result.report);
        setIsAnalyzing(false);
        setProgress({
          stage: 'completed',
          message: 'Loaded cached audit report!',
          progressPercent: 100,
        });
        return;
      }

      const auditId = result.id;

      // 2. Open Server-Sent Events (SSE) stream for live progress tracking
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(`/api/audit/stream/${encodeURIComponent(auditId)}`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const update: ProgressUpdate = JSON.parse(event.data);
          setProgress(update);

          if (update.stage === 'completed' && update.partialReport) {
            setReport(update.partialReport as AuditReport);
            setIsAnalyzing(false);
            es.close();
          } else if (update.stage === 'error') {
            setErrorMessage(update.error || update.message || 'Audit failed.');
            setIsAnalyzing(false);
            es.close();
          }
        } catch {
          // ignore parse error
        }
      };

      es.onerror = () => {
        // If SSE disconnects, try fetching report via poll endpoint
        setTimeout(async () => {
          try {
            const reportRes = await fetch(`/api/audit/${encodeURIComponent(auditId)}`);
            if (reportRes.ok) {
              const rData = await reportRes.json();
              if (rData.report) {
                setReport(rData.report);
                setIsAnalyzing(false);
                es.close();
                return;
              }
            }
          } catch {
            // ignore
          }
        }, 3000);
      };
    } catch (err: any) {
      console.error('Audit initiation failed:', err);
      setErrorMessage(err?.message || 'Failed to connect to audit engine.');
      setIsAnalyzing(false);
    }
  };

  const handleNewAudit = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    setReport(null);
    setIsAnalyzing(false);
    setErrorMessage(null);
    setProgress({ stage: 'idle', message: '', progressPercent: 0 });
  };

  const handleSelectSample = (sampleUrl: string) => {
    setPresetUrl(sampleUrl);
    setReport(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        onNewAudit={handleNewAudit}
        onSelectSample={handleSelectSample}
        isAnalyzing={isAnalyzing}
        hasReport={Boolean(report)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Error Banner */}
        {errorMessage && (
          <div className="max-w-3xl mx-auto mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider">Audit Encountered an Issue</h4>
                <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="px-2.5 py-1 rounded-md bg-red-100 hover:bg-red-200 text-red-900 text-xs font-semibold transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* State 1: In Progress Tracking */}
        {isAnalyzing ? (
          <ProgressIndicator progress={progress} domain={currentDomain} />
        ) : report ? (
          /* State 2: Completed Report View */
          <ReportView report={report} onNewAudit={handleNewAudit} />
        ) : (
          /* State 3: Input Form & Welcome View */
          <AuditInputForm
            onSubmit={handleStartAudit}
            isAnalyzing={isAnalyzing}
            initialUrl={presetUrl}
          />
        )}
      </main>

      {/* Professional Polish Standard Footer */}
      <footer className="h-12 bg-white border-t border-slate-200 flex items-center px-4 sm:px-8 justify-between text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          <span>SiteAudit Pro Engine Active</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span>Gemini 3.7 Vision Heuristics</span>
          <span>•</span>
          <span>Multi-Page Deep Crawler</span>
        </div>
      </footer>
    </div>
  );
}

