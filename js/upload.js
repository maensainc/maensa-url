// upload.js

const API_BASE        = "https://maensa.onrender.com";

// ————— Elementos del DOM —————
const modalLogin        = document.getElementById("modal-login");
const modalRegister     = document.getElementById("modal-register");
const paso1El           = document.getElementById("registro-paso-1");
const paso2El           = document.getElementById("registro-paso-2");
const paso3El           = document.getElementById("registro-paso-3");
const puntos            = [
  document.getElementById("punto-1"),
  document.getElementById("punto-2"),
  document.getElementById("punto-3"),
];
const planNameEl        = document.getElementById("plan-name");
const planRemainingEl   = document.getElementById("plan-remaining");
const countdownEl       = document.getElementById("countdown");
const menuLi            = document.getElementById("menu-usuario-li");

let countdownTimer;
let registroData = {};
let resendCooldown = 0, resendTimer;


function getUserEmail() {
  const raw = localStorage.getItem('usuario');
  if (!raw) return null;
  try { return JSON.parse(raw).email; }
  catch { return null; }
}

function getTablesKey() {
  const email = getUserEmail();
  return email
    ? `misTablas_${email}`
    : 'misTablas_guest';
}
// ————— Helpers de tiempo —————
function formatTime(sec) {
  const h = Math.floor(sec/3600).toString().padStart(2,'0');
  const m = Math.floor((sec%3600)/60).toString().padStart(2,'0');
  const s = (sec%60).toString().padStart(2,'0');
  return `${h}:${m}:${s}`;
}
function secondsToMidnight() {
  const now = new Date();
  const mdn = new Date(now);
  mdn.setDate(mdn.getDate()+1);
  mdn.setHours(0,0,0,0);
  return Math.floor((mdn - now)/1000);
}
function startCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  function tick() {
    countdownEl.textContent = formatTime(secondsToMidnight());
  }
  tick();
  countdownTimer = setInterval(tick, 1000);
}

function getTablesKey() {
  const email = getUserEmail();
  return email
    ? `misTablas_${email}`
    : 'misTablas_guest';
}

function loadTablas() {
  return JSON.parse(localStorage.getItem(getTablesKey()) || '[]');
}

function saveTablas(tablas) {
  localStorage.setItem(getTablesKey(), JSON.stringify(tablas));
}


function populateTableSelect() {
  const sel = document.getElementById("table-select");
  sel.innerHTML = "";
  window.tablas.forEach(t => {
    const o = document.createElement("option");
    o.value       = t.id;
    o.textContent = t.name;
    sel.appendChild(o);
  });
  // auto-selección de la primera opción si no hay valor
  if (!sel.value && sel.options.length) {
    sel.value = sel.options[0].value;
  }
}
function getTablaActiva() {
  return window.tablas.find(t => t.id === document.getElementById("table-select").value);
}




function getRemainingByPlan(plan) {
  switch (plan) {
    case 'gratis':     return 20;
    case 'basico':     return 20;
    case 'intermedio': return 50;
    case 'pro':        return 100;
    case 'ilimitado':  return '∞';
    default:           return '—';
  }
}

function ensureRemainingUploads() {
  const raw = localStorage.getItem('usuario');
  if (!raw) return;
  const user = JSON.parse(raw);
  if (user.remainingUploads == null) {
    user.remainingUploads = getRemainingByPlan(user.plan) === '∞'
      ? Infinity
      : getRemainingByPlan(user.plan);
    localStorage.setItem('usuario', JSON.stringify(user));
  }
}

// ————— Estado de Plan —————
async function updatePlanStatus() {
  // Obtengo el usuario del localStorage
  const raw = localStorage.getItem('usuario');
  if (!raw) return;
  const { email, plan: storedPlan } = JSON.parse(raw);

  // Reseteo indicadores en la interfaz
  planNameEl.textContent      = '—';
  planRemainingEl.textContent = '—';
  countdownEl.textContent     = '--:--:--';
  document.querySelector('.dropzone').classList.remove('disabled');
  document.getElementById('btn-process').disabled = false;

  try {
    // Llamo al endpoint con la cabecera x-user-email
    const res = await fetch(`${API_BASE}/api/plan-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': email
      }
    });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'plan-status failed');

    // Muestro el nombre del plan
    planNameEl.textContent = d.plan;

    // Calculo fotos restantes
    if (d.remaining < 0) {
      planRemainingEl.textContent = '∞';
    } else if (d.remaining === 0) {
      planRemainingEl.textContent = 'Te quedaste sin fotos hoy';
      document.querySelector('.dropzone').classList.add('disabled');
      document.getElementById('btn-process').disabled = true;
    } else {
      planRemainingEl.textContent = d.remaining;
    }

    // Arranco el countdown hasta la medianoche
    startCountdown();

  } catch (err) {
    console.warn('Error en plan-status:', err);
    // Fallback: si algo falla, muestro el plan que tengo guardado
    planNameEl.textContent      = storedPlan || '—';
    planRemainingEl.textContent = '—';
    countdownEl.textContent     = '--:--:--';
  }
}


// ————————— Sesión —————————
// Solo oculta botones y muestra nombre; NO abre menú
function restoreSession(u) {
  document.getElementById('btn-login').style.display    = 'none';
  document.getElementById('btn-register').style.display = 'none';
  document.querySelector('.nombre-usuario').textContent = `${u.nombre} ${u.apellido}`;
  menuLi.classList.remove('activo'); // asegurar menú cerrado
}
// Login manual: restaura + abre menú + actualiza plan
function loginExitoso(u) {
  // Oculta los botones de login/registro
  document.getElementById('btn-login').style.display    = 'none';
  document.getElementById('btn-register').style.display = 'none';

  // Muestra el nombre de usuario junto al ícono
  document.querySelector('.nombre-usuario').textContent = `${u.nombre} ${u.apellido}`;

  // Muestra el <li> de usuario (quitamos la clase hidden),
  // pero aseguramos que el menú no esté abierto por defecto
  menuLi.classList.remove('hidden');
  menuLi.classList.remove('activo');

  // Actualiza plan y contador de subidas
  updatePlanStatus();
}
function cerrarSesion() {
  localStorage.removeItem('usuario');
  window.location.href = 'Maensa.html';
}
function toggleMenuUsuario() {
  menuLi.classList.toggle('activo');
}

// ————————— Modales Login/Registro —————————
function mostrarLogin()        { modalRegister.classList.add('hidden'); modalLogin.classList.remove('hidden'); }
function cerrarModal()         { modalLogin.classList.add('hidden'); }
function mostrarRegistro()     { modalLogin.classList.add('hidden'); modalRegister.classList.remove('hidden'); paso1(); }
function cerrarModalRegistro() { modalRegister.classList.add('hidden'); }

// — Pasos Registro —————
function actualizarIndicador(p) {
  puntos.forEach((el,i)=> el.classList.toggle('activo', i===p-1));
}
function paso1() { paso1El.classList.remove('hidden'); paso2El.classList.add('hidden'); paso3El.classList.add('hidden'); actualizarIndicador(1); }
function paso2() { paso1El.classList.add('hidden'); paso2El.classList.remove('hidden'); paso3El.classList.add('hidden'); actualizarIndicador(2); }
function paso3() { paso1El.classList.add('hidden'); paso2El.classList.add('hidden'); paso3El.classList.remove('hidden'); actualizarIndicador(3); }

// — Registro paso 1 → 2 —
async function irAPaso2() {
  const nombre     = document.getElementById('nombre').value.trim();
  const apellido   = document.getElementById('apellido').value.trim();
  const email      = document.getElementById('email').value.trim();
  const telefono   = document.getElementById('telefono').value.trim();
  const nacimiento = document.getElementById('fecha_nacimiento').value;
  const password   = document.getElementById('password').value;
  if (!/(?=.*[A-Z])(?=.*\d).{8,}/.test(password))
    return alert('La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.');
  if (!nombre||!apellido||!email)
    return alert('Completa nombre, apellido y email.');

  try {
    const res = await fetch(`${API_BASE}/api/registro`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({nombre,apellido,email,telefono,nacimiento,password})
    });
    const d = await res.json();
    if (!res.ok||d.error) return alert(d.error||'Error al registrar usuario.');
    registroData = { nombre,apellido,email,telefono,nacimiento,password };
    paso2();
    iniciarCooldown();
    alert('Mirá tu correo y escribí el código de verificación.');
  } catch {
    alert('Error de conexión al registrar usuario.');
  }
}

// — Reenvío código —————
function iniciarCooldown() {
  resendCooldown = 30; updateResendButton();
  resendTimer = setInterval(()=>{
    resendCooldown--;
    updateResendButton();
    if (resendCooldown<=0) clearInterval(resendTimer);
  },1000);
}
function updateResendButton() {
  const btn = document.getElementById('btn-reenviar-codigo');
  if (!btn) return;
  if (resendCooldown>0) {
    btn.disabled    = true;
    btn.textContent = `Reenviar código (${resendCooldown}s)`;
  } else {
    btn.disabled    = false;
    btn.textContent = 'Reenviar código';
  }
}
function reenviarCodigo() {
  if (resendCooldown>0) return;
  iniciarCooldown();
  fetch(`${API_BASE}/api/registro`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify(registroData)
  })
    .then(r=>r.json())
    .then(d=>alert(d.error||'Te enviamos un nuevo código.'))
    .catch(()=>alert('Error al reenviar código.'));
}

// — Verificar código —————
async function verificarCodigo() {
  const codigo = Array.from({length:6},(_,i)=>
    document.getElementById(`c-${i+1}`).value.trim()
  ).join('');
  if (!codigo) return alert('Ingresá el código.');

  try {
    const res = await fetch(`${API_BASE}/api/verificar-codigo`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email:registroData.email, codigo })
    });
    const d = await res.json();
    if (!res.ok||d.error) return alert(d.error||'Código incorrecto.');
    cerrarModalRegistro();
    registroData.plan = 'basico';
    registroData.pago_confirmado = 0;
    registroData.verificado = true;
    localStorage.setItem('usuario', JSON.stringify(registroData));
    window.location.href = 'planel.html';
  } catch {
    alert('Error de conexión al verificar código.');
  }
}

// — Finalizar registro —————
async function finalizarRegistro() {
  const pi = document.querySelector('input[name="plan"]:checked');
  if (!pi) return alert('Seleccioná un plan.');
  const plan = pi.value;
  if (plan==='basico') {
    registroData.plan = 'basico';
    registroData.pago_confirmado = 0;
    registroData.verificado = true;
    localStorage.setItem('usuario', JSON.stringify(registroData));
    alert('Cuenta básica creada.');
    cerrarModalRegistro();
    loginExitoso(registroData);
  } else {
    try {
      const res = await fetch(`${API_BASE}/api/registro-plan`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...registroData, plan })
      });
      const d = await res.json();
      if (d.init_point) window.location.href = d.init_point;
      else alert(d.error||'Error al iniciar pago.');
    } catch {
      alert('Error de conexión al iniciar pago.');
    }
  }
}

// ————————— Login —————————
async function iniciarSesion() {
  const email    = document.getElementById('email-login').value.trim();
  const password = document.getElementById('password-login').value.trim();
  if (!email||!password) return alert('Email y contraseña obligatorios.');

  try {
    const res = await fetch(`${API_BASE}/api/login`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
    const d = await res.json();
    if (!res.ok||d.error) return alert(d.error||'Error al iniciar sesión.');
    localStorage.setItem('usuario', JSON.stringify(d.usuario));
    alert(`¡Bienvenido/a ${d.usuario.nombre}!`);
    cerrarModal();
    loginExitoso(d.usuario);
  } catch {
    alert('Error de conexión al iniciar sesión.');
  }
}

// ————————— Binders & Upload Logic —————————
function bindAuthButtons() {
  document.getElementById('btn-login').onclick           = e=>{e.preventDefault(); mostrarLogin()};
  document.getElementById('btn-register').onclick        = e=>{e.preventDefault(); mostrarRegistro()};
  document.getElementById('btn-iniciar-sesion').onclick  = e=>{e.preventDefault(); iniciarSesion()};
  document.getElementById('btn-verificar').onclick       = e=>{e.preventDefault(); verificarCodigo()};
  document.getElementById('btn-reenviar-codigo').onclick = e=>{e.preventDefault(); reenviarCodigo()};
  document.getElementById('btn-usuario').onclick         = e=>{e.preventDefault(); toggleMenuUsuario()};
  document.getElementById('cerrar-sesion').onclick       = e=>{e.preventDefault(); cerrarSesion()};
}

function renderPreviews() {
  const PREVIEWS = document.getElementById("previews");
  PREVIEWS.innerHTML = "";
  const tbl = getTablaActiva();
  if (!tbl) return;
  tbl.images.forEach(src => {
    const img = document.createElement("img");
    img.src       = src;
    img.className = "preview-item";
    PREVIEWS.appendChild(img);
  });
}

// — Select de tabla cambia —
document.getElementById("table-select").addEventListener("change", renderPreviews);


// — Procesar recibos: sube al backend y además guarda en la tabla local —
// Procesar recibos: listener completo y modificado
document.getElementById("btn-process").addEventListener("click", async () => {
  // 1. Obtener archivos seleccionados
  const files = Array.from(document.getElementById("file-input").files);
  if (!files.length) {
    return alert("Selecciona archivos primero.");
  }

  // 2. Recargar todas las tablas y buscar la tabla activa
  const tablas = loadTablas();
  const activeId = document.getElementById("table-select").value;
  const tbl = tablas.find(t => t.id === activeId);
  if (!tbl) {
    return alert("Selecciona una tabla de destino.");
  }

  // 3. Desactivar botón y mostrar estado
  const btn = document.getElementById("btn-process");
  btn.textContent = "Procesando…";
  btn.disabled    = true;

  // 4. Subir archivos al backend y parsear la respuesta
  const form = new FormData();
  files.forEach(f => form.append("files", f));
  const user = JSON.parse(localStorage.getItem("usuario") || "{}");
  const res  = await fetch(`${API_BASE}/api/receipt-parser`, {
    method:  "POST",
    headers: { "x-user-email": user.email },
    body:    form
  });
  if (!res.ok) {
    const err = await res.json();
    alert(err.error || "Error procesando recibos");
    btn.textContent = "Procesar recibos";
    btn.disabled    = false;
    return;
  }
  const parsedData = await res.json();
  await updatePlanStatus();

  // 5. Generar miniaturas en base64 (más estables que createObjectURL)
  tbl.images = files.map(f => f.name);

  // 6. Concatenar datos parseados solo en la tabla activa
  tbl.data = (tbl.data || []).concat(parsedData);

  // 7. Guardar todas las tablas actualizadas de vuelta en localStorage
  saveTablas(tablas);

  // 8. Redirigir a la página de resultados de la tabla activa
  const tableId = encodeURIComponent(tbl.id);
  window.location.href = `results.html?tableId=${tableId}`;
});


// upload.js

// Elementos DOM
const fileInput      = document.getElementById("file-input");
const previewContainer = document.getElementById("previews");
const btnProcess     = document.getElementById("btn-process");

// Al cambiar la selección de archivos:
// Al cambiar la selección de archivos:
fileInput.addEventListener("change", e => {
  const files = Array.from(e.target.files);

  // 1) Vaciar previews anteriores
  previewContainer.innerHTML = "";

  // 2) Por cada archivo, crear un preview-item SOLO con el nombre
  files.forEach(file => {
    const div = document.createElement("div");
    div.className = "preview-item";
    div.textContent = file.name;      // <- aquí ya NO se crea <img>
    previewContainer.appendChild(div);
  });

  // 3) Habilitar o deshabilitar el botón Procesar
  btnProcess.disabled = files.length === 0;
});



// ————————— Inicialización —————————
// ————————— Inicialización —————————
document.addEventListener('DOMContentLoaded', () => {
  // 1) Sesión / plan
  const raw = localStorage.getItem('usuario');
  if (raw) loginExitoso(JSON.parse(raw));
  else updatePlanStatus();

  window.tablas = loadTablas();
  populateTableSelect(); 
  const sel   = document.getElementById('table-select');
  const urlId = new URLSearchParams(window.location.search).get('tableId');

  if (urlId) {
    const options = Array.from(sel.options);
    if (options.find(o => o.value === urlId)) {
      sel.value = urlId;
    }
  }

  renderPreviews();

  // 3) Botones de auth (login / registro)
  bindAuthButtons();

  // 4) Mostrar sólo previews de los archivos que seleccionas:
const fileInput        = document.getElementById("file-input");
const previewContainer = document.getElementById("previews");
const btnProcess       = document.getElementById("btn-process");

// Al cambiar la selección de archivos:
fileInput.addEventListener("change", e => {
  const files = Array.from(e.target.files);

  // 1) Vaciar previews anteriores
  previewContainer.innerHTML = "";

  // 2) Mostrar solo el nombre de cada archivo
  files.forEach(file => {
    const div = document.createElement("div");
    div.className = "preview-item";
    div.textContent = file.name;
    previewContainer.appendChild(div);
  });

  // 3) Habilitar o deshabilitar el botón Procesar
  btnProcess.disabled = files.length === 0;
});

});

