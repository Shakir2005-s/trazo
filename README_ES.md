[English](README.md) | Español

# trazo

[![CI](https://github.com/heidenber/trazo/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/heidenber/trazo/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/@heidenber/trazo)](https://www.npmjs.com/package/@heidenber/trazo)

El agente dice qué hay en el sistema; trazo decide dónde va cada cosa.

Escribís un diagrama como JSON semántico, sin coordenadas. trazo lo valida, lo acomoda y escribe un único archivo HTML autocontenido.

![Diagrama entidad-relación generado por trazo, con tablas, columnas y claves foráneas](https://raw.githubusercontent.com/heidenber/trazo/main/docs/erd-light.png)

## Demo

`demo.json`:

```json
{
  "type": "architecture",
  "title": "Orders",
  "nodes": [{ "id": "web", "kind": "client" }, { "id": "api" }, { "id": "db", "kind": "database" }],
  "edges": ["web -> api: HTTPS", "api -> db: SQL"]
}
```

```sh
trazo make demo.json
```

![El diagrama de la demo: web, api y db conectados de izquierda a derecha con flechas HTTPS y SQL](https://raw.githubusercontent.com/heidenber/trazo/main/docs/demo-light.png)

Esto escribe `demo.html` junto al archivo de entrada e imprime su ruta. Abrilo en el navegador: podés mover y hacer zoom, pasar el mouse sobre un nodo (o enfocarlo con el teclado) para ver su nota y resaltar sus conexiones, y exportar a SVG o PNG. No necesita servidor ni hace pedidos de red.

## ¿Por qué no pedirle el diagrama directamente al agente?

Puede dibujarlo, pero tiene que ubicar él mismo cada caja, flecha y etiqueta, y la geometría le sale mal. En nuestro benchmark, 20 de 24 diagramas SVG escritos a mano tenían texto superpuesto, etiquetas fuera de sus cajas o aristas que cruzaban nodos, y fueron los que más tokens costaron. Con trazo el agente solo dice qué hay en el sistema; trazo hace el layout, valida la entrada y genera siempre el mismo HTML: ningún defecto de layout en 46 corridas, válido al primer intento. Mermaid es más barato, pero 7 de 24 de sus diagramas tenían defectos de layout. Detalles: [bench/README.md](bench/README.md#baseline-trazo-vs-hand-written-svg-vs-mermaid)

## Cuándo usarlo

trazo hace una sola cosa: un agente (o vos) describe el diagrama, y el código lo acomoda.

- La entrada no tiene coordenadas, tamaños ni estilos, así que hay poco para leer y poco para errarle. Antes de escribir un diagrama, un agente lee `trazo schema` y `trazo example` de ese tipo: unos 700 tokens, unos 1.100 con la skill (estimado como caracteres / 4).
- Los errores nombran la ruta exacta dentro del JSON y traen una pista, así que un agente puede corregir su entrada a partir del mensaje. En las corridas de agentes registradas, Claude Sonnet 5.5 obtuvo un diagrama válido en el primer `make` en todas las corridas y Claude Haiku 4.5 en el 92 a 96%; todas terminaron con un diagrama válido.
- El mismo JSON siempre da el mismo HTML, byte por byte, sin navegador y sin red.
- Las claves foráneas del ERD apuntan a columnas, no solo a tablas.

Números y método: [bench/README.md](bench/README.md). En el mismo benchmark (Codex, gpt-6-luna, 8 tareas, 3 corridas cada una): Mermaid usó entre un 35 y un 40% menos de tokens que trazo, y 5 de 24 corridas de Mermaid necesitaron una corrección tras un error de sintaxis.

Lo que no hace:

- Solo cuatro tipos: arquitectura, workflow, ERD y secuencia. Mermaid, PlantUML y D2 cubren muchos más.
- No se renderiza dentro de Markdown. GitHub, GitLab y muchos editores muestran bloques de Mermaid directamente; con trazo abrís el HTML o exportás SVG o PNG desde ahí.
- No se edita en la salida: cambiás el JSON y volvés a correr `make`.
- No importa Mermaid, no trae íconos de nube ni de marcas, no genera páginas explicativas ni revisa el resultado en un navegador.

Las skills de diagramas para agentes más grandes hacen más de esto. trazo lo cambia por menos para leer y un layout que no depende del modelo.

## Instalación

Node 22 o superior:

```sh
npm i -g @heidenber/trazo
```

Esto instala el comando `trazo`. Para usar trazo como librería en un proyecto, corré `npm i @heidenber/trazo` en su lugar.

Para instalarlo desde el código fuente:

```sh
git clone https://github.com/heidenber/trazo
cd trazo
npm ci
npm run build
npm i -g .
```

## Comandos

| Comando | Qué hace |
|---|---|
| `trazo make <input> [-o, --out <file>] [--theme light\|dark] [--json]` | Valida, acomoda y escribe un HTML autocontenido. |
| `trazo check <input> [--json]` | Solo valida; no escribe nada. |
| `trazo schema <type>` | Imprime la referencia compacta de campos de un tipo de diagrama. |
| `trazo example <type>` | Imprime un diagrama de ejemplo completo, entrada válida para `make`. |

`<input>` es un archivo JSON, o `-` para leer de stdin. `<type>` es `architecture`, `workflow`, `erd` o `sequence`. Sin `-o`, `make` escribe `<input>` con extensión `.html`; con `-o -`, o cuando `<input>` es `-` y no hay `-o`, escribe el HTML en stdout. `--json` imprime una línea JSON en lugar de texto plano y cubre los resultados (`make`, `check`); los errores de uso (salida 2) son siempre texto plano en stderr.

Códigos de salida: 0 correcto, 1 entrada inválida, 2 error de uso, 3 error interno.

```sh
trazo example erd | trazo make - -o erd.html
```

## Tipos de diagrama

- `architecture`: servicios, almacenes, colas y personas, agrupados en cajas. `trazo example architecture`
- `workflow`: pasos y decisiones, opcionalmente en carriles. `trazo example workflow`
- `erd`: tablas, columnas y claves foráneas, con terminaciones de pata de gallo. `trazo example erd`
- `sequence`: mensajes entre participantes, con notas y fragmentos `alt`, `opt` y `loop`. `trazo example sequence`

`trazo schema <type>` imprime los campos de cada tipo en unas 40 líneas.

Los ejemplos incluidos (`trazo example <type>`) tal como los dibuja trazo; el ERD es la imagen del principio. Hacé clic en uno para verlo en tamaño completo.

<p align="center"><a href="https://github.com/heidenber/trazo/blob/main/docs/architecture-light.png"><img src="https://raw.githubusercontent.com/heidenber/trazo/main/docs/architecture-light.png" width="100%" alt="Ejemplo de arquitectura: una tienda de impresión de fotos con storefront, API gateway, servicios de backend, almacenes de datos y proveedores externos"></a></p>
<p align="center"><a href="https://github.com/heidenber/trazo/blob/main/docs/workflow-light.png"><img src="https://raw.githubusercontent.com/heidenber/trazo/main/docs/workflow-light.png" width="100%" alt="Ejemplo de workflow: una solicitud de compra que pasa por los carriles Requester, Procurement y Finance, con decisiones y un reintento"></a></p>
<p align="center"><a href="https://github.com/heidenber/trazo/blob/main/docs/sequence-light.png"><img src="https://raw.githubusercontent.com/heidenber/trazo/main/docs/sequence-light.png" width="600" alt="Ejemplo de secuencia: un checkout entre comprador, storefront, API de pedidos, inventario y proveedor de pago, con fragmentos alt y loop"></a></p>

## Skill para agentes

`skill/` trae una skill corta que le indica al agente que lea el código antes de dibujar y dibuje solo lo que encontró, cite cada parte en `source`, parta de `trazo example`, valide el JSON y corrija los errores a partir de los mensajes. `skill/SKILL.md` es para Claude Code y Pi; `skill/AGENTS.md` es el mismo texto para Codex. trazo no instala nada por su cuenta: copiá los archivos después de instalar el paquete de forma global. Son las ubicaciones documentadas de cada agente; comprobalas contra la versión que uses.

Bash:

```bash
SK="$(npm root -g)/@heidenber/trazo/skill"
mkdir -p ~/.claude/skills/trazo && cp "$SK/SKILL.md" ~/.claude/skills/trazo/        # Claude Code
mkdir -p ~/.pi/agent/skills/trazo && cp "$SK/SKILL.md" ~/.pi/agent/skills/trazo/    # Pi
mkdir -p ~/.codex && cat "$SK/AGENTS.md" >> ~/.codex/AGENTS.md                      # Codex
```

PowerShell:

```powershell
$sk = Join-Path (npm root -g) "trazo\skill"
New-Item -ItemType Directory -Force "$HOME\.claude\skills\trazo" | Out-Null
Copy-Item "$sk\SKILL.md" "$HOME\.claude\skills\trazo\"                              # Claude Code
New-Item -ItemType Directory -Force "$HOME\.pi\agent\skills\trazo" | Out-Null
Copy-Item "$sk\SKILL.md" "$HOME\.pi\agent\skills\trazo\"                            # Pi
New-Item -ItemType Directory -Force "$HOME\.codex" | Out-Null
Get-Content "$sk\AGENTS.md" | Add-Content "$HOME\.codex\AGENTS.md"                  # Codex
```

Si corrés el comando de Codex dos veces, el bloque queda duplicado. Para actualizarlo, borrá antes todo lo que hay entre `<!-- trazo:start -->` y `<!-- trazo:end -->` en `~/.codex/AGENTS.md`. En Claude Code y Pi, volvé a copiar el archivo.

## Librería

```js
import { check, make } from "@heidenber/trazo";

const result = check(jsonTextOrObject);
// { ok: boolean, issues: Issue[] }

const made = await make(jsonTextOrObject, { theme: "dark" });
// { ok, issues, html?: string }  html solo viene cuando ok es true
```

Las dos aceptan texto JSON o un objeto ya parseado. `make` también devuelve en `issues` los avisos de geometría.

La parte estable de un `Issue` es `severity`, `code`, `path` y `hint`. El texto de `message` puede cambiar entre versiones, así que no lo uses para comparar.

## Rendimiento

El costo de lectura, el tiempo de generación y el tamaño de la salida los mide un script de este repositorio. En [bench/README.md](bench/README.md) está qué se mide, cómo correrlo y los resultados registrados.

## Desarrollo

```sh
npm test            # tests unitarios y de CLI
npm run gen:check   # los archivos generados están al día
npm run bench       # benchmark determinista (requiere npm run build)
```

## Licencia

trazo se distribuye bajo la Apache License 2.0. Copyright 2026 Heidenber Palacio Garzón. Ver LICENSE y NOTICE.

Material de terceros:
- Íconos Lucide: ISC License. Íconos derivados de Feather: MIT License.
- Tipografía Inter: SIL Open Font License 1.1.
- elkjs: Eclipse Public License 2.0.
- zod: MIT License.

Versiones y textos completos: THIRD_PARTY_NOTICES.md.
