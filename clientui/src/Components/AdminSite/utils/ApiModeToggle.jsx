/**
 * ApiModeToggle Component
 * Toggle button to switch between Local and Live API endpoints
 * Displays current connection status indicator
 */
import { useState, useEffect, useCallback } from 'react';
import { getApiMode, toggleApiMode } from '../../../utils/apiMode';
import { Cloud, Server } from 'lucide-react';

const ApiModeToggle = () => {
  const [mode, setMode] = useState(getApiMode);

  // Sync state if another tab changes the mode
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'erp-api-mode') {
        setMode(e.newValue === 'live' ? 'live' : 'local');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleToggle = useCallback(() => {
    const newMode = toggleApiMode();
    setMode(newMode);
    // Reload the page so all API endpoints and sockets pick up the new base URL
    window.location.reload();
  }, []);

  const isLive = mode === 'live';

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={`
        api-mode-toggle
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
        transition-all duration-200 border
        ${
          isLive
            ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50 hover:bg-emerald-800/50 hover:border-emerald-600'
            : 'bg-sky-900/40 text-sky-300 border-sky-700/50 hover:bg-sky-800/50 hover:border-sky-600'
        }
      `}
      title={
        isLive
          ? 'Using Live API (https://erp-project-apis.onrender.com). Click to switch to Local.'
          : 'Using Local API (http://localhost:5351). Click to switch to Live.'
      }
    >
      {/* Status indicator dot */}
      <span
        className={`
          inline-block w-1.5 h-1.5 rounded-full
          ${isLive ? 'bg-emerald-400' : 'bg-sky-400'}
        `}
      />
      {/* Icon */}
      {isLive ? <Cloud size={14} /> : <Server size={14} />}
      {/* Label */}
      <span>{isLive ? 'LIVE' : 'LOCAL'}</span>
    </button>
  );
};

export default ApiModeToggle;