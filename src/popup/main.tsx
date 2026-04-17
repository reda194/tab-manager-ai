import React from 'react';
import ReactDOM from 'react-dom/client';
import { Popup } from './App';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import '../shared/styles.css';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <Popup />
      </ErrorBoundary>
    </React.StrictMode>
  );
}
