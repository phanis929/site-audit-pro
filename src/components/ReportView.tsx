import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Download,
  Share2,
  RefreshCw,
  ExternalLink,
  Clock,
  Globe,
  FileCheck,
  ChevronRight,
  AlertCircle,
  Sparkles,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { AuditReport } from '../types.js';
import { ScoreGauge } from './ScoreGauge.js';
import { SiteWidePatternsSection } from './SiteWidePatternsSection.js';
import { PageAuditCard } from './PageAuditCard.js';
import { exportReportToPDF } from '../utils/pdfExport.js';

interface ReportViewProps {
  report: AuditReport;
  onNewAudit: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ report, onNewAudit }) => {
  const [selectedPageTab, setSelectedPageTab] = useState<number>(0);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      setIsExportingPDF(true);
      await exportReportToPDF(report);
    } catch (err) {
      console.error('PDF export error:', err);
      // Fallback print dialog if PDF fails
      window.print();
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleShareReport = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleSelectPagePath = (path: string) => {
    const targetIdx = report.pages.findIndex(p => p.path === path || p.path.toLowerCase() === path.toLowerCase());
    if (targetIdx !== -1) {
      setSelectedPageTab(targetIdx);
      const targetElement = document.getElementById('per-page-breakdown-section');
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Count total high severity findings
  let highSeverityCount = report.site_wide_patterns.filter(p => p.severity === 'High').length;
  report.pages.forEach(p => {
    ['ui_ux', 'content', 'accessibility', 'performance'].forEach(catKey => {
      const cat = p.categories?.[catKey as keyof typeof p.categories];
      if (cat?.findings) {
        highSeverityCount += cat.findings.filter(f => f.severity === 'High').length;
      }
    });
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-12"
    >
      {/* Top Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold shadow-2xs">
            <Globe className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {report.domain}
              </h1>
              <a
                href={report.root_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-0.5 font-medium"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>{new Date(report.created_at).toLocaleDateString()}</span>
              <span>•</span>
              <span>{report.total_pages_analyzed} Pages Audited</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {report.execution_time_seconds}s Scan
              </span>
            </div>
          </div>
        </div>

        {/* Export & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="download-pdf-btn"
            type="button"
            onClick={handleDownloadPDF}
            disabled={isExportingPDF}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Download className="w-4 h-4 text-blue-400" />
            {isExportingPDF ? 'Generating PDF...' : 'Download as PDF'}
          </button>

          <button
            type="button"
            onClick={handleShareReport}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            {isCopied ? 'Link Copied!' : 'Share'}
          </button>

          <button
            type="button"
            onClick={onNewAudit}
            className="px-3.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
            Re-Audit
          </button>
        </div>
      </div>

      {/* 1. Overall Score & Category Health */}
      <ScoreGauge
        score={report.site_score}
        size="hero"
        showCategoryPills={true}
        categoryScores={report.category_averages}
      />

      {/* Executive Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          Executive Audit Summary
        </h3>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal">
          {report.summary}
        </p>

        {/* Quick stat banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 text-center">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pages Analyzed</span>
            <span className="text-lg font-black text-slate-900">{report.total_pages_analyzed}</span>
          </div>
          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Site-Wide Patterns</span>
            <span className="text-lg font-black text-blue-950">{report.site_wide_patterns.length}</span>
          </div>
          <div className="p-3 rounded-lg bg-red-50/70 border border-red-200">
            <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">High Severity Issues</span>
            <span className="text-lg font-black text-red-950">{highSeverityCount}</span>
          </div>
          <div className="p-3 rounded-lg bg-green-50/70 border border-green-200">
            <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider block">Accessibility Avg</span>
            <span className="text-lg font-black text-green-950">{report.category_averages.accessibility}%</span>
          </div>
        </div>
      </div>

      {/* 2. SITE-WIDE PATTERNS SECTION (Highest Value Section First) */}
      <SiteWidePatternsSection
        patterns={report.site_wide_patterns}
        onSelectPagePath={handleSelectPagePath}
      />

      {/* 3. PER-PAGE BREAKDOWN SECTION */}
      <section id="per-page-breakdown-section" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2 h-4 bg-blue-600 rounded-xs"></span>
              Individual Page Breakdown
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Deep dive into specific UI, content, accessibility, and performance findings per route.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full self-start">
            {report.pages.length} Pages Sampled
          </span>
        </div>

        {/* Page selector tabs */}
        <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-2xs flex items-center gap-1.5 overflow-x-auto">
          {report.pages.map((page, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedPageTab(idx)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                selectedPageTab === idx
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
              }`}
            >
              <span className="font-mono">{page.path}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  selectedPageTab === idx ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {page.score}
              </span>
            </button>
          ))}
        </div>

        {/* Active Page Audit Card */}
        {report.pages[selectedPageTab] && (
          <PageAuditCard
            page={report.pages[selectedPageTab]}
            pageIndex={selectedPageTab}
          />
        )}
      </section>

      {/* All Analyzed Pages Quick Jump List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest font-bold text-slate-500">
            Analyzed Pages ({report.pages.length})
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">Click to navigate</span>
        </div>

        <div className="divide-y divide-slate-100">
          {report.pages.map((p, idx) => (
            <div
              key={idx}
              onClick={() => {
                setSelectedPageTab(idx);
                const elem = document.getElementById('per-page-breakdown-section');
                if (elem) elem.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`p-3.5 flex items-center justify-between transition-colors cursor-pointer border-l-4 ${
                selectedPageTab === idx
                  ? 'border-blue-600 bg-blue-50/60 text-blue-800 font-semibold'
                  : 'border-transparent hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="overflow-hidden pr-2">
                <span className="font-mono text-xs font-bold block truncate">{p.path}</span>
                <span className="text-[11px] text-slate-500 block truncate">{p.signals?.title || p.url}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                    p.score >= 80 ? 'bg-green-50 text-green-700 border-green-200' : p.score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {p.score}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MANDATORY DISCLAIMER FOOTER */}
      <footer id="report-disclaimer-footer" className="mt-10 pt-6 border-t border-slate-200 text-center">
        <div className="max-w-2xl mx-auto p-4 rounded-xl bg-slate-100/90 border border-slate-200 text-xs text-slate-600 leading-relaxed">
          <div className="flex items-center justify-center gap-1.5 font-bold text-slate-800 mb-1">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            Audit Scope & Methodology Disclaimer
          </div>
          <p className="text-[11px] text-slate-600">
            This is an AI-generated directional review, not a substitute for a full accessibility (WCAG) or performance (Lighthouse) audit. Visual UI heuristics, content clarity, and technical cues are gathered courtesy of automated discovery and Gemini 3.7 Vision evaluation.
          </p>
        </div>
      </footer>
    </motion.div>
  );
};

