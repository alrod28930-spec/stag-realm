import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('🚀 Main.tsx - Starting application...');

// Check if root element exists
const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('❌ Root element not found!');
  throw new Error('Root element with id "root" not found');
}

console.log('✅ Root element found, rendering app directly...');

try {
  const root = createRoot(rootElement);
  console.log('🚀 Rendering App component...');
  root.render(<App />);
  console.log('✅ App rendered successfully!');
} catch (error) {
  console.error('❌ Failed to render app:', error);
  // Show error on page
  rootElement.innerHTML = `
    <div style="padding: 20px; color: red; font-family: Arial, sans-serif;">
      <h1>App Failed to Load</h1>
      <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
      <p>Check the console for more details.</p>
    </div>
  `;
}

// Initialize system services after React renders
setTimeout(() => {
  console.log('🚀 Initializing system services...');
  import('@/services/systemInitializer').then(({ systemInitializer }) => {
    systemInitializer.initialize().then(() => {
      console.log('🚀 StagAlgo system fully initialized and ready!');
    }).catch((error) => {
      console.error('❌ System initialization failed:', error);
    });
  }).catch((error) => {
    console.error('❌ Failed to import system initializer:', error);
  });
}, 100);
