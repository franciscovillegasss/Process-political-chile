# Trabajar en el juego

- Para localizar un fallo, empieza en la tabla de `README.md` y en la carpeta del proceso afectado. Busca por ID, texto de aviso o nombre del manejador con `rg`.
- Lee las reglas y la prueba vecina antes de abrir coordinadores globales. Consulta `src/app/turn.js` o `src/app/state.js` si el fallo involucra el calendario, el guardado o más de un proceso.
- Mantén las reglas comprobables separadas de la vista. Conserva las partidas anteriores y los controles existentes al mover código.
- Ejecuta primero la prueba del proceso. Antes de publicar, ejecuta `npm run check`. Para cambios que cruzan turnos, elecciones, mandatos o guardado, ejecuta también `npm run test:e2e`.
