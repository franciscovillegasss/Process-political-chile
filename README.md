# Proceso Político Chile

Simulador de carrera política, campañas, elecciones y gestión pública.

`npm ci` instala el proyecto. `npm run dev` abre la versión local en el puerto 3000.

## Perfil de referencia RM

Selecciona **RM · 52 comunas y seis cargos** al crear una partida. El perfil clásico conserva Valparaíso, Presidencia y los guardados existentes. La referencia territorial usa las magnitudes de 2024 para concejos y CORE, 2025 para diputaciones y 2021 para la renovación senatorial de la RM. El reloj semanal y los candidatos son simulados.

En **Cargo → Situación del cargo**, escoge una obra municipal. En **Lobby**, negocia con bancadas cuyos apoyos tienen costos y plazos distintos. Un rechazo conserva el saldo. Después de un acuerdo, Alcaldía compromete los recursos en el turno siguiente. El concejal puede solicitar un informe desde la pantalla de gestión. El circuito municipal conserva sus expedientes y concesiones. Los cargos regionales y parlamentarios también cuentan con tramitación simulada propia, con mayorías por bancada y cámara revisora en las leyes nacionales.

**Agenda semanal** permite delegar trabajo territorial o puerta a puerta con costo de horas. Se detiene en hitos sensibles. El menú **Recuperar copia** permite abrir el último punto de control RM o un respaldo manual válido sin sobreescribir la ranura principal.

[Documentación electoral 2024 de Servel](https://www.servel.cl/biblioteca-de-documentos/procesos-electorales/elecciones-2024/documentos-elecciones-2024/documentacion-elecciones-2024/) · [Territorios electorales](https://www.servel.cl/sistema-electoral/territorios-electorales/) · [Ley Orgánica de Municipalidades](https://www.bcn.cl/leychile/navegar?idNorma=251693)

## Campaña, escrutinio y despacho

La guía de creación explica PP, apoyo, reconocimiento y costos de campaña. Una candidatura recibe un aporte simulado por semana según el cargo. Marketing, cabildos, encuestas y reclutamiento recurren primero al saldo electoral. El excedente se cubre con la tesorería general. El aporte termina al cerrar la elección.

En Marketing puedes financiar radio, video y la difusión de uno de tus ejes. En Políticas puedes adaptar un eje de baja urgencia a una prioridad alta por 4 horas, sin costo de credibilidad. Las revisiones ordinarias conservan sus restricciones durante la campaña.

Los turnos electorales abren un conteo televisivo de 60 segundos con pausas y opción de adelantar. En Políticos puedes consultar el Ejecutivo de la partida y cambiar la comuna. El directorio combina resultados conocidos y autoridades ficticias del escenario. Cargo ofrece fiscalización, vínculos territoriales, preparación de expedientes y supervisión. Las gestiones tienen límites y las audiencias dejan de generar aprobación automática.

## Gestión, presupuesto y compromisos

Cargo permite presentar, negociar, votar, retirar y ejecutar proyectos. Las concesiones modifican costo, plazo y alcance. Diputaciones, senadurías y Presidencia requieren ambas cámaras. Los ejecutivos inician la ejecución y los órganos deliberantes autorizan recursos que el Ejecutivo ejecuta en el turno siguiente. Los expedientes antiguos conservan su recorrido.

El escenario utiliza $12.000.000 de saldo público inicial y asignaciones anuales de hasta $6.000.000, con techo de $12.000.000. Cada servicio temporal cuesta $1.000.000 y entrega cobertura durante doce semanas. Los proyectos autorizados reservan sus fondos y los terminados generan mantenimiento trimestral. Los montos y los trámites son una abstracción de juego. La cobertura territorial y los efectos nacionales aparecen en las necesidades y métricas. Los compromisos se adaptan al ámbito del cargo, se registran al iniciar el mandato y su cumplimiento afecta campañas posteriores durante ocho años.

Encuestas ofrece tres tamaños de muestra con precio y margen distintos. La muestra queda guardada. Toda la brigada puede movilizarse, con rendimiento gradual y beneficio de la capacitación. Los empates detienen el avance para confirmar un recuento con desempate simulado persistente. El escrutinio conserva los votos finales y sus parciales son independientes del orden de las candidaturas.

## Dónde buscar un fallo

| Síntoma | Empieza aquí | Prueba puntual |
|---|---|---|
| Creación, territorio o programa | `src/features/character/` · `identity.js`, `territory.js`, `platform.js` y sus vistas | Los casos de creación están en `e2e/career.mjs`. |
| Campaña, finanzas, sondeos o voluntarios | `src/features/campaign/` · `actions.js`, `rules.js` y el HTML de la pestaña afectada | `node --test src/features/campaign/rules.test.js` |
| Personal y planilla | `src/features/campaign/staff.js` y `staff-catalog.js` | El avance y el pago de personal se coordinan en `src/app/turn.js`. |
| Inscripción, escaños o segunda vuelta | `src/features/elections/` · `actions.js`, `rules.js`, `runoff.js`, `view.js` | `node --test src/features/elections/*.test.js` |
| Necesidades de la comuna, contactos o huella de un proyecto | `src/features/territory/rules.js` y `src/features/campaign/territory.js` | `node --test src/features/territory/rules.test.js` |
| Agenda, afinidad o macroeconomía | `src/features/electorate/rules.js` y `src/features/campaign/rules.js` para el corte económico | `node --test src/features/electorate/rules.test.js` |
| Tramitación, presupuesto, servicios o compromisos | `src/features/career/governance-rules.js`, `governance.js`, `public-services.js` y `promises.js` | `node --test src/features/career/governance.test.js` |
| Mandato, proyectos, retiro o sucesión | `src/features/career/` · `mandate.js`, `profile.js`, `rules.js` | `node --test src/features/career/rules.test.js` |
| Congreso, quórum o filtros | `src/features/congress/chambers.js` y `panel.html` | Los controles se ejercitan en `e2e/career.mjs`. |
| Cargar, importar o migrar una partida | `src/features/save/codec.js` y `storage.js` | `node --test src/features/save/codec.test.js` |
| Reloj, avisos, pestañas o montaje de página | `src/app/turn.js`, `src/ui/`, `src/main.js` | `node --test tooling/page-fragments.test.js` |

Las reglas comprobables viven junto a sus pruebas. Los módulos de acciones leen o cambian el estado de la partida. Las vistas renderizan ese estado. `src/app/state.js` define el estado base y `src/app/render.js` coordina los refrescos. Los controles HTML se registran en un solo lugar, `src/main.js`. Vite ensambla las vistas HTML desde `index.html`.

Para investigar un aviso, busca su texto con `rg -n "texto del aviso" src` y abre primero el módulo encontrado. Para un botón, busca su manejador o su ID. Consulta el coordinador de turnos solo cuando el fallo ocurra al avanzar la fecha o atraviese varios procesos.

## Verificación

- `npm run check` ejecuta las pruebas de Node y la compilación.
- `npx playwright install chromium` instala el navegador para `npm run test:e2e`.
- La prueba de navegador cubre derrotas, proyectos, reelección, segunda vuelta, guardado, dos carreras de 82 años, los siete cargos, servicios, promesas, encuestas y recuentos.

[Auditoría y prioridades de jugabilidad](docs/gameplay-audit.md)
