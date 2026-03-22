/**
 * App principal - Maneja la UI y eventos
 */
document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const inputView = document.getElementById('input-view');
    const resultView = document.getElementById('result-view');
    const jsonInput = document.getElementById('json-input');
    const jsonOutput = document.getElementById('json-output').querySelector('code');
    const fixBtn = document.getElementById('fix-btn');
    const copyBtn = document.getElementById('copy-btn');
    const backBtn = document.getElementById('back-btn');
    const errorMessage = document.getElementById('error-message');
    const copyToast = document.getElementById('copy-toast');

    // Estado
    let currentFormattedJSON = '';

    /**
     * Aplica syntax highlighting al JSON
     */
    function highlightJSON(json) {
        // Escapar HTML
        let escaped = json
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Aplicar colores
        return escaped
            // Strings (incluyendo las claves)
            .replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match, content) => {
                return `<span class="json-string">"${content}"</span>`;
            })
            // Claves (strings seguidos de :)
            .replace(/<span class="json-string">"([^"]+)"<\/span>(\s*):/g, (match, key, space) => {
                return `<span class="json-key">"${key}"</span>${space}:`;
            })
            // Números
            .replace(/:\s*(-?\d+\.?\d*)/g, (match, num) => {
                return `: <span class="json-number">${num}</span>`;
            })
            // También números en arrays
            .replace(/\[\s*(-?\d+\.?\d*)/g, (match, num) => {
                return `[ <span class="json-number">${num}</span>`;
            })
            .replace(/,\s*(-?\d+\.?\d*)(\s*[,\]])/g, (match, num, end) => {
                return `, <span class="json-number">${num}</span>${end}`;
            })
            // Booleanos
            .replace(/:\s*(true|false)/g, (match, bool) => {
                return `: <span class="json-boolean">${bool}</span>`;
            })
            .replace(/\[\s*(true|false)/g, (match, bool) => {
                return `[ <span class="json-boolean">${bool}</span>`;
            })
            .replace(/,\s*(true|false)/g, (match, bool) => {
                return `, <span class="json-boolean">${bool}</span>`;
            })
            // Null
            .replace(/:\s*null/g, ': <span class="json-null">null</span>')
            .replace(/\[\s*null/g, '[ <span class="json-null">null</span>')
            .replace(/,\s*null/g, ', <span class="json-null">null</span>');
    }

    /**
     * Muestra un error
     */
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.add('visible');
    }

    /**
     * Oculta el error
     */
    function hideError() {
        errorMessage.classList.remove('visible');
    }

    /**
     * Cambia entre vistas
     */
    function showView(view) {
        inputView.classList.remove('active');
        resultView.classList.remove('active');
        view.classList.add('active');
    }

    /**
     * Muestra el toast de copiado
     */
    function showToast() {
        copyToast.classList.add('visible');
        setTimeout(() => {
            copyToast.classList.remove('visible');
        }, 2000);
    }

    /**
     * Procesa el JSON
     */
    function processJSON() {
        hideError();
        const input = jsonInput.value;

        if (!input.trim()) {
            showError('Por favor, ingresa un JSON para formatear.');
            return;
        }

        const result = JSONFixer.fix(input);

        if (result.success) {
            currentFormattedJSON = result.formatted;
            jsonOutput.innerHTML = highlightJSON(result.formatted);
            showView(resultView);
        } else {
            showError(result.error);
        }
    }

    /**
     * Copia el JSON al portapapeles
     */
    async function copyToClipboard() {
        try {
            await navigator.clipboard.writeText(currentFormattedJSON);
            showToast();
        } catch (err) {
            // Fallback para navegadores antiguos
            const textarea = document.createElement('textarea');
            textarea.value = currentFormattedJSON;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast();
        }
    }

    /**
     * Vuelve a la vista de entrada
     */
    function goBack() {
        showView(inputView);
    }

    // Event listeners
    fixBtn.addEventListener('click', processJSON);
    copyBtn.addEventListener('click', copyToClipboard);
    backBtn.addEventListener('click', goBack);

    // Permitir Ctrl+Enter para procesar
    jsonInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            processJSON();
        }
    });

    // Permitir Escape para volver
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && resultView.classList.contains('active')) {
            goBack();
        }
    });
});
