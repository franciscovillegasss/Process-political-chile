# Proceso Político Chile

Simulador de carrera política, campañas, elecciones y gestión pública.

`npm ci` instala el proyecto. `npm run dev` abre la versión local en el puerto 3000.

## Dónde buscar un fallo

| Síntoma | Empieza aquí | Prueba puntual |
|---|---|---|
| Creación, territorio o programa | `src/features/character/` · `identity.js`, `territory.js`, `platform.js` y sus vistas | Los casos de creación están en `e2e/career.mjs`. |
| Campaña, finanzas, sondeos o voluntarios | `src/features/campaign/` · `actions.js`, `rules.js` y el HTML de la pestaña afectada | `node --test src/features/campaign/rules.test.js` |
| Personal y planilla | `src/features/campaign/staff.js` y `staff-catalog.js` | El avance y el pago de personal se coordinan en `src/app/turn.js`. |
| Inscripción, escaños o segunda vuelta | `src/features/elections/` · `actions.js`, `rules.js`, `runoff.js`, `view.js` | `node --test src/features/elections/*.test.js` |
| Necesidades de la comuna, contactos o huella de un proyecto | `src/features/territory/rules.js` y `src/features/campaign/territory.js` | `node --test src/features/territory/rules.test.js` |
| Agenda, afinidad o macroeconomía | `src/features/electorate/rules.js` y `src/features/campaign/rules.js` para el corte económico | `node --test src/features/electorate/rules.test.js` |
| Mandato, proyectos, retiro o sucesión | `src/features/career/` · `mandate.js`, `profile.js`, `rules.js` | `node --test src/features/career/rules.test.js` |
| Congreso, quórum o filtros | `src/features/congress/chambers.js` y `panel.html` | Los controles se ejercitan en `e2e/career.mjs`. |
| Cargar, importar o migrar una partida | `src/features/save/codec.js` y `storage.js` | `node --test src/features/save/codec.test.js` |
| Reloj, avisos, pestañas o montaje de página | `src/app/turn.js`, `src/ui/`, `src/main.js` | `node --test tooling/page-fragments.test.js` |

Las reglas comprobables viven junto a sus pruebas. Los módulos de acciones leen o cambian el estado de la partida. Las vistas renderizan ese estado. `src/app/state.js` define el estado base y `src/app/render.js` coordina los refrescos. Los controles HTML se registran en un solo lugar, `src/main.js`. Vite ensambla las vistas HTML desde `index.html`.

Para investigar un aviso, busca su texto con `rg -n "texto del aviso" src` y abre primero el módulo encontrado. Para un botón, busca su manejador o su ID. Consulta el coordinador de turnos solo cuando el fallo ocurra al avanzar la fecha o atraviese varios procesos.

## Verificación

- `npm run check` ejecuta las pruebas de Node y la compilación.
- `npx playwright install chromium` instala el navegador para `npm run test:e2e`.
- La prueba de navegador cubre la recuperación tras derrotas, proyectos, reelección, segunda vuelta, guardado y dos carreras de 82 años.

[Auditoría y prioridades de jugabilidad](docs/gameplay-audit.md)
