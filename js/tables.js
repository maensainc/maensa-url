// tables.js

const API_BASE     = "https://maensa.onrender.com";
const tableListEl  = document.getElementById('table-list');
const btnNewTable  = document.getElementById('btn-new-table');
const tableTitleEl = document.getElementById('table-title');
const btnUploadImg = document.getElementById('btn-upload-images');
const btnDelete    = document.getElementById('btn-delete-table');
const imgListEl    = document.getElementById('images-list');
const dataTableEl  = document.getElementById('data-table');
const fileInput    = document.getElementById('table-file-input');

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

// — Persistencia remota —
async function fetchTablasRemotas() {
  try {
    const res = await fetch(`${API_BASE}/api/tablas`, {
      headers: { "x-user-email": getUserEmail() }
    });
    if (!res.ok) throw new Error(`GET tablas ${res.status}`);
    const data = await res.json();
    localStorage.setItem(getTablesKey(), JSON.stringify(data));
    return data;
  } catch {
    const raw = localStorage.getItem(getTablesKey());
    return raw ? JSON.parse(raw) : [];
  }
}
async function syncTablasRemotas(arr) {
  try {
    await fetch(`${API_BASE}/api/tablas`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": getUserEmail()
      },
      body: JSON.stringify(arr)
    });
  } catch {
    console.warn('Network error PUT tablas');
  }
}

// — Persistencia local + remota —
async function loadTablas() {
  tablas = await fetchTablasRemotas();
}
async function saveTablas(arr) {
  localStorage.setItem(getTablesKey(), JSON.stringify(arr));
  await syncTablasRemotas(arr);
}

// — Render sidebar —
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

// — Seleccionar tabla activa —
function selectTable(id) {
  activeId = id;
  localStorage.setItem('ultimaTablaSeleccionada', id);
  renderSidebar();

  const tab = tablas.find(t => t.id === activeId) || { name: '—', data: [] };
  tableTitleEl.textContent = tab.name;

  if (isResults) {
    renderDataTable(tab.data);
    window.history.replaceState(null, '', `?tableId=${encodeURIComponent(activeId)}`);
  } else {
    renderActiveTable();
    window.history.replaceState(null, '', `?id=${encodeURIComponent(activeId)}`);
  }
}

// — Crear / eliminar tablas —
function createNewTable() {
  const name = prompt('Nombre de la nueva tabla:');
  if (!name) return;
  const id = Date.now().toString();
  tablas.push({ id, name, images: [], data: [] });
  saveTablas(tablas).then(() => selectTable(id));
}
function deleteActiveTable() {
  if (!activeId) return;
  if (!confirm('Eliminar tabla?')) return;
  tablas = tablas.filter(t => t.id !== activeId);
  saveTablas(tablas).then(() => {
    activeId = tablas[0]?.id || null;
    renderSidebar();
    if (isResults) {
      const tab = tablas.find(t => t.id === activeId) || { name: '—', data: [] };
      tableTitleEl.textContent = tab.name;
      renderDataTable(tab.data);
    } else {
      renderActiveTable();
    }
  });
}

// — Render tablas.html —
function renderActiveTable() {
  const tab = tablas.find(t => t.id === activeId);
  if (!tab) {
    tableTitleEl.textContent = '—';
    btnUploadImg.disabled = true;
    btnDelete.disabled    = true;
    imgListEl.innerHTML   = '';
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

// — Preview / parse archivos —
async function handleFilesSelected(e) {
  const files = Array.from(e.target.files);
  if (!files.length || !activeId) return;

  const tab = tablas.find(t => t.id === activeId);
  const form = new FormData();
  files.forEach(f => form.append('files', f));

  try {
    const res = await fetch(`${API_BASE}/api/receipt-parser`, {
      method: 'POST',
      headers: { 'x-user-email': getUserEmail() },
      body: form
    });
    if (!res.ok) throw await res.json();
    const parsed = await res.json();

    tab.data   = parsed;
    tab.images = files.map(f => URL.createObjectURL(f));
    await saveTablas(tablas);

    if (isResults) {
      renderDataTable(tab.data);
    } else {
      window.location.href = `results.html?tableId=${activeId}`;
    }
  } catch (err) {
    console.error('Error parse/subir:', err);
  }
}

// — Render results.html —
function renderDataTable(data) {
  dataTableEl.innerHTML = '';
  if (!data?.length) {
    dataTableEl.textContent = 'No hay datos para mostrar.';
    return;
  }
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  Object.keys(data[0]).forEach(k => {
    const th = document.createElement('th');
    th.textContent = k;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.forEach(row => {
    const tr = document.createElement('tr');
    Object.values(row).forEach(v => {
      const td = document.createElement('td');
      td.textContent = Array.isArray(v) ? v.join(', ') : v;
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

  // Determinar activeId
  const params = new URLSearchParams(window.location.search);
  const key    = isResults ? 'tableId' : 'id';
  const fromQS = params.get(key);
  const last   = localStorage.getItem('ultimaTablaSeleccionada');
  activeId = fromQS || (tablas.some(t => t.id === last) ? last : null) || tablas[0]?.id || null;

  renderSidebar();

  // Actualizar título y contenido inicial
  const initialTab = tablas.find(t => t.id === activeId) || { name: '—', data: [] };
  tableTitleEl.textContent = initialTab.name;
  if (isResults) {
    renderDataTable(initialTab.data);
  } else {
    renderActiveTable();
  }

  // Listeners
  btnNewTable.addEventListener('click', createNewTable);
  btnDelete  .addEventListener('click', deleteActiveTable);
  if (!isResults) {
    btnUploadImg.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFilesSelected);
  }
});
