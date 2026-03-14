const FALLBACK_ROUTES = {
  "Bachillerato 1": [
    {
      "orden": 1,
      "nombre": "Juan Pablo",
      "acudiente": "Mamá",
      "telefono": "3154137032",
      "barrio": "Turbay Ayala"
    },
    {
      "orden": 2,
      "nombre": "Nicolás Bedoya",
      "acudiente": "Mamá",
      "telefono": "3128840559",
      "barrio": "Turbay Ayala"
    },
    {
      "orden": 3,
      "nombre": "Dilan Gañán",
      "acudiente": "Abuela Teresa",
      "telefono": "3206342481",
      "barrio": "Turbay Ayala"
    }
  ],
  "Bachillerato 2": [
    {
      "orden": 1,
      "nombre": "Estudiante 1",
      "acudiente": "Acudiente",
      "telefono": "3000000001",
      "barrio": "Centro"
    },
    {
      "orden": 2,
      "nombre": "Estudiante 2",
      "acudiente": "Acudiente",
      "telefono": "3000000002",
      "barrio": "El Carmen"
    }
  ],
  "Primaria": [
    {
      "orden": 1,
      "nombre": "Estudiante Primaria",
      "acudiente": "Acudiente",
      "telefono": "3000000003",
      "barrio": "Villa Juliana"
    }
  ],
  "Transición": [
    {
      "orden": 1,
      "nombre": "Estudiante Transición",
      "acudiente": "Acudiente",
      "telefono": "3000000004",
      "barrio": "La Isabela"
    }
  ]
};
const FALLBACK_BARRIOS = [
  "Turbay Ayala",
  "Centro",
  "Villa Juliana",
  "La Isabela",
  "Pueblo Nuevo",
  "El Carmen",
  "Centenario",
  "Compartir"
];

const state = {
  routes: {},
  barrios: [],
  currentRoute: "Bachillerato 1",
  currentBarrio: "Turbay Ayala",
  messageType: "alistamiento",
  tray: [],
  search: "",
  sendMode: "auto",
  loadedFromFallback: false
};

const ui = {
  routeName: document.getElementById("routeName"),
  currentBarrioLabel: document.getElementById("currentBarrioLabel"),
  channelLabel: document.getElementById("channelLabel"),
  progressLabel: document.getElementById("progressLabel"),
  routeTabs: document.getElementById("routeTabs"),
  barrioSelect: document.getElementById("barrioSelect"),
  sendMode: document.getElementById("sendMode"),
  deviceHelp: document.getElementById("deviceHelp"),
  statusText: document.getElementById("statusText"),
  preview: document.getElementById("preview"),
  studentList: document.getElementById("studentList"),
  diagnostics: document.getElementById("diagnostics"),
  tray: document.getElementById("tray"),
  searchStudent: document.getElementById("searchStudent")
};

function getStudents() {
  return state.routes[state.currentRoute] || [];
}

function getCurrentStudent() {
  const students = getStudents();
  const index = Math.min(Number(localStorage.getItem("rutaEscolar_driverIndex") || 0), Math.max(students.length - 1, 0));
  return students[index] || null;
}

function getCurrentIndex() {
  const students = getStudents();
  return Math.min(Number(localStorage.getItem("rutaEscolar_driverIndex") || 0), Math.max(students.length - 1, 0));
}

function setCurrentIndex(index) {
  localStorage.setItem("rutaEscolar_driverIndex", String(index));
}

function setStatus(message) {
  ui.statusText.textContent = message;
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("57")) return digits;
  if (digits.length === 10) return "57" + digits;
  if (digits.length === 11 && digits.startsWith("0")) return "57" + digits.slice(1);
  return digits;
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

function getResolvedSendMode() {
  if (state.sendMode === "auto") {
    return isMobileDevice() ? "app" : "web";
  }
  return state.sendMode;
}

function getWhatsAppUrl(phone, msg) {
  const clean = normalizePhone(phone);
  if (!clean) return "";
  const encoded = encodeURIComponent(msg);
  if (getResolvedSendMode() === "web") {
    return "https://web.whatsapp.com/send?phone=" + clean + "&text=" + encoded;
  }
  return "https://wa.me/" + clean + "?text=" + encoded;
}

function addTray(title, text, type = "text") {
  state.tray.unshift({ title, text, type, id: Date.now() + Math.random() });
  state.tray = state.tray.slice(0, 12);
  renderTray();
}

function buildStudentMessage(student) {
  if (!student) return "No hay estudiante seleccionado.";
  return "💬 Hola, " + student.acudiente + ". La ruta va en camino por " + student.barrio + " para recoger a " + student.nombre + ".";
}

function buildMessage(type = state.messageType) {
  const students = getStudents();
  const currentStudent = getCurrentStudent();

  if (type === "alistamiento") {
    return "🚌 " + state.currentRoute + "\n\nLa ruta se está alistando.\n\nOrden de recogida:\n\n" +
      students.map((s) => s.orden + ". " + s.nombre + " - " + s.barrio).join("\n") +
      "\n\nPor favor preparar a los estudiantes.";
  }

  if (type === "barrio") {
    return "📍 La ruta está ingresando al barrio " + state.currentBarrio + ".\n\nPor favor alistar a los estudiantes de este sector.";
  }

  if (type === "colegio") {
    return "🏫 La ruta llegó al colegio.\n\nLos estudiantes han llegado correctamente.";
  }

  return buildStudentMessage(currentStudent);
}

function openWhatsAppUrl(url) {
  if (!url) {
    setStatus("Número inválido.");
    addTray("Error", "No se pudo generar un enlace válido para WhatsApp.", "error");
    return;
  }

  if (isMobileDevice()) {
    window.location.href = url;
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function openCurrentWhatsApp() {
  const currentStudent = getCurrentStudent();
  if (!currentStudent) {
    setStatus("No hay estudiante seleccionado.");
    return;
  }
  const msg = buildMessage();
  const url = getWhatsAppUrl(currentStudent.telefono, msg);
  openWhatsAppUrl(url);
  addTray("Abrir WhatsApp", url, "link");
  setStatus("Se generó un enlace de WhatsApp.");
}

function openStudentWhatsApp(index) {
  const students = getStudents();
  const student = students[index];
  if (!student) return;
  setCurrentIndex(index);
  state.messageType = "estudiante";
  const msg = buildStudentMessage(student);
  const url = getWhatsAppUrl(student.telefono, msg);
  openWhatsAppUrl(url);
  addTray("WhatsApp por estudiante", url, "link");
  setStatus("Abriendo WhatsApp para " + student.nombre + ".");
  render();
}

async function copyText(text, okMessage, failMessage) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus(okMessage);
    addTray(okMessage, text, text.startsWith("http") ? "link" : "text");
  } catch (error) {
    setStatus(failMessage);
    addTray("Error al copiar", failMessage, "error");
  }
}

function renderRouteTabs() {
  ui.routeTabs.innerHTML = Object.keys(state.routes).map((route) => `
    <button class="route-tab ${route === state.currentRoute ? "active" : ""}" data-route="${route}">
      ${route}
    </button>
  `).join("");
}

function renderBarrioOptions() {
  ui.barrioSelect.innerHTML = state.barrios.map((b) => `<option value="${b}">${b}</option>`).join("");
  ui.barrioSelect.value = state.currentBarrio;
}

function renderHeader() {
  const students = getStudents();
  const currentIndex = getCurrentIndex();
  ui.routeName.textContent = state.currentRoute;
  ui.currentBarrioLabel.textContent = state.currentBarrio;
  ui.channelLabel.textContent = getResolvedSendMode() === "app" ? "WhatsApp móvil" : "WhatsApp Web";
  ui.progressLabel.textContent = students.length ? `Estudiante ${currentIndex + 1} de ${students.length}` : "Sin estudiantes";
  ui.deviceHelp.textContent = getResolvedSendMode() === "app"
    ? "Canal activo: WhatsApp móvil. En celular abrirá la app de WhatsApp."
    : "Canal activo: WhatsApp Web. En PC abrirá una pestaña nueva con WhatsApp Web.";
}

function renderPreview() {
  ui.preview.textContent = buildMessage();
}

function renderStudents() {
  const students = getStudents();
  const search = state.search.toLowerCase();
  const currentIndex = getCurrentIndex();
  const filtered = students.filter((s) => (
    (s.nombre + " " + s.barrio + " " + s.acudiente).toLowerCase().includes(search)
  ));

  ui.studentList.innerHTML = filtered.map((s) => {
    const index = students.findIndex((x) => x.orden === s.orden && x.nombre === s.nombre);
    return `
      <div class="student ${index === currentIndex ? "active" : ""}">
        <div class="student-top">
          <div>
            <div class="student-name">${s.orden}. ${s.nombre}</div>
            <div class="student-meta">
              Acudiente: ${s.acudiente}<br>
              Barrio: ${s.barrio}<br>
              Tel: +${normalizePhone(s.telefono)}
            </div>
          </div>
          <button class="btn success small" data-student-index="${index}">Avisar</button>
        </div>
      </div>
    `;
  }).join("");
}

function renderDiagnostics() {
  const students = getStudents();
  const issues = [];
  const suggestions = [];

  if (!students.length) issues.push("La ruta actual no tiene estudiantes.");
  const invalidPhones = students.filter((s) => normalizePhone(s.telefono).length < 12);
  if (invalidPhones.length) issues.push("Hay " + invalidPhones.length + " teléfono(s) inválido(s) o incompletos.");
  const noBarrio = students.filter((s) => !s.barrio);
  if (noBarrio.length) issues.push("Hay " + noBarrio.length + " estudiante(s) sin barrio.");
  const duplicatedOrders = students.filter((s, index, arr) => arr.findIndex((x) => x.orden === s.orden) !== index);
  if (duplicatedOrders.length) issues.push("Hay órdenes de recogida repetidos.");

  suggestions.push("Si pruebas dentro de un preview incrustado, WhatsApp puede no abrir por restricciones del entorno.");
  suggestions.push("En celular conviene usar modo automático o WhatsApp móvil.");
  suggestions.push("En PC conviene usar modo automático o WhatsApp Web.");
  if (state.loadedFromFallback) {
    suggestions.push("La app está usando datos embebidos de respaldo para evitar errores 404.");
  }

  const items = [];
  if (issues.length === 0) {
    items.push(`<div class="diag-item ok">No se detectaron errores críticos en esta ruta.</div>`);
  } else {
    issues.forEach((item) => items.push(`<div class="diag-item warn">${item}</div>`));
  }
  suggestions.forEach((item) => items.push(`<div class="diag-item info">${item}</div>`));
  ui.diagnostics.innerHTML = items.join("");
}

function renderTray() {
  if (!state.tray.length) {
    ui.tray.innerHTML = '<div class="tray-item">Vacía</div>';
    return;
  }

  ui.tray.innerHTML = state.tray.map((t) => {
    if (t.type === "link") {
      return `
        <div class="tray-item link">
          <strong>${t.title}</strong>
          <a class="tray-link" href="${t.text}" target="_blank" rel="noopener noreferrer">${t.text}</a>
          <div class="tray-actions">
            <button class="btn success small" data-open-link="${t.id}">Abrir enlace</button>
            <button class="btn dark small" data-copy-link="${t.id}">Copiar enlace</button>
          </div>
          <div class="note">Si no abre aquí, copia el enlace y pégalo manualmente en el navegador.</div>
        </div>
      `;
    }

    return `
      <div class="tray-item ${t.type === "error" ? "error" : ""}">
        <strong>${t.title}</strong>
        <div class="note" style="white-space:pre-wrap;color:#24445f;margin-top:6px;">${t.text}</div>
      </div>
    `;
  }).join("");
}

function render() {
  renderRouteTabs();
  renderHeader();
  renderPreview();
  renderStudents();
  renderDiagnostics();
  renderTray();
}

function bindEvents() {
  document.getElementById("btnAlistamiento").addEventListener("click", () => {
    state.messageType = "alistamiento";
    addTray("Vista previa", buildMessage("alistamiento"), "text");
    setStatus("Mensaje de alistamiento generado.");
    render();
  });

  document.getElementById("btnBarrio").addEventListener("click", () => {
    state.messageType = "barrio";
    addTray("Vista previa", buildMessage("barrio"), "text");
    setStatus("Mensaje de barrio generado.");
    render();
  });

  document.getElementById("btnColegio").addEventListener("click", () => {
    state.messageType = "colegio";
    addTray("Vista previa", buildMessage("colegio"), "text");
    setStatus("Mensaje de llegada generado.");
    render();
  });

  document.getElementById("btnSiguiente").addEventListener("click", () => {
    const students = getStudents();
    if (!students.length) return;
    const next = (getCurrentIndex() + 1) % students.length;
    setCurrentIndex(next);
    state.messageType = "estudiante";
    addTray("Siguiente estudiante", students[next].nombre + " - " + students[next].barrio, "text");
    setStatus("Siguiente estudiante: " + students[next].nombre);
    render();
  });

  document.getElementById("btnEnviar").addEventListener("click", openCurrentWhatsApp);
  document.getElementById("btnCopiar").addEventListener("click", () => copyText(buildMessage(), "Mensaje copiado al portapapeles.", "No se pudo copiar el mensaje."));
  document.getElementById("btnEnlace").addEventListener("click", () => {
    const currentStudent = getCurrentStudent();
    const url = getWhatsAppUrl(currentStudent && currentStudent.telefono, buildMessage());
    addTray("Enlace", url, "link");
    setStatus("Enlace generado.");
  });

  document.getElementById("btnLimpiarBandeja").addEventListener("click", () => {
    state.tray = [];
    renderTray();
    setStatus("Bandeja vaciada.");
  });

  ui.barrioSelect.addEventListener("change", (e) => {
    state.currentBarrio = e.target.value;
    setStatus("Barrio cambiado a " + state.currentBarrio + ".");
    render();
  });

  ui.sendMode.addEventListener("change", (e) => {
    state.sendMode = e.target.value;
    setStatus("Canal cambiado.");
    render();
  });

  ui.searchStudent.addEventListener("input", (e) => {
    state.search = e.target.value;
    renderStudents();
  });

  ui.routeTabs.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-route]");
    if (!btn) return;
    state.currentRoute = btn.dataset.route;
    setCurrentIndex(0);
    setStatus("Ruta cambiada a " + state.currentRoute + ".");
    render();
  });

  ui.studentList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-student-index]");
    if (!btn) return;
    openStudentWhatsApp(Number(btn.dataset.studentIndex));
  });

  ui.tray.addEventListener("click", (e) => {
    const openBtn = e.target.closest("[data-open-link]");
    if (openBtn) {
      const item = state.tray.find((t) => String(t.id) === openBtn.dataset.openLink);
      if (item) openWhatsAppUrl(item.text);
      return;
    }
    const copyBtn = e.target.closest("[data-copy-link]");
    if (copyBtn) {
      const item = state.tray.find((t) => String(t.id) === copyBtn.dataset.copyLink);
      if (item) copyText(item.text, "Enlace copiado al portapapeles.", "No se pudo copiar el enlace.");
    }
  });
}

async function loadJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("No se pudo cargar " + url + " (" + res.status + ")");
  }
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!contentType.includes("application/json")) {
    throw new Error("La ruta " + url + " no devolvió JSON.");
  }
  return JSON.parse(text);
}

async function init() {
  try {
    const [routes, barrios] = await Promise.all([
      loadJson("./data/estudiantes.json"),
      loadJson("./data/barrios.json")
    ]);
    state.routes = routes;
    state.barrios = barrios;
  } catch (error) {
    console.error(error);
    state.routes = FALLBACK_ROUTES;
    state.barrios = FALLBACK_BARRIOS;
    state.loadedFromFallback = true;
    setStatus("Datos cargados desde respaldo local. Revisa /data si quieres usar JSON externos.");
  }

  if (!state.barrios.includes(state.currentBarrio)) {
    state.currentBarrio = state.barrios[0] || "Sin barrio";
  }

  renderBarrioOptions();
  bindEvents();
  render();
  if (!state.loadedFromFallback) {
    setStatus("Sistema listo para pruebas.");
  }
}

init();
