const fileInput = document.querySelector("#fileInput");
const dropzone = document.querySelector("#dropzone");
const fileCard = document.querySelector("#fileCard");
const fileName = document.querySelector("#fileName");
const fileType = document.querySelector("#fileType");
const fileMeta = document.querySelector("#fileMeta");
const processButton = document.querySelector("#processButton");
const demoButton = document.querySelector("#demoButton");
const pipelineItems = Array.from(document.querySelectorAll("#pipelineList li"));
const urlForm = document.querySelector("#urlForm");
const urlInput = document.querySelector("#urlInput");
const renderButton = document.querySelector("#renderButton");
const renderStatus = document.querySelector("#renderStatus");
const renderGrid = document.querySelector("#renderGrid");
const confidenceMetric = document.querySelector("#confidenceMetric");
const roomMetric = document.querySelector("#roomMetric");
const styleGroup = document.querySelector("#styleGroup");

let processed = false;
let activeStyle = "Japandi";

function formatBytes(bytes) {
  if (!bytes) return "Tamano no disponible";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function setFileCard(name, type, meta) {
  fileName.textContent = name;
  fileType.textContent = type.slice(0, 4).toUpperCase();
  fileMeta.textContent = meta;
  fileCard.hidden = false;
  renderStatus.textContent = "Plano listo para procesar";
}

function clearPipeline() {
  pipelineItems.forEach((item) => {
    item.classList.remove("active", "done");
  });
}

function processPlan() {
  clearPipeline();
  processed = false;
  processButton.textContent = "Procesando";
  processButton.disabled = true;
  renderStatus.textContent = "Analizando geometria del plano";

  pipelineItems.forEach((item, index) => {
    window.setTimeout(() => {
      pipelineItems.forEach((node, nodeIndex) => {
        node.classList.toggle("done", nodeIndex < index);
        node.classList.toggle("active", nodeIndex === index);
      });
    }, index * 720);
  });

  window.setTimeout(() => {
    pipelineItems.forEach((item) => {
      item.classList.remove("active");
      item.classList.add("done");
    });
    processed = true;
    processButton.textContent = "Reprocesar";
    processButton.disabled = false;
    renderStatus.textContent = "Modelo espacial listo para renderizar";
    confidenceMetric.textContent = "93%";
    roomMetric.textContent = "4";
  }, pipelineItems.length * 720 + 300);
}

function handleFile(file) {
  if (!file) return;
  const extension = file.name.split(".").pop() || "file";
  const accepted = ["pdf", "jpg", "jpeg", "png", "gif"];

  if (!accepted.includes(extension.toLowerCase())) {
    setFileCard(file.name, "ERR", "Formato no soportado");
    return;
  }

  const size = formatBytes(file.size);
  setFileCard(file.name, extension, `${size} seleccionado. Validacion completada.`);
}

fileInput.addEventListener("change", (event) => {
  handleFile(event.target.files[0]);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove("dragover");
  });
});

dropzone.addEventListener("drop", (event) => {
  handleFile(event.dataTransfer.files[0]);
});

urlForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = urlInput.value.trim();

  try {
    const url = new URL(value);
    const path = url.pathname.split("/").pop() || "plano-remoto.pdf";
    const extension = path.includes(".") ? path.split(".").pop() : "URL";
    setFileCard(path, extension, "URL valida. El backend descargara el recurso.");
  } catch {
    setFileCard("URL invalida", "ERR", "Revisa el protocolo y dominio del enlace.");
  }
});

processButton.addEventListener("click", processPlan);

demoButton.addEventListener("click", () => {
  setFileCard("demo-apartamento-82m2.pdf", "PDF", "Demo cargada. 4 habitaciones detectables.");
  processPlan();
  document.querySelector("#pipeline").scrollIntoView({ behavior: "smooth", block: "center" });
});

styleGroup.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  activeStyle = button.dataset.style;
  styleGroup.querySelectorAll("button").forEach((node) => node.classList.remove("active"));
  button.classList.add("active");
});

renderButton.addEventListener("click", () => {
  if (!processed) {
    renderStatus.textContent = "Procesa o carga una demo antes de renderizar";
    return;
  }

  renderButton.disabled = true;
  renderStatus.textContent = `Generando renders en estilo ${activeStyle}`;

  window.setTimeout(() => {
    renderGrid.querySelectorAll(".render-card").forEach((card, index) => {
      window.setTimeout(() => card.classList.add("generated"), index * 130);
    });
    renderStatus.textContent = "3 renders HD listos para revision";
    renderButton.disabled = false;
  }, 1100);
});
