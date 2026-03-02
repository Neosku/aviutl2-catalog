import { useCallback, useRef, useState } from 'react';

export default function useExclusiveBusyAction<TBusyAction extends string, TIdleAction extends TBusyAction>(
  idleAction: TIdleAction,
) {
  type ActiveBusyAction = Exclude<TBusyAction, TIdleAction>;
  const [busyAction, setBusyAction] = useState<TBusyAction>(idleAction);
  const busyActionRef = useRef<TBusyAction>(idleAction);

  const beginAction = useCallback(
    (action: ActiveBusyAction) => {
      if (busyActionRef.current !== idleAction) return false;
      busyActionRef.current = action;
      setBusyAction(action);
      return true;
    },
    [idleAction],
  );

  const finishAction = useCallback(() => {
    busyActionRef.current = idleAction;
    setBusyAction(idleAction);
  }, [idleAction]);

  return {
    busyAction,
    beginAction,
    finishAction,
    isBusy: busyAction !== idleAction,
  };
}
