import type { CSSProperties, MouseEvent, PointerEvent } from 'react';
import TitleBarControls from './TitleBarControls';
import useTitleBarWindow from './useTitleBarWindow';

const dragRegionStyle = { WebkitAppRegion: 'drag' } as CSSProperties;
const noDragStyle = { WebkitAppRegion: 'no-drag' } as CSSProperties;

function isNoDragTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest?.('[data-no-drag="true"]'));
}

export default function TitleBar() {
  const { max, minimize, toggleMaximize, closeWindow, startDragging } = useTitleBarWindow();

  async function startDragIfAllowed(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if (isNoDragTarget(event.target)) return;
    event.preventDefault();
    await startDragging();
  }

  async function handleDoubleClick(event: MouseEvent<HTMLDivElement>) {
    if (isNoDragTarget(event.target)) return;
    await toggleMaximize();
  }

  return (
    <div
      className="flex h-8 w-full flex-none items-stretch justify-between bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 pl-2 pr-0 select-none"
      data-tauri-drag-region
      style={dragRegionStyle}
      onPointerDown={startDragIfAllowed}
      onDoubleClick={handleDoubleClick}
    >
      <div className="text-xs font-semibold tracking-wide flex items-center" data-tauri-drag-region>
        AviUtl2 Catalog
      </div>
      <TitleBarControls
        max={max}
        onMinimize={minimize}
        onToggleMaximize={toggleMaximize}
        onClose={closeWindow}
        noDragStyle={noDragStyle}
      />
    </div>
  );
}
