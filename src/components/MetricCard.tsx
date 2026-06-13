import React, { useState } from 'react';
import { CircleCheck, Info, Lightbulb } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  caption?: string;
  icon: React.ReactNode;
  trend?: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'slate';
  description?: string;
  formula?: string;
  warning?: string;
}

const toneClass = {
  blue: 'bg-gradient-to-br from-blue-500 to-blue-700 text-white border-none shadow-sm shadow-blue-950/20',
  emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-none shadow-sm shadow-emerald-950/20',
  amber: 'bg-gradient-to-br from-amber-500 to-amber-700 text-white border-none shadow-sm shadow-amber-950/20',
  slate: 'bg-gradient-to-br from-slate-600 to-slate-800 text-white border-none shadow-sm shadow-slate-950/20',
};

const MetricCard: React.FC<MetricCardProps> = ({ label, value, caption, icon, trend, tone = 'blue', description, formula, warning }) => {
  const [tooltipOpen, setTooltipOpen] = useState(false);

  return (
    <div className="panel p-5 transition hover:border-slate-300">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {warning ? (
              <Lightbulb size={13} className="shrink-0 text-amber-500" />
            ) : (
              <CircleCheck size={13} className="shrink-0 text-emerald-500" />
            )}
            <div className="text-xs font-semibold uppercase text-slate-500 tracking-[.04em]">{label}</div>
            {(description || formula) && (
              <div
                className="group relative"
                onMouseEnter={() => setTooltipOpen(true)}
                onMouseLeave={() => setTooltipOpen(false)}
                onFocus={() => setTooltipOpen(true)}
                onBlur={() => setTooltipOpen(false)}
                onClick={() => setTooltipOpen(prev => !prev)}
                role="button"
                tabIndex={0}
                aria-describedby={`tooltip-${label}`}
              >
                <Info size={14} className="text-slate-400" />
                <div
                  id={`tooltip-${label}`}
                  role="tooltip"
                  className={`pointer-events-none absolute left-1/2 top-6 z-50 w-72 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-medium leading-5 text-slate-600 shadow-lg shadow-slate-950/10 transition ${tooltipOpen ? 'opacity-100' : 'opacity-0'}`}
                >
                  {description && <div>{description}</div>}
                  {formula && (
                    <div className="mt-2 rounded-md bg-slate-50 p-2 font-semibold text-slate-700">
                      Công thức: {formula}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 break-words text-[26px] font-bold leading-tight tracking-tight text-slate-950">{value}</div>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${toneClass[tone]}`}>
          {icon}
        </div>
      </div>

      {(caption || trend) && (
        <div className="mt-4 flex min-h-6 items-center justify-between gap-3 border-t border-slate-100 pt-3">
          {caption && <span className="text-sm font-medium text-slate-500">{caption}</span>}
          {trend && (
            <span className="status-badge border-emerald-200 bg-emerald-50 text-emerald-700">
              {trend}
            </span>
          )}
        </div>
      )}

      {warning && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs font-medium leading-5 text-amber-700">
          <Lightbulb size={14} className="mt-0.5 shrink-0" />
          <span>{warning}</span>
        </div>
      )}
    </div>
  );
};

export default React.memo(MetricCard);
