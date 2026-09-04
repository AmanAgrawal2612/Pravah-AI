import React from 'react';
import MapDashboard from './MapDashboard';
import './index.css';

function App() {
  return (
    <div className="w-full h-screen bg-gray-50 text-gray-900 flex flex-col font-sans overflow-hidden">
      <header className="bg-white border-b border-gray-200 p-4 shadow-sm flex justify-between items-center z-50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow">
            UF
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-700">
            Urban Flood Nowcasting
          </h1>
        </div>
        <div className="flex items-center space-x-4 text-sm font-medium">
          <span className="flex items-center text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span> Live Radar Stream</span>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full border border-gray-300">Stage 5 Deliverable</span>
        </div>
      </header>
      <main className="flex-1 relative flex">
        <MapDashboard />
      </main>
    </div>
  );
}
export default App;
