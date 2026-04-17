import React from 'react';
import ReactDOM from 'react-dom/client';
import { SidePanel } from './App';
import '../shared/styles.css';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <SidePanel />
    </React.StrictMode>
  );
}
