import React from 'react';

interface ScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  label?: string;
  sublabel?: string;
  showCategoryPills?: boolean;
  categoryScores?: {
    ui_ux: number;
    content: number;
    accessibility: number;
    performance: number;
  };
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({
  score,
  size = 'md',
  label,
  sublabel,
  showCategoryPills = false,
  categoryScores,
}) => {
  const getScoreColor = (val: number) => {
    if (val >= 80) {
      return {
        stroke: '#16A34A', // green-600
        text: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
        ring: 'ring-green-500',
      };
    }
    if (val >= 50) {
      return {
        stroke: '#F59E0B', // amber-500
        text: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        ring: 'ring-amber-500',
      };
    }
    return {
      stroke: '#DC2626', // red-600
      text: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      ring: 'ring-red-500',
    };
  };

  const getScoreVerdict = (val: number) => {
    if (val >= 80) return 'Good Quality';
    if (val >= 50) return 'Needs Improvement';
    return 'Critical Action Required';
  };

  const color = getScoreColor(score);

  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${color.bg} ${color.text} border ${color.border}`}>
        <span className="font-extrabold">{score}</span>
        <span className="text-[10px] opacity-75">/100</span>
      </div>
    );
  }

  if (size === 'md') {
    const radius = 26;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <div className="flex items-center gap-3">
        <div className="relative w-14 h-14 flex items-center justify-center">
          <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              className="text-slate-100"
            />
            <circle
              cx="32"
              cy="32"
              r={radius}
              stroke={color.stroke}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-black text-slate-800 leading-none">{score}</span>
          </div>
        </div>
        {label && (
          <div>
            <div className="text-xs font-bold text-slate-800">{label}</div>
            {sublabel && <div className="text-[11px] text-slate-500">{sublabel}</div>}
          </div>
        )}
      </div>
    );
  }

  // Hero Gauge (Large)
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Main Circular Score & Verdict */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-2">Overall Score</p>
            <div className="relative flex items-center justify-center">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  className="text-slate-100"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke={color.stroke}
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <span className="absolute text-4xl font-black text-slate-800">{score}</span>
            </div>
            <p className={`mt-3 text-xs font-bold ${color.text} px-3 py-1 ${color.bg} rounded-full border ${color.border}`}>
              {getScoreVerdict(score)}
            </p>
          </div>

          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Website Quality Assessment</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
              Weighted composite evaluating visual hierarchy, mobile responsiveness, semantic accessibility, and server latency.
            </p>
          </div>
        </div>

        {/* 4 Category Pill Breakdown */}
        {showCategoryPills && categoryScores && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
            <CategoryScoreBox
              title="UI / UX"
              score={categoryScores.ui_ux}
              description="Visual & Layout"
            />
            <CategoryScoreBox
              title="Content"
              score={categoryScores.content}
              description="Scannability & Copy"
            />
            <CategoryScoreBox
              title="Accessibility"
              score={categoryScores.accessibility}
              description="WCAG & Semantics"
            />
            <CategoryScoreBox
              title="Performance"
              score={categoryScores.performance}
              description="TTFB & Payload"
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface CategoryScoreBoxProps {
  title: string;
  score: number;
  description: string;
}

const CategoryScoreBox: React.FC<CategoryScoreBoxProps> = ({ title, score, description }) => {
  const getPillColor = (val: number) => {
    if (val >= 80) return { text: 'text-green-600', bg: 'bg-green-50/70', bar: 'bg-green-600' };
    if (val >= 50) return { text: 'text-amber-600', bg: 'bg-amber-50/70', bar: 'bg-amber-500' };
    return { text: 'text-red-600', bg: 'bg-red-50/70', bar: 'bg-red-600' };
  };

  const style = getPillColor(score);

  return (
    <div className={`p-3.5 rounded-lg border border-slate-200 ${style.bg} flex flex-col justify-between min-w-[125px] shadow-2xs`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{title}</span>
        <span className={`text-sm font-black ${style.text}`}>{score}</span>
      </div>
      <div className="w-full bg-slate-200/80 rounded-full h-1.5 my-1.5 overflow-hidden">
        <div className={`h-1.5 rounded-full ${style.bar}`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }}></div>
      </div>
      <span className="text-[10px] text-slate-500 truncate font-medium">{description}</span>
    </div>
  );
};

