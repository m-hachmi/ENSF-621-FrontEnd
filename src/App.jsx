import React, { useEffect, useState } from 'react';
import './App.css';

const GRAPH_API_URL = 'https://ensf621-api.onrender.com';
const MODEL_API_URL =
  import.meta.env.VITE_API_URL || 'https://tfrddd-quick-fluid-flow-api.hf.space';

function extractPredictPlots(data) {
  if (!data) return [];

  if (Array.isArray(data.plots)) {
    return data.plots.map((item, idx) =>
      typeof item === 'string'
        ? { label: `Plot ${idx + 1}`, src: item }
        : {
            label: item.label || item.title || item.name || `Plot ${idx + 1}`,
            src: item.image || item.image_base64 || item.data_url || item.src || '',
          }
    );
  }

  const fields = [
    ['velocity_x', 'Velocity X'],
    ['velocity_y', 'Velocity Y'],
    ['pressure', 'Pressure'],
    ['turbulent_viscosity', 'Turbulent Viscosity'],
  ];

  return fields
    .filter(([key]) => typeof data[key] === 'string' && data[key].length > 0)
    .map(([key, label]) => ({ label, src: data[key] }));
}

export default function App() {
  const [angle, setAngle] = useState('');
  const [speed, setSpeed] = useState('');
  const [airfoil, setAirfoil] = useState('');

  const [models, setModels] = useState(['gnn', 'pinn']);
  const [selectedModel, setSelectedModel] = useState('gnn');

  const [isShowingAirfoil, setIsShowingAirfoil] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [singleImageUrl, setSingleImageUrl] = useState('');
  const [plots, setPlots] = useState([]);
  const [graphMeta, setGraphMeta] = useState(null);
  const [pthFile, setPthFile] = useState(null);

  useEffect(() => {
    let active = true;
    fetch(`${MODEL_API_URL}/models`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const list = Array.isArray(data) ? data : data.models;
        if (Array.isArray(list) && list.length > 0) {
          const ids = list.map((m) => (typeof m === 'string' ? m : m.id || m.name)).filter(Boolean);
          if (ids.length > 0) {
            setModels(ids);
            setSelectedModel((prev) => (ids.includes(prev) ? prev : ids[0]));
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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
    setPlots([]);
    setPthFile(null);

    try {
      const response = await fetch(`${GRAPH_API_URL}/generate-graph`, {
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
        setSingleImageUrl(`${GRAPH_API_URL}${data.plot_url}`);
      } else {
        throw new Error('API response did not include plot_url');
      }

      if (data.download_url) {
        const pthResponse = await fetch(`${GRAPH_API_URL}${data.download_url}`);
        if (!pthResponse.ok) {
          throw new Error(`Failed to fetch .pth file (status ${pthResponse.status})`);
        }

        const blob = await pthResponse.blob();
        const filename = data.download_url.split('/').pop() || `${data.job_id || 'graph'}.pth`;
        const file = new File([blob], filename, {
          type: blob.type || 'application/octet-stream',
        });
        setPthFile(file);
      }
    } catch (err) {
      setPthFile(null);
      alert(`Failed to generate airfoil mesh: ${err.message}`);
    } finally {
      setIsShowingAirfoil(false);
    }
  };

  /* ------------HANDLING THE SIMULATION BUTTON CLICK------------------*/
  const handleSimulate = async () => {
    if (!validateInputs()) {
      return;
    }

    setIsSimulating(true);
    try {
      let response;

      if (pthFile) {
        const formData = new FormData();
        formData.append('naca_name', airfoil.trim());
        formData.append('aoa', String(Number(angle)));
        formData.append('speed', String(Number(speed)));
        formData.append('model_id', selectedModel);
        formData.append('file', pthFile, pthFile.name);

        response = await fetch(`${MODEL_API_URL}/predict`, {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch(`${MODEL_API_URL}/predict`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            naca_name: airfoil.trim(),
            aoa: Number(angle),
            speed: Number(speed),
            model_id: selectedModel,
          }),
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || `Request failed with status ${response.status}`);
      }

      const parsedPlots = extractPredictPlots(data);
      if (parsedPlots.length === 0) {
        throw new Error('No plots returned from /predict');
      }

      setSingleImageUrl('');
      setGraphMeta(null);
      setPthFile(null);
      setPlots(parsedPlots);
    } catch (err) {
      alert(`Failed to run simulation: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
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

          {/* MODEL SELECTOR */}
          <div className="section">
            <label className="section-label">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-input"
            >
              {models.map((modelId) => (
                <option key={modelId} value={modelId}>
                  {modelId.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* SHOW AIRFOIL BUTTON */}
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
            {plots.length > 0 ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  overflowY: 'auto',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '10px',
                  padding: '8px',
                }}
              >
                {plots.map((plot, idx) => (
                  <div
                    key={`${plot.label}-${idx}`}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    <span className="placeholder-subtext" style={{ marginBottom: '4px' }}>
                      {plot.label}
                    </span>
                    <img
                      src={plot.src}
                      alt={plot.label}
                      style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                    />
                  </div>
                ))}
              </div>
            ) : singleImageUrl ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={singleImageUrl}
                  alt={`NACA ${airfoil} mesh at ${angle} deg`}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
                {graphMeta && (
                  <p className="placeholder-subtext" style={{ marginTop: '8px' }}>
                    Nodes: {graphMeta.num_nodes} | Edges: {graphMeta.num_edges}
                  </p>
                )}
                {pthFile && (
                  <p className="placeholder-subtext" style={{ marginTop: '4px' }}>
                    Loaded in state: {pthFile.name} ({(pthFile.size / 1024).toFixed(1)} KB)
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
