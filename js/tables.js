// tables.js

// — Helpers —
// Leer un parámetro de querystring (soporta `?id=` y `?tableId=`)
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// Renderiza un array de objetos como tabla HTML (para results.html)
function renderDataTable(data) {
  const container = document.getElementById('data-table');
  if (!container) return;
  if (!data || !data.length) {
    container.textContent = 'No hay datos para mostrar.';
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  Object.keys(data[0]).forEach(key => {
    const th = document.createElement('th');
    th.textContent = key;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  data.forEach(item => {
    const tr = document.createElement('tr');
    Object.values(item).forEach(val => {
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

// — Selectores & estado —
const SIDEBAR_LIST    = document.getElementById('table-list');
const BTN_NEW         = document.getElementById('btn-new-table');
const TABLE_TITLE     = document.getElementById('table-title');
const BTN_UPLOAD      = document.getElementById('btn-upload-images');
const BTN_DELETE      = document.getElementById('btn-delete-table');
const IMG_LIST        = document.getElementById('images-list');
const FILE_INPUT      = document.getElementById('file-input');

let tablas   = [];   // Array de { id, name, images: [...], data: [...] }
let activeId = null; // id de la tabla seleccionada

function getUserEmail() {
  const raw = localStorage.getItem('usuario');
  if (!raw) return null;
  try { return JSON.parse(raw).email; }
  catch { return null; }
}

// Devuelve la clave donde guardamos las tablas de ESTE usuario
function getTablesKey() {
  const email = getUserEmail();
  return email
    ? `misTablas_${email}`
    : 'misTablas_guest';
}


function load() {
  const raw = localStorage.getItem(getTablesKey());
  tablas = raw ? JSON.parse(raw) : [];
}

// — Guarda las tablas de ESTE usuario —
function save() {
  localStorage.setItem(getTablesKey(), JSON.stringify(tablas));
}

// — Renderizado de la sidebar —
function renderSidebar() {
  SIDEBAR_LIST.innerHTML = '';
  tablas.forEach(tab => {
    const li = document.createElement('li');
    li.textContent = tab.name;
    li.dataset.id = tab.id;
    li.classList.toggle('active', tab.id === activeId);
    li.addEventListener('click', () => selectTable(tab.id));
    SIDEBAR_LIST.appendChild(li);
  });
}

// — Mostrar la tabla activa en el main (miniaturas) —
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
  tab.images.forEach((src, idx) => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = `${tab.name} img #${idx+1}`;
    IMG_LIST.appendChild(img);
  });
}

// — Seleccionar una tabla por id —
function selectTable(id) {
  activeId = id;
  renderSidebar();
  renderActiveTable();
  window.history.replaceState(null, '', `?id=${id}`);
}

// — Crear nueva tabla —
function createNewTable() {
  const name = prompt('Nombre de la nueva tabla:');
  if (!name) return;
  const id = Date.now().toString();
  tablas.push({ id, name, images: [], data: [] });
  save();
  selectTable(id);
}

// — Subir imágenes (file input) —
function handleFilesSelected(event) {
  const files = Array.from(event.target.files);
  const tab = tablas.find(t => t.id === activeId);
  if (!tab) return;

  files.forEach(file => {
    const url = URL.createObjectURL(file);
    tab.images.push(url);
  });

  save();
  renderActiveTable();
  FILE_INPUT.value = '';
}

// — Eliminar tabla activa —
function deleteActiveTable() {
  if (!activeId) return;
  const tab = tablas.find(t => t.id === activeId);
  if (!confirm(`¿Eliminar la tabla "${tab.name}" y todas sus imágenes?`)) return;
  tablas = tablas.filter(t => t.id !== activeId);
  activeId = null;
  save();
  renderSidebar();
  renderActiveTable();
}

// — Inicialización al cargar la página —
window.addEventListener('DOMContentLoaded', () => {
  load();
  renderSidebar();

  // Determinar activeId de query params (?id= en tables.html, ?tableId= en results.html)
  const paramId = getQueryParam('id') || getQueryParam('tableId');
  if (paramId && tablas.some(t => t.id === paramId)) {
    activeId = paramId;
  } else if (tablas.length) {
    activeId = tablas[0].id;
  }

  renderSidebar();
  renderActiveTable();

  const isResults = !!document.getElementById('data-table');

  // Siempre bind para nueva tabla
  BTN_NEW.addEventListener('click', createNewTable);
  // Eliminar tabla en ambas vistas
  BTN_DELETE.addEventListener('click', deleteActiveTable);

  if (isResults) {
    // En results.html: ocultar miniaturas, y redirigir subir imágenes
    IMG_LIST.style.display = 'none';
    BTN_UPLOAD.textContent = 'Subir imágenes';
    BTN_UPLOAD.onclick = () => {
      window.location.href = `upload.html?tableId=${encodeURIComponent(activeId)}`;
    };
    // Finalmente renderizar tabla de datos parseados
    const tabla = tablas.find(t => t.id === activeId);
    renderDataTable(tabla && tabla.data);
  } else {
    // En la vista normal: abrir file picker
    BTN_UPLOAD.addEventListener('click', () => FILE_INPUT.click());
    FILE_INPUT.addEventListener('change', handleFilesSelected);
  }
});
