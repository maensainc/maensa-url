// planes.js
const API_BASE = "https://maensa.onrender.com";

// Traduce cada plan a su límite diario de subidas
function getLimitePorPlan(plan) {
  switch (plan) {
    case 'gratis':     return 20;
    case 'basico':     return 20;
    case 'intermedio': return 50;
    case 'pro':        return 100;
    case 'ilimitado':  return Infinity;
    default:           return 0;
  }
}

// ——————————————
// Funciones de Modal & Sesión
// ——————————————
function loginExitoso(usuario) {
  // Oculta botones de login/registro
  document.getElementById("btn-login").style.display    = "none";
  document.getElementById("btn-register").style.display = "none";

  // Muestra menú con nombre de usuario
  const menuLi = document.getElementById("menu-usuario-li");
  menuLi.classList.remove("hidden");
  menuLi.classList.remove("activo");
  document.querySelector(".nombre-usuario").textContent =
    `${usuario.nombre} ${usuario.apellido}`;

  // Inicializa contador de subidas diario por usuario
  const key = `uploadsUsed_${usuario.email}`;
  const hoy = new Date().toISOString().split('T')[0];
  let record = JSON.parse(localStorage.getItem(key)) || {};
  if (record.date !== hoy) {
    record = { date: hoy, count: 0 };
    localStorage.setItem(key, JSON.stringify(record));
  }

  // Guarda objeto usuario
  localStorage.setItem("usuario", JSON.stringify(usuario));
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
  paso1();
}

// ——————————————
// Helpers de registro
// ——————————————
let registroData = {};
let resendCooldown = 0, resendTimer = null;

function actualizarIndicador(paso) {
  for (let i = 1; i <= 3; i++) {
    document.getElementById(`punto-${i}`).classList.toggle("activo", i === paso);
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
  const nombre     = document.getElementById("nombre").value.trim();
  const apellido   = document.getElementById("apellido").value.trim();
  const email      = document.getElementById("email").value.trim();
  const telefono   = document.getElementById("telefono").value.trim();
  const nacimiento = document.getElementById("fecha_nacimiento").value;
  const password   = document.getElementById("password").value;

  if (!/(?=.*[A-Z])(?=.*\d).{8,}/.test(password)) {
    return alert("La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.");
  }
  if (!nombre || !apellido || !email) {
    return alert("Completa nombre, apellido y email.");
  }

  try {
    const res  = await fetch(`${API_BASE}/api/registro`, {
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
    registroData.plan            = "basico";
    registroData.pago_confirmado = 0;
    registroData.verificado      = true;
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
    loginExitoso(data.usuario);
  } catch {
    alert("Error de conexión al iniciar sesión.");
  }
}

// ——————————————
// Menú usuario
// ——————————————
function toggleMenuUsuario() {
  const menuLi = document.getElementById("menu-usuario-li");
  menuLi.classList.toggle("activo");
}
function cerrarSesion() {
  localStorage.removeItem("usuario");
  location.href = "Maensa.html";
}

// ——————————————
// Compra de planes
// ——————————————
function bindPlanes() {
  document.querySelectorAll(".plan-card .btn-contratar")
    .forEach(btn => btn.addEventListener("click", async e => {
      e.preventDefault();
      const plan = btn.closest(".plan-card")?.dataset.plan;
      if (!plan) return;

if (plan === "gratis") {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  if (!usuario.email) {
    return alert("No se encontró tu sesión. Por favor, inicia sesión de nuevo.");
  }

  try {
    const res  = await fetch(`${API_BASE}/api/registro-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "gratis", email: usuario.email })
    });
    const data = await res.json();

    if (!res.ok) {
      return alert(data.error || `Error ${res.status}: ${res.statusText}`);
    }

    // Backend devuelve ok=true y ya actualizó pago_confirmado=1 y bloqueó el email
    alert("¡Plan Gratis activado y cuenta habilitada con éxito!");

    // Actualizo el usuario en el cliente
    usuario.plan = "gratis";
    usuario.pago_confirmado = 1;
    localStorage.setItem("usuario", JSON.stringify(usuario));
    loginExitoso(usuario);

  } catch (err) {
    console.error("Error al activar plan gratis:", err);
    alert("Error de conexión al activar el plan gratis.");
  }
  return;
}


      try {
        const res  = await fetch(`${API_BASE}/api/registro-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan })
        });
        const data = await res.json();
        if (!res.ok) {
          // Si el backend devolvió un error 4xx/5xx, lo mostramos
          console.error(`registro-plan error ${res.status}`, data);
          return alert(data.error || `Error ${res.status}: ${res.statusText}`);
        }
        if (data.init_point) {
          window.location.href = data.init_point;
        } else {
          console.error("Sin init_point:", data);
          alert("No se recibió URL de pago. Contactá al admin.");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        alert("Error de conexión al iniciar el pago.");
      }
    }));
}

// ——————————————
// Renderizado de resultados
// ——————————————
function renderResultsTable() {
  const table = document.getElementById("results-table");
  if (!table) return;

  const data = JSON.parse(localStorage.getItem("receiptResult") || "[]");
  if (!data.length) {
    alert("No hay datos para mostrar.");
    window.location.href = "upload.html";
    return;
  }

  const columns = [
    { key: 'fileName',        label: 'Archivo' },
    { key: 'tipo',            label: 'Tipo' },
    { key: 'fecha',           label: 'Fecha' },
    { key: 'hora',            label: 'Hora' },
    { key: 'total',           label: 'Total' },
    { key: 'de',              label: 'De quien sale' },
    { key: 'para',            label: 'A quien llega' },
    { key: 'motivo',          label: 'Motivo' },
    { key: 'medioPago',       label: 'Medio de Pago' },
    { key: 'numeroOperacion', label: 'Nº de Operación' },
    { key: 'items',           label: 'Items' },
  ];

  table.innerHTML = "";

  const thead = document.createElement("thead");
  const trH   = document.createElement("tr");
  columns.forEach(c => {
    const th = document.createElement("th");
    th.textContent = c.label;
    trH.appendChild(th);
  });
  thead.appendChild(trH);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  data.forEach(row => {
    const tr = document.createElement("tr");
    columns.forEach(c => {
      const td = document.createElement("td");
      let v = row[c.key];
      if (c.key === 'items' && Array.isArray(v)) v = v.join("; ");
      td.textContent = v != null ? v : "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  document.getElementById("btn-download")?.addEventListener("click", () => {
    let csv = columns.map(c => c.label).join(",") + "\n";
    data.forEach(row => {
      csv += columns
        .map(c => `"${(row[c.key]||"").toString().replace(/"/g,'""')}"`)
        .join(",") + "\n";
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "recibos.csv";
    a.click();
    URL.revokeObjectURL(url);
  });
}

// ——————————————
// Inicialización global
// ——————————————
document.addEventListener("DOMContentLoaded", () => {
  // Sesión / menú
  const raw = localStorage.getItem("usuario");
  if (raw) loginExitoso(JSON.parse(raw));

  document.getElementById("btn-login")?.addEventListener("click", e => { e.preventDefault(); mostrarLogin(); });
  document.getElementById("btn-register")?.addEventListener("click", e => { e.preventDefault(); mostrarRegistro(); });
  document.getElementById("btn-iniciar-sesion")?.addEventListener("click", e => { e.preventDefault(); iniciarSesion(); });
  document.getElementById("btn-reenviar-codigo")?.addEventListener("click", e => { e.preventDefault(); reenviarCodigo(); });
  document.getElementById("btn-usuario")?.addEventListener("click", e => { e.preventDefault(); toggleMenuUsuario(); });
  document.getElementById("cerrar-sesion")?.addEventListener("click", e => { e.preventDefault(); cerrarSesion(); });

  document.addEventListener("click", e => {
    const menuLi  = document.getElementById("menu-usuario-li");
    const btnUser = document.getElementById("btn-usuario");
    if (menuLi && btnUser && !menuLi.contains(e.target) && e.target !== btnUser) {
      menuLi.classList.remove("activo");
    }
  });

  // Planes y resultados
  bindPlanes();
  renderResultsTable();

  // Botón reenviar código (registro)
  updateResendButton();
  if (!raw) return;
  let usuario;
  try {
    usuario = JSON.parse(raw);
  } catch (e) {
    console.warn("No pude parsear usuario:", e);
    return;
  }
  const planActivo = usuario.plan;
  if (!planActivo) return;

  // 2. Busco la tarjeta que tenga data-plan igual al plan del usuario
  const tarjeta = document.querySelector(`.plan-card[data-plan="${planActivo}"]`);
  if (!tarjeta) return;

  // 3. Le agrego una clase para estilos especiales
  tarjeta.classList.add("activo");

  // 4. Cambio el texto del botón y lo deshabilito
  const btn = tarjeta.querySelector(".btn-contratar");
  if (btn) {
    btn.textContent = "Activo";
    btn.disabled = true;
  }
});
