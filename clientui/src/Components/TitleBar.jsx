import { useState, useCallback } from 'react';

/**
 * TitleBar - macOS-style window title bar with close, minimize, maximize controls
 *
 * Features:
 * - Three circular buttons (Close, Minimize, Maximize) always visible (macOS style)
 * - If a handler is not provided, the button appears faded (opacity 0.5) with "not available" tooltip
 * - Icons appear on hover only
 */
const TitleBar = ({
  title,
  icon,
  onClose,
  onMinimize,
  onMaximize,
  isMaximized = false,
  isMinimized = false,
  onDragStart,
  className = '',
}) => {
  const [hoveredButton, setHoveredButton] = useState(null);

  const handleMouseDown = useCallback(
    (e) => {
      if (onDragStart && !isMaximized && !isMinimized) {
        onDragStart(e);
      }
    },
    [onDragStart, isMaximized, isMinimized]
  );

  // Always show all 3 macOS-style buttons (Close, Minimize, Maximize)
  // If no handler is provided, the button still shows but does nothing when clicked
  const buttons = [
    {
      id: 'close',
      label: 'Close',
      icon: '✕',
      onClick: onClose || (() => {}),
      bgColor: '#FF5F57',
      hoverBg: '#FF3B30',
      iconColor: '#8E1C15',
      active: !!onClose,
    },
    {
      id: 'minimize',
      label: 'Minimize',
      icon: '−',
      onClick: onMinimize || (() => {}),
      bgColor: '#FEBC2E',
      hoverBg: '#FF9500',
      iconColor: '#8A5A00',
      active: !!onMinimize,
    },
    {
      id: 'maximize',
      label: isMaximized ? 'Restore' : 'Maximize',
      icon: isMaximized ? '⤡' : '⤢',
      onClick: onMaximize || (() => {}),
      bgColor: '#28C840',
      hoverBg: '#34C759',
      iconColor: '#0A6B1A',
      active: !!onMaximize,
    },
  ];

  return (
    <div
      className={`macos-titlebar flex items-center justify-between select-none ${className}`}
      onMouseDown={handleMouseDown}
      style={{
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #e0e0e0',
        padding: '8px 12px',
      }}
    >
      {/* Left side: icon + title */}
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="text-sm shrink-0">{icon}</span>}
        <span
          className="macos-titlebar-title truncate"
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#666',
          }}
        >
          {title}
        </span>
      </div>

      {/* Right side: window control buttons */}
      <div
        className="flex items-center gap-1.5 shrink-0"
        style={{ gap: '7px' }}
      >
        {buttons.map((btn) => (
          <button
            key={btn.id}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (btn.onClick) btn.onClick();
            }}
            onMouseEnter={() => setHoveredButton(btn.id)}
            onMouseLeave={() => setHoveredButton(null)}
            className="relative flex items-center justify-center transition-all duration-150"
            style={{
              width: '13px',
              height: '13px',
              borderRadius: '50%',
              backgroundColor: hoveredButton === btn.id ? btn.hoverBg : btn.bgColor,
              border: 'none',
              cursor: btn.active ? 'pointer' : 'default',
              padding: 0,
              opacity: btn.active ? 1 : 0.5,
            }}
            title={`${btn.label}${btn.active ? '' : ' (not available)'}`}
          >
            <span
              style={{
                fontSize: '9px',
                fontWeight: 'bold',
                lineHeight: 1,
                color: hoveredButton === btn.id ? '#fff' : btn.iconColor,
                opacity: hoveredButton === btn.id ? 1 : 0,
                transition: 'opacity 150ms ease',
                userSelect: 'none',
              }}
            >
              {btn.icon}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TitleBar;