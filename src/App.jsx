import React, { Suspense, lazy, useMemo, useState } from 'react';
import JSONFixer from './jsonFixer';

const JsonGraph = lazy(() => import('./JsonGraph'));

function highlightJson(json) {
  const escaped = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"\s*:?)|(\btrue\b|\bfalse\b)|(\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, stringToken, booleanToken, nullToken, numberToken) => {
      if (stringToken) {
        if (stringToken.endsWith(':')) {
          return `<span class="json-key-token">${stringToken.slice(0, -1)}</span>:`;
        }
        return `<span class="json-string-token">${stringToken}</span>`;
      }
      if (booleanToken) {
        return `<span class="json-boolean-token">${booleanToken}</span>`;
      }
      if (nullToken) {
        return `<span class="json-null-token">${nullToken}</span>`;
      }
      return `<span class="json-number-token">${numberToken}</span>`;
    }
  );
}

export default function App() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [formatted, setFormatted] = useState('');
  const [parsed, setParsed] = useState(null);
  const [view, setView] = useState('text');
  const [copied, setCopied] = useState(false);

  const highlighted = useMemo(() => {
    if (!formatted) {
      return '';
    }
    return highlightJson(formatted);
  }, [formatted]);

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
    setView('graph');
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
                <pre className="json-pretty" dangerouslySetInnerHTML={{ __html: highlighted }} />
              </section>
            ) : (
              <Suspense fallback={<section className="panel panel--loading">Cargando vista grafica...</section>}>
                <JsonGraph data={parsed} />
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
