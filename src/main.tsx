import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { systemInitializer } from '@/services/systemInitializer'

// Initialize system services
systemInitializer.initialize().then(() => {
  console.log('🚀 StagAlgo system fully initialized and ready!');
}).catch((error) => {
  console.error('❌ System initialization failed:', error);
});

createRoot(document.getElementById("root")!).render(<App />);
