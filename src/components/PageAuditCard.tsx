import React, { useState } from 'react';
import {
  ExternalLink,
  Layers,
  FileText,
  Eye,
  Zap,
  AlertTriangle,
  AlertCircle,
  Info,
  Maximize2,
  X,
  Clock,
  HardDrive,
  Image as ImageIcon,
  Smartphone,
  ShieldCheck,
  Check,
  Copy,
} from 'lucide-react';
import { PageAudit, Finding, Severity } from '../types.js';
import { ScoreGauge } from './ScoreGauge.js';

interface PageAuditCardProps {
  page: PageAudit;
  pageIndex: number;
}

type ActiveCategory = 'ui_ux' | 'content' | 'accessibility' | 'performance' | 'signals';

export const PageAuditCard: React.FC<PageAuditCardProps> = ({ page, pageIndex }) => {
  const [activeTab, setActiveTab] = useState<ActiveCategory>('ui_ux');
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [copiedFindingIdx, setCopiedFindingIdx] = useState<number | null>(null);

  const handleCopyFinding = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedFindingIdx(idx);
    setTimeout(() => setCopiedFindingIdx(null), 2000);
  };

  const getSeverityIconBadge = (severity: Severity) => {
    switch (severity) {
      case 'High':
        return (
          <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 shadow-2xs">
            !
          </div>
        );
      case 'Medium':
        return (
          <div className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 shadow-2xs">
            ▲
          </div>
        );
      case 'Low':
        return (
          <div className="w-6 h-6 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 shadow-2xs">
            i
          </div>
        );
    }
  };

  const getScorePill = (score: number) => {
    if (score >= 80) return 'bg-green-50 text-green-700 border-green-200';
    if (score >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const currentCategoryData =
    activeTab !== 'signals' ? page.categories?.[activeTab] : null;

  return (
    <div
      id={`page-audit-${pageIndex}`}
      className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
    >
      {/* Top Page Header */}
      <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-2 h-5 bg-blue-600 rounded-xs"></span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-800 flex items-center">
                Page Report: <span className="font-mono text-blue-600 ml-1.5">{page.path}</span>
              </h3>
              <a
                href={page.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1 transition-colors"
              >
                <span>{page.url}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium line-clamp-1">
              {page.signals?.title || 'No Title Tag'}
            </p>
          </div>
        </div>

        {/* Page Overall Score Badge */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Page Score</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getScorePill(page.score)}`}>
              {page.score >= 80 ? 'Good' : page.score >= 50 ? 'Needs Fix' : 'Critical'}
            </span>
          </div>
          <ScoreGauge score={page.score} size="md" />
        </div>
      </div>

      {/* Main Content Area: Side-by-Side with Screenshot & Category Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Left Column: Live Screenshot & Key Signals */}
        <div className="lg:col-span-5 p-5 bg-slate-50/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                Live Page View
              </span>
              {page.screenshot_url && !imageLoadError && (
                <button
                  type="button"
                  onClick={() => setIsScreenshotModalOpen(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  Expand View
                </button>
              )}
            </div>

            {/* Screenshot Frame */}
            <div className="relative rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs group">
              {page.screenshot_url && !imageLoadError ? (
                <div
                  className="cursor-pointer relative overflow-hidden bg-slate-100 max-h-64"
                  onClick={() => setIsScreenshotModalOpen(true)}
                >
                  <img
                    src={`/api/proxy-image?url=${encodeURIComponent(page.screenshot_url)}`}
                    alt={`Screenshot of ${page.path}`}
                    referrerPolicy="no-referrer"
                    onError={() => setImageLoadError(true)}
                    className="w-full object-top object-cover group-hover:scale-101 transition-transform duration-300"
                    style={{ minHeight: '160px' }}
                  />
                  <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/20 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 bg-slate-900/85 text-white text-xs font-semibold px-3 py-1 rounded-full transition-opacity flex items-center gap-1.5 shadow-md">
                      <Maximize2 className="w-3 h-3" /> Zoom Screenshot
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-100/60">
                  <ImageIcon className="w-7 h-7 text-slate-400 mx-auto mb-2 opacity-70" />
                  <p className="text-xs text-slate-500 font-medium">Visual DOM snapshot processed</p>
                  <span className="text-[10px] text-slate-400 block mt-1">Direct HTML structure audited</span>
                </div>
              )}
            </div>

            {/* Signals Strip */}
            <div className="grid grid-cols-2 gap-2 mt-3.5">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Response Time</span>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {page.signals?.response_time_ms} ms
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Page Size</span>
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                  <HardDrive className="w-3 h-3 text-slate-400" />
                  {page.signals?.page_size_kb} KB
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Alt Text Coverage</span>
                <span className={`text-xs font-bold flex items-center gap-1 mt-0.5 ${page.signals?.alt_coverage_percentage >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
                  <ImageIcon className="w-3 h-3" />
                  {page.signals?.alt_coverage_percentage}% ({page.signals?.images_with_alt}/{page.signals?.total_images})
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Mobile Viewport</span>
                <span className={`text-xs font-bold flex items-center gap-1 mt-0.5 ${page.signals?.has_viewport ? 'text-green-600' : 'text-red-600'}`}>
                  <Smartphone className="w-3 h-3" />
                  {page.signals?.has_viewport ? 'Configured' : 'Missing!'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('signals')}
            className={`mt-3.5 w-full py-2 px-3 rounded-lg text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'signals'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            View Technical Signals ({page.signals?.h1_count} H1s, Meta, SSL)
          </button>
        </div>

        {/* Right Column: Category Tabs & Findings */}
        <div className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between">
          {/* Category Tabs Header */}
          <div className="flex items-center gap-1.5 pb-3.5 border-b border-slate-100 overflow-x-auto">
            <CategoryTabButton
              active={activeTab === 'ui_ux'}
              onClick={() => setActiveTab('ui_ux')}
              label="UI & UX"
              score={page.categories?.ui_ux?.score}
              icon={<Layers className="w-3.5 h-3.5" />}
            />
            <CategoryTabButton
              active={activeTab === 'content'}
              onClick={() => setActiveTab('content')}
              label="Content"
              score={page.categories?.content?.score}
              icon={<FileText className="w-3.5 h-3.5" />}
            />
            <CategoryTabButton
              active={activeTab === 'accessibility'}
              onClick={() => setActiveTab('accessibility')}
              label="Accessibility"
              score={page.categories?.accessibility?.score}
              icon={<Eye className="w-3.5 h-3.5" />}
            />
            <CategoryTabButton
              active={activeTab === 'performance'}
              onClick={() => setActiveTab('performance')}
              label="Performance"
              score={page.categories?.performance?.score}
              icon={<Zap className="w-3.5 h-3.5" />}
            />
          </div>

          {/* Active Tab Content */}
          <div className="mt-4 flex-1">
            {activeTab === 'signals' ? (
              /* Technical Signals Details View */
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  Extracted Raw Technical Signals
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-[10px] text-slate-400 uppercase block mb-1">Page Title Tag</span>
                    <p className="text-slate-800 font-medium">{page.signals?.title || 'No Title'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-[10px] text-slate-400 uppercase block mb-1">Meta Description</span>
                    <p className="text-slate-800 font-medium">
                      {page.signals?.meta_description || 'No Meta Description found'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-[10px] text-slate-400 uppercase block mb-1">Heading Structure</span>
                    <p className="text-slate-800 font-medium">
                      {page.signals?.h1_count} H1s, {page.signals?.h2_count} H2s, {page.signals?.h3_count} H3s
                      {page.signals?.h1_samples?.length ? ` (H1: "${page.signals.h1_samples[0]}")` : ''}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="font-bold text-[10px] text-slate-400 uppercase block mb-1">Security & Protocol</span>
                    <p className="text-slate-800 font-medium">
                      HTTPS: {page.signals?.is_https ? 'Active (Secure)' : 'Not HTTPS'} • Favicon: {page.signals?.has_favicon ? 'Detected' : 'Missing'}
                    </p>
                  </div>
                </div>
              </div>
            ) : currentCategoryData ? (
              /* Category Findings List */
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    {currentCategoryData.findings?.length || 0} Findings for {activeTab.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    Score: <span className="text-blue-600 font-black">{currentCategoryData.score}/100</span>
                  </span>
                </div>

                <div className="space-y-2.5">
                  {currentCategoryData.findings?.map((finding: Finding, fIdx: number) => (
                    <div
                      key={fIdx}
                      className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs"
                    >
                      <div className="flex items-start gap-2.5 mb-1.5">
                        {getSeverityIconBadge(finding.severity)}
                        <div className="flex-1">
                          <h5 className="text-xs font-bold text-slate-800 leading-snug">
                            {finding.issue}
                          </h5>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                            <span className="font-semibold text-slate-700">Why it matters: </span>
                            {finding.why_it_matters}
                          </p>
                        </div>
                      </div>

                      {/* Actionable recommendation block */}
                      <div className="mt-2 pl-8">
                        <div className="p-2.5 rounded-md bg-emerald-50/80 text-emerald-950 border border-emerald-200/70 text-[11px] font-medium flex items-center justify-between gap-2">
                          <p className="leading-relaxed">
                            <span className="font-bold text-emerald-800">Recommendation: </span>
                            {finding.suggested_fix}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleCopyFinding(finding.suggested_fix, fIdx)}
                            className="p-1 rounded text-emerald-700 hover:bg-emerald-100 transition-colors flex-shrink-0"
                            title="Copy fix recommendation"
                          >
                            {copiedFindingIdx === fIdx ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-emerald-600" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Screenshot Modal */}
      {isScreenshotModalOpen && page.screenshot_url && (
        <div
          id="screenshot-modal"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsScreenshotModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-200 rounded text-slate-800">{page.path}</span>
                <span className="text-xs text-slate-500 font-medium truncate max-w-md">{page.url}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsScreenshotModalOpen(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 bg-slate-100 flex items-center justify-center">
              <img
                src={`/api/proxy-image?url=${encodeURIComponent(page.screenshot_url)}`}
                alt={`Screenshot of ${page.path}`}
                className="max-w-full h-auto rounded border border-slate-200 shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CategoryTabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  score?: number;
  icon: React.ReactNode;
}

const CategoryTabButton: React.FC<CategoryTabButtonProps> = ({
  active,
  onClick,
  label,
  score,
  icon,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
        active
          ? 'bg-blue-600 text-white shadow-2xs'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
      }`}
    >
      {icon}
      <span>{label}</span>
      {score !== undefined && (
        <span
          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
            active ? 'bg-blue-800 text-blue-100' : 'bg-white text-slate-800 border border-slate-200'
          }`}
        >
          {score}
        </span>
      )}
    </button>
  );
};

