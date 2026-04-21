const JSONFixer = {
  fix(input) {
    if (!input || !input.trim()) {
      return { success: false, error: 'El input esta vacio' };
    }

    let str = input.trim();

    try {
      const parsed = JSON.parse(str);
      return {
        success: true,
        data: parsed,
        formatted: JSON.stringify(parsed, null, 2)
      };
    } catch (error) {
      // sigue con reparacion
    }

    str = this.applyFixes(str);

    try {
      const parsed = JSON.parse(str);
      return {
        success: true,
        data: parsed,
        formatted: JSON.stringify(parsed, null, 2)
      };
    } catch (error) {
      return {
        success: false,
        error: `No se pudo reparar el JSON: ${error.message}`
      };
    }
  },

  applyFixes(str) {
    let result = str;

    result = result.replace(/^\uFEFF/, '');
    result = this.removeComments(result);
    result = result.replace(/["\u201C\u201D]/g, '"');
    result = result.replace(/[\u2018\u2019]/g, "'");
    result = this.wrapIfNeeded(result);
    result = this.quoteUnquotedKeys(result);
    result = this.fixQuotes(result);
    result = this.normalizeSpecialLiterals(result);
    result = this.removeTrailingCommas(result);
    result = this.addMissingCommas(result);
    result = this.fixUnquotedValues(result);
    result = this.fixUnquotedArrayItems(result);
    result = this.escapeControlCharactersInStrings(result);
    result = this.balanceBrackets(result);

    return result;
  },

  removeComments(str) {
    let result = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < str.length; i += 1) {
      const char = str[i];
      const next = str[i + 1];

      if (inString) {
        result += char;

        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }

        continue;
      }

      if (char === '"') {
        inString = true;
        result += char;
        continue;
      }

      if (char === '/' && next === '/') {
        while (i < str.length && str[i] !== '\n') {
          i += 1;
        }
        if (i < str.length) {
          result += '\n';
        }
        continue;
      }

      if (char === '/' && next === '*') {
        i += 2;
        while (i < str.length && !(str[i] === '*' && str[i + 1] === '/')) {
          i += 1;
        }
        i += 1;
        continue;
      }

      result += char;
    }

    return result;
  },

  normalizeSpecialLiterals(str) {
    return str
      .replace(/:\s*undefined(\s*[,}\]])/gi, ': null$1')
      .replace(/:\s*NaN(\s*[,}\]])/g, ': null$1')
      .replace(/:\s*-?Infinity(\s*[,}\]])/g, ': null$1');
  },

  isValidJsonNumberLiteral(value) {
    return /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value);
  },

  wrapIfNeeded(str) {
    const trimmed = str.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return str;
    }
    if (trimmed.includes(':')) {
      return `{${str}}`;
    }
    return str;
  },

  quoteUnquotedKeys(str) {
    return str.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  },

  fixQuotes(str) {
    let result = '';
    let inDoubleQuote = false;
    let inSingleQuote = false;
    let escaped = false;

    for (let i = 0; i < str.length; i += 1) {
      const char = str[i];

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
        result += '"';
      } else {
        result += char;
      }
    }

    return result;
  },

  removeTrailingCommas(str) {
    return str.replace(/,(\s*[}\]])/g, '$1');
  },

  addMissingCommas(str) {
    let result = str.replace(/([}\]])(\s*)(["{[\[])/g, '$1,$2$3');
    result = result.replace(/"(\s*)\n(\s*)"/g, '",$1\n$2"');
    return result;
  },

  fixUnquotedValues(str) {
    let result = '';
    let i = 0;
    let inString = false;
    let escaped = false;

    while (i < str.length) {
      const char = str[i];

      if (inString) {
        result += char;
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        i += 1;
        continue;
      }

      if (char === '"') {
        inString = true;
        result += char;
        i += 1;
        continue;
      }

      if (char !== ':') {
        result += char;
        i += 1;
        continue;
      }

      result += char;
      i += 1;

      while (i < str.length && /\s/.test(str[i])) {
        result += str[i];
        i += 1;
      }

      if (i >= str.length) {
        break;
      }

      const startChar = str[i];
      if (startChar === '"' || startChar === '{' || startChar === '[') {
        continue;
      }

      const valueEnd = this.findValueBoundary(str, i);
      const value = str.slice(i, valueEnd);
      i = valueEnd;

      const trimmedValue = value.trim();
      if (!trimmedValue) {
        result += '""';
        continue;
      }

      if (/^(true|false|null)$/i.test(trimmedValue)) {
        result += value.replace(trimmedValue, trimmedValue.toLowerCase());
        continue;
      }

      if (this.isValidJsonNumberLiteral(trimmedValue)) {
        result += value;
        continue;
      }

      const normalizedValue = trimmedValue
        .replace(/\r\n/g, '\n')
        .replace(/[\r\n]+/g, '\\n')
        .replace(/\t/g, ' ');

      const quotedValue = normalizedValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      result += value.replace(trimmedValue, `"${quotedValue}"`);
    }

    return result;
  },

  findValueBoundary(str, startIndex) {
    let i = startIndex;
    while (i < str.length) {
      const char = str[i];
      if (char === ',') {
        if (this.isNextProperty(str, i + 1)) {
          return i;
        }
      } else if (char === '}' || char === ']') {
        return i;
      }
      i += 1;
    }
    return i;
  },

  isNextProperty(str, startIndex) {
    let i = startIndex;
    while (i < str.length && /\s/.test(str[i])) {
      i += 1;
    }
    if (str[i] !== '"') {
      return false;
    }
    i += 1;

    while (i < str.length) {
      if (str[i] === '\\') {
        i += 2;
        continue;
      }
      if (str[i] === '"') {
        i += 1;
        break;
      }
      i += 1;
    }

    while (i < str.length && /\s/.test(str[i])) {
      i += 1;
    }
    return str[i] === ':';
  },

  fixUnquotedArrayItems(str) {
    let result = '';
    let i = 0;
    let inString = false;
    let escaped = false;
    const stack = [];
    let expectArrayValue = false;

    while (i < str.length) {
      const char = str[i];

      if (inString) {
        result += char;
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        i += 1;
        continue;
      }

      if (char === '"') {
        inString = true;
        result += char;
        i += 1;
        continue;
      }

      if (char === '[') {
        stack.push('array');
        result += char;
        expectArrayValue = true;
        i += 1;
        continue;
      }

      if (char === '{') {
        stack.push('object');
        result += char;
        expectArrayValue = false;
        i += 1;
        continue;
      }

      if (char === ']' || char === '}') {
        stack.pop();
        result += char;
        expectArrayValue = false;
        i += 1;
        continue;
      }

      if (char === ',') {
        result += char;
        expectArrayValue = stack[stack.length - 1] === 'array';
        i += 1;
        continue;
      }

      if (stack[stack.length - 1] !== 'array' || !expectArrayValue) {
        result += char;
        i += 1;
        continue;
      }

      while (i < str.length && /\s/.test(str[i])) {
        result += str[i];
        i += 1;
      }

      if (i >= str.length) {
        break;
      }

      const startChar = str[i];
      if (startChar === '"' || startChar === '{' || startChar === '[' || startChar === ']' || startChar === '-' || /\d/.test(startChar)) {
        expectArrayValue = false;
        continue;
      }

      const valueEnd = this.findArrayItemBoundary(str, i);
      const value = str.slice(i, valueEnd);
      i = valueEnd;

      const trimmedValue = value.trim();
      if (!trimmedValue) {
        result += '""';
        expectArrayValue = false;
        continue;
      }

      if (/^(true|false|null)$/i.test(trimmedValue)) {
        result += value.replace(trimmedValue, trimmedValue.toLowerCase());
        expectArrayValue = false;
        continue;
      }

      if (this.isValidJsonNumberLiteral(trimmedValue)) {
        result += value;
        expectArrayValue = false;
        continue;
      }

      const normalizedValue = trimmedValue
        .replace(/\r\n/g, '\n')
        .replace(/[\r\n]+/g, '\\n')
        .replace(/\t/g, ' ');

      const quotedValue = normalizedValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      result += value.replace(trimmedValue, `"${quotedValue}"`);
      expectArrayValue = false;
    }

    return result;
  },

  findArrayItemBoundary(str, startIndex) {
    let i = startIndex;
    let nestedObjects = 0;
    let nestedArrays = 0;

    while (i < str.length) {
      const char = str[i];
      if (char === '{') {
        nestedObjects += 1;
      } else if (char === '}') {
        if (nestedObjects === 0) {
          return i;
        }
        nestedObjects -= 1;
      } else if (char === '[') {
        nestedArrays += 1;
      } else if (char === ']') {
        if (nestedObjects === 0 && nestedArrays === 0) {
          return i;
        }
        nestedArrays -= 1;
      } else if (char === ',' && nestedObjects === 0 && nestedArrays === 0) {
        return i;
      }
      i += 1;
    }
    return i;
  },

  balanceBrackets(str) {
    let result = str;
    const countChar = (text, char) => (text.match(new RegExp(`\\${char}`, 'g')) || []).length;
    const openBraces = countChar(result, '{');
    const closeBraces = countChar(result, '}');
    const openBrackets = countChar(result, '[');
    const closeBrackets = countChar(result, ']');

    for (let i = 0; i < openBraces - closeBraces; i += 1) {
      result += '}';
    }
    for (let i = 0; i < openBrackets - closeBrackets; i += 1) {
      result += ']';
    }
    for (let i = 0; i < closeBraces - openBraces; i += 1) {
      result = `{${result}`;
    }
    for (let i = 0; i < closeBrackets - openBrackets; i += 1) {
      result = `[${result}`;
    }

    return result;
  },

  escapeControlCharactersInStrings(str) {
    let result = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < str.length; i += 1) {
      const char = str[i];

      if (!inString) {
        result += char;
        if (char === '"') {
          inString = true;
        }
        continue;
      }

      if (escaped) {
        result += char;
        escaped = false;
        continue;
      }

      if (char === '\\') {
        result += char;
        escaped = true;
        continue;
      }

      if (char === '"') {
        result += char;
        inString = false;
        continue;
      }

      if (char === '\n') {
        result += '\\n';
        continue;
      }

      if (char === '\r') {
        result += '\\r';
        continue;
      }

      if (char === '\t') {
        result += '\\t';
        continue;
      }

      result += char;
    }

    return result;
  }
};

export default JSONFixer;
