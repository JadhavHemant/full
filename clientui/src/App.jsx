// Import global styles for the application
import './App.css'
import './styles/mobile-responsive.css'
import { useEffect, useState, useCallback } from 'react'
// Import the main routing component that handles all application routes
import  MainRouting  from './Components/MainRouting/MainRouting'
// Import Toaster component for displaying toast notifications
import { Toaster } from 'react-hot-toast'
// Import GlobalMessageListener for handling real-time chat messages
import GlobalMessageListener from './Components/chat/GlobalMessageListener'
import { Moon, Sun } from 'lucide-react'
import { loadRoleConfig as loadSessionRoleConfig } from './utils/sessionUser'

/**
 * Determine if dark theme should be active based on current hour
 * Day mode: 7:00 AM  – 6:59 PM (light)
 * Night mode: 7:00 PM – 6:59 AM (dark)
 */
const getDefaultTheme = () => {
  const stored = localStorage.getItem('erp-theme')
  if (stored === 'light' || stored === 'dark') return stored

  const hour = new Date().getHours()
  return hour >= 7 && hour < 19 ? 'light' : 'dark'
}

/**
 * Calculate milliseconds until the next theme switch time
 * Switches happen at 7:00 AM (day) and 7:00 PM (night)
 */
const msUntilNextSwitch = () => {
  const now = new Date()
  const hour = now.getHours()
  const min = now.getMinutes()
  const sec = now.getSeconds()
  const ms = now.getMilliseconds()

  // Next switch time: if before 7 AM → switch at 7 AM today
  // If between 7 AM and 7 PM → switch at 7 PM today
  // If after 7 PM → switch at 7 AM tomorrow
  let targetHour
  if (hour < 7) {
    targetHour = 7 // Next switch at 7 AM today
  } else if (hour < 19) {
    targetHour = 19 // Next switch at 7 PM today
  } else {
    targetHour = 7 + 24 // Next switch at 7 AM tomorrow
  }

  const target = new Date(now)
  target.setHours(targetHour, 0, 0, 0)
  return target.getTime() - now.getTime()
}

/**
 * Apply theme to document element using both data-theme attribute
 * and legacy .dark class for backward compatibility
 */
const applyTheme = (themeName) => {
  const root = document.documentElement
  if (themeName === 'dark') {
    root.setAttribute('data-theme', 'dark')
    root.classList.add('dark')
  } else {
    root.removeAttribute('data-theme')
    root.classList.remove('dark')
  }
  localStorage.setItem('erp-theme', themeName)
}

/**
 * Main App component - Root component of the React application
 * Sets up the global toast notification system, message listener, and routing
 * Includes automatic day/night theme switching at 7 AM and 7 PM
 */
function App() {
  const [theme, setTheme] = useState(getDefaultTheme)

  useEffect(() => {
    loadSessionRoleConfig().catch(() => {
      // Non-blocking: UI falls back to default role IDs if config fetch fails.
    })
  }, [])

  // Apply theme on mount and whenever theme changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Auto-switch theme at 7 AM (day) and 7 PM (night)
  useEffect(() => {
    const scheduleNextSwitch = () => {
      const delay = msUntilNextSwitch()
      return setTimeout(() => {
        const newTheme = getDefaultTheme()
        setTheme(newTheme)
        applyTheme(newTheme)
      }, delay)
    }

    const timerId = scheduleNextSwitch()

    // Re-check every hour as a fallback to stay in sync
    const hourlyCheck = setInterval(() => {
      const expected = getDefaultTheme()
      const current = localStorage.getItem('erp-theme')
      if (expected !== current) {
        setTheme(expected)
        applyTheme(expected)
      }
    }, 3600000) // 1 hour

    return () => {
      clearTimeout(timerId)
      clearInterval(hourlyCheck)
    }
  }, [])

  // Sync theme across tabs
  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.key === 'erp-theme') {
        setTheme(e.newValue || 'light')
      }
    }
    window.addEventListener('storage', handleThemeChange)
    return () => window.removeEventListener('storage', handleThemeChange)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((value) => (value === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <>
      <button
        type="button"
        className="erp-theme-toggle"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
        title={`${theme === 'dark' ? 'Switch to day mode' : 'Switch to night mode'} • Auto-switches at 7 AM / 7 PM`}
      >
        <span className="erp-theme-toggle__track">
          <span className="erp-theme-toggle__thumb">
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </span>
        </span>
      </button>
      {/* Toast notification component positioned at top-right of the screen */}
      <Toaster position="top-right" />
      {/* Global listener for real-time chat messages across the application */}
      <GlobalMessageListener />
      {/* Main routing component that handles all application navigation */}
      <MainRouting/>
    </>
  )
}

export default App
