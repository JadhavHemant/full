// Import StrictMode for highlighting potential problems in an application
import { StrictMode } from 'react'
// Import createRoot to render React components into the DOM
import { createRoot } from 'react-dom/client'
// Import the main App component
import App from './App.jsx'
// Import shadcn/ui theme from Figma design
import './styles/shadcn-theme.css'

// Find the root DOM element and render the App component
createRoot(document.getElementById('root')).render(
  // <StrictMode>
    <App />
  // </StrictMode>,
)
