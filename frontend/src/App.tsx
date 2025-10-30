/**
 * Main App component
 */

import { Dashboard } from './components/Dashboard/Dashboard';
import { WidgetStateProvider } from './contexts/WidgetStateContext';

function App() {
  return (
    <div className="App">
      <WidgetStateProvider>
        <Dashboard />
      </WidgetStateProvider>
    </div>
  );
}

export default App;
