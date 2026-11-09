import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import 'leaflet/dist/leaflet.css'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { RentalProvider } from './context/RentalContext.jsx'
import { registerServiceWorker } from './registerServiceWorker.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RentalProvider>
        <App />
      </RentalProvider>
    </AuthProvider>
  </React.StrictMode>,
)
registerServiceWorker();
