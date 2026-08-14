import React from 'react';
import { Search, Sparkles, RefreshCw, Globe, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  onNewAudit: () => void;
  onSelectSample: (url: string) => void;
  isAnalyzing: boolean;
  hasReport: boolean;
  currentDomain?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNewAudit,
  onSelectSample,
  isAnalyzing,
  hasReport,
  currentDomain,
}) => {
  return (
    <header id="site-header" className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div
          id="brand-logo"
          onClick={onNewAudit}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold italic shadow-xs group-hover:bg-blue-700 transition-colors">
            S
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              SiteAudit <span className="text-blue-600">Pro</span>
            </h1>
          </div>
        </div>

        {/* Center / Right status & action buttons */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Active audited URL pill */}
          {hasReport && currentDomain && !isAnalyzing && (
            <div className="hidden md:flex items-center px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200 text-sm font-medium text-slate-700 shadow-2xs">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
              <span className="truncate max-w-[220px]">https://{currentDomain}</span>
            </div>
          )}

          {/* Quick sample sites when on input screen */}
          {!hasReport && !isAnalyzing && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 mr-1">
              <span className="flex items-center gap-1 font-semibold text-slate-600">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Samples:
              </span>
              <button
                id="sample-stripe-btn"
                type="button"
                onClick={() => onSelectSample('stripe.com')}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-200 transition-colors"
              >
                stripe.com
              </button>
              <button
                id="sample-linear-btn"
                type="button"
                onClick={() => onSelectSample('linear.app')}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-200 transition-colors"
              >
                linear.app
              </button>
              <button
                id="sample-tailwind-btn"
                type="button"
                onClick={() => onSelectSample('tailwindcss.com')}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-200 transition-colors"
              >
                tailwindcss.com
              </button>
            </div>
          )}

          {/* Action button */}
          {hasReport && !isAnalyzing ? (
            <button
              id="header-new-audit-btn"
              type="button"
              onClick={onNewAudit}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              New Audit
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              AI Vision Ready
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

