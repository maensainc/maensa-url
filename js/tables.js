// tables.js

// — Helpers —
// Leer un parámetro de querystring
function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// — Selectores —
const SIDEBAR_LIST = document.getElementById('table-list');
const BTN_NEW      = document.getElementById('btn-new-table');
const TABLE_TITLE  = document.getElementById('table-title');
const BTN_UPLOAD   = document.getElementById('btn-upload-images');
const IMG_LIST     = document.getElementById('images-list');
const FILE_INPUT   = document.getElementById('file-input');

let tablas = [];   // Array de { id, name, images: [...], data: ... }
let activeId = null;

// — Utilities —
function save() {
  localStorage.setItem('misTablas', JSON.stringify(tablas));
}
function load() {
  const raw = localStorage.getItem('misTablas');
  tablas = raw ? JSON.parse(raw) : [];
}

// — Render sidebar —
function renderSidebar() {
  SIDEBAR_LIST.innerHTML = '';
  tablas.forEach(tbl => {
    const li = document.createElement('li');
    li.textContent = tbl.name;
    li.dataset.id = tbl.id;
    if (tbl.id === activeId) li.classList.add('active');
    li.addEventListener('click', () => {
      activeId = tbl.id;
      renderSidebar();
      renderMain();
    });
    SIDEBAR_LIST.appendChild(li);
  });
}

// — Render main area —
function renderMain() {
  const tbl = tablas.find(t => t.id === activeId);
  if (!tbl) {
    TABLE_TITLE.textContent = '—';
    BTN_UPLOAD.disabled     = true;
    IMG_LIST.innerHTML      = '';
    return;
  }
  // Título
  TABLE_TITLE.textContent = tbl.name;

  // Botón “Subir imágenes” → upload.html?tableId=…
  BTN_UPLOAD.disabled = false;
  BTN_UPLOAD.onclick = () => {
    window.location.href = `upload.html?tableId=${encodeURIComponent(activeId)}`;
  };

  // Mostrar miniaturas
  IMG_LIST.innerHTML = '';
  tbl.images.forEach(src => {
    const img = document.createElement('img');
    img.src = src;
    IMG_LIST.appendChild(img);
  });
}

// — Crear nueva tabla —
BTN_NEW.addEventListener('click', () => {
  const name = prompt('Nombre de la nueva tabla:');
  if (!name) return;
  const id = Date.now().toString();
  tablas.push({ id, name, images: [], data: null });
  activeId = id;
  save();
  renderSidebar();
  renderMain();
});

// — Subir imágenes directamente en este panel (solo base64 local) —
BTN_UPLOAD.addEventListener('click', () => {
  FILE_INPUT.click();
});
FILE_INPUT.addEventListener('change', async () => {
  if (!activeId) return;
  const tbl = tablas.find(t => t.id === activeId);
  const files = Array.from(FILE_INPUT.files);
  for (let f of files) {
    const dataUrl = await new Promise(r => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result);
      fr.readAsDataURL(f);
    });
    tbl.images.push(dataUrl);
  }
  FILE_INPUT.value = '';
  save();
  renderMain();
});

// — Inicialización —
document.addEventListener('DOMContentLoaded', () => {
  // 1) Cargo tablas guardadas
  load();

  // 2) Si viene de upload.html?tableId=XXX, uso ese ID
  const param = getQueryParam('tableId');
  if (param && tablas.some(t => t.id === param)) {
    activeId = param;
  } else {
    // Si no, tomo la primera tabla (si existe)
    activeId = tablas.length ? tablas[0].id : null;
  }

  // 3) Pinto todo
  renderSidebar();
  renderMain();
});
