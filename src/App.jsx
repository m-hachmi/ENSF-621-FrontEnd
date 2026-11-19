import React, { useState } from 'react';
import './App.css';

const API_BASE_URL = 'https://ensf621-api.onrender.com';

export default function App() {
  const [angle, setAngle] = useState('');
  const [speed, setSpeed] = useState('');
  const [airfoil, setAirfoil] = useState('');
  const [isShowingAirfoil, setIsShowingAirfoil] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [graphMeta, setGraphMeta] = useState(null);

  const validateInputs = () => {
    if (!airfoil.trim() || angle === '' || speed === '') {
      alert('All parameters need to be filled');
      return false;
    }
    return true;
  };

  /* ------------HANDLING THE SHOW AIRFOIL BUTTON CLICK------------------*/
  const handleShowAirfoil = async () => {
    if (!validateInputs()) {
      return;
    }

    setIsShowingAirfoil(true);
    try {
      const response = await fetch(`${API_BASE_URL}/generate-graph`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          naca_name: airfoil.trim(),
          aoa: Number(angle),
          speed: Number(speed),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || `Request failed with status ${response.status}`);
      }

      setGraphMeta(data);
      if (data.plot_url) {
        setImageUrl(`${API_BASE_URL}${data.plot_url}`);
      } else {
        throw new Error('API response did not include plot_url');
      }
    } catch (err) {
      alert(`Failed to generate airfoil mesh: ${err.message}`);
    } finally {
      setIsShowingAirfoil(false);
    }
  };

  /* ------------HANDLING THE SIMULATION BUTTON CLICK------------------*/
  const handleSimulate = () => {
    if (!validateInputs()) {
      return;
    }
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 1500);
  };

  const isBusy = isShowingAirfoil || isSimulating;

  return (
    <div className="outer-container">
      {/* the main container */}
      <div className="square-left">
        {/* Left Side: Control Panel */}
        <div className="left-panel">
          <div className="header">
            <h1 className="title">Quick Fluid Flow</h1>
            <p className="subtitle">Configure parameters and launch the simulation</p>
          </div>

          {/* ANGLE OF ATTACK INPUT */}
          <div className="section">
            <label className="section-label">Angle of Attack (°)</label>
            <input
              type="number"
              placeholder="e.g. 5"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              className="text-input"
            />
          </div>

          {/* SPEED INPUT */}
          <div className="section">
            <label className="section-label">Speed (m/s)</label>
            <input
              type="number"
              placeholder="e.g. 50"
              value={speed}
              onChange={(e) => setSpeed(e.target.value)}
              className="text-input"
            />
          </div>

          {/* NACA AIRFOIL INPUT */}
          <div className="section">
            <label className="section-label">NACA Airfoil</label>
            <input
              type="text"
              placeholder="e.g. 0012"
              value={airfoil}
              onChange={(e) => setAirfoil(e.target.value)}
              className="text-input"
            />
          </div>

          {/* SHOW AIRFOIL BUTTON */}
          {/* THIS WILL RUN THE USER INPUT PREPROCESSING SCRIPT DISPLAYS THE MATPLOTLIB PICTURE */}
          <div className="section" style={{ marginTop: 'auto' }}>
            <button
              type="button"
              onClick={handleShowAirfoil}
              disabled={isBusy}
              className="show-button"
              style={{
                opacity: isBusy ? 0.7 : 1,
                cursor: isBusy ? 'not-allowed' : 'pointer',
              }}
            >
              {isShowingAirfoil ? 'Generating PyG Object...' : 'Show airfoil'}
            </button>
          </div>

          {/* SIMULATION BUTTON */}
          <div className="section" style={{ marginTop: 'auto' }}>
            <button
              type="button"
              onClick={handleSimulate}
              disabled={isBusy}
              className="simulate-button"
              style={{
                opacity: isBusy ? 0.7 : 1,
                cursor: isBusy ? 'not-allowed' : 'pointer',
              }}
            >
              {isSimulating ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>
        </div>

        {/* divider */}
        <div className="divider" />

        {/* results */}
        <div className="right-panel">
          <div className="square-image-container">
            {imageUrl ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={imageUrl}
                  alt={`NACA ${airfoil} mesh at ${angle} deg`}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
                {graphMeta && (
                  <p className="placeholder-subtext" style={{ marginTop: '8px' }}>
                    Nodes: {graphMeta.num_nodes} | Edges: {graphMeta.num_edges}
                  </p>
                )}
              </div>
            ) : (
              <div className="placeholder-box">
                <svg
                  className="icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 002-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="placeholder-text">ML Model inference will be displayed here</p>
                <p className="placeholder-subtext">Fill out the simulation parameters first</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
