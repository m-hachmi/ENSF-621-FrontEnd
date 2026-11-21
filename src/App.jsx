import React, { useEffect, useState } from 'react';
import './App.css';

const GRAPH_API_URL = 'https://ensf621-api.onrender.com';
const MODEL_API_URL =
  import.meta.env.VITE_API_URL || 'https://tfrddd-quick-fluid-flow-api.hf.space';








  /* GEMINI HELPED WITH THIS ONE (BEGIN)*/

function extractPredictPlots(data) {
  if (!data) return [];

  if (Array.isArray(data.fields)) {
    const plots = [];

    data.fields.forEach((item, idx) => {
      if (!item) return;
      const baseLabel = item.label || item.id || `Field ${idx + 1}`;

      if (typeof item.image === 'string' && item.image.length > 0) {
        plots.push({ label: baseLabel, src: item.image });
      }
      if (typeof item.image_a === 'string' && item.image_a.length > 0) {
        plots.push({ label: `${baseLabel} — Model A`, src: item.image_a });
      }
      if (typeof item.image_b === 'string' && item.image_b.length > 0) {
        plots.push({ label: `${baseLabel} — Model B`, src: item.image_b });
      }
      if (typeof item.image_diff === 'string' && item.image_diff.length > 0) {
        plots.push({ label: `${baseLabel} — Difference`, src: item.image_diff });
      }
    });

    if (plots.length > 0) return plots;
  }

  if (Array.isArray(data.plots)) {
    return data.plots
      .map((item, idx) =>
        typeof item === 'string'
          ? { label: `Plot ${idx + 1}`, src: item }
          : {
              label: item.label || item.title || item.name || `Plot ${idx + 1}`,
              src: item.image || item.image_base64 || item.data_url || item.src || '',
            }
      )
      .filter((p) => typeof p.src === 'string' && p.src.length > 0);
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
/* GEMINI HELPED WITH THIS ONE (END)*/













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
  const [modelA, setModelA] = useState('gnn');
  const [modelB, setModelB] = useState('pinn');

  const [isShowingAirfoil, setIsShowingAirfoil] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
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
          const ids = list
            .map((m) => (typeof m === 'string' ? m : m.id || m.name))
            .filter(Boolean);
          if (ids.length > 0) {
            setModels(ids);
            setSelectedModel((prev) => (ids.includes(prev) ? prev : ids[0]));
            setModelA((prev) => (ids.includes(prev) ? prev : ids[0]));
            setModelB((prev) =>
              ids.includes(prev) ? prev : ids[1] || ids[0]
            );
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

  const runModelEndpoint = async ({ endpoint, extraFields, errorPrefix }) => {
    if (!pthFile) {
      alert('Please generate the airfoil (.pth) first before running simulation');
      return;
    }

    const formData = new FormData();
    formData.append('file', pthFile, pthFile.name);
    Object.entries(extraFields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const response = await fetch(`${MODEL_API_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || `Request failed with status ${response.status}`);
    }

    const parsedPlots = extractPredictPlots(data);
    if (parsedPlots.length === 0) {
      throw new Error(`No plots returned from ${endpoint}`);
    }

    setSingleImageUrl('');
    setGraphMeta(null);
    setPlots(parsedPlots);
  };

  /* ------------HANDLING THE SIMULATION BUTTON CLICK------------------*/
  const handleSimulate = async () => {
    if (!pthFile) {
      alert('Please generate the airfoil (.pth) first before running simulation');
      return;
    }

    setIsSimulating(true);
    try {
      await runModelEndpoint({
        endpoint: '/predict',
        extraFields: { model_id: selectedModel },
        errorPrefix: 'Failed to run simulation',
      });
    } catch (err) {
      alert(`Failed to run simulation: ${err.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  /* ------------HANDLING THE COMPARE BUTTON CLICK------------------*/
  const handleCompare = async () => {
    if (!pthFile) {
      alert('Please generate the airfoil (.pth) first before comparing models');
      return;
    }
    if (!airfoil.trim()) {
      alert('Please enter a NACA airfoil name before comparing models');
      return;
    }

    setIsComparing(true);
    try {
      await runModelEndpoint({
        endpoint: '/compare',
        extraFields: {
          model_a: modelA,
          model_b: modelB,
          naca_name: airfoil.trim(),
        },
        errorPrefix: 'Failed to compare models',
      });
    } catch (err) {
      alert(`Failed to compare models: ${err.message}`);
    } finally {
      setIsComparing(false);
    }
  };

  const isBusy = isShowingAirfoil || isSimulating || isComparing;

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

          {/* COMPARE MODEL SELECTORS */}
          <div className="section">
            <label className="section-label">Compare Models</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                aria-label="Model A"
                value={modelA}
                onChange={(e) => setModelA(e.target.value)}
                className="text-input"
              >
                {models.map((modelId) => (
                  <option key={`a-${modelId}`} value={modelId}>
                    A: {modelId.toUpperCase()}
                  </option>
                ))}
              </select>
              <select
                aria-label="Model B"
                value={modelB}
                onChange={(e) => setModelB(e.target.value)}
                className="text-input"
              >
                {models.map((modelId) => (
                  <option key={`b-${modelId}`} value={modelId}>
                    B: {modelId.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
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
          <div className="section">
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

          {/* COMPARE BUTTON */}
          <div className="section">
            <button
              type="button"
              onClick={handleCompare}
              disabled={isBusy}
              className="simulate-button"
              style={{
                opacity: isBusy ? 0.7 : 1,
                cursor: isBusy ? 'not-allowed' : 'pointer',
              }}
            >
              {isComparing ? 'Comparing...' : 'Compare'}
            </button>
          </div>
        </div>

        {/* divider */}
        <div className="divider" />

        {/* results */}
        <div className="right-panel" style={{ minWidth: 0 }}>
          {plots.length > 0 ? (
            <div
              style={{
                width: '100%',
                minWidth: 0,
                maxHeight: '75vh',
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                padding: '16px',
                boxSizing: 'border-box',
              }}
            >
              {plots.map((plot, idx) => (
                <div
                  key={`${plot.label}-${idx}`}
                  style={{
                    width: '100%',
                    minWidth: 0,
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <span
                    className="placeholder-subtext"
                    style={{ marginBottom: '6px', fontWeight: 600 }}
                  >
                    {plot.label}
                  </span>
                  <img
                    src={plot.src}
                    alt={plot.label}
                    style={{
                      width: '100%',
                      maxWidth: '520px',
                      height: 'auto',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="square-image-container">
              {singleImageUrl ? (
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
          )}
        </div>
      </div>
    </div>
  );
}
