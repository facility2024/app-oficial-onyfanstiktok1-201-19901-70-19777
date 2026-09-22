import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { instalarAntiInspect } from './utils/antiInspect'

instalarAntiInspect();

createRoot(document.getElementById("root")!).render(<App />);
