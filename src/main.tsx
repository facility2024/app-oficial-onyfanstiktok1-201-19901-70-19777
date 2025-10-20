import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Polyfill mínimo e seguro para crypto.randomUUID (iOS antigos)
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  (crypto as any).randomUUID = function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

createRoot(document.getElementById("root")!).render(
  <App />
);
