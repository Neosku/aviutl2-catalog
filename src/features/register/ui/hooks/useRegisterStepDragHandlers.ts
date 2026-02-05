/**
 * ステップのドラッグ並び替えを司る hook
 */
import { useCallback } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { DragHandleState, RefCell, RegisterStepType } from '../types';

interface UseRegisterStepDragHandlersArgs {
  dragHandleRef: RefCell<DragHandleState>;
  installListRef: RefCell<HTMLDivElement | null>;
  uninstallListRef: RefCell<HTMLDivElement | null>;
  reorderSteps: (type: RegisterStepType, from: number, to: number) => void;
}

export default function useRegisterStepDragHandlers({
  dragHandleRef,
  installListRef,
  uninstallListRef,
  reorderSteps,
}: UseRegisterStepDragHandlersArgs) {
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragHandleRef.current;
      if (!drag.active) return;
      event.preventDefault();
      const { floating, placeholder, container, offsetX, offsetY } = drag;
      if (!floating || !placeholder || !container) return;
      const dragOffsetX = offsetX ?? 0;
      const dragOffsetY = offsetY ?? 0;
      floating.style.top = `${event.clientY - dragOffsetY}px`;
      floating.style.left = `${event.clientX - dragOffsetX}px`;
      // placeholder を除外した実カードだけで挿入位置を計算する。
      const siblings = Array.from(container.querySelectorAll<HTMLElement>('.step-card')).filter(
        (el) => !el.classList.contains('step-card--placeholder'),
      );
      let insertBefore: HTMLElement | null = null;
      for (const sibling of siblings) {
        if (sibling === placeholder) continue;
        const rect = sibling.getBoundingClientRect();
        if (event.clientY < rect.top + rect.height / 2) {
          insertBefore = sibling;
          break;
        }
      }
      if (insertBefore) {
        container.insertBefore(placeholder, insertBefore);
      } else {
        container.appendChild(placeholder);
      }
    },
    [dragHandleRef],
  );

  const handlePointerUp = useCallback(() => {
    const drag = dragHandleRef.current;
    if (!drag.active) return;
    drag.active = false;
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }
    const { floating, placeholder, container, type, index, origin, handle, pointerId } = drag;
    floating?.remove();
    if (handle?.releasePointerCapture && pointerId != null) {
      try {
        handle.releasePointerCapture(pointerId);
      } catch {
        // ignore release errors
      }
    }
    if (container && placeholder && origin) {
      const finalIndex = Array.from(container.children).indexOf(placeholder);
      container.insertBefore(origin, placeholder);
      origin.style.display = '';
      origin.classList.remove('step-card--drag-origin');
      placeholder.remove();
      if (type) {
        reorderSteps(type, index, finalIndex);
      }
    }
    dragHandleRef.current = { active: false, type: '', index: -1 };
  }, [dragHandleRef, handlePointerMove, reorderSteps]);

  const startHandleDrag = useCallback(
    (type: RegisterStepType, index: number, event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof window === 'undefined') return;
      const container = type === 'install' ? installListRef.current : uninstallListRef.current;
      if (!container) return;
      const cards = Array.from(container.querySelectorAll<HTMLElement>('.step-card'));
      const card = cards[index];
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const placeholder = document.createElement('div');
      placeholder.className =
        'step-card step-card--placeholder rounded-xl border-2 border-dashed border-blue-400/70 bg-blue-50/60 dark:border-blue-600 dark:bg-blue-900/20';
      placeholder.style.height = `${rect.height}px`;
      container.insertBefore(placeholder, card);

      const floating = card.cloneNode(true) as HTMLElement;
      floating.classList.add('step-card--floating', 'shadow-xl', 'ring-2', 'ring-blue-500/20');
      floating.style.width = `${rect.width}px`;
      floating.style.height = `${rect.height}px`;
      floating.style.position = 'fixed';
      floating.style.top = `${rect.top}px`;
      floating.style.left = `${rect.left}px`;
      floating.style.pointerEvents = 'none';
      floating.style.zIndex = '200';
      document.body.appendChild(floating);
      const sourceControls = card.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input, select, textarea',
      );
      const floatingControls = floating.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input, select, textarea',
      );
      // clone は input 値を保持しないため、表示内容を元カードから明示的にコピーする。
      floatingControls.forEach((ctrl, idx) => {
        const originCtrl = sourceControls[idx];
        if (!originCtrl) return;
        if (ctrl instanceof HTMLSelectElement && originCtrl instanceof HTMLSelectElement) {
          ctrl.value = originCtrl.value;
        } else if (
          ctrl instanceof HTMLInputElement &&
          originCtrl instanceof HTMLInputElement &&
          (ctrl.type === 'checkbox' || ctrl.type === 'radio')
        ) {
          ctrl.checked = originCtrl.checked;
        } else {
          ctrl.value = originCtrl.value;
        }
      });

      card.classList.add('step-card--drag-origin');
      card.style.display = 'none';

      dragHandleRef.current = {
        active: true,
        type,
        index,
        origin: card,
        floating,
        placeholder,
        container,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        handle: event.currentTarget,
        pointerId: event.pointerId,
      };

      if (event.currentTarget.setPointerCapture) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [dragHandleRef, handlePointerMove, handlePointerUp, installListRef, uninstallListRef],
  );

  return { startHandleDrag };
}
