import React, { useState } from 'react';
import './App.css'; 

export default function App() {
  const [angle, setAngle] = useState('');
  const [speed, setSpeed] = useState('');
  const [airfoil, setAirfoil] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);



  /* ------------HANDLING THE SIMULATION BUTTON CLICK------------------*/
  const handleSimulate = () => {
    if (!airfoil || !angle || !speed) {
      alert('All parameters need to be filled');
      return;
    }
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 1500);
  };



/* NOTE TO SELF: put everything visible in the UI inside the return stateement*/

  return (


    <div className="outer-container">
      {/* the main container */}
      <div className="square-left">
        



        {/* Left Side: Control Panel */}
        <div className="left-panel">
          <div className="header">
            <h1 className="title">Quick Fluid Flow </h1> {/* Placeholder name, we can change it later */}
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
              onClick={handleSimulate}
              disabled={isSimulating}
              className="show-button"
              style={{
                opacity: isSimulating ? 0.7 : 1,
                cursor: isSimulating ? 'not-allowed' : 'pointer',
              }}
            >
              {isSimulating ? 'Generating PyG Object' : 'Show airfoil'}
            </button>
          </div>



          {/* SIMULATION BUTTON*/}
          <div className="section" style={{ marginTop: 'auto' }}>
            <button
              type="button"
              onClick={handleSimulate}
              disabled={isSimulating}
              className="simulate-button"
              style={{
                opacity: isSimulating ? 0.7 : 1,
                cursor: isSimulating ? 'not-allowed' : 'pointer',
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
          </div>
        </div>

      </div>

    </div> /* MAIN CONTAINER ENDS HERE*/
  );
}