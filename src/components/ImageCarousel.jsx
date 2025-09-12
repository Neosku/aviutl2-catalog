// 画像を表示するコンポーネント
import React, { useRef, useEffect, useState } from 'react';
import Icon from './Icon.jsx';

export default function ImageCarousel({ images = [] }) {
  // スクロールコンテナへの参照（現在位置の取得・スクロール制御に使用）
  const ref = useRef(null);
  // 現在のスライド位置
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // スクロール量から現在ページを概算
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setIndex(Math.min(Math.max(i, 0), images.length - 1));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [images.length]);

  // 指定インデックスまでスムーススクロール
  function scrollTo(i) {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  // キーボード操作（左右の矢印）
  function onKey(e) {
    if (e.key === 'ArrowRight') scrollTo(Math.min(index + 1, images.length - 1));
    if (e.key === 'ArrowLeft') scrollTo(Math.max(index - 1, 0));
  }

  // 画像が無い場合は何も描画しない
  if (!images.length) return null;
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;
  return (
    <div className="carousel__wrap" onKeyDown={onKey} tabIndex={0} aria-roledescription="carousel">
      <div className="carousel" ref={ref}>
        {images.map((img, i) => (
          <img key={i} src={img.src} alt={img.alt || ''} />
        ))}
      </div>
      {/* 先頭/末尾では矢印を消す */}
      {hasPrev ? (
        <button className="carousel__nav prev" onClick={() => scrollTo(index - 1)} aria-label="前の画像へ">
          <Icon name="chevron_left" size={20} />
        </button>
      ) : null}
      {hasNext ? (
        <button className="carousel__nav next" onClick={() => scrollTo(index + 1)} aria-label="次の画像へ">
          <Icon name="chevron_right" size={20} />
        </button>
      ) : null}
      {/* 現在位置を表示するナビゲーター */}
      <div className="carousel__dots" role="tablist">
        {images.map((_, i) => (
          <button
            key={i}
            className={'dot' + (i === index ? ' is-active' : '')}
            aria-selected={i === index}
            aria-label={`スライド ${i + 1}/${images.length}`}
            role="tab"
            onClick={() => scrollTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
