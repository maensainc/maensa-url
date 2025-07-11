// tables.js

const API_BASE = "https://maensa.onrender.com";

// — Helpers de usuario & claves —

// Obtiene el email del usuario logueado desde localStorage
function getUserEmail() {
  const raw = localStorage.getItem('usuario');
  if (!raw) return null;
  try { return JSON.parse(raw).email; }
  catch { return null; }
}

// Construye la clave de LocalStorage para este usuario
function getTablesKey() {
  const email = getUserEmail();
  return email
    ? `misTablas_${email}`
    : 'misTablas_guest';
}

// — Persistencia remota —

// Intenta recuperar las tablas del servidor; si falla, cae en LocalStorage
async function fetchTablasRemotas() {
  try {
    const res = await fetch(`${API_BASE}/api/tablas`, {
      headers: { "x-user-email": getUserEmail() }
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const tablas = await res.json();
    // Sincroniza LocalStorage con este resultado
    localStorage.setItem(getTablesKey(), JSON.stringify(tablas));
    return tablas;
  } catch (err) {
    console.warn("No se pudo cargar tablas remotas:", err);
    const raw = localStorage.getItem(getTablesKey());
    return raw ? JSON.parse(raw) : [];
  }
}

// Envía el array completo de tablas al servidor
async function syncTablasRemotas(tablas) {
  try {
    await fetch(`${API_BASE}/api/tablas`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": getUserEmail()
      },
      body: JSON.stringify(tablas)
    });
  } catch (err) {
    console.warn("No se pudo sincronizar tablas remotas:", err);
  }
}

// — Persistencia local + remota —

// Carga tablas (primero remotas, luego LocalStorage si falla)
async function loadTablas() {
  return await fetchTablasRemotas();
}

// Guarda tablas en LocalStorage y en servidor
function saveTablas(tablas) {
  localStorage.setItem(getTablesKey(), JSON.stringify(tablas));
  syncTablasRemotas(tablas);
}

// — Renderizado de resultados —

// Renderiza un array de objetos como tabla HTML en results.html
function renderDataTable(data) {
  const container = document.getElementById('data-table');
  if (!container) return;
  if (!data || !data.length) {
    container.textContent = 'No hay datos para mostrar.';
    return;
  }
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  Object.keys(data[0]).forEach(key => {
    const th = document.createElement('th');
    th.textContent = key;
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.forEach(row => {
    const tr = document.createElement('tr');
    Object.values(row).forEach(val => {
      const td = document.createElement('td');
      td.textContent = Array.isArray(val) ? val.join(', ') : val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  container.innerHTML = '';
  container.appendChild(table);
}

// — Selectores & estado global —

const SIDEBAR_LIST   = document.getElementById('table-list');
const BTN_NEW        = document.getElementById('btn-new-table');
const TABLE_TITLE    = document.getElementById('table-title');
const BTN_UPLOAD     = document.getElementById('btn-upload-images');
const BTN_DELETE     = document.getElementById('btn-delete-table');
const IMG_LIST       = document.getElementById('images-list');
const FILE_INPUT     = document.getElementById('file-input');
const DATA_TABLE_EL  = document.getElementById('data-table');

const isResults = !!DATA_TABLE_EL;  // true en results.html

let tablas   = [];
let activeId = null;

// — Renderizado de la sidebar —

function renderSidebar() {
  SIDEBAR_LIST.innerHTML = '';
  tablas.forEach(tab => {
    const li = document.createElement('li');
    li.textContent = tab.name;
    li.dataset.id  = tab.id;
    li.classList.toggle('active', tab.id === activeId);
    li.addEventListener('click', () => selectTable(tab.id));
    SIDEBAR_LIST.appendChild(li);
  });
}

// — Mostrar miniaturas en tables.html —

function renderActiveTable() {
  const tab = tablas.find(t => t.id === activeId);
  if (!tab) {
    TABLE_TITLE.textContent = '—';
    BTN_UPLOAD.disabled = true;
    BTN_DELETE.disabled = true;
    IMG_LIST.innerHTML = '';
    return;
  }
  TABLE_TITLE.textContent = tab.name;
  BTN_UPLOAD.disabled = false;
  BTN_DELETE.disabled = false;

  IMG_LIST.innerHTML = '';
  tab.images.forEach((src, i) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = `${tab.name} img #${i+1}`;
    IMG_LIST.appendChild(img);
  });
}

// — Cambio de tabla activa —

function selectTable(id) {
  activeId = id;
  renderSidebar();

  if (isResults) {
    const tab = tablas.find(t => t.id === activeId);
    renderDataTable(tab?.data);
  } else {
    renderActiveTable();
  }

  const param = isResults ? 'tableId' : 'id';
  window.history.replaceState(null, '', `?${param}=${encodeURIComponent(activeId)}`);
}

// — Crear y eliminar tablas —

function createNewTable() {
  const name = prompt('Nombre de la nueva tabla:');
  if (!name) return;
  const id = Date.now().toString();
  tablas.push({ id, name, images: [], data: [] });
  saveTablas(tablas);
  selectTable(id);
}

function deleteActiveTable() {
  if (!activeId) return;
  const tab = tablas.find(t => t.id === activeId);
  if (!confirm(`¿Eliminar la tabla "${tab.name}" y todas sus imágenes?`)) return;
  tablas = tablas.filter(t => t.id !== activeId);
  saveTablas(tablas);
  activeId = tablas[0]?.id || null;
  renderSidebar();
  if (isResults) {
    renderDataTable(tablas.find(t => t.id === activeId)?.data);
  } else {
    renderActiveTable();
  }
}

// — Subir imágenes en tables.html —

function handleFilesSelected(e) {
  const files = Array.from(e.target.files);
  const tab = tablas.find(t => t.id === activeId);
  if (!tab) return;
  files.forEach(f => {
    const url = URL.createObjectURL(f);
    tab.images.push(url);
  });
  saveTablas(tablas);
  renderActiveTable();
  FILE_INPUT.value = '';
}

// — Inicialización —

window.addEventListener('DOMContentLoaded', async () => {
  // 1) Carga inicial (remota ↔ local)
  tablas = await loadTablas();

  // 2) Determina activeId desde URL o el primero
  const params = new URLSearchParams(window.location.search);
  activeId = params.get(isResults ? 'tableId' : 'id') || tablas[0]?.id;

  // 3) Render
  renderSidebar();
  if (isResults) {
    IMG_LIST.style.display   = 'none';
    BTN_UPLOAD.style.display = 'none';
    BTN_DELETE.style.display = 'none';
    renderDataTable(tablas.find(t => t.id === activeId)?.data);
  } else {
    renderActiveTable();
  }

  // 4) Bind de botones
  BTN_NEW.addEventListener('click', createNewTable);
  BTN_DELETE.addEventListener('click', deleteActiveTable);

  if (!isResults) {
    BTN_UPLOAD.addEventListener('click', () => FILE_INPUT.click());
    FILE_INPUT.addEventListener('change', handleFilesSelected);
  }
});
