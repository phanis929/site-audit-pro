import React, { useState } from 'react';
import { Layers, AlertTriangle, AlertCircle, Info, Check, Copy, ArrowRight } from 'lucide-react';
import { SiteWidePattern, Severity } from '../types.js';

interface SiteWidePatternsSectionProps {
  patterns: SiteWidePattern[];
  onSelectPagePath?: (path: string) => void;
}

export const SiteWidePatternsSection: React.FC<SiteWidePatternsSectionProps> = ({
  patterns,
  onSelectPagePath,
}) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const handleCopyFix = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const filteredPatterns = patterns.filter(p => {
    if (filterSeverity === 'all') return true;
    return p.severity.toLowerCase() === filterSeverity.toLowerCase();
  });

  const getSeverityBadge = (severity: Severity) => {
    switch (severity) {
      case 'High':
        return (
          <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold border border-red-500/30 uppercase tracking-wider inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            High
          </span>
        );
      case 'Medium':
        return (
          <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-500/30 uppercase tracking-wider inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Medium
          </span>
        );
      case 'Low':
        return (
          <span className="bg-slate-500/20 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold border border-slate-500/30 uppercase tracking-wider inline-flex items-center gap-1">
            <Info className="w-3 h-3" />
            Low
          </span>
        );
    }
  };

  return (
    <section id="site-wide-patterns-section" className="bg-slate-900 text-white p-5 sm:p-6 rounded-xl border border-slate-800 shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center flex-shrink-0">
            <Layers className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold uppercase tracking-widest text-blue-400">
                Critical Site-Wide Patterns
              </h2>
              <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold border border-red-500/30 uppercase">
                {patterns.length} {patterns.length === 1 ? 'Pattern' : 'Patterns'} Found
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cross-page UX, architectural, and accessibility flaws recurring across 2 or more routes.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Filter:</span>
          {(['all', 'high', 'medium', 'low'] as const).map(sev => (
            <button
              key={sev}
              type="button"
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition-colors cursor-pointer ${
                filterSeverity === sev
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              {sev === 'all' ? `All (${patterns.length})` : sev}
            </button>
          ))}
        </div>
      </div>

      {/* Pattern Cards Grid */}
      {filteredPatterns.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs font-medium">
          No systemic patterns found matching the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          {filteredPatterns.map((pattern, idx) => (
            <div
              key={idx}
              id={`pattern-card-${idx}`}
              className="bg-white/5 p-4 rounded-lg border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                    {pattern.pattern}
                  </h4>
                  {getSeverityBadge(pattern.severity)}
                </div>

                <div className="text-[11px] text-slate-400 leading-relaxed mb-2.5">
                  <span className="font-semibold text-slate-300">Affected Pages: </span>
                  <div className="inline-flex flex-wrap gap-1 mt-1">
                    {pattern.affected_pages.map((pPath, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => onSelectPagePath && onSelectPagePath(pPath)}
                        className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-blue-600/40 text-slate-300 hover:text-white font-mono text-[11px] border border-white/10 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title="Jump to this page audit"
                      >
                        {pPath}
                        <ArrowRight className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-amber-200/90 leading-relaxed italic bg-amber-500/10 p-2.5 rounded border border-amber-500/20 mb-3">
                  <span className="font-bold text-amber-300 not-italic">Impact: </span>
                  {pattern.why_it_matters}
                </p>
              </div>

              {/* Actionable fix copy bar */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                <div className="text-[11px] text-emerald-300 font-medium line-clamp-2">
                  <span className="font-bold text-emerald-400">Fix: </span>
                  {pattern.suggested_fix}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyFix(pattern.suggested_fix, idx)}
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-bold flex items-center gap-1 flex-shrink-0 transition-colors cursor-pointer"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Copy Fix</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

