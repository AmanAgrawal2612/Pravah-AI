import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { Clock, Navigation, AlertTriangle, CloudRain, Droplets } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

function LocationSelector({ setStart, setEnd, selectMode, setSelectMode }) {
  useMapEvents({
    click(e) {
      if (!selectMode) return;
      if (selectMode === 'start') {
        setStart([e.latlng.lat, e.latlng.lng]);
        setSelectMode(null);
      } else if (selectMode === 'end') {
        setEnd([e.latlng.lat, e.latlng.lng]);
        setSelectMode(null);
      }
    },
  });
  return null;
}

export default function MapDashboard() {
  const [network, setNetwork] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [timeStep, setTimeStep] = useState(0);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendDead, setBackendDead] = useState(false);
  const [selectMode, setSelectMode] = useState(null);

  const defaultCenter = [19.02, 72.84];

  useEffect(() => {
    async function fetchData() {
      try {
        const netRes = await axios.get(API_BASE + '/network');
        setNetwork(netRes.data);
        const predRes = await axios.get(API_BASE + '/flood-data');
        console.log("Predictions loaded:", Object.keys(predRes.data.predictions).length, "edges");
        setPredictions(predRes.data.predictions);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setBackendDead(true);
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleRoute = async () => {
    if (!startPoint || !endPoint) return;
    try {
      const res = await axios.post(API_BASE + '/safe-route', {
        start_lat: startPoint[0],
        start_lon: startPoint[1],
        end_lat: endPoint[0],
        end_lon: endPoint[1],
        time_offset: timeStep
      });
      setRoute(res.data.route);
    } catch (err) {
      console.error("Routing error:", err);
      alert("Could not find a route.");
    }
  };

    const getEdgeColor = (edgeId) => {
    if (!predictions) return '#9ca3af'; 
    const edgeData = predictions[edgeId];
    if (!edgeData) return '#cbd5e1'; 
    const depth = edgeData[timeStep];
    if (depth === undefined || depth === null) return '#64748b'; 
    if (depth > 15) return '#ef4444'; 
    if (depth > 5) return '#f59e0b'; 
    return '#10b981'; 
  };

  return (
    <div className="w-full h-full relative flex">
      {backendDead && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-[2000] backdrop-blur-sm">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-xl font-bold text-gray-800">Backend Server is Dead or Loading</p>
          <p className="text-sm text-gray-500 mt-2">Please wait for the backend to start, then refresh the page.</p>
        </div>
      )}
      {loading && !backendDead && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-[2000] backdrop-blur-sm">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl font-bold text-gray-800">Initializing Urban Drainage Graph...</p>
          <p className="text-sm text-gray-500 mt-2">Loading real Mumbai streets. This takes ~10 seconds...</p>
        </div>
      )}

      <div className="flex-1 relative z-0">
        <MapContainer center={defaultCenter} zoom={15} className="w-full h-full" style={{ background: '#f3f4f6' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <LocationSelector setStart={setStartPoint} setEnd={setEndPoint} selectMode={selectMode} setSelectMode={setSelectMode} />
          
          {network?.edges.map((edge) => (
            <Polyline
              key={`${edge.id}-${timeStep}-${predictions ? "y" : "n"}`}
              positions={[edge.start, edge.end]}
              color={getEdgeColor(edge.id)}
              weight={getEdgeColor(edge.id) === '#ef4444' ? 6 : 4}
              opacity={0.9}
            />
          ))}

          {startPoint && <CircleMarker center={startPoint} radius={10} color="#2563eb" fillColor="#2563eb" fillOpacity={1} />}
          {endPoint && <CircleMarker center={endPoint} radius={10} color="#9333ea" fillColor="#9333ea" fillOpacity={1} />}

          {route && (
            <Polyline
              positions={route}
              color="#9333ea"
              weight={8}
              opacity={1}
              dashArray="15, 10"
              className="animate-pulse shadow-xl"
            />
          )}
        </MapContainer>

        {selectMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg font-medium flex items-center z-[1000] animate-bounce">
            <Navigation className="w-5 h-5 mr-2" />
            Click anywhere on the map to set {selectMode === 'start' ? 'Start' : 'Destination'} Point
          </div>
        )}
      </div>

      <div className="w-96 bg-white border-l border-gray-200 shadow-2xl flex flex-col z-[1000]">
        <div className="p-4 flex-1 overflow-y-auto min-h-0">
          <div className="mb-4 bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <h3 className="font-semibold text-lg flex items-center text-gray-800 mb-4">
              <Clock className="w-5 h-5 mr-2 text-blue-600" />
              Nowcast Time Horizon
            </h3>
            
            <div className="relative pt-6 pb-2">
              <input
                type="range"
                min="0"
                max="180"
                step="15"
                value={timeStep}
                onChange={(e) => setTimeStep(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div 
                className="absolute -top-1 px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg shadow transform -translate-x-1/2 transition-all"
                style={{ left: `${(timeStep / 180) * 100}%` }}
              >
                +{timeStep}m
              </div>
            </div>
            
            <div className="flex justify-between text-xs font-bold text-gray-500 mt-2">
              <span>Now</span>
              <span>+1h</span>
              <span>+2h</span>
              <span>+3h</span>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col items-center text-center">
              <CloudRain className="w-8 h-8 text-blue-500 mb-2" />
              <span className="text-2xl font-bold text-gray-800">12mm/h</span>
              <span className="text-xs font-semibold text-gray-500">Avg Radar Rainfall</span>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 flex flex-col items-center text-center">
              <Droplets className="w-8 h-8 text-amber-500 mb-2" />
              <span className="text-2xl font-bold text-gray-800">65%</span>
              <span className="text-xs font-semibold text-gray-500">Runoff Coeff.</span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
            <h3 className="font-semibold text-lg flex items-center text-gray-800 mb-4">
              <Navigation className="w-5 h-5 mr-2 text-purple-600" />
              Flood-Safe Routing
            </h3>
            
            <div className="flex space-x-3 mb-4">
              <button 
                onClick={() => setSelectMode('start')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-colors ${startPoint ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                {startPoint ? '✓ Start Picked' : 'Set Start'}
              </button>
              <button 
                onClick={() => setSelectMode('end')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-colors ${endPoint ? 'bg-purple-100 text-purple-700 border border-purple-300' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                {endPoint ? '✓ End Picked' : 'Set Dest.'}
              </button>
            </div>
            
            <button 
              onClick={handleRoute}
              disabled={!startPoint || !endPoint}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Calculate Optimal Route
            </button>
          </div>
          
          <div className="mt-4">
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Predicted Water Depth</h4>
            <div className="space-y-1.5">
              <div className="flex items-center text-sm font-bold text-gray-700 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <span className="w-4 h-4 rounded-full bg-emerald-500 mr-3"></span>
                Safe (0-5cm)
              </div>
              <div className="flex items-center text-sm font-bold text-gray-700 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                <span className="w-4 h-4 rounded-full bg-amber-500 mr-3"></span>
                Caution (5-15cm)
              </div>
              <div className="flex items-center text-sm font-bold text-gray-700 bg-white p-2 rounded-lg border border-red-200 shadow-sm">
                <span className="w-4 h-4 rounded-full bg-red-500 mr-3 flex items-center justify-center">
                  <AlertTriangle className="w-2.5 h-2.5 text-white" />
                </span>
                Impassable (&gt;15cm)
              </div>
              <div className="flex items-center text-sm font-bold text-gray-500 bg-gray-100 p-2 rounded-lg border border-gray-200 border-dashed">
                <span className="w-4 h-4 rounded-full bg-gray-400 mr-3"></span>
                No Data (Debug: {predictions ? 'Loaded ' + Object.keys(predictions).length : 'Null'})
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






