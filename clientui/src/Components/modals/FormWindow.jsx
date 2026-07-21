import { useState, useCallback, useEffect, useRef } from 'react';
import TitleBar from '../TitleBar';

/**
 * FormWindow - A reusable draggable, resizable form window
 * with minimize, maximize/restore, fullscreen, extend, and close controls.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls visibility
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Window title
 * @param {string} props.icon - Optional emoji icon
 * @param {React.ReactNode} props.children - Form content
 * @param {string} props.width - Default width (default: 'max-w-lg')
 * @param {string} props.className - Additional classes for content area
 */
const FormWindow = ({ isOpen, onClose, title, icon, children, width = 'max-w-lg', className = '' }) => {
  const [windowState, setWindowState] = useState('normal'); // 'normal' | 'minimized' | 'maximized'
  const [position, setPosition] = useState({ x: 100, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 640, height: 'auto' });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });
  const [isMinimized, setIsMinimized] = useState(false);

  const contentRef = useRef(null);

  // Reset position when opening
  useEffect(() => {
    if (isOpen) {
      setWindowState('normal');
      setIsMinimized(false);
      setPosition({ x: 100, y: 80 });
    }
  }, [isOpen]);

  // Minimize
  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
  }, []);

  // Restore from minimized
  const handleRestore = useCallback(() => {
    setIsMinimized(false);
  }, []);

  // Maximize / Restore
  const handleMaximize = useCallback(() => {
    setWindowState((prev) => (prev === 'maximized' ? 'normal' : 'maximized'));
  }, []);

  // Close
  const handleClose = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  // Browser fullscreen
  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Drag handlers
  const handleMouseDown = useCallback(
    (e) => {
      if (windowState === 'maximized' || isMinimized) return;
      if (e.target.closest('.form-window-controls')) return;
      setIsDragging(true);
      setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    },
    [windowState, isMinimized, position]
  );

  // Resize handlers
  const handleResizeStart = useCallback((e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY });
    setResizeStartSize({ width: size.width, height: size.height || 400 });
    setResizeDirection(direction);
  }, [size]);

  const [resizeDirection, setResizeDirection] = useState('');

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    };
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e) => {
      const dx = e.clientX - resizeStart.x;
      const dy = e.clientY - resizeStart.y;
      let newWidth = resizeStartSize.width;
      let newHeight = resizeStartSize.height;
      if (resizeDirection.includes('e')) newWidth = Math.max(400, resizeStartSize.width + dx);
      if (resizeDirection.includes('s')) newHeight = Math.max(300, resizeStartSize.height + dy);
      if (resizeDirection.includes('w')) {
        newWidth = Math.max(400, resizeStartSize.width - dx);
        setPosition((prev) => ({ ...prev, x: position.x + dx }));
      }
      setSize({ width: newWidth, height: newHeight });
    };
    const handleMouseUp = () => { setIsResizing(false); setResizeDirection(''); };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart, resizeStartSize, resizeDirection, position]);

  if (!isOpen) return null;

  // Minimized state
  if (isMinimized) {
    return (
      <div
        onClick={handleRestore}
        className="fixed bottom-4 right-4 z-[9999] flex cursor-pointer items-center gap-3 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-5 py-3 text-sm font-semibold text-white shadow-2xl hover:from-orange-600 hover:to-red-600 transition-all duration-200"
      >
        <span>{icon || '📋'}</span>
        <span>{title}</span>
        <button
          onClick={(e) => { e.stopPropagation(); handleClose(); }}
          className="ml-2 rounded-full p-0.5 hover:bg-white/20 transition-colors"
          title="Close"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  const isMaximized = windowState === 'maximized';

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-10 bg-black/40 backdrop-blur-sm">
      {/* Modal Window */}
      <div
        className={`relative flex flex-col overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-900 dark:text-gray-100 ${
          isMaximized ? 'fixed inset-4 rounded-lg' : ''
        }`}
        style={
          !isMaximized
            ? {
                width: typeof size.width === 'number' ? size.width : width.includes('max-w') ? 640 : size.width,
                maxHeight: '85vh',
                left: position.x,
                top: position.y,
                position: 'absolute',
              }
            : {}
        }
      >
        {/* Title Bar - Draggable */}
        <TitleBar
          title={title}
          icon={icon}
          onClose={handleClose}
          onMinimize={handleMinimize}
          onMaximize={handleMaximize}
          isMaximized={isMaximized}
          isMinimized={isMinimized}
          onDragStart={handleMouseDown}
        />

        {/* Content */}
        <div
          ref={contentRef}
          className={`overflow-y-auto p-6 ${className}`}
          style={isMaximized ? { flex: 1 } : { maxHeight: 'calc(85vh - 52px)' }}
        >
          {children}
        </div>

        {/* Resize Handles */}
        {!isMaximized && (
          <>
            <div className="absolute left-0 top-0 h-full w-1 cursor-w-resize hover:bg-orange-400/50" onMouseDown={(e) => handleResizeStart(e, 'w')} />
            <div className="absolute right-0 top-0 h-full w-1 cursor-e-resize hover:bg-orange-400/50" onMouseDown={(e) => handleResizeStart(e, 'e')} />
            <div className="absolute bottom-0 left-0 h-1 w-full cursor-s-resize hover:bg-orange-400/50" onMouseDown={(e) => handleResizeStart(e, 's')} />
            <div className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize" onMouseDown={(e) => handleResizeStart(e, 'se')}>
              <svg className="h-3 w-3 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22 22H20V20H22V22ZM22 18H18V22H22V18ZM18 22H14V18H18V22Z" />
              </svg>
            </div>
          </>
        )}

        {/* Dragging overlay */}
        {isDragging && <div className="absolute inset-0 z-50 cursor-grabbing" />}
      </div>
    </div>
  );
};

export default FormWindow;