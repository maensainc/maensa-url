// tables.js

const API_BASE     = "https://maensa.onrender.com";
const tableListEl  = document.getElementById('table-list');
const btnNewTable  = document.getElementById('btn-new-table');
const tableTitleEl = document.getElementById('table-title');
const btnUploadImg = document.getElementById('btn-upload-images');
const btnDelete    = document.getElementById('btn-delete-table');
const imgListEl    = document.getElementById('images-list');
const dataTableEl  = document.getElementById('data-table');
const fileInput    = document.getElementById('file-input');

const isResults = !!dataTableEl;

let tablas   = [];
let activeId = null;

// — Helpers de usuario & keys —
function getUserEmail() {
  const raw = localStorage.getItem('usuario');
  if (!raw) return null;
  try { return JSON.parse(raw).email; }
  catch { return null; }
}

function getTablesKey() {
  const email = getUserEmail();
  return email ? `misTablas_${email}` : 'misTablas_guest';
}

// — Persistencia remota con manejo de status錯误 —
async function fetchTablasRemotas() {
  try {
    const res = await fetch(`${API_BASE}/api/tablas`, {
      headers: { "x-user-email": getUserEmail() }
    });
    if (!res.ok) {
      console.error(`GET /api/tablas error: ${res.status} ${res.statusText}`);
      const raw = localStorage.getItem(getTablesKey());
      return raw ? JSON.parse(raw) : [];
    }
    const data = await res.json();
    localStorage.setItem(getTablesKey(), JSON.stringify(data));
    return data;
  } catch (err) {
    console.error('Network error fetching tablas:', err);
    const raw = localStorage.getItem(getTablesKey());
    return raw ? JSON.parse(raw) : [];
  }
}

async function syncTablasRemotas(arr) {
  // 1) Verifica aquí
  console.log('Tablas (como objeto):', arr);
  console.log('Tablas (serializado a JSON):', JSON.stringify(arr));

  try {
    const res = await fetch(`${API_BASE}/api/tablas`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": getUserEmail()
      },
      body: JSON.stringify(arr)  // <— aquí debe ir el array de objetos
    });
    if (!res.ok) {
      console.error(`PUT /api/tablas error: ${res.status} ${res.statusText}`);
    }
  } catch (err) {
    console.warn('Error de red sincronizando tablas:', err);
  }
}


// — Persistencia local + remota —
async function loadTablas() {
  tablas = await fetchTablasRemotas();
}

function saveTablas(arr) {
  localStorage.setItem(getTablesKey(), JSON.stringify(arr));
  syncTablasRemotas(arr);
}

// — Render de la barra lateral —
function renderSidebar() {
  tableListEl.innerHTML = '';
  tablas.forEach(tab => {
    const li = document.createElement('li');
    li.textContent = tab.name;
    li.dataset.id  = tab.id;
    if (tab.id === activeId) li.classList.add('active');
    li.addEventListener('click', () => selectTable(tab.id));
    tableListEl.appendChild(li);
  });
}

// — Seleccionar tabla activa y actualizar URL —
function selectTable(id) {
  activeId = id;
  renderSidebar();
  if (isResults) renderDataTable(tablas.find(t => t.id === activeId)?.data);
  else           renderActiveTable();
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
  if (!tab || !confirm(`Eliminar tabla "${tab.name}"?`)) return;
  tablas = tablas.filter(t => t.id !== activeId);
  saveTablas(tablas);
  activeId = tablas[0]?.id || null;
  renderSidebar();
  isResults
    ? renderDataTable(tablas.find(t => t.id === activeId)?.data)
    : renderActiveTable();
}

// — Render en tables.html: miniaturas —
function renderActiveTable() {
  const tab = tablas.find(t => t.id === activeId);
  if (!tab) {
    tableTitleEl.textContent = '—';
    btnUploadImg.disabled    = true;
    btnDelete.disabled       = true;
    imgListEl.innerHTML      = '';
    return;
  }
  tableTitleEl.textContent = tab.name;
  btnUploadImg.disabled    = false;
  btnDelete.disabled       = false;
  imgListEl.innerHTML      = '';
  tab.images.forEach(src => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = tab.name;
    imgListEl.appendChild(img);
  });
}

// — Manejo de selección de archivos para preview —
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
  fileInput.value = '';
}

// — Render en results.html: tabla de datos —
function renderDataTable(data) {
  dataTableEl.innerHTML = '';
  if (!data?.length) {
    dataTableEl.textContent = 'No hay datos para mostrar.';
    return;
  }
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  Object.keys(data[0]).forEach(key => {
    const th = document.createElement('th');
    th.textContent = key;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
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
  dataTableEl.appendChild(table);
}

// — Inicialización —
window.addEventListener('DOMContentLoaded', async () => {
  await loadTablas();
  const params = new URLSearchParams(window.location.search);
  const key    = isResults ? 'tableId' : 'id';
  activeId     = params.get(key) || tablas[0]?.id || null;
  renderSidebar();
  if (isResults) renderDataTable(tablas.find(t => t.id === activeId)?.data);
  else           renderActiveTable();

  btnNewTable.addEventListener('click', createNewTable);
  btnDelete   .addEventListener('click', deleteActiveTable);

  if (!isResults) {
    btnUploadImg.addEventListener('click', () => fileInput.click());
    fileInput   .addEventListener('change', handleFilesSelected);
  }
});
