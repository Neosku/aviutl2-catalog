import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import type { StepIndicatorProps } from '../types';

export default function StepIndicator({ step, installed }: StepIndicatorProps) {
  const steps = useMemo(
    () => [
      { id: 'intro', label: '開始' },
      { id: 'installStatus', label: 'インストールの状況' },
      { id: 'details', label: installed ? 'フォルダの指定' : 'インストール' },
      { id: 'packages', label: '推奨パッケージ' },
      { id: 'done', label: '完了' },
    ],
    [installed],
  );

  const currentIndex = steps.findIndex((item) => item.id === step);
  const progressStyle = useMemo(
    () => ({ width: `${(currentIndex / (steps.length - 1)) * 100}%` }),
    [currentIndex, steps.length],
  );

  return (
    <div className="w-full px-10 pt-8 pb-10 shrink-0 z-10 relative">
      <div className="flex items-start justify-between max-w-lg mx-auto relative">
        <div className="absolute left-[14px] right-[14px] top-[13px] h-[2px] -z-10">
          <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 rounded-full" />
          <div
            className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-500 ease-out rounded-full"
            style={progressStyle}
          />
        </div>

        {steps.map((item, index) => {
          const isActive = item.id === step;
          const isCompleted = currentIndex > index;

          return (
            <div key={item.id} className="relative flex flex-col items-center group cursor-default">
              <div
                className={`
                  relative flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold transition-colors duration-300 z-10 border-2
                  ${
                    isActive
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : isCompleted
                        ? 'bg-white dark:bg-slate-900 border-blue-600 text-blue-600'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'
                  }
                `}
              >
                {isCompleted ? <Check size={14} strokeWidth={4} /> : index + 1}
              </div>

              <span
                className={`
                  absolute top-8 left-1/2 -translate-x-1/2 w-max
                  text-[10.5px] font-bold tracking-wide transition-colors duration-300 whitespace-nowrap
                  ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-600'}
                `}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
