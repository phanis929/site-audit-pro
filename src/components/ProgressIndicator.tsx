import React from 'react';
import { motion } from 'motion/react';
import {
  Search,
  Camera,
  Layers,
  Sparkles,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  Zap,
  Eye,
  Workflow,
} from 'lucide-react';
import { ProgressUpdate, AuditProgressStage } from '../types.js';

interface ProgressIndicatorProps {
  progress: ProgressUpdate;
  domain: string;
}

const STEPS: {
  id: AuditProgressStage;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'discovering',
    label: 'Discovering Pages',
    sublabel: 'Scanning sitemaps, internal links & routes',
    icon: Search,
  },
  {
    id: 'screenshots',
    label: 'Capturing Screenshots',
    sublabel: 'Full-page viewport rendering',
    icon: Camera,
  },
  {
    id: 'reading_signals',
    label: 'Reading Page Signals',
    sublabel: 'Extracting DOM, alt text & metadata',
    icon: FileSpreadsheet,
  },
  {
    id: 'auditing_pages',
    label: 'Running Visual & Content Audit',
    sublabel: 'Gemini 3.7 Vision layout & copy evaluation',
    icon: Sparkles,
  },
  {
    id: 'checking_accessibility',
    label: 'Checking Accessibility',
    sublabel: 'Alt coverage, viewport & H1-H3 hierarchy',
    icon: Eye,
  },
  {
    id: 'checking_performance',
    label: 'Checking Performance Signals',
    sublabel: 'Measuring TTFB latency & HTML payload size',
    icon: Zap,
  },
  {
    id: 'site_wide_patterns',
    label: 'Finding Site-Wide Patterns',
    sublabel: 'Cross-page correlation & systemic synthesis',
    icon: Layers,
  },
  {
    id: 'compiling',
    label: 'Compiling Report',
    sublabel: 'Calculating scores & executive takeaways',
    icon: Workflow,
  },
];

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ progress, domain }) => {
  // Map stage to step index
  const getStageIndex = (stage: AuditProgressStage): number => {
    switch (stage) {
      case 'discovering':
        return 0;
      case 'screenshots':
        return 1;
      case 'reading_signals':
        return 2;
      case 'auditing_pages':
        return 3;
      case 'checking_accessibility':
        return 4;
      case 'checking_performance':
        return 5;
      case 'site_wide_patterns':
        return 6;
      case 'compiling':
        return 7;
      case 'completed':
        return 8;
      default:
        return 0;
    }
  };

  const currentIndex = getStageIndex(progress.stage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden p-6 sm:p-8"
    >
      {/* Top Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          Analyzing {domain}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Website Audit in Progress
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-lg mx-auto">
          {progress.message || 'Discovering routes, taking snapshots, and evaluating site-wide heuristics...'}
        </p>

        {/* Live Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 mt-5 overflow-hidden border border-slate-200">
          <motion.div
            className="bg-blue-600 h-full rounded-full"
            initial={{ width: '5%' }}
            animate={{ width: `${Math.max(8, progress.progressPercent || 10)}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between items-center text-xs text-slate-500 mt-2 font-medium">
          <span>{progress.currentPage ? `Currently processing: ${progress.currentPage}` : 'Pipeline active'}</span>
          <span className="font-bold text-slate-700">{progress.progressPercent || 10}%</span>
        </div>
      </div>

      {/* Sequential Steps List */}
      <div className="space-y-2.5">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isDone = idx < currentIndex || progress.stage === 'completed';
          const isCurrent = idx === currentIndex && progress.stage !== 'completed';

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-4 ${
                isCurrent
                  ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400/20'
                  : isDone
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-white border-slate-100 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold ${
                        isCurrent
                          ? 'text-blue-950'
                          : isDone
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-200 text-blue-800 tracking-wider">
                        Running
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 block">{step.sublabel}</span>
                </div>
              </div>

              <div className="text-right">
                {isDone && (
                  <span className="text-xs font-bold text-emerald-700">
                    Done
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

