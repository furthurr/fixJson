/**
 * JSON Fixer - Intenta reparar JSON malformado
 */
const JSONFixer = {
    /**
     * Intenta parsear y reparar un JSON malformado
     * @param {string} input - El string JSON potencialmente malformado
     * @returns {object} - { success: boolean, data: any, formatted: string, error?: string }
     */
    fix(input) {
        if (!input || !input.trim()) {
            return { success: false, error: 'El input está vacío' };
        }

        let str = input.trim();

        // Primero intentamos parsear directamente
        try {
            const parsed = JSON.parse(str);
            return {
                success: true,
                data: parsed,
                formatted: JSON.stringify(parsed, null, 2)
            };
        } catch (e) {
            // Si falla, intentamos reparar
        }

        // Aplicar reparaciones
        str = this.applyFixes(str);

        // Intentar parsear el resultado reparado
        try {
            const parsed = JSON.parse(str);
            return {
                success: true,
                data: parsed,
                formatted: JSON.stringify(parsed, null, 2)
            };
        } catch (e) {
            return {
                success: false,
                error: `No se pudo reparar el JSON: ${e.message}`
            };
        }
    },

    /**
     * Aplica múltiples correcciones al string JSON
     */
    applyFixes(str) {
        let result = str;

        // 1. Eliminar BOM y caracteres invisibles
        result = result.replace(/^\uFEFF/, '');
        
        // 2. Reemplazar comillas tipográficas por comillas normales
        result = result.replace(/[""]/g, '"');
        result = result.replace(/['']/g, "'");

        // 3. Si no empieza con { o [, intentar envolver
        result = this.wrapIfNeeded(result);

        // 4. Agregar comillas a las claves sin comillas
        result = this.quoteUnquotedKeys(result);

        // 5. Reemplazar comillas simples por dobles en strings
        result = this.fixQuotes(result);

        // 6. Eliminar comas finales antes de } o ]
        result = this.removeTrailingCommas(result);

        // 7. Agregar comas faltantes entre elementos
        result = this.addMissingCommas(result);

        // 8. Corregir valores sin comillas (excepto números, booleanos, null)
        result = this.fixUnquotedValues(result);

        // 9. Balancear llaves y corchetes
        result = this.balanceBrackets(result);

        return result;
    },

    /**
     * Envuelve el contenido con {} si parece ser un objeto sin llaves
     */
    wrapIfNeeded(str) {
        const trimmed = str.trim();
        
        // Si ya empieza con { o [, no hacer nada
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            return str;
        }

        // Si parece contener pares clave:valor, envolver con {}
        if (trimmed.includes(':')) {
            return '{' + str + '}';
        }

        return str;
    },

    /**
     * Agrega comillas a las claves que no las tienen
     */
    quoteUnquotedKeys(str) {
        // Busca patrones como: palabra: o palabra : (sin comillas)
        // Pero evita reemplazar dentro de strings ya entre comillas
        return str.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
    },

    /**
     * Convierte comillas simples a dobles para strings
     */
    fixQuotes(str) {
        let result = '';
        let inDoubleQuote = false;
        let inSingleQuote = false;
        let escaped = false;

        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const prevChar = i > 0 ? str[i - 1] : '';

            if (escaped) {
                result += char;
                escaped = false;
                continue;
            }

            if (char === '\\') {
                escaped = true;
                result += char;
                continue;
            }

            if (char === '"' && !inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
                result += char;
            } else if (char === "'" && !inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
                result += '"'; // Convertir a comilla doble
            } else {
                result += char;
            }
        }

        return result;
    },

    /**
     * Elimina comas finales antes de } o ]
     */
    removeTrailingCommas(str) {
        return str.replace(/,(\s*[}\]])/g, '$1');
    },

    /**
     * Intenta agregar comas faltantes entre elementos
     */
    addMissingCommas(str) {
        // Agregar coma entre } o ] seguido de " o { o [
        let result = str.replace(/([}\]])(\s*)(["{[\[])/g, '$1,$2$3');
        
        // Agregar coma entre "valor" seguido de "clave"
        result = result.replace(/"(\s*)\n(\s*)"/g, '",$1\n$2"');
        
        return result;
    },

    /**
     * Intenta arreglar valores sin comillas que deberían tenerlas
     */
    fixUnquotedValues(str) {
        // Busca patrones como: "key": valor (donde valor no es número, bool, null, objeto o array)
        return str.replace(
            /:(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}\]])/g,
            (match, space, value, end) => {
                // Si es un valor especial de JSON, dejarlo
                if (['true', 'false', 'null'].includes(value.toLowerCase())) {
                    return `:${space}${value.toLowerCase()}${end}`;
                }
                // Si no, agregar comillas
                return `:${space}"${value}"${end}`;
            }
        );
    },

    /**
     * Intenta balancear llaves y corchetes faltantes
     */
    balanceBrackets(str) {
        let result = str;
        
        const countChar = (s, char) => (s.match(new RegExp('\\' + char, 'g')) || []).length;
        
        // Contar llaves y corchetes
        const openBraces = countChar(result, '{');
        const closeBraces = countChar(result, '}');
        const openBrackets = countChar(result, '[');
        const closeBrackets = countChar(result, ']');

        // Agregar llaves faltantes al final
        for (let i = 0; i < openBraces - closeBraces; i++) {
            result += '}';
        }

        // Agregar corchetes faltantes al final
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
            result += ']';
        }

        // Agregar al inicio si faltan aperturas
        for (let i = 0; i < closeBraces - openBraces; i++) {
            result = '{' + result;
        }

        for (let i = 0; i < closeBrackets - openBrackets; i++) {
            result = '[' + result;
        }

        return result;
    }
};

// Exportar para uso en navegador
if (typeof window !== 'undefined') {
    window.JSONFixer = JSONFixer;
}
