
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
  // Recogemos los 6 dígitos
  const codeInputs = Array.from(document.querySelectorAll('.codigo-input'));
  const codigo = codeInputs.map(i => i.value.trim()).join('');
  if (codigo.length !== codeInputs.length) {
    return alert("Ingresá los 6 dígitos del código de verificación.");
  }

  try {
    const res = await fetch(`${API_BASE}/api/verificar-codigo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: registroData.email, codigo }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      return alert(data.error || "Código incorrecto.");
    }

    cerrarModalRegistro();
    registroData.verificado = true;
    localStorage.setItem("usuario", JSON.stringify(registroData));
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
  console.log('>> iniciarSesion llamado');
  const email    = document.getElementById("email-login").value.trim();
  const password = document.getElementById("password-login").value.trim();
  console.log({ email, password });

  if (!email || !password) {
    alert("Email y contraseña obligatorios.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', data);

    if (!res.ok || data.error) {
      alert(data.error || "Error al iniciar sesión.");
      return;
    }

    // Guardar usuario y mostrar UI
    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    alert(`¡Bienvenido/a ${data.usuario.nombre}!`);
    cerrarModal();            // cierra el modal de login
    loginExitoso(data.usuario);
  } catch (err) {
    console.error("Error de conexión al iniciar sesión:", err);
    alert("Error de conexión al iniciar sesión.");
  }
}

// ————— Vinculación en DOMContentLoaded —————
document.addEventListener('DOMContentLoaded', () => {
  // 1) Login automático si ya hay usuario
  const u = localStorage.getItem("usuario");
  if (u) {
    try { loginExitoso(JSON.parse(u)); }
    catch (e) { console.warn("Error parseando usuario:", e); }
  }

  // 2) Bind de botones de auth
  const btnLogin = document.getElementById("btn-iniciar-sesion");
  if (btnLogin) {
    btnLogin.addEventListener("click", e => {
      e.preventDefault();
      iniciarSesion();
    });
  }
  const btnRegister = document.getElementById("btn-register");
  if (btnRegister) {
    btnRegister.addEventListener("click", e => {
      e.preventDefault();
      mostrarRegistro();
    });
  }
  const btnVerificar = document.getElementById('btn-verificar');
    if (btnVerificar) {
      btnVerificar.addEventListener('click', e => {
        e.preventDefault();
        verificarCodigo();
      });
    }

  // 3) Carrusel, scroll suave, FAQ, etc.
  reiniciarTimer();
  AOS.init({ duration: 800, once: true });
  // …

  // 4) “Comenzar →”
  const btnComenzar = document.getElementById('btn-comenzar');
  if (btnComenzar) {
    btnComenzar.addEventListener('click', e => {
      e.preventDefault();
      const rawUser = localStorage.getItem('usuario');
      if (!rawUser) mostrarRegistro();
      else window.location.href = 'upload.html';
    });
  }

  // 5) — Auto-focus para inputs de código de verificación —
  const codeInputs = Array.from(document.querySelectorAll('.codigo-input'));
  codeInputs.forEach((input, idx) => {
    input.addEventListener('input', () => {
      if (input.value.length === input.maxLength && idx < codeInputs.length - 1) {
        codeInputs[idx + 1].focus();
      }
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && input.value === '' && idx > 0) {
        codeInputs[idx - 1].focus();
      }
    });
  });
});



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

document.addEventListener('DOMContentLoaded', () => {
  // 1) Login automático si ya hay usuario
  const u = localStorage.getItem("usuario");
  if (u) {
    try { loginExitoso(JSON.parse(u)); }
    catch (e) { console.warn("Error parseando usuario:", e); }
  }

  // 2) Bind de botones de auth (login, register, reenvío de código…)
  if (typeof updateResendButton === "function") updateResendButton();

  // 3) Carrusel, AOS, scroll suave, FAQ…
  reiniciarTimer();
  AOS.init({ duration: 800, once: true });

  // 4) Listener para “Comenzar →”
  const btnComenzar = document.getElementById('btn-comenzar');
  if (btnComenzar) {
    btnComenzar.addEventListener('click', e => {
      e.preventDefault();
      const rawUser = localStorage.getItem('usuario');
      if (!rawUser) {
        mostrarRegistro();
      } else {
        window.location.href = 'upload.html';
      }
    });
  }
  document.querySelectorAll('.modal').forEach(modal => {
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.classList.add('hidden');
  });
  const content = modal.querySelector('.modal-content');
  if (content) {
    content.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const btn = content.querySelector('button:not([disabled])');
        if (btn) btn.click();
      }
    });
  }
});
});


const btnComenzar = document.getElementById('btn-comenzar');
console.log('btnComenzar existe?', btnComenzar);
if (btnComenzar) {
  btnComenzar.addEventListener('click', e => {
    e.preventDefault();
    console.log('¡Clic en Comenzar! rawUser =', localStorage.getItem('usuario'));
    const rawUser = localStorage.getItem('usuario');
    if (!rawUser) {
      mostrarRegistro();
    } else {
      window.location.href = 'upload.html';
    }
  });
}