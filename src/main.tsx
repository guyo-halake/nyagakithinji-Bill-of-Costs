import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { isSupabaseConfigured } from './services/supabase';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

if (isSupabaseConfigured) {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
  root.render(
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', background: '#f8fafc', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
      <section style={{ width: 'min(100%, 520px)', padding: '32px', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#fff', boxShadow: '0 12px 32px rgb(15 23 42 / 8%)' }}>
        <h1 style={{ margin: '0 0 12px', fontSize: '24px' }}>This site is not connected yet</h1>
        <p style={{ margin: '0 0 12px', lineHeight: 1.6 }}>
          Ask your site administrator to connect the database, then reload this page.
        </p>
        <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>
          For local setup, copy <code>.env.example</code> to <code>.env.local</code>, add the database URL and public key, and restart the app.
        </p>
      </section>
    </main>
  );
}
