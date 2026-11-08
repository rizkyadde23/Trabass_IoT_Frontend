import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { RentalProvider } from './context/RentalContext.jsx'
import { registerServiceWorker } from './registerServiceWorker.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RentalProvider>
      <App />
    </RentalProvider>
  </React.StrictMode>,
)
registerServiceWorker();