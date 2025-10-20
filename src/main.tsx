import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Polyfill for crypto.randomUUID on older mobile browsers
try {
  // @ts-ignore
  const c = window.crypto || (window.crypto = {} as any);
  // @ts-ignore
  if (typeof c.randomUUID !== 'function') {
    // RFC4122 v4-like fallback
    // @ts-ignore
    c.randomUUID = () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
        const r = (Math.random() * 16) | 0;
        const v = ch === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
  }
} catch {}

// Mobile optimization splash screen
const LoadingSplash = () => (
  <div className="fixed inset-0 bg-black flex items-center justify-center">
    <div className="text-white text-center">
      <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <div className="text-lg font-bold">OnyTikTok</div>
    </div>
  </div>
);

createRoot(document.getElementById("root")!).render(
  <App />
);
