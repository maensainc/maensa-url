function mostrarVencimiento(usuario) {
  const expiresAt = usuario.trial?.expiresAt || usuario.expirationTimestamp;
  if (!expiresAt) {
    document.getElementById("vencimiento-valor").textContent = "No aplica";
    return;
  }
  const fecha = new Date(expiresAt);
  document.getElementById("vencimiento-valor").textContent =
    fecha.toLocaleDateString() + " " + fecha.toLocaleTimeString();
}

window.addEventListener('DOMContentLoaded', () => {
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  if (!usuario) {
    alert("No has iniciado sesión.");
    window.location.href = "Maensa.html";
    return;
  }

  mostrarDatos(usuario);
  mostrarMenuUsuario(usuario);
  prepararEdicion();
  actualizarBotonEstado();
  mostrarVencimiento(usuario);
});

function mostrarDatos(usuario) {
  document.getElementById("nombre-valor").textContent = usuario.nombre;
  document.getElementById("apellido-valor").textContent = usuario.apellido;
  document.getElementById("email-valor").textContent = ocultarEmail(usuario.email);
  document.getElementById("telefono-valor").textContent = ocultarTelefono(usuario.telefono);
  document.querySelector(".nombre-usuario").textContent = `${usuario.nombre} ${usuario.apellido}`;
  document.querySelector(".nombre-usuario-cuenta").textContent = usuario.nombre;
}

function ocultarEmail(email) {
  const [nombre, dominio] = email.split("@");
  return "*".repeat(Math.min(nombre.length, 8)) + "@" + dominio;
}

function ocultarTelefono(telefono) {
  return telefono?.length >= 4 ? "********" + telefono.slice(-4) : "********";
}

function mostrarDato(tipo) {
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  if (tipo === 'email') {
    document.getElementById("email-valor").textContent = usuario.email;
  } else if (tipo === 'telefono') {
    document.getElementById("telefono-valor").textContent = usuario.telefono;
  }
}

function ocultarDato(tipo) {
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  if (tipo === 'email') {
    document.getElementById("email-valor").textContent = ocultarEmail(usuario.email);
  } else if (tipo === 'telefono') {
    document.getElementById("telefono-valor").textContent = ocultarTelefono(usuario.telefono);
  }
}

function mostrarMenuUsuario(usuario) {
  document.getElementById('btn-login').style.display = 'none';
  document.getElementById('btn-register').style.display = 'none';

  const menu = document.getElementById('menu-usuario-li');
  menu.classList.remove('hidden');

  document.getElementById('btn-usuario').addEventListener('click', e => {
    e.preventDefault();
    menu.classList.toggle('activo');
  });

  document.addEventListener('click', e => {
    if (!menu.contains(e.target) && !document.getElementById('btn-usuario').contains(e.target)) {
      menu.classList.remove('activo');
    }
  });

  document.getElementById('cerrar-sesion').addEventListener('click', e => {
    e.preventDefault();
    localStorage.removeItem("usuario");
    window.location.href = "Maensa.html";
  });
}

function prepararEdicion() {
  const campos = [
    { id: "nombre-valor", key: "nombre" },
    { id: "apellido-valor", key: "apellido" },
    { id: "email-valor", key: "email", ocultar: ocultarEmail },
    { id: "telefono-valor", key: "telefono", ocultar: ocultarTelefono },
  ];

  const botonesEditar = document.querySelectorAll(".btn-editar");

  botonesEditar.forEach((btn, index) => {
    btn.onclick = () => {
      const usuario = JSON.parse(localStorage.getItem("usuario"));
      const campo = campos[index];
      const span = document.getElementById(campo.id);
      const valorActual = usuario[campo.key] || "";

      const input = document.createElement("input");
      input.type = "text";
      input.value = valorActual;
      input.classList.add("input-edicion");

      span.replaceWith(input);
      btn.textContent = "Guardar";

      input.addEventListener("keypress", e => {
        if (e.key === "Enter") btn.click();
      });

      const guardarCambios = () => {
        const nuevoValor = input.value.trim();
        if (!nuevoValor) {
          alert("El campo no puede estar vacío.");
          return;
        }

        const contraseña = prompt("Confirmá tu contraseña para guardar los cambios:");
        if (!contraseña) return;

        const idUsuario = usuario.email_original ?? usuario.email;

        fetch("https://maensa.onrender.com/api/actualizar", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: idUsuario,
            password: contraseña,
            [campo.key]: nuevoValor
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.ok) {
            alert("Dato actualizado correctamente.");
            if (campo.key === "email") {
                if (!usuario.email_original) {
                    usuario.email_original = usuario.email;
                    }
                usuario.email = nuevoValor;
                } else {
                usuario[campo.key] = nuevoValor;
            }
            localStorage.setItem("usuario", JSON.stringify(usuario));

            const nuevoSpan = document.createElement("span");
            nuevoSpan.id = campo.id;
            nuevoSpan.textContent = campo.ocultar ? campo.ocultar(nuevoValor) : nuevoValor;
            nuevoSpan.classList.add("valor-dato");
            input.replaceWith(nuevoSpan);
            btn.textContent = "Editar";

            prepararEdicion(); 
          } else {
            alert("Error: " + (data.error || "No se pudo actualizar."));
          }
        })
        .catch(() => alert("Error al conectar con el servidor."));
      };

      btn.onclick = guardarCambios;
    };
  });
}


function cambiarPassword() {
  const nuevaPassword = prompt("Escribí la nueva contraseña:");
  if (!nuevaPassword) return;

  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const confirmar = prompt("Confirmá tu contraseña actual:");
  if (!confirmar) return;

  fetch("https://maensa.onrender.com/api/actualizar", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: usuario.email_original ?? usuario.email,
      password: confirmar,
      nuevaPassword: nuevaPassword
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.ok) {
      alert("Contraseña actualizada con éxito.");
    } else {
      alert("Error: " + (data.error || "No se pudo cambiar la contraseña"));
    }
  })
  .catch(() => alert("Error de conexión con el servidor"));
}

function eliminarCuenta() {
  document.getElementById('modal-eliminar').classList.remove('hidden');
}

function cerrarModalEliminar() {
  document.getElementById('modal-eliminar').classList.add('hidden');
  document.getElementById('input-password-eliminar').value = "";
}

function confirmarEliminarCuenta() {
  const password = document.getElementById('input-password-eliminar').value.trim();
  if (!password) {
    alert("Ingresá tu contraseña para confirmar.");
    return;
  }

  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const email = usuario.email_original ?? usuario.email;

  fetch("https://maensa.onrender.com/api/eliminar", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        alert("Cuenta eliminada correctamente.");
        localStorage.removeItem("usuario");
        window.location.href = "Maensa.html";
      } else {
        alert("Error: " + (data.error || "No se pudo eliminar la cuenta."));
      }
    })
    .catch(() => {
      alert("Error de conexión con el servidor.");
    })
    .finally(() => {
      cerrarModalEliminar();
    });
}
function alternarEstadoCuenta() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const accion = usuario.pago_confirmado ? "deshabilitar" : "habilitar";

  document.getElementById("modal-toggle-cuenta").classList.remove("hidden");

  const titulo = document.getElementById("titulo-toggle");
  const texto = document.getElementById("texto-toggle");
  const botonConfirmar = document.getElementById("btn-confirmar-toggle");

  // Texto dinámico
  titulo.textContent = `¿${accion[0].toUpperCase() + accion.slice(1)} cuenta?`;
  texto.textContent = accion === "deshabilitar"
    ? "Podrás volver a activarla más tarde si tu plan sigue vigente."
    : "Se verificará si tu plan sigue activo para reactivarla.";

  // Limpiar input
  document.getElementById("input-contrasena-toggle").value = "";

  // Estilos dinámicos
  titulo.classList.remove("titulo-verde", "titulo-rojo");
  titulo.classList.add(accion === "habilitar" ? "titulo-verde" : "titulo-rojo");

  botonConfirmar.classList.remove("btn-confirmar-verde", "btn-confirmar-rojo");
  botonConfirmar.classList.add(accion === "habilitar" ? "btn-confirmar-verde" : "btn-confirmar-rojo");
}

function cerrarModalAlternar() {
  document.getElementById("modal-toggle-cuenta").classList.add("hidden");
}

function confirmarAlternancia() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const contrasena = document.getElementById("input-contrasena-toggle").value.trim();

  if (!contrasena) {
    alert("Debés ingresar tu contraseña.");
    return;
  }

  fetch("https://maensa.onrender.com/api/toggle-estado", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: usuario.email_original ?? usuario.email,
      password: contrasena
    })
  })
    .then(res => res.json().then(data => ({ status: res.status, data })))
    .then(({ status, data }) => {
      if (status === 200 && data.ok) {
        usuario.pago_confirmado = data.nuevoEstado;
        localStorage.setItem("usuario", JSON.stringify(usuario));
        actualizarBotonEstado();
        cerrarModalAlternar();
        alert("Estado actualizado correctamente.");
      } else if (status === 402) {
        alert(data.error);
        window.location.href = "planes.html";
      } else {
        alert(data.error || "Error al cambiar el estado.");
      }
    })
    .catch(() => alert("Error de conexión con el servidor"));
}

function actualizarBotonEstado() {
  const usuario = JSON.parse(localStorage.getItem("usuario"));
  const btnEstado = document.getElementById("btn-toggle-estado");
  if (!btnEstado) return;

  if (usuario.pago_confirmado) {
    btnEstado.textContent = "Deshabilitar cuenta";
    btnEstado.classList.remove("verde");
    btnEstado.classList.add("rojo");
  } else {
    btnEstado.textContent = "Habilitar cuenta";
    btnEstado.classList.remove("rojo");
    btnEstado.classList.add("verde");
  }
}

