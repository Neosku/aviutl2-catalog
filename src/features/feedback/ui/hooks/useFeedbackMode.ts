import { useCallback, useState } from 'react';
import { FEEDBACK_INITIAL_MODE } from '../../model/constants';
import type { FeedbackMode } from '../../model/types';

export default function useFeedbackMode() {
  const [mode, setMode] = useState<FeedbackMode>(FEEDBACK_INITIAL_MODE);

  const onModeChange = useCallback((nextMode: FeedbackMode) => {
    setMode(nextMode);
  }, []);

  return {
    mode,
    onModeChange,
  };
}
