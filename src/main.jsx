import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/base.css';
import './styles/layout.css';
import './styles/shared.css';
import './styles/classroom.css';
import './styles/worker.css';
import './styles/schedule.css';
import './styles/modal.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
