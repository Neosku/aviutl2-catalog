/**
 * タグ編集コンポーネント
 */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { normalizeArrayText } from '../../model/helpers';
import type { TagEditorProps } from '../types';
const TagEditor = memo(function TagEditor({ initialTags, suggestions = [], onChange }: TagEditorProps) {
  const [tags, setTags] = useState(() => normalizeArrayText(initialTags));
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const normalized = normalizeArrayText(initialTags);
    setTags(normalized);
    setInputValue('');
  }, [initialTags]);

  const handleAddTagsFromInput = useCallback(
    (text: string) => {
      const parts = String(text || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      if (!parts.length) {
        setInputValue('');
        return;
      }
      const next = [...tags];
      let updated = false;
      parts.forEach((tag) => {
        if (!next.includes(tag)) {
          next.push(tag);
          updated = true;
        }
      });
      if (updated) {
        setTags(next);
        onChange?.(next);
      }
      setInputValue('');
    },
    [tags, onChange],
  );

  const handleToggleTag = useCallback(
    (tag: string) => {
      if (tags.includes(tag)) {
        const next = tags.filter((t) => t !== tag);
        setTags(next);
        onChange?.(next);
        return;
      }
      handleAddTagsFromInput(tag);
    },
    [handleAddTagsFromInput, onChange, tags],
  );

  const handleRemoveTag = useCallback(
    (tag: string) => {
      const next = tags.filter((t) => t !== tag);
      setTags(next);
      onChange?.(next);
    },
    [tags, onChange],
  );

  const handleTagInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      handleAddTagsFromInput(inputValue);
    },
    [handleAddTagsFromInput, inputValue],
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="tags-input">
        タグ
      </label>
      <div
        className="flex min-h-[42px] flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm transition focus-within:ring-2 focus-within:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
        onClick={() => inputRef.current?.focus()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.focus();
          }
        }}
        tabIndex={0}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex animate-in fade-in zoom-in duration-200 items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-sm font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          >
            <span className="max-w-[160px] truncate">{tag}</span>
            <button
              type="button"
              className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-600 dark:hover:text-slate-200"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveTag(tag);
              }}
              aria-label={`${tag} を削除`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id="tags-input"
          name="tags"
          className="min-w-[120px] flex-1 border-0 bg-transparent p-1 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-slate-100"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleTagInputKeyDown}
          aria-label="タグを入力"
          placeholder={tags.length === 0 ? 'タグを入力 (Enterで追加)' : ''}
        />
      </div>
      {suggestions.length > 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">既存タグ</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((tag) => {
              const isSelected = tags.includes(tag);
              return (
                <button
                  type="button"
                  key={tag}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-500/20 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-500/40'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
                  }`}
                  onClick={() => handleToggleTag(tag)}
                >
                  <span>{tag}</span>
                  {isSelected && <Check size={12} />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

export default TagEditor;
