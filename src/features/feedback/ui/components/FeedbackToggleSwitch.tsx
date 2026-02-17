import React from 'react';
import type { FeedbackToggleSwitchProps } from '../types';

export default function FeedbackToggleSwitch({ id, name, checked, onChange }: FeedbackToggleSwitchProps) {
  return (
    <div className="relative inline-flex items-center">
      <input id={id} type="checkbox" name={name} checked={checked} onChange={onChange} className="peer sr-only" />
      <div className="h-5 w-9 rounded-full bg-slate-300 transition-colors peer-checked:bg-blue-600 dark:bg-slate-600" />
      <div
        className={`absolute left-1 top-1 h-3 w-3 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`}
      />
    </div>
  );
}
