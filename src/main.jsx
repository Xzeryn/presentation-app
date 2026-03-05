import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from './context/ThemeContext'
import { TeamProvider } from './context/TeamContext'
import { RoadmapProvider } from './context/RoadmapContext'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <TeamProvider>
        <RoadmapProvider>
          <App />
        </RoadmapProvider>
      </TeamProvider>
    </ThemeProvider>
  </React.StrictMode>,
)

