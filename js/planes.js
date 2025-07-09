// planes.js

const API_BASE = "https://maensa.onrender.com";

// ——————————————
// Funciones de Modal & Sesión
// ——————————————

function loginExitoso(usuario) {
  document.getElementById("btn-login").style.display    = "none";
  document.getElementById("btn-register").style.display = "none";
  const menu = document.getElementById("menu-usuario-li");
  menu.classList.remove("hidden");
  document.querySelector(".nombre-usuario").textContent = `${usuario.nombre} ${usuario.apellido}`;
}

function cerrarModalLogin() {
  document.getElementById("modal-login").classList.add("hidden");
}
function mostrarLogin() {
  cerrarModalRegistro();
  document.getElementById("modal-login").classList.remove("hidden");
}

function cerrarModalRegistro() {
  document.getElementById("modal-register").classList.add("hidden");
}
function mostrarRegistro() {
  cerrarModalLogin();
  document.getElementById("modal-register").classList.remove("hidden");
  paso1(); // reset pasos
}

// ——————————————
// Helpers de registro
// ——————————————

let registroData = {};
let resendCooldown = 0, resendTimer = null;

function actualizarIndicador(paso) {
  for (let i = 1; i <= 3; i++) {
    document.getElementById(`punto-${i}`)
      .classList.toggle("activo", i === paso);
  }
}

function paso1() {
  document.getElementById("registro-paso-1").classList.remove("hidden");
  document.getElementById("registro-paso-2").classList.add("hidden");
  document.getElementById("registro-paso-3").classList.add("hidden");
  actualizarIndicador(1);
}
function paso2() {
  document.getElementById("registro-paso-1").classList.add("hidden");
  document.getElementById("registro-paso-2").classList.remove("hidden");
  document.getElementById("registro-paso-3").classList.add("hidden");
  actualizarIndicador(2);
}

// ——————————————
// Paso 1: envío de datos
// ——————————————

async function irAPaso2() {
  const nombre   = document.getElementById("nombre").value.trim();
  const apellido = document.getElementById("apellido").value.trim();
  const email    = document.getElementById("email").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const nacimiento = document.getElementById("fecha_nacimiento").value;
  const password = document.getElementById("password").value;

  if (!/(?=.*[A-Z])(?=.*\d).{8,}/.test(password)) {
    return alert("La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.");
  }
  if (!nombre || !apellido || !email) {
    return alert("Completa nombre, apellido y email.");
  }

  try {
    const res = await fetch(`${API_BASE}/api/registro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, apellido, email, telefono, nacimiento, password }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return alert(data.error || "Error al registrar usuario.");
    }
    registroData = { nombre, apellido, email, telefono, nacimiento, password };
    paso2();
    iniciarCooldown();
    alert("Mirá tu correo y escribí el código de verificación.");
  } catch {
    alert("Error de conexión al registrar usuario.");
  }
}

// ——————————————
// Reenviar código
// ——————————————

function iniciarCooldown() {
  resendCooldown = 30;
  updateResendButton();
  resendTimer = setInterval(() => {
    resendCooldown--;
    updateResendButton();
    if (resendCooldown <= 0) clearInterval(resendTimer);
  }, 1000);
}

function updateResendButton() {
  const btn = document.getElementById("btn-reenviar-codigo");
  if (!btn) return;
  if (resendCooldown > 0) {
    btn.disabled    = true;
    btn.textContent = `Reenviar código (${resendCooldown}s)`;
  } else {
    btn.disabled    = false;
    btn.textContent = "Reenviar código";
  }
}

function reenviarCodigo() {
  if (resendCooldown > 0) return;
  iniciarCooldown();
  fetch(`${API_BASE}/api/registro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(registroData),
  })
    .then(r => r.json())
    .then(d => alert(d.error || "Te enviamos un nuevo código."))
    .catch(() => alert("Error de conexión al reenviar código."));
}

// ——————————————
// Paso 2: verificar código
// ——————————————

async function verificarCodigo() {
  const codigo = document.getElementById("codigo-verificacion").value.trim();
  if (!codigo) return alert("Ingresá el código.");

  try {
    const res  = await fetch(`${API_BASE}/api/verificar-codigo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: registroData.email, codigo }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return alert(data.error || "Código incorrecto.");
    }

    cerrarModalRegistro();
    registroData.plan = "basico";
    registroData.pago_confirmado = 0;
    registroData.verificado = true;
    localStorage.setItem("usuario", JSON.stringify(registroData));
    window.location.href = "planel.html";
  } catch {
    alert("Error de conexión al verificar código.");
  }
}

// ——————————————
// Login
// ——————————————

async function iniciarSesion() {
  const email    = document.getElementById("email-login").value.trim();
  const password = document.getElementById("password-login").value.trim();
  if (!email || !password) {
    return alert("Email y contraseña son obligatorios.");
  }

  try {
    const res  = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return alert(data.error || "Error al iniciar sesión.");
    }

    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    alert(`¡Bienvenido/a ${data.usuario.nombre}!`);
    cerrarModalLogin();
    loginExitoso(data.usuario);
  } catch {
    alert("Error de conexión al iniciar sesión.");
  }
}

// ——————————————
// Menú usuario
// ——————————————

function toggleMenuUsuario() {
  document.getElementById("menu-usuario-li").classList.toggle("activo");
}
function cerrarSesion() {
  localStorage.removeItem("usuario");
  location.href = "Maensa.html";
}

// ——————————————
// Inicio único
// ——————————————

document.addEventListener("DOMContentLoaded", () => {
  // Auto‐login
  const raw = localStorage.getItem("usuario");
  if (raw) {
    try { loginExitoso(JSON.parse(raw)); }
    catch (e) { console.warn("Parse error usuario:", e); }
  }

  // Bind botones
  document.getElementById("btn-login")?.addEventListener("click", e => { e.preventDefault(); mostrarLogin(); });
  document.getElementById("btn-register")?.addEventListener("click", e => { e.preventDefault(); mostrarRegistro(); });
  document.getElementById("btn-iniciar-sesion")?.addEventListener("click", e => { e.preventDefault(); iniciarSesion(); });
  document.getElementById("btn-reenviar-codigo")?.addEventListener("click", e => { e.preventDefault(); reenviarCodigo(); });
  document.getElementById("btn-usuario")?.addEventListener("click", e => { e.preventDefault(); toggleMenuUsuario(); });
  document.getElementById("cerrar-sesion")?.addEventListener("click", e => { e.preventDefault(); cerrarSesion(); });

  // Cerrar menú clic fuera
  document.addEventListener("click", e => {
    const menu = document.getElementById("menu-usuario-li");
    const btn  = document.getElementById("btn-usuario");
    if (menu && btn && !menu.contains(e.target) && e.target !== btn) {
      menu.classList.remove("activo");
    }
  });

  // Estado inicial botón reenvío
  updateResendButton();
});


document.addEventListener("DOMContentLoaded", () => {
  // Selecciono todos los botones de contratar
  document.querySelectorAll(".plan-card .btn-contratar")
    .forEach(btn => btn.addEventListener("click", async (e) => {
      e.preventDefault();

      // 1) Averiguo el plan desde el data-plan de la tarjeta
      const plan = btn.closest(".plan-card").dataset.plan;
      if (!plan) return console.error("No encontré el atributo data-plan");

      try {
        // 2) Llamo al endpoint que inicia la compra en MercadoPago
        const res = await fetch(`${API_BASE}/api/registro-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan })
        });
        const data = await res.json();

        // 3) Si todo salió bien, redirijo al init_point de MercadoPago
        if (data.init_point) {
          window.location.href = data.init_point;
        } else {
          alert(data.error || "No se pudo iniciar el pago.");
        }
      } catch (err) {
        console.error("Error iniciando pago:", err);
        alert("Error de conexión al iniciar el pago.");
      }
    }));
});