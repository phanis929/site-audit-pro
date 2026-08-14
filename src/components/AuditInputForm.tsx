import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Globe,
  Sliders,
  Plus,
  X,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  FileCode,
  Layers,
  Zap,
} from 'lucide-react';
import { AuditRequestPayload } from '../types.js';

interface AuditInputFormProps {
  onSubmit: (payload: AuditRequestPayload) => void;
  isAnalyzing: boolean;
  initialUrl?: string;
}

export const AuditInputForm: React.FC<AuditInputFormProps> = ({
  onSubmit,
  isAnalyzing,
  initialUrl = '',
}) => {
  const [url, setUrl] = useState(initialUrl);
  const [maxPages, setMaxPages] = useState<number>(5);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [specificPagesInput, setSpecificPagesInput] = useState<string>('');
  const [specificPages, setSpecificPages] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Update url when initialUrl changes (e.g. from navbar preset)
  React.useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
      setValidationError(null);
    }
  }, [initialUrl]);

  const handleAddPath = () => {
    const trimmed = specificPagesInput.trim();
    if (!trimmed) return;
    const cleanPath = trimmed.startsWith('/') || trimmed.startsWith('http') ? trimmed : `/${trimmed}`;
    if (!specificPages.includes(cleanPath)) {
      setSpecificPages([...specificPages, cleanPath]);
    }
    setSpecificPagesInput('');
  };

  const handleRemovePath = (pathToRemove: string) => {
    setSpecificPages(specificPages.filter(p => p !== pathToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnalyzing) return;

    const trimmed = url.trim();
    if (!trimmed) {
      setValidationError('Please enter a website URL (e.g., example.com or https://company.com).');
      return;
    }

    // Basic URL validation
    let valid = false;
    try {
      const formatted = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      const parsed = new URL(formatted);
      if (parsed.hostname.includes('.') && parsed.hostname.length > 3) {
        valid = true;
      }
    } catch {
      valid = false;
    }

    if (!valid) {
      setValidationError('Please enter a valid website domain or URL (e.g. stripe.com or https://linear.app).');
      return;
    }

    setValidationError(null);

    // Merge any pending path in input
    let finalSpecific = [...specificPages];
    if (specificPagesInput.trim()) {
      const p = specificPagesInput.trim();
      const cleanPath = p.startsWith('/') || p.startsWith('http') ? p : `/${p}`;
      if (!finalSpecific.includes(cleanPath)) {
        finalSpecific.push(cleanPath);
      }
    }

    onSubmit({
      url: trimmed,
      maxPages: Math.min(Math.max(1, maxPages), 8),
      specificPages: finalSpecific,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      {/* Hero Headline */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-4 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          Autonomous Multi-Page UX & Quality Audit
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
          Audit an entire website in seconds.
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-3 max-w-2xl mx-auto font-normal leading-relaxed">
          Submit one root URL. SiteAudit Pro automatically discovers key routes, captures screenshots, inspects technical signals, and identifies site-wide UX flaws.
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-md p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Main URL Input Bar */}
          <div>
            <label htmlFor="website-url-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Target Website Root URL
            </label>
            <div className="relative flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Globe className="w-5 h-5" />
                </div>
                <input
                  id="website-url-input"
                  type="text"
                  value={url}
                  onChange={e => {
                    setUrl(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="e.g. stripe.com, linear.app, or https://mywebsite.com"
                  disabled={isAnalyzing}
                  className="w-full pl-11 pr-4 py-3.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 font-medium text-sm sm:text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              <button
                id="analyze-submit-btn"
                type="submit"
                disabled={isAnalyzing}
                className="px-6 sm:px-8 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
              >
                {isAnalyzing ? (
                  <span>Analyzing...</span>
                ) : (
                  <>
                    <span>Run Site Audit</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {validationError && (
              <p className="text-xs font-semibold text-red-600 mt-2 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                {validationError}
              </p>
            )}
          </div>

          {/* Quick Preset Sites */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 pt-1">
            <span className="font-semibold text-slate-600">Quick Test:</span>
            {[
              { label: 'Stripe', domain: 'stripe.com' },
              { label: 'Linear', domain: 'linear.app' },
              { label: 'Tailwind CSS', domain: 'tailwindcss.com' },
              { label: 'Vercel', domain: 'vercel.com' },
              { label: 'Supabase', domain: 'supabase.com' },
            ].map(preset => (
              <button
                key={preset.domain}
                type="button"
                onClick={() => {
                  setUrl(preset.domain);
                  setValidationError(null);
                }}
                disabled={isAnalyzing}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium border border-slate-200 transition-colors cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Advanced Controls Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              {showAdvanced ? 'Hide Discovery & Page Settings' : 'Customize Max Pages & Specific Routes'}
            </button>

            {/* Collapsible Advanced Settings */}
            {showAdvanced && (
              <div className="mt-4 p-4 sm:p-5 rounded-lg bg-slate-50 border border-slate-200 space-y-4">
                {/* Max Pages selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      Max Pages to Scan
                      <span className="text-[10px] font-normal lowercase text-slate-400">(courtesy crawl cap)</span>
                    </label>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {maxPages} Pages Max
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:w-72">
                    {[3, 5, 8].map(count => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setMaxPages(count)}
                        className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          maxPages === count
                            ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                        }`}
                      >
                        {count} Pages {count === 5 ? '(Default)' : ''}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    We automatically prioritize representative routes like Homepage, About, Pricing, Contact, and Products.
                  </p>
                </div>

                {/* Specific Pages field */}
                <div className="pt-3 border-t border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Guaranteed Specific Pages <span className="text-[10px] font-normal lowercase text-slate-400">(Optional paths to force inclusion)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={specificPagesInput}
                      onChange={e => setSpecificPagesInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddPath();
                        }
                      }}
                      placeholder="e.g. /pricing, /contact, /checkout"
                      className="flex-1 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs text-slate-800 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                    <button
                      type="button"
                      onClick={handleAddPath}
                      className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Route
                    </button>
                  </div>

                  {/* List of custom paths */}
                  {specificPages.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                      {specificPages.map((path, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-xs font-mono font-medium"
                        >
                          {path}
                          <button
                            type="button"
                            onClick={() => handleRemovePath(path)}
                            className="text-blue-500 hover:text-blue-800 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Feature Value Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Multi-Page Discovery</h4>
          <p className="text-xs text-slate-500 mt-1">Discovers sitemap & internal routes automatically.</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2.5 font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Gemini 3.7 Vision</h4>
          <p className="text-xs text-slate-500 mt-1">Real multimodal visual evaluation + factual signals.</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 font-bold">
            <Zap className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Site-Wide Patterns</h4>
          <p className="text-xs text-slate-500 mt-1">Surfaces recurring UX and semantic issues first.</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2.5 font-bold">
            <FileCode className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">PDF Executive Export</h4>
          <p className="text-xs text-slate-500 mt-1">Full branded report with screenshots & action plan.</p>
        </div>
      </div>
    </motion.div>
  );
};

