// フィルターパネルのコンポーネント
import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCatalog } from '../app/store/catalog.jsx';

// インストール済み / 種類(type) / タグ のフィルターパネル
export default function FilterPanel() {
  const { allTypes, allTags } = useCatalog();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const installedOnly = params.get('installed') === '1';
  const selectedType = params.get('type') || '';
  const selectedTags = (params.get('tags') || '').split(',').filter(Boolean);

  // 種類とタグのリストをソートしておく
  const types = useMemo(() => {
    const list = Array.isArray(allTypes) ? allTypes : [];
    return [...list].sort((a, b) => String(a).localeCompare(String(b), 'ja'));
  }, [allTypes]);
  const tags = useMemo(() => {
    const list = Array.isArray(allTags) ? allTags : [];
    return [...list].sort((a, b) => String(a).localeCompare(String(b), 'ja'));
  }, [allTags]);

  function applyParams(p) {
    navigate(`${location.pathname}?${p.toString()}`);
  }

  // インストール済み
  function toggleInstalled() {
    const p = new URLSearchParams(location.search);
    if (installedOnly) p.delete('installed'); else p.set('installed', '1');
    applyParams(p);
  }

  // 種類（単一選択）
  function toggleType(val) {
    const p = new URLSearchParams(location.search);
    if (selectedType === val) p.delete('type'); else p.set('type', val);
    applyParams(p);
  }
  function clearType() {
    const p = new URLSearchParams(location.search);
    p.delete('type');
    applyParams(p);
  }

  // タグ（複数選択）
  function toggleTag(val) {
    const set = new Set(selectedTags);
    if (set.has(val)) set.delete(val); else set.add(val);
    const next = Array.from(set);
    const p = new URLSearchParams(location.search);
    if (next.length) p.set('tags', next.join(',')); else p.delete('tags');
    applyParams(p);
  }
  function clearTags() {
    const p = new URLSearchParams(location.search);
    p.delete('tags');
    applyParams(p);
  }

  // すべてクリア
  function clearAll() {
    const p = new URLSearchParams(location.search);
    p.delete('installed');
    p.delete('type');
    p.delete('tags');
    applyParams(p);
  }

  return (
    <React.Fragment>
      {/* 表示設定 */}
      <div className="sidebar" aria-label="表示設定">
        <div className="sidebar__actions">
          <button className="btn btn--clear btn--block" onClick={clearAll} title="すべての条件をクリア">すべてをクリア</button>
        </div>
      </div>
      <div className="sidebar">
        <div className="sidebar__header">表示設定</div>
        <div className="sidebar__group">
          <button
            className={'chip chip--block' + (installedOnly ? ' is-selected' : '')}
            aria-pressed={installedOnly}
            onClick={toggleInstalled}
          >インストール済みのみ</button>
        </div>
      </div>

      {/* 種類フィルタ */}
      <div className="sidebar" role="radiogroup" aria-label="種類で絞り込み">
        <div className="sidebar__header">種類で絞り込み</div>
        <div className="sidebar__group">
          {types.map(t => (
            <button
              key={t}
              className={'chip chip--block' + (selectedType === t ? ' is-selected' : '')}
              onClick={() => toggleType(t)}
              role="radio"
              aria-checked={selectedType === t}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* タグフィルタ */}
      <div className="sidebar" aria-label="タグで絞り込み">
        <div className="sidebar__header">タグで絞り込み (複数可)</div>
        <div className="sidebar__group">
          <div className="chips">
            {tags.map(t => (
              <button
                key={t}
                className={'chip' + (selectedTags.includes(t) ? ' is-selected' : '')}
                onClick={() => toggleTag(t)}
                aria-pressed={selectedTags.includes(t)}
              >{t}</button>
            ))}
          </div>
        </div>
        <div className="sidebar__actions">
          <button className="btn" onClick={clearTags}>クリア</button>
        </div>
      </div>
    </React.Fragment>
  );
}
