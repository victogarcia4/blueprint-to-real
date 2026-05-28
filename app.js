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
const renderApiUrl =
  location.hostname === "127.0.0.1" || location.hostname === "localhost"
    ? "https://blueprint-2-real.vercel.app/api/render"
    : "/api/render";
const detectedRooms = [
  { name: "Sala", type: "living room", view: "Vista principal" },
  { name: "Cocina", type: "kitchen", view: "Vista funcional" },
  { name: "Dormitorio", type: "bedroom", view: "Vista nocturna" },
  { name: "Bano", type: "bathroom", view: "Vista compacta" }
];

let processed = false;
let activeStyle = "Japandi";
let uploadedImageDataUrl = "";
let remoteImageUrl = "";

const placeholderRenders = renderGrid.innerHTML;

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

function showRenderError(message) {
  renderStatus.textContent = "No se pudo generar el render";
  renderGrid.innerHTML = `
    <article class="render-card generated render-error">
      <span>Error de render</span>
      <strong>${message}</strong>
      <small>
        Revisa que OPENROUTER_API_KEY este activa en Vercel y que el plano sea una imagen o URL publica.
      </small>
    </article>
  `;
}

function showDemoRenders() {
  renderGrid.innerHTML = placeholderRenders;
  renderGrid.querySelectorAll(".render-card").forEach((card, index) => {
    window.setTimeout(() => card.classList.add("generated"), index * 130);
  });
  renderStatus.textContent = "3 renders conceptuales listos. Para render real usa Vercel con OPENROUTER_API_KEY.";
}

function createRoomRenderCards() {
  renderGrid.innerHTML = detectedRooms
    .map(
      (room, index) => `
        <article class="render-card generated render-loading" id="renderRoom${index}">
          <span>${room.name}</span>
          <strong>Generando ${room.view.toLowerCase()}...</strong>
          <small>Render real por ambiente. OpenRouter puede tardar entre 20 y 90 segundos por imagen.</small>
        </article>
      `
    )
    .join("");
}

function updateRoomCard(index, room, data) {
  const card = document.querySelector(`#renderRoom${index}`);
  if (!card) return;

  card.className = "render-card generated real-render room-real-render";
  card.innerHTML = `
    <img src="${data.image}" alt="Render IA de ${room.name}" />
    <span>${room.name}</span>
    <strong>${room.view}</strong>
  `;
}

function updateRoomError(index, room, message) {
  const card = document.querySelector(`#renderRoom${index}`);
  if (!card) return;

  card.className = "render-card generated render-error room-render-error";
  card.innerHTML = `
    <span>${room.name}</span>
    <strong>No se pudo generar este ambiente</strong>
    <small>${message}</small>
  `;
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
  remoteImageUrl = "";
  uploadedImageDataUrl = "";

  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      uploadedImageDataUrl = String(reader.result || "");
      fileMeta.textContent = `${size} seleccionado. Imagen lista para render real.`;
    });
    reader.readAsDataURL(file);
  } else {
    fileMeta.textContent = `${size} seleccionado. Para render real, sube una imagen del plano o usa una URL de imagen.`;
  }
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
    remoteImageUrl = value;
    uploadedImageDataUrl = "";
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
  renderStatus.textContent = `Generando render real en estilo ${activeStyle}`;
  createRoomRenderCards();

  const basePayload = {
    imageDataUrl: uploadedImageDataUrl,
    imageUrl: remoteImageUrl,
    style: activeStyle,
    floor: document.querySelector("#floorSelect").value,
    walls: document.querySelector("#wallSelect").value,
    furnish: document.querySelector("#furnishSelect").value,
    fidelity: document.querySelector("#fidelityRange").value
  };

  Promise.allSettled(
    detectedRooms.map((room, index) =>
      fetch(renderApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...basePayload,
          roomName: room.name,
          roomType: room.type
        })
      })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.setup || data.error || "No se pudo generar el render.");
          }
          return data;
        })
        .then((data) => {
          updateRoomCard(index, room, data);
          return data;
        })
        .catch((error) => {
          updateRoomError(index, room, error.message || "No se pudo generar el render.");
          throw error;
        })
    )
  ).then((results) => {
    const completed = results.filter((result) => result.status === "fulfilled").length;
    renderStatus.textContent =
      completed === detectedRooms.length
        ? `${completed} ambientes renderizados`
        : `${completed} de ${detectedRooms.length} ambientes renderizados`;
    renderButton.disabled = false;
  });
});
