# Plan de Implementación: Creación en Dos Páginas Completas y Simulación D3.js D'Hondt de Pactos Electorales

Plan arquitectónico y de experiencia de usuario para transformar la creación de personaje en dos pantallas completas inmersivas, integrar atributos políticos dinámicos (Oratoria, Carisma, Negociación), e implementar un simulador interactivo de escaños distritales con D3.js en el subpanel de Pactos Electorales.

---

## Decisiones Críticas Confirmadas con el Usuario

> [!IMPORTANT]
> A continuación se resumen las tres elecciones estratégicas confirmadas en la Fase 1:

- **Estructura de Creación (Sin Pop-up)**: Se abandona el modal superpuesto para adoptar dos páginas completas independientes:
  - *Página 1 (Identidad, Atributos & Facciones)*: Nombre, edad, ocupación, partido, facción interna, y asignación de puntos en atributos políticos (Oratoria, Carisma, Negociación, Capacidad de Gestión).
  - *Página 2 (Territorio, Ejes & Punto de Partida)*: Cascada geográfica SERVEL (Región -> Distrito -> Comuna), selección de cargo inicial habilitado por edad, y elección de 3 políticas prioritarias con compás ideológico 2D.
- **Simulación D3.js de Escaños D'Hondt**: En la pestaña *Políticos* -> subpanel *Pactos Electorales*, se implementa un hemiciclo interactivo renderizado con **D3.js** dotado de controles deslizantes (sliders) de porcentaje de votación por lista/pacto, calculando en tiempo real el cociente D'Hondt y la asignación exacta de los escaños del distrito actual.
- **Profundidad de Personaje**: Se incorporan atributos de rol político (Oratoria, Carisma, Negociación, Capacidad de Gestión) y sub-facciones internas partidarias reales (ej. FA: *Tercerismo* vs *Desbordar lo Posible*; RN: *Tradicional* vs *Liberal*; PC: *Sindical* vs *Institucional*), que modulan costos de campaña, relación con otros líderes y probabilidad de éxito parlamentario.

---

## 1. Visión General & Concepto Central

- **Experiencia de Usuario**: Una experiencia de inicio cinematográfica y estructurada donde el jugador diseña su figura pública con peso estratégico real, seguido de una herramienta analítica avanzada (simulador D3) que le permite planificar sus alianzas y pactos electorales para maximizar escaños parlamentarios bajo el sistema proporcional D'Hondt chileno.
- **Valor Agregado**:
  - Elimina la sensación de "formulario emergente" al dar espacio completo a la biografía, facciones y atributos.
  - Ofrece a los jugadores una herramienta de inteligencia electoral cuantitativa basada en la ley chilena (Ley 20.840 de asignación D'Hondt con cifra repartidora).

---

## 2. Experiencia de Usuario & Diseño Visual

### Flujo de Navegación de Pantallas
```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│   PÁGINA 1: IDENTIDAD   │ ───> │  PÁGINA 2: TERRITORIO  │ ───> │  TABLERO PRINCIPAL DE  │
│  Biografía, Atributos  │      │  Cascada SERVEL, Ejes  │      │   JUEGO (THE POLITICAL │
│   Partidarios & Facción│      │  y Cargo de Partida    │      │        PROCESS)        │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

### Visualización D3.js en "Pactos Electorales"
- **Hemiciclo Distrital D3**: Visualización semicircular de 3 a 8 escaños (según el Distrito seleccionado, ej. Distrito 8 = 8 escaños; Distrito 10 = 8 escaños; Distrito 11 = 6 escaños).
- **Controles Deslizantes Dinámicos**:
  - Sliders para cada lista: *Contigo Chile Mejor* (Oficialismo), *Chile Vamos*, *Frente Republicano & Libertario*, *Centro Democrático*, y *Lista Independiente/Fuera de Pacto*.
  - Normalización en vivo al 100% del padrón distrital efectivo.
  - Cálculo instantáneo de cocientes D'Hondt ($Votos / 1, Votos / 2, \dots$) y animación fluida D3 al cambiar los escaños asignados.
  - Indicador visual si el jugador resulta electo por "Efecto Arrastre" dentro de su pacto.

---

## 3. Decisiones de Producto & Compensaciones

- **Páginas completas vs Modal**:
  - *Decisión*: Renderizar páginas completas (`screen-wizard-identity` y `screen-wizard-territory`) ocupando el 100% del viewport en lugar de un modal oscuro encima del juego.
  - *Razón*: Permite desplegar las tarjetas de partidos y facciones con holgura tipográfica, sin scroll comprimido y con feedback visual enriquecido.
- **D3.js v7 en Navegador**:
  - *Decisión*: Cargar D3.js v7 vía CDN liviana e integrar una función de renderizado reactivo `renderDHondtSimulator()`.
  - *Razón*: Garantiza animaciones suaves de entrada/salida de puntos en el hemiciclo sin dependencias pesadas de npm ni riesgo de desincronización de build.

---

## 4. Arquitectura Técnica & Diagrama de Componentes

```
┌────────────────────────────────────────────────────────────────────────┐
│                         ESTADO MAESTRO (GAME_STATE)                   │
│  - player: { attributes: { oratory, charisma, negotiation, mgmt },     │
│              party, faction, corePolicies, commune, district, office } │
│  - activePactId, congress, macroMetrics, electoralCalendar            │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         ▼                                                       ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│ PANTALLAS DE CREACIÓN COMPLETA  │             │ VISTA POLÍTICOS -> PACTOS D'HONDT│
│ 1. screen-create-identity       │             │ - electoral-pacts-grid          │
│    * Oratoria / Carisma / Negoc │             │ - dhondt-simulator-container   │
│    * 15 Partidos + Facciones    │             │   * Sliders de Votos Lista      │
│ 2. screen-create-territory      │             │   * Hemiciclo D3 Interactivo    │
│    * Cascada Región/Distr/Com   │             │   * Tabla Cifra Repartidora     │
│    * Validación Cargo por Edad  │             │   * Cálculo de Arrastre Jugador │
└─────────────────────────────────┘             └─────────────────────────────────┘
```

### Plan de Pruebas & Verificación
1. **Validación de Pantallas**: Probar transición Página 1 -> Página 2 -> Tablero de Juego, impidiendo avanzar si no se cumplen validaciones (nombre $\ge 3$ caracteres, partido seleccionado, puntos de atributos asignados, 3 políticas elegidas).
2. **Simulador D3**: Interactuar con los sliders de votación en el subpanel de Pactos Electorales y comprobar que el hemiciclo D3 recalcule los escaños en tiempo real según la fórmula D'Hondt.
3. **Compilación & Lint**: Ejecutar `compile_applet` y `lint_applet` garantizando 0 errores.
