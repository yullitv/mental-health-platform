import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { CurrentUserProvider } from './context/CurrentUserContext'
import { SocketProvider } from './context/SocketContext'
import { NotificationProvider } from './context/NotificationContext'
import { ThemeProvider } from './context/ThemeContext'
import ClerkThemedProvider from './context/ClerkThemedProvider'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ClerkThemedProvider publishableKey={PUBLISHABLE_KEY}>
        <CurrentUserProvider>
          <SocketProvider>
            <NotificationProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </NotificationProvider>
          </SocketProvider>
        </CurrentUserProvider>
      </ClerkThemedProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
