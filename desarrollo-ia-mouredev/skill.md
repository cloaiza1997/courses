### Paso 0 - Contexto SDD

- Skill de ejemplo - `.agents/skills/sdd/SKILL.md`
    
    ```markdown
    ---
    name: sdd
    description: Úsala siempre que trabajes con Spec-Driven Development en este proyecto (docs/constitution.md o cualquier archivo dentro de specs/) - redactar, revisar o cambiar specs, planes y tareas, o implementar y validar tareas de una spec.
    ---
    # Spec-Driven Development (SDD)
    ## Flujo
    Constitución → Spec → Clarificación → Plan → Tareas → Implementación → Validación → Cambio.
    - Nunca pases a la siguiente fase sin la aprobación explícita del usuario.
    - La spec manda: si algo no está en la spec, no se implementa. Si falta una decisión, para y pregunta.
    - Un cambio de requisitos se hace primero en la spec, luego en el plan y las tareas, y por último en el código.
    - Cada spec vive en su carpeta: `specs/NNN-nombre/` con `spec.md`, `plan.md` y `tasks.md`.
    - Al terminar cada fase, actualiza `MEMORY.md`.
    ## Plantilla de spec (spec.md)
    ```
    # Spec NNN — <Nombre>
    
    Estado: borrador | aprobada | implementada
    ## Contexto y objetivo
    ## Usuarios
    ## Historias de usuario
    - HU-1. Como <rol>, quiero <acción> para <beneficio>.
    ## Definiciones (solo si hay términos que puedan interpretarse de varias formas)
    ## Requisitos funcionales
    ## Requisitos no funcionales
    ## Casos límite
    ## Fuera de alcance
    ## Criterios de finalización
    ## Dudas abiertas
    - [NECESITA ACLARACIÓN] <duda>
    ```
    La spec describe el QUÉ y el POR QUÉ. Nada de stack, arquitectura ni nombres de archivos.
    ## Requisitos en EARS (en español)
    - RF-x: CUANDO <evento>, EL SISTEMA <respuesta>.
    - RF-x: SI <condición no deseada>, ENTONCES EL SISTEMA <respuesta>.
    - RF-x: MIENTRAS <estado>, EL SISTEMA <respuesta>.
    - RF-x: EL SISTEMA <comportamiento permanente>.
    Cada RF debe ser verificable: nada de "rápido", "intenso" o "bonito" sin un criterio medible.
    ## Plan (plan.md)
    Archivos y responsabilidades · Funciones puras (con "hoy" como parámetro) · Algoritmo en pseudocódigo · Interfaz · Decisiones justificadas con su alternativa descartada · Estrategia de tests con `node --test`. Indica qué RF cubre cada parte.
    ## Tareas (tasks.md)
    ```
    - [ ] **Tn. <Descripción>.** RF-x, RF-y
    - Hecho cuando: <comprobación verificable>.
    ```
    Máximo 20-30 min por tarea, en orden de dependencia. Si salen más de 10, propón dividir la spec.
    ## Implementación
    Una sola tarea cada vez: tests primero (en rojo), después el código, `node --test` en verde, marcar la tarea y parar.
    ```
    

### Paso 1 - Constitución

- Requisitos iniciales y globales para el proyecto con principios innegociables. Es un complemento al `AGENTS.md` y se debe referenciar ahí
- Skill de ejemplo - `/sdd-constitution.md`
    
    ```markdown
    ---
    description: SDD · Propone la constitución del proyecto (principios innegociables)
    agent: plan
    ---
    Vamos a crear (o revisar, si ya existe) docs/constitution.md. Usa la skill sdd.
    Antes de proponer nada, lee AGENTS.md, MEMORY.md y el código del proyecto.
    Contexto adicional: $ARGUMENTS
    Proponme 6 principios innegociables, cortos y verificables, que cubran:
    simplicidad del stack, relación entre spec y código, separación entre lógica
    e interfaz, política de tests, protección de los datos del usuario e idioma
    del código y los textos. Máximo 15 líneas.
    NO escribas el archivo todavía: espera mi aprobación.
    ```
    

### Paso 2 - Especificación (spec.md)

- Plantilla genérica
    
    ```markdown
    # Spec NNN — <Nombre de la funcionalidad>
    ## Contexto y objetivo
    <Qué problema resuelve y por qué merece la pena. Un párrafo.>
    ## Usuarios / actores
    <Quién lo usa.>
    ## Historias de usuario
    - H1: Como <rol> quiero <acción> para <beneficio>.
    ## Requisitos funcionales (criterios de aceptación en EARS)
    - RF-1: CUANDO <evento>, EL SISTEMA <respuesta> (salida/resultado esperado).
    - RF-2: SI <condición no deseada>, ENTONCES EL SISTEMA <respuesta>.
    - RF-3: MIENTRAS <estado>, EL SISTEMA <respuesta>.
    - RF-4: EL SISTEMA <comportamiento permanente>.
    ## Requisitos no funcionales
    <Solo los que apliquen: rendimiento, seguridad, plataformas, idioma...>
    ## Casos límite
    <Vacíos, duplicados, datos corruptos, límites, concurrencia...>
    ## Fuera de alcance
    <Lo que explícitamente NO se hace en esta iteración.>
    ## Criterios de finalización
    <Ej.: todos los RF con test en verde + demo manual del flujo principal.>
    ## Dudas abiertas
    - [NECESITA ACLARACIÓN] <duda>
    ```
    
- Skill de ejemplo - `/sdd-spec.md`
    
    ```markdown
    ---
    description: SDD · Entrevista y genera la spec (uso - /sdd-spec 002-nombre idea inicial)
    agent: plan
    ---
    NO escribas código en ningún momento. Lee docs/constitution.md y MEMORY.md, y usa la skill sdd.
    Carpeta de la spec: specs/$1/
    Idea inicial (el texto que va después del nombre de la carpeta): $ARGUMENTS
    Tu trabajo:
    1. Hazme preguntas de UNA en UNA para eliminar ambigüedades (casos límite,
    errores, qué queda fuera de esta versión). Máximo 5 preguntas.
    2. Con mis respuestas, genera specs/$1/spec.md siguiendo la plantilla de la
    skill sdd, con los requisitos en EARS y "Estado: borrador".
    3. Solo el QUÉ y el POR QUÉ: nada de stack, arquitectura ni nombres de archivos.
    ```
    

### Paso 3 - Clarificación

- Iterar para resolver dudas y dejar la especificación lo más clara posible
- Es como si fuera un QA profesional, para validar los requisitos funcionales y no funcionales
- Skill de ejemplo - `/sdd-clarify.md`
    
    ```markdown
    ---
    description: SDD · Revisa la spec como un QA (solo detecta, no resuelve)
    agent: plan
    ---
    Revisa specs/$1/spec.md como si fueras un QA muy profesional. Usa la skill sdd.
    Lista:
    1. Ambigüedades restantes (requisitos que no se pueden verificar).
    2. Contradicciones entre requisitos.
    3. Casos límite no cubiertos.
    4. Conflictos con docs/constitution.md.
    No propongas soluciones todavía: solo detecta. Formato: lista numerada.
    ```
    

### Paso 4 - Planificación (plan.md)

- Crear el plan de trabajo para la implementación
- Cómo se va a llevar a cabo la ejecución de la especificación
- Skill de ejemplo - `/sdd-plan.md`
    
    ```markdown
    ---
    description: SDD · Genera el plan técnico de una spec aprobada
    agent: plan
    ---
    Lee docs/constitution.md, AGENTS.md y specs/$1/spec.md. Usa la skill sdd.
    NO escribas código.
    Genera specs/$1/plan.md con: archivos que se crean o modifican y la
    responsabilidad de cada uno, funciones puras de lógica (con "hoy" como
    parámetro), algoritmo en pseudocódigo, cómo se pinta en la interfaz,
    decisiones técnicas justificadas (con su alternativa descartada) y estrategia
    de tests con node --test.
    Todo debe respetar la constitución y cubrir todos los RF. Marca qué RF cubre
    cada parte. Si la spec no está aprobada o tiene dudas abiertas, para y avísame.
    ```
    

### Paso 5 - Tareas (task.md)

- Skill de ejemplo - `/sdd-tasks.md`
    
    ```markdown
    ---
    description: SDD · Divide el plan en tareas pequeñas y verificables
    agent: plan
    ---
    A partir de specs/$1/spec.md y specs/$1/plan.md, genera specs/$1/tasks.md
    siguiendo el formato de la skill sdd:
    - Tareas pequeñas (máx. 20-30 min cada una), en orden de dependencia.
    - Cada una con los RF que cubre y una línea "Hecho cuando:" verificable.
    - Checkboxes.
    - Intenta que no sean más de 10: si salen más, propón dividir la spec.
    ```
    

### Paso 6 - Implementación

- Indicar con qué puede comenzar, con todas las tareas en loop o una tarea específica
- Skill de ejemplo - `/sdd-implement.md`
    
    ```markdown
    ---
    description: SDD · Implementa UNA tarea, tests primero (uso - /sdd-implement 002-nombre T3)
    agent: build
    ---
    Implementa SOLO la tarea $2 de specs/$1/tasks.md, siguiendo specs/$1/plan.md,
    docs/constitution.md y la skill sdd.
    1. Escribe primero los tests y comprueba que fallan.
    2. Escribe el código hasta que pasen.
    3. Ejecuta node --test y muéstrame el resultado.
    4. Marca $2 como hecha en tasks.md e indica qué RF cubre.
    Después PÁRATE. No empieces la siguiente tarea.
    ```
    

### Paso 7 - Validación

- Skill de ejemplo - `/sdd-validate.md`
    
    ```markdown
    ---
    description: SDD · Valida la spec RF por RF (tests + Chrome DevTools)
    agent: build
    ---
    Recorre specs/$1/spec.md requisito por requisito. Para cada RF indica qué test
    lo cubre y el resultado de ejecutarlo con node --test.
    Los RF de interfaz que no se puedan testear con node --test, verifícalos con
    el MCP de Chrome DevTools (incluida la vista móvil de 375 px).
    Si algún RF no está cubierto o falla, dilo claramente. NO arregles nada todavía.
    Después comprueba los criterios de finalización y dame un veredicto:
    ¿la spec está cumplida?
    ```
    

### Nuevo requisito

- Skill de ejemplo - `sdd-change.md`
    
    ```markdown
    ---
    description: SDD · Nuevo requisito - primero la spec, luego el código
    agent: plan
    ---
    Nuevo requisito para la spec specs/$1/ (el texto que va después del nombre de
    la carpeta): $ARGUMENTS
    NO toques código. Usa la skill sdd.
    1. Actualiza specs/$1/spec.md: nuevo RF (o cambio de uno existente) en EARS,
    sus casos límite y lo que queda fuera de alcance.
    2. Indica qué partes de plan.md y tasks.md habría que cambiar después.
    3. Muéstrame el diff de la spec y espera mi aprobación.
    ```
    

### Fase actual

- Skill de ejemplo - `/sdd-status.md`
    
    ```markdown
    ---
    description: SDD · Dónde estamos - fase actual y siguiente paso de una spec
    agent: plan
    ---
    Lee specs/$1/ (spec.md, plan.md y tasks.md, los que existan) y MEMORY.md.
    Dime en pocas líneas:
    1. En qué fase del flujo SDD está esta spec y su estado.
    2. Tareas hechas y pendientes (x de y).
    3. El siguiente paso exacto, con el comando /sdd-* que debo ejecutar.
    No modifiques ningún archivo.
    ```