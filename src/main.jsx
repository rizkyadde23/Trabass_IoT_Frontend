import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { RentalProvider } from './context/RentalContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RentalProvider>
      <App />
    </RentalProvider>
  </React.StrictMode>,
)