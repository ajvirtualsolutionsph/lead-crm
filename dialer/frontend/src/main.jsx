import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import App from './App.jsx';

if (import.meta.env.VITE_BACKEND_URL) {
  axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;
}

// Wake up the Render backend on page load so it's warm before the first call
axios.get('/health').catch(() => {});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
