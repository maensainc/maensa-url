// upload.js


const API_BASE = "https://maensa.onrender.com";

let tablas = [];

// ————————————— UTILS SESIÓN / USUARIO —————————————
function getUserEmail() {
  const raw = localStorage.getItem("usuario");
  if (!raw) return null;
  try { return JSON.parse(raw).email; }
  catch { return null; }
}

function getTablesKey() {
  const email = getUserEmail();
  return email ? `misTablas_${email}` : "misTablas_guest";
}

// ————————————— PERSISTENCIA REMOTA —————————————
async function fetchTablasRemotas() {
  try {
    const res = await fetch(`${API_BASE}/api/tablas`, {
      headers: { "x-user-email": getUserEmail() }
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    localStorage.setItem(getTablesKey(), JSON.stringify(data));
    return data;
  } catch {
    const raw = localStorage.getItem(getTablesKey());
    return raw ? JSON.parse(raw) : [];
  }
}

async function syncTablasRemotas(arr) {
  const email = getUserEmail();
  if (!email) {
    console.log('🔒 Modo invitado: tablas sólo en localStorage');
    return;
  }
  try {
    // Ya sabemos que email existe, no lo redeclaramos ni volvemos a lanzar:
    const res = await fetch(`${API_BASE}/api/tablas`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': email
      },
      body: JSON.stringify(arr)
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('PUT /api/tablas devolvió', res.status, errText);
      alert(`Error guardando tabla en el servidor: ${res.status}`);
    }
  } catch (err) {
    console.error('Error de red sincronizando tablas:', err);
    alert('No pude conectar con el servidor al guardar la tabla');
  }
}


async function loadTablas() {
  tablas = await fetchTablasRemotas();
  return tablas;
}


// Antes era function saveTablas(…)
async function saveTablas(arr) {
  localStorage.setItem(getTablesKey(), JSON.stringify(arr));
  const email = getUserEmail();
  if (!email) {
    alert('Para guardar las tablas en el servidor, primero iniciá sesión.');
    return;
  }
  // <-- esperamos a que termine el PUT:
  await syncTablasRemotas(arr);
}

// ————————————— PLAN STATUS —————————————
function formatTime(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function secondsToMidnight() {
  const now = new Date(), mdn = new Date(now);
  mdn.setDate(mdn.getDate() + 1);
  mdn.setHours(0,0,0,0);
  return Math.floor((mdn - now) / 1000);
}

let countdownTimer;
function startCountdown(el) {
  clearInterval(countdownTimer);
  function tick() { el.textContent = formatTime(secondsToMidnight()); }
  tick();
  countdownTimer = setInterval(tick, 1000);
}

async function updatePlanStatus(nameEl, remEl, countEl) {
  const raw = localStorage.getItem("usuario");
  if (!raw) return;
  const { email, plan: stored } = JSON.parse(raw);
  nameEl.textContent = stored;
  remEl.textContent = "—";
  countEl.textContent = "--:--:--";
  try {
    const res = await fetch(`${API_BASE}/api/plan-status`, {
      headers: { "x-user-email": email }
    });
    const data = await res.json();
    if (!res.ok) throw new Error();
    nameEl.textContent = data.plan;
    if (data.remaining === "ilimitado") remEl.textContent = "∞";
    else if (data.remaining === 0) {
      remEl.textContent = "Sin fotos hoy";
      document.querySelector(".dropzone").classList.add("disabled");
    } else remEl.textContent = data.remaining;
    startCountdown(countEl);
  } catch {
    nameEl.textContent = stored;
  }
}

// ————————————— SESIÓN / LOGIN —————————————
function restoreSession(u) {
  document.getElementById("btn-login").style.display = "none";
  document.getElementById("btn-register").style.display = "none";
  document.querySelector(".nombre-usuario").textContent = `${u.nombre} ${u.apellido}`;
  document.getElementById("menu-usuario-li").classList.remove("hidden");
}

async function iniciarSesion() {
  const email = document.getElementById("email-login").value.trim();
  const pass = document.getElementById("password-login").value.trim();
  if (!email || !pass) return alert("Email y contraseña obligatorios.");
  try {
    const res = await fetch(`${API_BASE}/api/login`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ email, password: pass })
    });
    const d = await res.json();
    if (!res.ok) return alert(d.error);
    localStorage.setItem("usuario", JSON.stringify(d.usuario));
    restoreSession(d.usuario);
    closeModal("modal-login");
    const nameEl = document.getElementById("plan-name");
    const remEl  = document.getElementById("plan-remaining");
    const cntEl  = document.getElementById("countdown");
    await updatePlanStatus(nameEl, remEl, cntEl);
  } catch {
    alert("Error de conexión.");
  }
}

function cerrarSesion() {
  localStorage.removeItem("usuario");
  window.location.reload();
}

// ————————————— MODALES —————————————
function showModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

// ————————————— REGISTRO PASOS —————————————
let registroData = {}, resendCooldown = 0, resendTimer = null;
function togglePasos(step) {
  ["registro-paso-1","registro-paso-2","registro-paso-3"].forEach((id,i)=>{
    document.getElementById(id).classList.toggle("hidden", step-1!==i);
    document.getElementById(`punto-${i+1}`).classList.toggle("activo", step-1===i);
  });
}

async function irAPaso2() {
  const nombre = document.getElementById("nombre").value.trim();
  const apellido = document.getElementById("apellido").value.trim();
  const email = document.getElementById("email").value.trim();
  const tel = document.getElementById("telefono").value.trim();
  const nac = document.getElementById("fecha_nacimiento").value;
  const pass = document.getElementById("password").value;
  if (!nombre||!apellido||!email) return alert("Completa datos.");
  if (!/(?=.*[A-Z])(?=.*\d).{8,}/.test(pass)) return alert("Contraseña inválida.");
  try {
    const res = await fetch(`${API_BASE}/api/registro`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ nombre, apellido, email, telefono:tel, nacimiento:nac, password:pass })
    });
    const d = await res.json();
    if (!res.ok) return alert(d.error);
    registroData = { nombre, apellido, email, telefono:tel, nacimiento:nac, password:pass };
    togglePasos(2);
    iniciarCooldown();
    alert("Revisa tu correo e ingresa el código.");
  } catch {
    alert("Error de conexión.");
  }
}

function iniciarCooldown() {
  resendCooldown = 30;
  updateResendButton();
  clearInterval(resendTimer);
  resendTimer = setInterval(()=>{
    resendCooldown--;
    updateResendButton();
    if(resendCooldown<=0) clearInterval(resendTimer);
  },1000);
}

function updateResendButton() {
  const btn = document.getElementById("btn-reenviar-codigo");
  btn.disabled = resendCooldown>0;
  btn.textContent = resendCooldown>0
    ? `Reenviar (${resendCooldown}s)`
    : "Reenviar código";
}

async function reenviarCodigo() {
  if(resendCooldown>0) return;
  iniciarCooldown();
  await fetch(`${API_BASE}/api/registro`, {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify(registroData)
  });
  alert("Código reenviado.");
}

async function verificarCodigo() {
  const code = Array.from(document.querySelectorAll(".codigo-input"))
    .map(i=>i.value.trim()).join('');
  if(code.length!==6) return alert("Completa el código.");
  try {
    const res = await fetch(`${API_BASE}/api/verificar-codigo`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ email: registroData.email, codigo: code })
    });
    const d = await res.json();
    if(!res.ok) return alert(d.error);
    togglePasos(3);
  } catch {
    alert("Error de conexión.");
  }
}

async function finalizarRegistro() {
  const sel = document.querySelector('input[name="plan"]:checked');
  if(!sel) return alert("Selecciona plan.");
  const plan = sel.value;
  if(plan==="basico") {
    registroData.plan = "basico";
    registroData.pago_confirmado = 0;
    registroData.verificado = true;
    localStorage.setItem("usuario", JSON.stringify(registroData));
    togglePasos(1);
    closeModal("modal-register");
    restoreSession(registroData);
  } else {
    try {
      const res = await fetch(`${API_BASE}/api/registro-plan`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ ...registroData, plan })
      });
      const d = await res.json();
      if(d.init_point) window.location.href = d.init_point;
      else alert(d.error);
    } catch {
      alert("Error de conexión.");
    }
  }
}

// ————————————— EVENTOS Y LÓGICA PRINCIPAL —————————————
window.addEventListener("DOMContentLoaded", async () => {
  // 1) Sesión automática
  const raw = localStorage.getItem("usuario");
  if (raw) {
    const u = JSON.parse(raw);
    restoreSession(u);
    await updatePlanStatus(
      document.getElementById("plan-name"),
      document.getElementById("plan-remaining"),
      document.getElementById("countdown")
    );
  }

  const email = getUserEmail();
  if (!email) {
    showModal("modal-login");
    return;
  }

  // 2) Bind auth & modales
  document.getElementById("btn-login")?.addEventListener("click", e => { 
    e.preventDefault(); 
    showModal("modal-login"); 
  });
  document.getElementById("btn-register")?.addEventListener("click", e => { 
    e.preventDefault(); 
    showModal("modal-register"); 
    togglePasos(1); 
  });
  document.getElementById("btn-iniciar-sesion")?.addEventListener("click", e => { 
    e.preventDefault(); 
    iniciarSesion(); 
  });
  document.getElementById("btn-verificar")?.addEventListener("click", e => { 
    e.preventDefault(); 
    verificarCodigo(); 
  });
  document.getElementById("btn-reenviar-codigo")?.addEventListener("click", e => { 
    e.preventDefault(); 
    reenviarCodigo(); 
  });
  document.getElementById("btn-usuario")?.addEventListener("click", e => { 
    e.preventDefault(); 
    document.getElementById("menu-usuario-li").classList.toggle("activo"); 
  });
  document.getElementById("btn-cerrar-sesion")?.addEventListener("click", e => { 
    e.preventDefault(); 
    cerrarSesion(); 
  });

  // 3) Cargar tablas en el select
  await loadTablas();
  const sel = document.getElementById("table-select");
  tablas.forEach(t => {
    const o = document.createElement("option");
    o.value = t.id;
    o.textContent = t.name;
    sel.appendChild(o);
  });
  const last = localStorage.getItem("ultimaTablaSeleccionada");
  if (last && tablas.some(t => t.id === last)) {
    sel.value = last;
  } else if (tablas.length === 1) {
    sel.value = tablas[0].id;
  }

  // 4) Previsualización de archivos
  const fileInput = document.getElementById("upload-file-input");
  fileInput?.addEventListener("change", () => {
    const preview = document.getElementById("previews");
    preview.innerHTML = "";
    Array.from(fileInput.files).forEach(f => {
      const d = document.createElement("div");
      d.className = "preview-item";
      d.textContent = f.name;
      preview.appendChild(d);
    });
    document.getElementById("btn-process").disabled = fileInput.files.length === 0;
  });

  // 5) Procesar recibos
  const btnProcess = document.getElementById("btn-process");
  btnProcess.addEventListener("click", async () => {
    const files = Array.from(fileInput.files);
    if (!files.length) return alert("Selecciona archivos.");

    // Feedback inmediato
    btnProcess.textContent = "Procesando...";
    btnProcess.disabled   = true;

    try {
      await loadTablas();
      const selectedId = sel.value;
      const tbl = tablas.find(t => t.id === selectedId);
      if (!tbl) throw new Error("Selecciona una tabla destino.");

      const form = new FormData();
      files.forEach(f => form.append("files", f));

      const res = await fetch(`${API_BASE}/api/receipt-parser`, {
        method: "POST",
        headers: { "x-user-email": getUserEmail() },
        body: form
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error procesando recibos");
      }
      const parsed = await res.json();

      tbl.data   = (tbl.data || []).concat(parsed);
      tbl.images = files.map(f => ({ name: f.name, url: URL.createObjectURL(f) }));

      await saveTablas(tablas);
      window.location.href = `results.html?tableId=${encodeURIComponent(selectedId)}`;
    } catch (err) {
      alert(err.message);
      console.error(err);
      btnProcess.textContent = "Procesar recibos";
      btnProcess.disabled   = false;
    }
  });
});
