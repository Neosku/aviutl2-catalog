import { useNavigate } from 'react-router-dom';
import useDeepLinkHandler from './hooks/useDeepLinkHandler';

export default function DeepLinkHandler() {
  const navigate = useNavigate();
  useDeepLinkHandler(navigate);
  return null;
}
