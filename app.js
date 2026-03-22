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
    let currentParsedJSON = null;

    /**
     * Genera HTML con syntax highlighting y elementos colapsables
     */
    function renderJSON(data, indent = 0) {
        const indentStr = '  '.repeat(indent);
        const nextIndent = '  '.repeat(indent + 1);

        if (data === null) {
            return '<span class="json-null">null</span>';
        }

        if (typeof data === 'boolean') {
            return `<span class="json-boolean">${data}</span>`;
        }

        if (typeof data === 'number') {
            return `<span class="json-number">${data}</span>`;
        }

        if (typeof data === 'string') {
            const escaped = data
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
            return `<span class="json-string">"${escaped}"</span>`;
        }

        if (Array.isArray(data)) {
            if (data.length === 0) {
                return '[]';
            }

            const items = data.map((item, index) => {
                const comma = index < data.length - 1 ? ',' : '';
                const rendered = renderJSON(item, indent + 1);
                return `${nextIndent}${rendered}${comma}`;
            });

            const content = items.join('\n');
            const preview = `Array(${data.length})`;

            return `<span class="collapsible" onclick="toggleCollapse(this)"><span class="collapse-icon">-</span>[</span><span class="collapsible-content">\n${content}\n${indentStr}</span><span class="collapse-preview">${preview}</span>]`;
        }

        if (typeof data === 'object') {
            const keys = Object.keys(data);
            if (keys.length === 0) {
                return '{}';
            }

            const items = keys.map((key, index) => {
                const comma = index < keys.length - 1 ? ',' : '';
                const escapedKey = key
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
                const rendered = renderJSON(data[key], indent + 1);
                return `${nextIndent}<span class="json-key">"${escapedKey}"</span>: ${rendered}${comma}`;
            });

            const content = items.join('\n');
            const preview = `{${keys.length} keys}`;

            return `<span class="collapsible" onclick="toggleCollapse(this)"><span class="collapse-icon">-</span>{</span><span class="collapsible-content">\n${content}\n${indentStr}</span><span class="collapse-preview">${preview}</span>}`;
        }

        return String(data);
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
            currentParsedJSON = result.data;
            jsonOutput.innerHTML = renderJSON(result.data);
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

/**
 * Función global para colapsar/expandir elementos
 */
function toggleCollapse(element) {
    const content = element.nextElementSibling;
    const preview = content.nextElementSibling;
    const icon = element.querySelector('.collapse-icon');
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        preview.classList.remove('visible');
        icon.textContent = '-';
    } else {
        content.classList.add('collapsed');
        preview.classList.add('visible');
        icon.textContent = '+';
    }
}
