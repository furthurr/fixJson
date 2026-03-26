import React, { Suspense, lazy, useState } from 'react';
import JSONFixer from './jsonFixer';

const JsonGraph = lazy(() => import('./JsonGraph'));

function JsonValue({ value, depth = 0, propertyName = null, isLast = true, defaultCollapsed = false }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === 'object' && !isArray;
  const isBranch = isArray || isObject;

  const indentStyle = { paddingLeft: `${depth * 20}px` };
  const comma = isLast ? '' : ',';

  function renderPrimitive(currentValue) {
    if (currentValue === null) {
      return <span className="json-null-token">null</span>;
    }

    if (typeof currentValue === 'string') {
      return <span className="json-string-token">"{currentValue}"</span>;
    }

    if (typeof currentValue === 'number') {
      return <span className="json-number-token">{currentValue}</span>;
    }

    if (typeof currentValue === 'boolean') {
      return <span className="json-boolean-token">{String(currentValue)}</span>;
    }

    return <span>{String(currentValue)}</span>;
  }

  if (!isBranch) {
    return (
      <div className="json-line" style={indentStyle}>
        {propertyName !== null && (
          <>
            <span className="json-key-token">"{propertyName}"</span>
            <span>: </span>
          </>
        )}
        {renderPrimitive(value)}
        <span>{comma}</span>
      </div>
    );
  }

  const entries = isArray
    ? value.map((item, index) => [index, item])
    : Object.entries(value);

  const opening = isArray ? '[' : '{';
  const closing = isArray ? ']' : '}';
  const preview = isArray ? `[${entries.length} items]` : `{${entries.length} keys}`;

  if (collapsed) {
    return (
      <div className="json-line" style={indentStyle}>
        {propertyName !== null && (
          <>
            <button type="button" className="json-collapse-toggle" onClick={() => setCollapsed(false)}>+</button>
            <span className="json-key-token">"{propertyName}"</span>
            <span>: </span>
          </>
        )}
        {propertyName === null && (
          <button type="button" className="json-collapse-toggle" onClick={() => setCollapsed(false)}>+</button>
        )}
        <span className="json-bracket-token">{opening}</span>
        <span className="json-collapsed-preview">{preview}</span>
        <span className="json-bracket-token">{closing}</span>
        <span>{comma}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="json-line" style={indentStyle}>
        {propertyName !== null && (
          <>
            <button type="button" className="json-collapse-toggle" onClick={() => setCollapsed(true)}>-</button>
            <span className="json-key-token">"{propertyName}"</span>
            <span>: </span>
          </>
        )}
        {propertyName === null && (
          <button type="button" className="json-collapse-toggle" onClick={() => setCollapsed(true)}>-</button>
        )}
        <span className="json-bracket-token">{opening}</span>
      </div>

      {entries.map(([key, child], index) => (
        <JsonValue
          key={`${propertyName || 'root'}-${key}`}
          value={child}
          depth={depth + 1}
          propertyName={isArray ? null : key}
          isLast={index === entries.length - 1}
          defaultCollapsed={false}
        />
      ))}

      <div className="json-line" style={indentStyle}>
        <span className="json-bracket-token">{closing}</span>
        <span>{comma}</span>
      </div>
    </div>
  );
}

function JsonTextView({ data }) {
  if (data === null || data === undefined) {
    return null;
  }

  return (
    <div className="json-pretty json-pretty--interactive">
      <JsonValue value={data} />
    </div>
  );
}

export default function App() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [formatted, setFormatted] = useState('');
  const [parsed, setParsed] = useState(null);
  const [view, setView] = useState('text');
  const [copied, setCopied] = useState(false);
  const [isExportingGraph, setIsExportingGraph] = useState(false);

  const hasResult = Boolean(formatted);

  function handleFormat() {
    setCopied(false);
    const result = JSONFixer.fix(input);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setError('');
    setFormatted(result.formatted);
    setParsed(result.data);
    setView('text');
  }

  async function handleCopy() {
    if (!formatted) {
      return;
    }

    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (copyError) {
      setError('No se pudo copiar al portapapeles.');
    }
  }

  function handleReset() {
    setView('text');
    setFormatted('');
    setParsed(null);
    setError('');
    setCopied(false);
  }

  return (
    <div className="app-shell">
      {isExportingGraph && (
        <div className="graph-loading-overlay">
          <div className="graph-loading-overlay__content">
            <div className="graph-loading-overlay__text">Cargando...</div>
          </div>
        </div>
      )}

      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />

      <main className="app-card">
        <header className="hero">
          <div>
            <p className="eyebrow">JSON Repair + Visualization</p>
            <h1>JSON Fixer</h1>
            <p className="hero__subtitle">
              Pega un JSON roto, lo reparo sin cambiar sus datos y te lo muestro en texto o en un grafo navegable.
            </p>
          </div>
        </header>

        {!hasResult && (
          <section className="composer">
            <label htmlFor="json-input" className="composer__label">Pega tu JSON aqui</label>
            <textarea
              id="json-input"
              className="composer__input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder='{mensaje: "ok", resultado: [{nombre: Juan, edad: 30}]}'
              spellCheck="false"
            />

            {error && <div className="error-box">{error}</div>}

            <button type="button" className="primary-button" onClick={handleFormat}>
              Formatear JSON
            </button>
          </section>
        )}

        {hasResult && (
          <section className="workspace">
            <div className="workspace__topbar">
              <div>
                <h2>Resultado reparado</h2>
                <p>Elige la vista que prefieras para inspeccionar el JSON.</p>
              </div>

              <div className="workspace__actions">
                <div className="segmented-control">
                  <button
                    type="button"
                    className={view === 'text' ? 'is-active' : ''}
                    onClick={() => setView('text')}
                  >
                    Vista texto
                  </button>
                  <button
                    type="button"
                    className={view === 'graph' ? 'is-active' : ''}
                    onClick={() => setView('graph')}
                  >
                    Vista grafica
                  </button>
                </div>

                <button type="button" className="secondary-button" onClick={handleCopy}>
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
                <button type="button" className="secondary-button" onClick={handleReset}>
                  Volver
                </button>
              </div>
            </div>

            {view === 'text' ? (
              <section className="panel panel--text">
                <JsonTextView data={parsed} />
              </section>
            ) : (
              <Suspense fallback={<section className="panel panel--loading">Cargando vista grafica...</section>}>
                <JsonGraph data={parsed} onExportingChange={setIsExportingGraph} />
              </Suspense>
            )}
          </section>
        )}

        <footer className="footer-note">
          Autor: Pedro GV <a href="https://github.com/furthurr" target="_blank" rel="noreferrer">@furthurr</a>
        </footer>
      </main>
    </div>
  );
}
