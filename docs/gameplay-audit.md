# Auditoría de jugabilidad

## Qué conservar

La recuperación de PP permite volver a competir tras perder. Los costos de campaña obligan a decidir entre dinero, horas y apoyo. La agenda pública distingue urgencia, afinidad y credibilidad, y un proyecto ejecutado mejora el historial electoral. El guardado conserva la sucesión y los proyectos en curso.

## Mejoras aplicadas

- **Segunda vuelta.** El escrutinio conserva la base de la primera votación. La cercanía programática y los respaldos negociados redistribuyen el apoyo de cada candidatura eliminada entre ambos finalistas y la abstención. El resultado separa esa transferencia del apoyo nuevo.
- **Memoria comunal.** Campaña → Resumen muestra las prioridades, los contactos, la movilización y las obras de la comuna. Las prioridades iniciales son sintéticas y reproducibles. Las obras alivian la necesidad correspondiente y cuentan como historial electoral durante seis años. Los contactos duran hasta ocho años y la movilización se desgasta.

## Hallazgos de la auditoría original

| Prioridad | Hallazgo | Cambio propuesto y criterio de aceptación |
|---|---|---|
| Alta | **Los acuerdos de gestión son dos clics equivalentes.** Cualquier proyecto consigue los mismos dos respaldos y el conteo legislativo se fija a partir del quórum. | Que cada actor pida una concesión distinta y que la composición de la cámara afecte el resultado. El mismo proyecto debería aprobarse, cambiar o caer según los apoyos. Revisar primero `features/career/mandate.js` y `features/congress/chambers.js`. |
| Alta | **La competencia de segunda vuelta usa el apoyo acumulado de los finalistas.** El nuevo período de campaña funciona, pero el modelo no transfiere los votos de las candidaturas eliminadas. | Incorporar transferencias parciales y abstención según afinidad y respaldos. La noche electoral debe mostrar de dónde salió el cambio. Revisar `features/elections/rules.js`. |
| Alta | **El programa local se traduce en planes comunales genéricos.** La política elegida afecta el tema y el contexto, pero dos planes del mismo tema se parecen demasiado. | Dar a cada cargo atribuciones, resultados y restricciones presupuestarias concretas. El impacto de un proyecto municipal debe aparecer en su territorio y entrar en la siguiente campaña. Revisar `features/career/` y `features/character/programs.js`. |
| Media | **La política territorial comparte un modelo nacional y sectores reutilizados.** El foco barrial cambia el rendimiento de la acción, pero el territorio carece de una memoria propia de servicios, organizaciones y participación. | Dar a cada territorio un perfil persistente. El mismo mensaje debe tener rendimientos distintos en dos comunas, con una razón visible. Revisar `shared/geography.js`, `features/campaign/territory.js` y `features/electorate/rules.js`. |
| Media | **Los rivales tienen edad, generación y contiendas registradas, con una agenda limitada.** Su fuerza crece con el calendario y el historial. | Darles decisiones de campaña y prioridades propias. En una revancha debería reconocerse a un rival que cambió su estrategia tras perder. Revisar `features/elections/rules.js` y `features/career/roster.js`. |
| Media | **El sondeo cobra por una estimación con un desplazamiento fijo por semana.** Cambia el apoyo subyacente, pero el muestreo se repite de forma predecible. | Ofrecer muestras de distinto precio, incertidumbre visible y tendencia comparable entre sondeos. Revisar `features/campaign/actions.js` y `view.js`. |
| Media | **La sucesión conserva recursos y parte de la red con una fórmula común.** La persona sucesora hereda buena parte del perfil político. | Permitir elegir entre perfiles con atributos y apoyos distintos y mostrar qué parte del legado conservará cada uno. Revisar `features/career/profile.js`. |

La simulación usa reglas y calendarios propios. Esta auditoría evalúa la experiencia y la coherencia interna del juego. La prioridad de diseño es que las decisiones de gestión, el territorio y las alianzas tengan efectos diferenciados y comprobables antes de añadir más pantallas.
