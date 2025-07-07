const modal = document.getElementById('modal-login');
const modalRegistro = document.getElementById('modal-register');

// Abrir / cerrar modales
function abrirModal() {
  modal.classList.remove('hidden');
}

function cerrarModal() {
  modal.classList.add('hidden');
}

function abrirModalRegistro() {
  modalRegistro.classList.remove('hidden');
  document.getElementById('registro-paso-1').classList.remove('hidden');
  document.getElementById('registro-paso-2').classList.add('hidden');

  // Asegura que el modal vuelva a tamaño original al abrir
  document.getElementById('registro-container').classList.remove('expandido');
}

function cerrarModalRegistro() {
  modalRegistro.classList.add('hidden');
}

function mostrarRegistro() {
  cerrarModal();
  abrirModalRegistro();
}

function mostrarLogin() {
  cerrarModalRegistro();
  abrirModal();
}

document.getElementById('btn-login').addEventListener('click', e => {
  e.preventDefault();
  abrirModal();
});

document.getElementById('btn-register').addEventListener('click', e => {
  e.preventDefault();
  abrirModalRegistro();
});

function irAPaso2() {
  const nombre = document.getElementById('nombre').value.trim();
  const apellido = document.getElementById('apellido').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!nombre || !apellido || !email) {
    alert("Completá al menos nombre, apellido y email.");
    return;
  }

  document.getElementById('registro-paso-1').classList.add('hidden');
  document.getElementById('registro-paso-2').classList.remove('hidden');

  document.getElementById('punto-1').classList.remove('activo');
  document.getElementById('punto-2').classList.add('activo');

  document.getElementById('registro-container').classList.add('expandido');
}

function volverAPaso1() {
  document.getElementById('registro-paso-2').classList.add('hidden');
  document.getElementById('registro-paso-1').classList.remove('hidden');

  document.getElementById('punto-2').classList.remove('activo');
  document.getElementById('punto-1').classList.add('activo');

  document.getElementById('registro-container').classList.remove('expandido');
}

function finalizarRegistro() {
  const plan = document.querySelector('input[name="plan"]:checked');
  if (!plan) {
    alert("Seleccioná un plan para continuar.");
    return;
  }

  const datos = {
    nombre: document.getElementById('nombre').value,
    apellido: document.getElementById('apellido').value,
    email: document.getElementById('email').value,
    telefono: document.getElementById('telefono').value,
    nacimiento: document.getElementById('fecha_nacimiento').value,
    plan: plan.value
  };

  fetch("https://maensa.onrender.com/api/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos)
  })
  .then(res => res.json())
  .then(data => {
    if (data.status === "free") {
      alert("¡Registro gratuito exitoso!");
      cerrarModalRegistro();
    } else if (data.init_point) {
      window.location.href = data.init_point;
    }
  })
  .catch(err => {
    console.error(err);
    alert("Error al registrar o generar pago");
  });
}



