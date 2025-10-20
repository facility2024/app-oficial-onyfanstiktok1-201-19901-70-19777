import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

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
