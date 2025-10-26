//React entry point (renders App component)
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Tailwind
import './styles/global.css';
import './styles/navbar.css';
import './styles/search.css';
import './styles/menu.css';
import './styles/buttons.css';
import './styles/home.css';
import './styles/college-menus.css';
import './styles/utility.css';
import './styles/dining-halls.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);