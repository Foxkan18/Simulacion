// Variables globales para configuración de la simulación
const GRAVEDAD = 9.8;  // m/s² (gravedad real)
const ESCALA = 0.1;    // Factor de escala para la simulación
const FPS = 60;        // Cuadros por segundo
const MAX_POTENCIA = 20; // Máxima potencia de lanzamiento

// Elementos del DOM
let ball, arm, leyesDiv, anguloInput, anguloValorSpan, potenciaInput, potenciaValorSpan;
let trayectoriaCanvas, ctx;
let formulas, toggleFormulasBtn;

// Variables de la simulación
let mensajeDuracion = 8000;
let anguloRad, velocidadInicial, velocidadInicialX, velocidadInicialY;
let posicionX, posicionY, velocidadX, velocidadY;
let intervaloSimulacion;
let puntosTrayectoria = [];
let tiempoVuelo = 0;
let alturaPico = 0;
let distanciaRecorrida = 0;
let pausado = false;
let estaSonando = false;

// Cargar sonidos
const sonidoTension = new Audio('https://assets.mixkit.co/active_storage/sfx/2681/2681-preview.mp3');
const sonidoLanzamiento = new Audio('https://assets.mixkit.co/active_storage/sfx/1912/1912-preview.mp3');
const sonidoImpacto = new Audio('https://assets.mixkit.co/active_storage/sfx/1431/1431-preview.mp3');

// Inicialización al cargar la página
window.onload = function() {
    inicializarElementos();
    inicializarEventListeners();
    resetearSimulacion();
    mostrarFormulaActual();
};

// Inicializa todas las referencias a elementos DOM
function inicializarElementos() {
    ball = document.getElementById("ball");
    arm = document.querySelector(".arm");
    leyesDiv = document.getElementById("leyes");
    anguloInput = document.getElementById("angulo");
    anguloValorSpan = document.getElementById("anguloValor");
    potenciaInput = document.getElementById("potencia");
    potenciaValorSpan = document.getElementById("potenciaValor");
    trayectoriaCanvas = document.getElementById("trayectoriaCanvas");
    ctx = trayectoriaCanvas.getContext("2d");
    formulas = document.getElementById("formulas");
    toggleFormulasBtn = document.getElementById("toggleFormulas");
    
    // Ajustar el tamaño del canvas al tamaño de la escena
    trayectoriaCanvas.width = trayectoriaCanvas.offsetWidth;
    trayectoriaCanvas.height = trayectoriaCanvas.offsetHeight;
}

// Configura los event listeners
function inicializarEventListeners() {
    // Actualizar valores mostrados al cambiar controles
    anguloInput.addEventListener("input", () => {
        anguloValorSpan.textContent = anguloInput.value + "°";
        actualizarPreview();
    });
    
    potenciaInput.addEventListener("input", () => {
        potenciaValorSpan.textContent = potenciaInput.value;
        actualizarPreview();
    });
    
    // Botón para alternar fórmulas
    toggleFormulasBtn.addEventListener("click", () => {
        if (formulas.style.display === "none" || formulas.style.display === "") {
            formulas.style.display = "block";
            toggleFormulasBtn.textContent = "Ocultar Fórmulas";
        } else {
            formulas.style.display = "none";
            toggleFormulasBtn.textContent = "Mostrar Fórmulas";
        }
    });
    
    // Botón para pausar/reanudar
    document.getElementById("pauseBtn").addEventListener("click", togglePausa);
    
    // Botón para activar/desactivar sonido
    document.getElementById("soundBtn").addEventListener("click", toggleSonido);
}

// Función principal de lanzamiento
function launch() {
    if (intervaloSimulacion) {
        clearInterval(intervaloSimulacion);
    }
    
    resetearSimulacion();
    
    // Calcular parámetros de lanzamiento
    anguloRad = (parseInt(anguloInput.value) * Math.PI) / 180;
    velocidadInicial = parseInt(potenciaInput.value);
    velocidadInicialX = velocidadInicial * Math.cos(anguloRad);
    velocidadInicialY = velocidadInicial * Math.sin(anguloRad);
    
    // Posición inicial (centro de la bola)
    posicionX = 165 + 15;
    posicionY = 130 + 15;
    
    // Velocidades iniciales
    velocidadX = velocidadInicialX;
    velocidadY = velocidadInicialY;
    
    // Mostrar ley correspondiente a la tensión del brazo
    mostrarLey("Tercera Ley de Newton: Al tensar el brazo de la catapulta, se genera una fuerza que será devuelta en dirección opuesta (acción y reacción).", 0);
    
    // Animar tensión del brazo
    if (estaSonando) sonidoTension.play();
    arm.style.transform = `rotate(${-parseInt(anguloInput.value) - 20}deg)`;
    
    // Mostrar trayectoria prevista
    dibujarTrayectoriaPrevista();
    
    // Iniciar la simulación después de un pequeño retraso
    setTimeout(() => {
        // Actualizar mensaje para la segunda ley
        mostrarLey(`Segunda Ley de Newton: F = m·a. La fuerza del brazo acelera la bola (F = ${velocidadInicial} N). La aceleración es directamente proporcional a la fuerza aplicada.`, mensajeDuracion + 300);
        
        // Iniciar la animación de lanzamiento
        if (estaSonando) sonidoLanzamiento.play();
        puntosTrayectoria = [];
        tiempoVuelo = 0;
        alturaPico = 0;
        distanciaRecorrida = 0;
        
        // Iniciar intervalo de simulación
        intervaloSimulacion = setInterval(actualizarSimulacion, 1000 / FPS);
    }, 1000);
}

// Actualiza la simulación en cada frame
function actualizarSimulacion() {
    if (pausado) return;
    
    // Incrementar el tiempo de vuelo
    tiempoVuelo += 1 / FPS;
    
    // Actualizar posición
    posicionX += velocidadX;
    posicionY -= velocidadY;
    
    // Aplicar gravedad
    velocidadY -= GRAVEDAD * ESCALA;
    
    // Actualizar estadísticas
    if (posicionY > alturaPico) {
        alturaPico = posicionY;
    }
    distanciaRecorrida = posicionX - (165 + 15);
    
    // Registrar punto de trayectoria
    puntosTrayectoria.push({ x: posicionX, y: posicionY });
    
    // Dibujar trayectoria actual
    dibujarTrayectoria();
    
    // Actualizar posición de la bola
    ball.style.left = posicionX - 15 + "px";
    ball.style.bottom = trayectoriaCanvas.height - posicionY - 15 + "px";
    
    // Detectar colisión con el suelo
    if (posicionY <= 15) {
        finalizarSimulacion("suelo");
    } 
    // Detectar si sale de los límites horizontales
    else if (posicionX - 15 > trayectoriaCanvas.width) {
        finalizarSimulacion("limites");
    }
}

// Finaliza la simulación por diferentes motivos
function finalizarSimulacion(motivo) {
    clearInterval(intervaloSimulacion);
    
    if (motivo === "suelo") {
        if (estaSonando) sonidoImpacto.play();
        // Ajustar posición final al suelo
        posicionY = 15;
        ball.style.bottom = trayectoriaCanvas.height - posicionY - 15 + "px";
        
        // Actualizar última posición en la trayectoria
        if (puntosTrayectoria.length > 0) {
            puntosTrayectoria[puntosTrayectoria.length - 1].y = posicionY;
        }
        
        // Dibujar trayectoria final
        dibujarTrayectoria();
        
        // Mostrar mensaje sobre las leyes de Newton aplicadas
        mostrarLey(`Primera y Tercera Ley de Newton: La bola se detiene por la fuerza de reacción del suelo. Por cada acción hay una reacción igual y opuesta.`, 0);
    } 
    else if (motivo === "limites") {
        mostrarLey(`Primera Ley de Newton: Si no hubiera otras fuerzas actuando (como la gravedad), la bola continuaría con movimiento uniforme indefinidamente.`, 0);
    }
}

// Dibuja la trayectoria actual en el canvas
function dibujarTrayectoria() {
    ctx.clearRect(0, 0, trayectoriaCanvas.width, trayectoriaCanvas.height);
    
    // Dibujar la trayectoria real (más gruesa)
    ctx.beginPath();
    ctx.strokeStyle = "#FF5722";
    ctx.lineWidth = 3;
    
    for (let i = 0; i < puntosTrayectoria.length; i++) {
        const punto = puntosTrayectoria[i];
        if (i === 0) {
            ctx.moveTo(punto.x, trayectoriaCanvas.height - punto.y);
        } else {
            ctx.lineTo(punto.x, trayectoriaCanvas.height - punto.y);
        }
    }
    ctx.stroke();
    
    // Marcar la altura máxima con un punto
    if (alturaPico > 0) {
        const puntoMasAlto = puntosTrayectoria.reduce(
            (max, p) => (p.y > max.y ? p : max), 
            { x: 0, y: 0 }
        );
        
        ctx.beginPath();
        ctx.fillStyle = "#FF9800";
        ctx.arc(puntoMasAlto.x, trayectoriaCanvas.height - puntoMasAlto.y, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Línea punteada hasta el eje Y
        ctx.beginPath();
        ctx.strokeStyle = "#FF9800";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 3]);
        ctx.moveTo(puntoMasAlto.x, trayectoriaCanvas.height - puntoMasAlto.y);
        ctx.lineTo(puntoMasAlto.x, trayectoriaCanvas.height);
        ctx.stroke();
        
        // Resetear estilo de línea
        ctx.setLineDash([]);
    }
}

// Dibuja una vista previa de la trayectoria esperada
function dibujarTrayectoriaPrevista() {
    ctx.clearRect(0, 0, trayectoriaCanvas.width, trayectoriaCanvas.height);
    
    // Calcular parámetros para la trayectoria
    const angulo = (parseInt(anguloInput.value) * Math.PI) / 180;
    const v0 = parseInt(potenciaInput.value);
    const v0x = v0 * Math.cos(angulo);
    const v0y = v0 * Math.sin(angulo);
    
    // Posición inicial
    let x0 = 165 + 15;
    let y0 = 130 + 15;
    
    // Dibujar trayectoria prevista
    ctx.beginPath();
    ctx.strokeStyle = "#AAAAAA";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    ctx.moveTo(x0, trayectoriaCanvas.height - y0);
    
    // Calcular puntos de la trayectoria teórica
    for (let t = 0; t < 10; t += 0.1) {
        const x = x0 + v0x * t;
        const y = y0 - (v0y * t - 0.5 * GRAVEDAD * ESCALA * t * t);
        
        // Si toca el suelo o sale de los límites, detener
        if (y <= 15 || x >= trayectoriaCanvas.width) {
            ctx.lineTo(x, trayectoriaCanvas.height - Math.max(y, 15));
            break;
        }
        
        ctx.lineTo(x, trayectoriaCanvas.height - y);
    }
    
    ctx.stroke();
    ctx.setLineDash([]);
}

// Actualiza la vista previa cuando se cambian los controles
function actualizarPreview() {
    // Actualizar la posición del brazo según el ángulo seleccionado
    arm.style.transform = `rotate(${-parseInt(anguloInput.value) / 2}deg)`;
    
    // Si no hay simulación en curso, mostrar trayectoria prevista
    if (!intervaloSimulacion) {
        dibujarTrayectoriaPrevista();
    }
    
    // Actualizar fórmula mostrada
    mostrarFormulaActual();
}

// Muestra un mensaje sobre las leyes de Newton
function mostrarLey(mensaje, delay) {
    if (delay > 0) {
        setTimeout(() => {
            leyesDiv.textContent = mensaje;
        }, delay);
    } else {
        leyesDiv.textContent = mensaje;
    }
}

// Resetea la simulación al estado inicial
function resetearSimulacion() {
    // Detener cualquier intervalo existente
    if (intervaloSimulacion) {
        clearInterval(intervaloSimulacion);
        intervaloSimulacion = null;
    }
    
    // Restablecer variables
    posicionX = 165 + 15;
    posicionY = 130 + 15;
    velocidadX = 0;
    velocidadY = 0;
    tiempoVuelo = 0;
    alturaPico = 0;
    distanciaRecorrida = 0;
    puntosTrayectoria = [];
    
    // Limpiar canvas
    ctx.clearRect(0, 0, trayectoriaCanvas.width, trayectoriaCanvas.height);
    
    // Restablecer posición de la bola
    ball.style.transition = "all 0.3s ease-in-out";
    ball.style.left = 165 + "px";
    ball.style.bottom = 130 + "px";
    
    // Restablecer posición del brazo
    arm.style.transform = "rotate(0deg)";
    
    // Limpiar mensaje de leyes
    leyesDiv.textContent = "Ajusta el ángulo y la potencia, luego presiona 'Lanzar Bola'";
    
    // Dibujar trayectoria prevista
    setTimeout(() => {
        ball.style.transition = "none"; // Quitar transición después del reset
        dibujarTrayectoriaPrevista();
    }, 300);
    
    // Mostrar fórmulas y datos teóricos iniciales
    mostrarFormulaActual();
}

// Alterna entre pausar y reanudar la simulación
function togglePausa() {
    pausado = !pausado;
    document.getElementById("pauseBtn").textContent = pausado ? "Reanudar" : "Pausar";
}

// Activa/desactiva los efectos de sonido
function toggleSonido() {
    estaSonando = !estaSonando;
    document.getElementById("soundBtn").textContent = estaSonando ? "Sonido: ON" : "Sonido: OFF";
}

// Muestra la fórmula correspondiente a la configuración actual
function mostrarFormulaActual() {
    // Obtener valores actuales
    const angulo = parseInt(anguloInput.value);
    const velocidad = parseInt(potenciaInput.value);
    const anguloRad = (angulo * Math.PI) / 180;
    
    // Calcular componentes de velocidad
    const vx = velocidad * Math.cos(anguloRad);
    const vy = velocidad * Math.sin(anguloRad);
    
    // Tiempo teórico de vuelo (ignorando resistencia del aire)
    const tiempoSubida = vy / (GRAVEDAD * ESCALA);
    const tiempoTotal = 2 * tiempoSubida;
    
    // Altura máxima teórica
    const alturaMax = (vy * vy) / (2 * GRAVEDAD * ESCALA);
    
    // Alcance teórico
    const alcance = vx * tiempoTotal;
    
    // Actualizar la información en el DOM
    document.getElementById("formulaVelocidadX").textContent = `v₀ₓ = v₀·cos(θ) = ${velocidad}·cos(${angulo}°) = ${vx.toFixed(2)} px/s`;
    document.getElementById("formulaVelocidadY").textContent = `v₀ᵧ = v₀·sin(θ) = ${velocidad}·sin(${angulo}°) = ${vy.toFixed(2)} px/s`;
    document.getElementById("formulaAltura").textContent = `h = v₀ᵧ²/(2g) = ${vy.toFixed(2)}²/(2·${(GRAVEDAD * ESCALA).toFixed(2)}) = ${alturaMax.toFixed(2)} px`;
    document.getElementById("formulaTiempo").textContent = `t = 2v₀ᵧ/g = 2·${vy.toFixed(2)}/${(GRAVEDAD * ESCALA).toFixed(2)} = ${tiempoTotal.toFixed(2)} s`;
    document.getElementById("formulaAlcance").textContent = `R = v₀ₓ·t = ${vx.toFixed(2)}·${tiempoTotal.toFixed(2)} = ${alcance.toFixed(2)} px`;
    
    // Actualizar datos teóricos en el panel
    document.getElementById("tiempoTeorico").textContent = tiempoTotal.toFixed(2) + " s";
    document.getElementById("alturaTeorica").textContent = alturaMax.toFixed(2) + " px";
    document.getElementById("distanciaTeorica").textContent = alcance.toFixed(2) + " px";
}
// Añadir al inicio con las variables globales
let registroLanzamientos = [];
let contadorIntentos = 1;

// Modificar la función finalizarSimulacion
function finalizarSimulacion(motivo) {
    clearInterval(intervaloSimulacion);
    
    if (motivo === "suelo") {
        if (estaSonando) sonidoImpacto.play();
        posicionY = 15;
        ball.style.bottom = trayectoriaCanvas.height - posicionY - 15 + "px";
        
        // Registrar datos del lanzamiento
        registrarDatos();
        
        // ... (resto del código existente)
    }
    // ... (resto del código existente)
}

// Nueva función para registrar datos
function registrarDatos() {
    const angulo = parseInt(anguloInput.value);
    const potencia = parseInt(potenciaInput.value);
    
    const lanzamiento = {
        intento: contadorIntentos++,
        angulo: angulo,
        potencia: potencia,
        tiempo: document.getElementById("tiempoTeorico").textContent,
        altura: document.getElementById("alturaTeorica").textContent,
        distancia: document.getElementById("distanciaTeorica").textContent
    };
    
    registroLanzamientos.push(lanzamiento);
    actualizarTablaRegistro();
}

// Nueva función para actualizar la tabla
function actualizarTablaRegistro() {
    const tbody = document.querySelector("#tablaRegistro tbody");
    tbody.innerHTML = "";
    
    registroLanzamientos.forEach(lanzamiento => {
        const row = document.createElement("tr");
        
        row.innerHTML = `
            <td>${lanzamiento.intento}</td>
            <td>${lanzamiento.angulo}</td>
            <td>${lanzamiento.potencia}</td>
            <td>${lanzamiento.tiempo}</td>
            <td>${lanzamiento.altura}</td>
            <td>${lanzamiento.distancia}</td>
        `;
        
        tbody.appendChild(row);
    });
}


