// ソートバーコンポーネント
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';

// ソートバーコンポーネント
// 新着順・名前順の並び替えボタンを表示
export default function SortBar({ value }) {
  const navigate = useNavigate();
  const location = useLocation();
  const url = new URLSearchParams(location.search);
  // 現在のソート種別を取得
  const current = value || url.get('sort') || 'newest';
  // 現在のソート方向を取得。名前順はデフォルト昇順、新着順はデフォルト降順
  const dir = url.get('dir') || (current === 'name' ? 'asc' : 'desc');
  // ソート設定を適用してページ遷移
  function applySort(s, d) {
    const params = new URLSearchParams(location.search);
    params.set('sort', s);
    params.set('dir', d);
    navigate(`${location.pathname}?${params.toString()}`);
  }
  // ソートボタンクリック時の処理
  function onClickKey(s) {
    if (s === current) {
      // 同じキーの場合 -> 方向を反転
      const nextDir = dir === 'asc' ? 'desc' : 'asc';
      applySort(s, nextDir);
    } else {
      // キーを切り替えの場合 -> そのキーのデフォルト方向を適用
      applySort(s, s === 'name' ? 'asc' : 'desc');
    }
  }
  // ソートボタン生成
  function label(key) {
    const base = key === 'name' ? '名前順' : '新着順';
    if (key !== current) return base;
    // 方向を示す矢印を表示
    const arrow = dir === 'asc'
      ? <Icon name="sort_up" size={25} /> : <Icon name="sort_down" size={25} />
    return (
      <span>
        {base} {arrow}
      </span>
    );
  }

  return (
    <div className="sortbar" role="group" aria-label="ソート">
      {/* 新着順ボタン */}
      <button
        className={"btn btn--toggle" + (current === 'newest' ? ' is-active' : '')}
        onClick={() => onClickKey('newest')}
        aria-pressed={current === 'newest'}
        title="クリックで並び替え方向を反転"
      >{label('newest')}</button>
      {/* 名前順ボタン */}
      <button
        className={"btn btn--toggle" + (current === 'name' ? ' is-active' : '')}
        onClick={() => onClickKey('name')}
        aria-pressed={current === 'name'}
        title="クリックで並び替え方向を反転"
      >{label('name')}</button>
    </div>
  );
}
