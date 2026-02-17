import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * @param {{ images?: Array<{ src: string; alt?: string }> }} props
 */
export default function ImageCarousel({ images = [] }) {
  const ref = useRef(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / el.clientWidth);
      setIndex(Math.min(Math.max(i, 0), images.length - 1));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [images.length]);

  function scrollTo(i) {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  function onKey(e) {
    if (e.key === 'ArrowRight') scrollTo(Math.min(index + 1, images.length - 1));
    if (e.key === 'ArrowLeft') scrollTo(Math.max(index - 1, 0));
  }

  if (!images.length) return null;
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  return (
    <div className="relative" onKeyDown={onKey} tabIndex={0} aria-roledescription="carousel">
      <div className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-4" ref={ref}>
        {images.map((img, i) => (
          <img
            key={i}
            src={img.src}
            alt={img.alt || ''}
            className="w-full flex-none snap-center rounded-2xl border border-slate-200 dark:border-slate-800 object-contain"
          />
        ))}
      </div>
      {hasPrev && (
        <button
          className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 text-slate-700 shadow-md hover:bg-white dark:bg-slate-900/80 dark:text-slate-100"
          onClick={() => scrollTo(index - 1)}
          aria-label="前の画像へ"
          type="button"
        >
          <ChevronLeft size={18} className="mx-auto" />
        </button>
      )}
      {hasNext && (
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 text-slate-700 shadow-md hover:bg-white dark:bg-slate-900/80 dark:text-slate-100"
          onClick={() => scrollTo(index + 1)}
          aria-label="次の画像へ"
          type="button"
        >
          <ChevronRight size={18} className="mx-auto" />
        </button>
      )}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1"
        role="tablist"
      >
        {images.map((_, i) => (
          <button
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/40'}`}
            aria-selected={i === index}
            aria-label={`スライド ${i + 1}/${images.length}`}
            role="tab"
            onClick={() => scrollTo(i)}
            type="button"
          />
        ))}
      </div>
    </div>
  );
}
