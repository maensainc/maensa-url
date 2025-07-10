
const API_BASE = "https://maensa.onrender.com";

const modalLogin        = document.getElementById("modal-login");
const modalRegister     = document.getElementById("modal-register");
const registroContainer = document.getElementById("registro-container");

const paso1 = document.getElementById("registro-paso-1");
const paso2 = document.getElementById("registro-paso-2");
const paso3 = document.getElementById("registro-paso-3");

const puntos = [
  document.getElementById("punto-1"),
  document.getElementById("punto-2"),
  document.getElementById("punto-3"),
];

let registroData = {}; // para pasar datos entre pasos

// ==============================
// FUNCIONES DE MODAL/REGISTRO
// ==============================


function mostrarLogin() {
  cerrarModalRegistro();
  modalLogin.classList.remove("hidden");
}

function cerrarModal() {
  modalLogin.classList.add("hidden");
}

function mostrarRegistro() {
  cerrarModal();
  modalRegister.classList.remove("hidden");
  paso1.classList.remove("hidden");
  paso2.classList.add("hidden");
  paso3.classList.add("hidden");
  registroContainer.classList.remove("expandido");
  actualizarIndicador(1);
}

function cerrarModalRegistro() {
  modalRegister.classList.add("hidden");
}

// — Paso 1: envío de datos y validación de contraseña —
async function irAPaso2() { 
  const nombre     = document.getElementById("nombre").value.trim();
  const apellido   = document.getElementById("apellido").value.trim();
  const email      = document.getElementById("email").value.trim();
  const telefono   = document.getElementById("telefono").value.trim();
  const nacimiento = document.getElementById("fecha_nacimiento").value;
  const password   = document.getElementById("password").value;

  if (!/(?=.*[A-Z])(?=.*\d).{8,}/.test(password)) {
    alert("La contraseña debe tener mínimo 8 caracteres, al menos una mayúscula y un número.");
    return;
  }
  if (!nombre || !apellido || !email) {
    alert("Completá nombre, apellido y email.");
    return;
  }

  try {
    const res  = await fetch(`${API_BASE}/api/registro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, apellido, email, telefono, nacimiento, password }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      alert(data.error || "Error al registrar usuario.");
      return;
    }

    registroData = { nombre, apellido, email, telefono, nacimiento, password };

    paso1.classList.add("hidden");
    paso2.classList.remove("hidden");
    registroContainer.classList.remove("expandido");
    actualizarIndicador(2);

    alert("Revisá tu correo y escribí el código de verificación.");
  } catch (err) {
    console.error(err);
    alert("Error de conexión al registrar usuario.");
  }
}

// ——— REENVIAR CÓDIGO DE VERIFICACIÓN ——–
let resendCooldown = 0;
let resendTimer;

function reenviarCodigo() {
  if (resendCooldown > 0) return; // aún en cooldown

  // Iniciar cooldown
  resendCooldown = 30;
  updateResendButton();
  resendTimer = setInterval(() => {
    resendCooldown--;
    updateResendButton();
    if (resendCooldown <= 0) {
      clearInterval(resendTimer);
    }
  }, 1000);

  // Hacer fetch de nuevo a /api/registro con los mismos datos de paso 1
  fetch(`${API_BASE}/api/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registroData)
  })
  .then(res => res.json())
  .then(data => {
    if (!data.ok && data.error) {
      alert(data.error);
    } else {
      alert('Te enviamos un nuevo código al correo.');
    }
  })
  .catch(err => {
    console.error('Error reenviando código:', err);
    alert('Error de conexión al reenviar código.');
  });
}

function updateResendButton() {
  const btn = document.getElementById('btn-reenviar-codigo');
  if (!btn) return;
  if (resendCooldown > 0) {
    btn.disabled = true;
    btn.textContent = `Reenviar código (${resendCooldown}s)`;
  } else {
    btn.disabled = false;
    btn.textContent = 'Reenviar código';
  }
}

// Al cargar la página, asegúrate de poner el estado inicial
window.addEventListener('DOMContentLoaded', () => {
  updateResendButton();
});



// — Volver de paso 2 a paso 1 —
function volverAPaso1() {
  paso2.classList.add("hidden");
  paso1.classList.remove("hidden");
  registroContainer.classList.remove("expandido");
  actualizarIndicador(1);
}

// — Paso 2: verificación de código —
async function verificarCodigo() {
  const codigo = document.getElementById("codigo-verificacion").value.trim();
  if (!codigo) {
    alert("Ingresá el código de verificación.");
    return;
  }
  try {
    const res  = await fetch(`${API_BASE}/api/verificar-codigo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: registroData.email, codigo }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      alert(data.error || "Código incorrecto.");
      return;
    }

    // ← Aquí quitamos el paso 3 y redirigimos directamente
    cerrarModalRegistro();
    // Guarda localStorage si quieres mantener al usuario “logueado” de inmediato
    registroData.plan = "basico";            // opcional: asigna un plan por defecto
    registroData.pago_confirmado = 0;
    registroData.verificado = true;
    localStorage.setItem("usuario", JSON.stringify(registroData));

    // Redirijo inmediatamente a la página de planes
    window.location.href = "planel.html";

  } catch (err) {
    console.error(err);
    alert("Error de conexión al verificar código.");
  }
}

// — Volver de paso 3 a paso 2 —
function volverAPaso2() {
  paso3.classList.add("hidden");
  paso2.classList.remove("hidden");
  registroContainer.classList.remove("expandido");
  actualizarIndicador(2);
}

// — Paso 3: finalizar registro / pago —
async function finalizarRegistro() {
  const planInput = document.querySelector('input[name="plan"]:checked');
  if (!planInput) {
    alert("Seleccioná un plan para continuar.");
    return;
  }
  const plan = planInput.value;

  if (plan === "basico") {
    registroData.plan            = "basico";
    registroData.pago_confirmado = 0;
    registroData.verificado      = true;
    localStorage.setItem("usuario", JSON.stringify(registroData));
    alert("Cuenta básica creada. ¡Bienvenido!");
    cerrarModalRegistro();
    loginExitoso(registroData);
  } else {
    try {
      const res  = await fetch(`${API_BASE}/api/registro-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...registroData, plan }),
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert(data.error || "Error al iniciar pago.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al iniciar pago.");
    }
  }
}

// — Actualizar indicador de pasos —
function actualizarIndicador(paso) {
  puntos.forEach((dot, i) => dot.classList.toggle("activo", i === paso - 1));
}

// ==============================
// LOGIN / SESIÓN
// ==============================
async function iniciarSesion() {
  const email    = document.getElementById("email-login").value.trim();
  const password = document.getElementById("password-login").value.trim();
  if (!email || !password) {
    alert("Email y contraseña obligatorios.");
    return;
  }
  try {
    const res  = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      alert(data.error || "Error al iniciar sesión.");
      return;
    }
    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    alert(`¡Bienvenido/a ${data.usuario.nombre}!`);
    cerrarModal();
    loginExitoso(data.usuario);
  } catch (err) {
    console.error(err);
    alert("Error de conexión al iniciar sesión.");
  }
}

function loginExitoso(usuario) {
  document.querySelector('a[onclick="mostrarLogin(); return false;"]').style.display    = "none";
  document.querySelector('a[onclick="mostrarRegistro(); return false;"]').style.display = "none";
  const menu = document.getElementById("menu-usuario-li");
  menu.classList.remove("hidden");
  document.querySelector(".nombre-usuario").textContent = `${usuario.nombre} ${usuario.apellido}`;
}

function cerrarSesion() {
  localStorage.removeItem("usuario");
  document.querySelector('a[onclick="mostrarLogin(); return false;"]').style.display    = "inline-block";
  document.querySelector('a[onclick="mostrarRegistro(); return false;"]').style.display = "inline-block";
  document.getElementById("menu-usuario-li").classList.add("hidden");
  alert("Sesión cerrada.");
}

// Función para toggle del menú de usuario (inline)
function toggleMenuUsuario() {
  document.getElementById("menu-usuario-li").classList.toggle("activo");
}

// ==============================
// CARRUSEL AUTOMÁTICO
// ==============================
const wrapper      = document.getElementById("carrusel-wrapper");
const indicadores  = document.querySelectorAll(".indicador");
let index          = 0;
let isDragging     = false;
let startX         = 0;
let autoSlideTimer = null;

function setSlide(i) {
  index = i;
  wrapper.style.transform = `translateX(-${100 * index}%)`;
  indicadores.forEach((dot, idx) => dot.classList.toggle("activo", idx === index));
  reiniciarTimer();
}

function reiniciarTimer() {
  clearInterval(autoSlideTimer);
  autoSlideTimer = setInterval(() => setSlide((index + 1) % indicadores.length), 15000);
}

indicadores.forEach((dot, i) => dot.addEventListener("click", () => setSlide(i)));
wrapper.addEventListener("mousedown", e => { isDragging = true; startX = e.pageX; });
wrapper.addEventListener("mouseup",   e => {
  if (!isDragging) return;
  isDragging = false;
  const delta = e.pageX - startX;
  if      (delta > 50 && index > 0)                   setSlide(index - 1);
  else if (delta < -50 && index < indicadores.length - 1) setSlide(index + 1);
});
wrapper.addEventListener("mouseleave", () => isDragging = false);

// ==============================
// FAQ TOGGLE
// ==============================
document.querySelectorAll(".faq-pregunta").forEach(btn => {
  btn.addEventListener("click", () => {
    const resp = btn.nextElementSibling;
    resp.style.display = (resp.style.display === "block") ? "none" : "block";
  });
});

// ==============================
// DRAG & DROP + REDIRECCIÓN
// ==============================

// ==============================
// SCROLL SUAVE
// ==============================
function scrollASeccion(id) {
  const headerOffset = 120;
  const seccion = document.getElementById(id);
  const y = seccion.getBoundingClientRect().top + window.pageYOffset - headerOffset;
  window.scrollTo({ top: y, behavior: "smooth" });
}

window.addEventListener("DOMContentLoaded", () => {
  // 1) Login automático si ya hay usuario
  const u = localStorage.getItem("usuario");
  if (u) {
    try { loginExitoso(JSON.parse(u)); }
    catch (e) { console.warn("Error parseando usuario:", e); }
  }

  // 2) Cerrar menú al hacer click fuera
  document.addEventListener("click", (e) => {
    const menu = document.getElementById("menu-usuario-li");
    const btn  = document.getElementById("btn-usuario");
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
      menu.classList.remove("activo");
    }
  });

  // 3) Asociar el botón Ingresar a iniciarSesion()
  const btnLogin = document.getElementById("btn-iniciar-sesion");
  if (btnLogin) {
    btnLogin.addEventListener("click", (e) => {
      e.preventDefault();
      iniciarSesion();
    });
  }

  // 4) (Opcional) reenvío de código
  const btnReenviar = document.getElementById("btn-reenviar-codigo");
  if (btnReenviar) {
    btnReenviar.addEventListener("click", (e) => {
      e.preventDefault();
      reenviarCodigo();
    });
  }

  // 5) Carrusel y AOS
  reiniciarTimer();
  AOS.init({ duration: 800, once: true });

  // 6) Estado inicial del botón de reenvío
  if (typeof updateResendButton === "function") {
    updateResendButton();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const dropArea = document.getElementById("drop-area");
  const fileElem = document.getElementById("fileElem");
  if (!dropArea || !fileElem) {
    console.error("drop-area o fileElem no encontrado");
    return;
  }

  async function manejarArchivos(files) {
    const raw = localStorage.getItem("usuario");
    if (!raw) return mostrarLogin();
    const u = JSON.parse(raw);
    if (!u.plan || u.plan === "basico") {
      return void (window.location.href = "planel.html");
    }

    // guardo metadata + archivos
    sessionStorage.setItem(
      "pendingFilesMeta",
      JSON.stringify(Array.from(files).map(f => ({ name: f.name, size: f.size })))
    );
    window.__PENDING_FILES__ = files;

    console.log("→ Subiendo", files.length, "archivos");
    window.location.href = "upload.html";
  }

  dropArea.addEventListener("click", e => {
    e.preventDefault(); 
    const raw = localStorage.getItem("usuario");
    if (!raw) return mostrarLogin();
    const u = JSON.parse(raw);
    if (!u.plan || u.plan === "basico") {
      return void (window.location.href = "planel.html");
    }
    fileElem.click();
  });

  fileElem.addEventListener("change", () => {
    if (fileElem.files.length) manejarArchivos(fileElem.files);
  });

  dropArea.addEventListener("dragover", e => {
    e.preventDefault();
    dropArea.classList.add("dragging");
  });
  dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("dragging");
  });
  dropArea.addEventListener("drop", e => {
    e.preventDefault();
    dropArea.classList.remove("dragging");
    if (e.dataTransfer.files.length) manejarArchivos(e.dataTransfer.files);
  });
});

let pendingFiles = null;

// 1) función para cargar el fragmento de upload
async function irAPaginaUpload(files) {
  try {
    // guarda los File para luego procesarlos
    pendingFiles = files;

    // baja el fragmento HTML
    const res  = await fetch('upload-fragment.html');
    const html = await res.text();

    // inyecta en el body (o en un contenedor específico)
    document.body.innerHTML = html;

    // re-inserta tu lógica de subida (la de planes.js)
    const script = document.createElement('script');
    script.textContent = `
      const files = pendingFiles;
      // ...copia aquí la lógica de previews y fetch de planes.js,
      // pero en vez de file-input usa directamente la variable files...
      // Ejemplo mínimo:
      const lista = document.getElementById("lista-archivos");
      files.forEach(f => {
        const li = document.createElement("li");
        li.textContent = f.name + " (" + Math.round(f.size/1024) + "KB)";
        lista.appendChild(li);
      });
      // luego tu código para procesar con el botón btn-process...
    `;
    document.body.appendChild(script);

  } catch (e) {
    console.error(e);
    alert('No pude cargar la sección de subida.');
  }
}

// 2) engancha tu drop y click hero
const heroDrop = document.getElementById('drop-area');
heroDrop.addEventListener('click', () => {
  // simula un file-input para que el usuario elija
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.multiple = true;
  inp.accept = 'image/*,application/pdf';
  inp.onchange = () => irAPaginaUpload(Array.from(inp.files));
  inp.click();
});
heroDrop.addEventListener('dragover', e => {
  e.preventDefault();
  heroDrop.classList.add('dragging');
});
heroDrop.addEventListener('dragleave', () => {
  heroDrop.classList.remove('dragging');
});
heroDrop.addEventListener('drop', e => {
  e.preventDefault();
  heroDrop.classList.remove('dragging');
  if (e.dataTransfer.files.length) {
    irAPaginaUpload(Array.from(e.dataTransfer.files));
  }
});