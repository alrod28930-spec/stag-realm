import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize system coordination (nervous system)
import './services/systemCoordinator';

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
