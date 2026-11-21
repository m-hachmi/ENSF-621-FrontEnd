import React, { useEffect, useState } from 'react';
import './App.css'; 


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function postJSON(path, body) {
  return send(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function postForm(path, form) {
  return send(path, { method: 'POST', body: form });
}

async function makeGraphFile(body) {
  const g = await postJSON('/generate-graph?include_edges=false', body);
  const res = await fetch(`${API_URL}${g.download_url}`);
  if (!res.ok) throw new Error(`Could not download the graph (HTTP ${res.status})`);
  return res.blob();
}

async function send(path, options) {
  const res = await fetch(`${API_URL}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((d) => d.msg.replace(/^Value error, /, '')).join('; ')
      : data.detail;
    throw new Error(detail || `Request failed (HTTP ${res.status})`);
  }
  return data;
}

export default function App() {
  const [angle, setAngle] = useState('');
  const [speed, setSpeed] = useState('');
  const [airfoil, setAirfoil] = useState('');
  const [models, setModels] = useState([]);
  const [modelId, setModelId] = useState('');
  const [loading, setLoading] = useState(null);      
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);     
  const [result, setResult] = useState(null);        
  const [field, setField] = useState(0);            
  const [compareId, setCompareId] = useState('');
  const [comparison, setComparison] = useState(null);


  /* ------------HANDLING THE SIMULATION BUTTON CLICK------------------*/
    /* ------------ LOAD THE LIST OF MODELS WHEN THE PAGE OPENS ------------ */
  useEffect(() => {
    fetch(`${API_URL}/models`)
      .then((r) => r.json())
      .then((list) => {
        setModels(list);
        const first = list.find((m) => m.available);
        if (first) setModelId(first.id);
      })
      .catch(() => setError(`Cannot reach the API at ${API_URL}. Is the server running?`));
  }, []);

  const inputs = () => {
    if (!airfoil || angle === '' || speed === '') {
      alert('All parameters need to be filled');
      return null;
    }
    return { naca_name: airfoil, aoa: Number(angle), speed: Number(speed) };
  };



  /* ------------ SHOW AIRFOIL: user input -> preprocessing -> mesh image ------------ */
  const handleShowAirfoil = async () => {
    const body = inputs();
    if (!body) return;
    setLoading('preview'); setError(''); setResult(null); setComparison(null);
    try {
      setPreview(await postJSON('/preview', body));
    } catch (e) {
      setError(e.message); setPreview(null);
    } finally {
      setLoading(null);
    }
  };



  /* ------------ RUN SIMULATION: user input -> preprocessing -> model inference -> field images ------------ */
    const handleSimulate = async () => {
    const body = inputs();
    if (!body) return;
    if (!modelId) {
      setError('No model is available. Check the API console for the reason.');
      return;
    }
    if (compareId && compareId === modelId) {
      setError('Choose two different models to compare.');
      return;
    }
    setLoading('predict'); setError('');
    try {
      const graph = await makeGraphFile(body);
      const form = new FormData();
      form.append('file', graph, `naca_${body.naca_name}.pth`);
      form.append('naca_name', body.naca_name);
      if (compareId) {
        form.append('model_a', modelId);
        form.append('model_b', compareId);
        setComparison(await postForm('/compare', form));
        setResult(null);
      } else {
        form.append('model_id', modelId);
        setResult(await postForm('/predict', form));
        setComparison(null);
      }
      setField(0);
    } catch (e) {
      setError(e.message); setResult(null); setComparison(null);
    } finally {
      setLoading(null);
    }
  };

  /* ------------ COMPARE MODELS: user input -> preprocessing -> model comparison -> field images ------------ */
  const handleCompare = async () => {
    const body = inputs();
    if (!body) return;
    if (!modelId) {
      setError('No model is available. Check the API console for the reason.');
      return;
    }
    if (!compareId) {
      setError('Choose a second model in "Compare with" to compare.');
      return;
    }
    if (compareId === modelId) {
      setError('Choose two different models to compare.');
      return;
    }
    setLoading('compare'); setError('');
    try {
      const graph = await makeGraphFile(body);
      const form = new FormData();
      form.append('file', graph, `naca_${body.naca_name}.pth`);
      form.append('naca_name', body.naca_name);
      form.append('model_a', modelId);
      form.append('model_b', compareId);
      setComparison(await postForm('/compare', form));
      setResult(null);
      setField(0);
    } catch (e) {
      setError(e.message); setResult(null); setComparison(null);
    } finally {
      setLoading(null);
    }
  };

  const busy = loading !== null;



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

          {/* MODEL SELECTION (filled from GET /models) */}
          <div className="section">
            <label className="section-label">Model</label>
            <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="text-input">
              {models.length === 0 && <option value="">No models loaded</option>}
              {models.map((m) => (
                <option key={m.id} value={m.id} disabled={!m.available}>
                  {m.label}{m.available ? '' : ' (unavailable)'}
                </option>
              ))}
            </select>
          </div>
                    {/* COMPARE WITH A SECOND MODEL */}
          <div className="section">
            <label className="section-label">Compare with</label>
            <select value={compareId} onChange={(e) => setCompareId(e.target.value)} className="text-input">
              <option value="">None</option>
              {models.filter((m) => m.available && m.id !== modelId).map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* SHOW AIRFOIL BUTTON */}
          {/* THIS WILL RUN THE USER INPUT PREPROCESSING SCRIPT DISPLAYS THE MATPLOTLIB PICTURE */}
          <div className="section" style={{ marginTop: 'auto' }}>
            <button
              type="button"
              onClick={handleShowAirfoil}
              disabled={busy}
              className="show-button"
              style={{
                opacity: busy ? 0.7 : 1,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {loading === 'preview' ? 'Generating PyG Object' : 'Show airfoil'}
            </button>
          </div>



          {/* SIMULATION BUTTON*/}
          <div className="section">
            <button
              type="button"
              onClick={handleSimulate}
              disabled={busy}
              className="simulate-button"
              style={{
                opacity: busy ? 0.7 : 1,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {loading === 'predict' ? 'Simulating...' : 'Run Simulation'}
            </button>
          </div>

          {/* COMPARE BUTTON */}
          <div className="section">
            <button
              type="button"
              onClick={handleCompare}
              disabled={busy}
              className="simulate-button"
              style={{
                opacity: busy ? 0.7 : 1,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              {loading === 'compare' ? 'Comparing...' : 'Compare'}
            </button>
          </div>
        </div>

        {/* divider */}
        <div className="divider" />




        {/* results */}
       <div className="right-panel">

          {/* 1. LOADING */}
          {busy && (
            <div className="placeholder-box">
              <div className="spinner" />
              <p className="placeholder-text">
                {loading === 'preview'
                  ? 'Generating the input mesh…'
                  : loading === 'compare'
                  ? 'Comparing models…'
                  : 'Running the model…'}
              </p>
              <p className="placeholder-subtext">This takes a few seconds</p>
            </div>
          )}

          {/* 2. ERROR */}
          {!busy && error && (
            <div className="placeholder-box">
              <p className="error-text">{error}</p>
            </div>
          )}
          {!busy && !error && comparison && (
            <div className="results">
              <div className="field-tabs">
                {comparison.fields.map((fl, i) => (
                  <button
                    key={fl.id}
                    type="button"
                    className={`field-tab ${i === field ? 'active' : ''}`}
                    onClick={() => setField(i)}
                  >
                    {fl.label}
                  </button>
                ))}
              </div>
              <div className="compare-grid">
                <img className="result-image" src={comparison.fields[field].image_a} alt="Model A" />
                <img className="result-image" src={comparison.fields[field].image_b} alt="Model B" />
              </div>
              <img className="result-image compare-diff" src={comparison.fields[field].image_diff} alt="Difference" />
              <p className="result-meta">
                Mean |A − B|: {comparison.fields[field].mean_abs_diff.toPrecision(3)} {comparison.fields[field].units} ·
                {' '}max |A − B|: {comparison.fields[field].max_abs_diff.toPrecision(3)} {comparison.fields[field].units}
              </p>
              <p className="result-meta">
                A: {comparison.model_a.label} ({comparison.model_a.inference_time_s}s) ·
                {' '}B: {comparison.model_b.label} ({comparison.model_b.inference_time_s}s)
                <br />
                NACA {comparison.naca_name} · {comparison.aoa}° · {comparison.speed} m/s ·
                {' '}{comparison.num_nodes.toLocaleString()} nodes
              </p>
              {comparison.warnings.map((w) => <p key={w} className="warning-text">⚠ {w}</p>)}
              <p className="note-text">{comparison.note}</p>
            </div>
          )}

          {/* 3. PREDICTION (Run Simulation) */}
          {!busy && !error && !comparison && result && (
            <div className="results">
              <div className="field-tabs">
                {result.fields.map((fl, i) => (
                  <button
                    key={fl.id}
                    type="button"
                    className={`field-tab ${i === field ? 'active' : ''}`}
                    onClick={() => setField(i)}
                  >
                    {fl.label}
                  </button>
                ))}
              </div>
              <img className="result-image" src={result.fields[field].image} alt={`${result.fields[field].label} prediction`} />
              <p className="result-meta">
                Range: {result.fields[field].min.toPrecision(4)} to {result.fields[field].max.toPrecision(4)} {result.fields[field].units}
              </p>
              <p className="result-meta">
                {result.model_label} · NACA {result.naca_name} · {result.aoa}° · {result.speed} m/s
                <br />
                {result.num_nodes.toLocaleString()} nodes · preprocessing {result.preprocessing_time_s}s ·
                inference {result.inference_time_s}s
              </p>
              {result.warnings.map((w) => <p key={w} className="warning-text">⚠ {w}</p>)}
              <p className="note-text">{result.note}</p>
            </div>
          )}

          {/* 4. MESH PREVIEW (Show airfoil) */}
          {!busy && !error && !comparison && !result && preview && (
            <div className="results">
              <img className="result-image" src={preview.image} alt="Input mesh" />
              <p className="result-meta">
                {preview.num_nodes.toLocaleString()} nodes ({preview.num_surface_nodes} on the airfoil) ·
                {' '}{preview.num_edges.toLocaleString()} edges · {preview.preprocessing_time_s}s
              </p>
              {preview.warnings.map((w) => <p key={w} className="warning-text">⚠ {w}</p>)}
            </div>
          )}

          {/* 5. PLACEHOLDER (nothing run yet) */}
          {!busy && !error && !comparison && !result && !preview && (
            <div className="square-image-container">
              <div className="placeholder-box">
                <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="placeholder-text">ML Model inference will be displayed here</p>
                <p className="placeholder-subtext">Fill out the simulation parameters first</p>
              </div>
            </div>
          )}

        </div>  

      </div>

    </div> /* MAIN CONTAINER ENDS HERE*/
  );
}
