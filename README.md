# JSON Fixer

Una herramienta web simple para reparar y formatear JSON malformado.

![Demo](demo.png)

## Descripcion

JSON Fixer es una aplicacion web que te permite pegar JSON con errores de formato y automaticamente intenta corregirlos, mostrando el resultado con syntax highlighting para una mejor legibilidad.

## Caracteristicas

- **Reparacion automatica** de JSON malformado:
  - Agrega comillas a claves sin comillas (`{name: "value"}` -> `{"name": "value"}`)
  - Convierte comillas simples a dobles
  - Elimina comas finales antes de `}` o `]`
  - Balancea llaves y corchetes faltantes
  - Corrige comillas tipograficas
  - Agrega comillas a valores string sin comillas

- **Syntax highlighting** con colores para:
  - Claves (azul)
  - Strings (verde)
  - Numeros (naranja)
  - Booleanos (purpura)
  - Null (rojo)

- **Interfaz intuitiva**:
  - Tema oscuro agradable a la vista
  - Boton para copiar al portapapeles
  - Atajos de teclado (`Ctrl+Enter` para formatear, `Escape` para volver)
  - Diseno responsive

## Uso

1. Abre `index.html` en tu navegador
2. Pega tu JSON (puede estar mal formateado)
3. Haz clic en "Formatear JSON"
4. Copia el resultado con el boton "Copiar"

### Ejemplo

**Entrada:**
```
{name: "Pedro", age: 30, active: true, hobbies: ['coding', 'gaming']}
```

**Salida:**
```json
{
  "name": "Pedro",
  "age": 30,
  "active": true,
  "hobbies": [
    "coding",
    "gaming"
  ]
}
```

## Tecnologias

- HTML5
- CSS3 (sin frameworks)
- JavaScript vanilla (sin dependencias)

## Instalacion

No requiere instalacion. Simplemente clona el repositorio y abre `index.html`:

```bash
git clone https://github.com/furthurr/fixJson.git
cd fixJson
open index.html
```

O usa un servidor local:

```bash
npx serve .
```

## Estructura del proyecto

```
fixJson/
├── index.html      # Pagina principal
├── styles.css      # Estilos con tema oscuro
├── json-fixer.js   # Logica para reparar JSON
├── app.js          # Manejo de UI y eventos
└── README.md       # Documentacion
```

## Autor

**Pedro GV** - [@furthurr](https://github.com/furthurr)

## Licencia

MIT License
