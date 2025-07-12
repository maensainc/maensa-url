const API_BASE = "https://maensa.onrender.com";
const tableListEl = document.getElementById('table-list');
const btnNewTable = document.getElementById('btn-new-table');
const btnEdit = document.getElementById('btn-edit-table');
const colToggles = document.getElementById('column-toggles');
const tableTitleEl = document.getElementById('table-title');
const btnUploadImg = document.getElementById('btn-upload-images');
const btnDelete = document.getElementById('btn-delete-table');
const imgListEl = document.getElementById('images-list');
const dataTableEl = document.getElementById('data-table');
const fileInput = document.getElementById('table-file-input');
const isResults = !!dataTableEl;
let tablas = [];
let activeId = null;
let editMode = false;

function getUserEmail() {
  const raw = localStorage.getItem('usuario');
  if (!raw) return null;
  try { return JSON.parse(raw).email; } catch { return null; }
}

function getTablesKey() {
  const email = getUserEmail();
  return email ? `misTablas_${email}` : 'misTablas_guest';
}

async function fetchTablasRemotas() {
  try {
    const res = await fetch(`${API_BASE}/api/tablas`, { headers: { 'x-user-email': getUserEmail() } });
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
  try {
    await fetch(`${API_BASE}/api/tablas`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-user-email': getUserEmail() },
      body: JSON.stringify(arr)
    });
  } catch {}
}

async function loadTablas() {
  tablas = await fetchTablasRemotas();
}

async function saveTablas(arr) {
  localStorage.setItem(getTablesKey(), JSON.stringify(arr));
  await syncTablasRemotas(arr);
}

function renderSidebar() {
  tableListEl.innerHTML = '';
  tablas.forEach(tab => {
    const li = document.createElement('li');
    li.textContent = tab.name;
    li.dataset.id = tab.id;
    if (tab.id === activeId) li.classList.add('active');
    li.addEventListener('click', () => selectTable(tab.id));
    tableListEl.appendChild(li);
  });
}

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

function createNewTable() {
  const name = prompt('Nombre de la nueva tabla:');
  if (!name) return;
  const id = Date.now().toString();
  tablas.push({ id, name, images: [], data: [] });
  saveTablas(tablas).then(() => selectTable(id));
}

function deleteActiveTable() {
  if (!activeId || !confirm('Eliminar tabla?')) return;
  tablas = tablas.filter(t => t.id !== activeId);
  saveTablas(tablas).then(() => {
    activeId = tablas[0]?.id || null;
    renderSidebar();
    const tab = tablas.find(t => t.id === activeId) || { name: '—', data: [] };
    tableTitleEl.textContent = tab.name;
    if (isResults) renderDataTable(tab.data);
    else renderActiveTable();
  });
}

function renderActiveTable() {
  const tab = tablas.find(t => t.id === activeId);
  if (!tab) {
    tableTitleEl.textContent = '—';
    btnUploadImg.disabled = true;
    btnDelete.disabled = true;
    imgListEl.innerHTML = '';
    return;
  }
  tableTitleEl.textContent = tab.name;
  btnUploadImg.disabled = false;
  btnDelete.disabled = false;
  imgListEl.innerHTML = '';
  tab.images.forEach(src => {
    const img = document.createElement('img');
    img.src = src;
    img.alt = tab.name;
    imgListEl.appendChild(img);
  });
}

async function handleFilesSelected(e) {
  const files = Array.from(e.target.files);
  if (!files.length || !activeId) return;
  const tab = tablas.find(t => t.id === activeId);
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  try {
    const res = await fetch(`${API_BASE}/api/receipt-parser`, { method: 'POST', headers: { 'x-user-email': getUserEmail() }, body: form });
    if (!res.ok) throw await res.json();
    const parsed = await res.json();
    tab.data = parsed;
    tab.images = files.map(f => URL.createObjectURL(f));
    await saveTablas(tablas);
    if (isResults) renderDataTable(tab.data);
    else window.location.href = `results.html?tableId=${activeId}`;
  } catch {}
}

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
    const th = document.createElement('th'); th.textContent = k; headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  data.forEach(row => {
    const tr = document.createElement('tr');
    Object.values(row).forEach(v => {
      const td = document.createElement('td'); td.textContent = Array.isArray(v) ? v.join(', ') : v; tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  dataTableEl.appendChild(table);
  initGlobalColumnReorder();
  applyColumnReorderFromSettings();
  applyPersistentHidden();
  if (editMode) addActionButtons();
}

function getSettingsKey(tableId) { return `maensa_table_settings_${tableId}`; }

function loadSettings(tableId) {
  const raw = localStorage.getItem(getSettingsKey(tableId));
  if (!raw) return { order: null, hidden: [], deletedRows: [] };
  try { return JSON.parse(raw); } catch { return { order: null, hidden: [], deletedRows: [] }; }
}

function saveSettings(tableId, settings) {
  localStorage.setItem(getSettingsKey(tableId), JSON.stringify(settings));
}

let dragSrcIndex = null;

function onHeaderDragStart(e) {
  dragSrcIndex = [...e.target.parentNode.children].indexOf(e.target);
  e.dataTransfer.effectAllowed = 'move';
}

function onHeaderDrop(e) {
  e.preventDefault();
  const targetTh = e.target.closest('th');
  if (!targetTh) return;
  const ths = [...targetTh.parentNode.children];
  const dropIndex = ths.indexOf(targetTh);
  if (dragSrcIndex === null || dropIndex === dragSrcIndex) return;
  const table = dataTableEl.querySelector('table');
  table.querySelectorAll('tr').forEach(tr => {
    const cells = tr.children;
    tr.insertBefore(cells[dragSrcIndex], cells[dropIndex]);
  });
  const settings = loadSettings(activeId);
  settings.order = Array.from(dataTableEl.querySelectorAll('thead th')).map(th => th.textContent);
  saveSettings(activeId, settings);
  dragSrcIndex = null;
}

function initGlobalColumnReorder() {
  const thead = dataTableEl.querySelector('thead'); if (!thead) return;
  thead.querySelectorAll('th').forEach(th => {
    th.draggable = true;
    th.removeEventListener('dragstart', onHeaderDragStart);
    th.removeEventListener('drop', onHeaderDrop);
    th.removeEventListener('dragover', e => e.preventDefault());
    th.addEventListener('dragstart', onHeaderDragStart);
    th.addEventListener('dragover', e => e.preventDefault());
    th.addEventListener('drop', onHeaderDrop);
  });
}

function applyColumnReorderFromSettings() {
  const settings = loadSettings(activeId);
  if (!settings.order) return;
  const table = dataTableEl.querySelector('table');
  let currentOrder = Array.from(dataTableEl.querySelectorAll('thead th')).map(th => th.textContent);
  settings.order.forEach((colName, targetIndex) => {
    const srcIndex = currentOrder.indexOf(colName);
    if (srcIndex === -1 || srcIndex === targetIndex) return;
    table.querySelectorAll('tr').forEach(tr => {
      const cells = tr.children;
      tr.insertBefore(cells[srcIndex], cells[targetIndex]);
    });
    currentOrder.splice(targetIndex, 0, currentOrder.splice(srcIndex, 1)[0]);
  });
}

function applyPersistentHidden() {
  const settings = loadSettings(activeId);
  settings.hidden.forEach(name => {
    const ths = Array.from(dataTableEl.querySelectorAll('thead th')); const idx = ths.findIndex(th => th.textContent === name);
    if (idx>=0) toggleColumn(idx, true);
  });
}

function toggleColumn(colIndex, hide) {
  const table = dataTableEl.querySelector('table');
  table.querySelectorAll('tr').forEach(tr => { const cell=tr.children[colIndex]; if(cell) cell.hidden=hide; });
}

function addActionButtons() {
  const table = dataTableEl.querySelector('table');
  const thead = table.querySelector('thead tr');
  if (!thead.querySelector('.th-actions')) {
    const th = document.createElement('th'); th.textContent='Acciones'; th.className='th-actions'; thead.appendChild(th);
  }
  table.querySelectorAll('tbody tr').forEach((tr,rowIdx) => {
    if (tr.querySelector('.delete-row-btn')) return;
    const td=document.createElement('td');
    const btn=document.createElement('button');
    btn.innerHTML='✖'; btn.title='Eliminar fila'; btn.className='delete-row-btn';
    btn.addEventListener('click',()=>{
      if(!confirm('¿Eliminar esta fila?'))return;
      const settings=loadSettings(activeId);
      settings.deletedRows.push(rowIdx);
      saveSettings(activeId,settings);
      tr.remove();
    });
    td.appendChild(btn);
    tr.appendChild(td);
  });
}

document.addEventListener('DOMContentLoaded',async()=>{
  await loadTablas();
  const params=new URLSearchParams(window.location.search);
  const key=isResults?'tableId':'id';
  const fromQS=params.get(key);
  const last=localStorage.getItem('ultimaTablaSeleccionada');
  activeId=fromQS||(tablas.some(t=>t.id===last)?last:null)||tablas[0]?.id||null;
  renderSidebar();
  const initial=tablas.find(t=>t.id===activeId)||{name:'—',data:[]};
  tableTitleEl.textContent=initial.name;
  if(isResults)renderDataTable(initial.data);else renderActiveTable();
  btnNewTable.addEventListener('click',createNewTable);
  btnDelete.addEventListener('click',deleteActiveTable);
  if(!isResults){btnUploadImg.addEventListener('click',()=>fileInput.click());fileInput.addEventListener('change',handleFilesSelected);}
  btnEdit.addEventListener('click',()=>{editMode=!editMode;document.body.classList.toggle('edit-mode',editMode);btnEdit.textContent=editMode?'Salir de edición':'Editar tabla';renderDataTable(tablas.find(t=>t.id===activeId)?.data||[]);if(editMode)initColumnToggles();});
});

function initColumnToggles(){
  colToggles.innerHTML='<h4>Columnas</h4>';
  const settings=loadSettings(activeId);
  const ths=dataTableEl.querySelectorAll('thead th');
  if(!settings.order){settings.order=Array.from(ths).map(th=>th.textContent);saveSettings(activeId,settings);}
  ths.forEach((th,idx)=>{
    const name=th.textContent;const id=`col-toggle-${idx}`;
    const lbl=document.createElement('label');
    lbl.innerHTML=`<input type="checkbox" id="${id}" data-col="${idx}" ${!settings.hidden.includes(name)?'checked':''}>${name}`;
    lbl.querySelector('input').addEventListener('change',e=>{
      const col=+e.target.dataset.col;const hide=!e.target.checked;toggleColumn(col,hide);
      if(hide)settings.hidden.push(name);else settings.hidden=settings.hidden.filter(k=>k!==name);
      saveSettings(activeId,settings);
    });
    colToggles.appendChild(lbl);
  });
}