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
const pdfButton = document.querySelector("#pdfButton");
const renderStatus = document.querySelector("#renderStatus");
const renderGrid = document.querySelector("#renderGrid");
const confidenceMetric = document.querySelector("#confidenceMetric");
const roomMetric = document.querySelector("#roomMetric");
const styleGroup = document.querySelector("#styleGroup");
const planPreview = document.querySelector("#planPreview");
const previewStatus = document.querySelector("#previewStatus");
const previewGallery = document.querySelector("#previewGallery");
const renderApiUrl =
  location.hostname === "127.0.0.1" || location.hostname === "localhost"
    ? "https://blueprint-2-real.vercel.app/api/render"
    : "/api/render";
const detectedRooms = [
  { name: "Casa completa", type: "whole house", view: "Vista general" },
  { name: "Sala", type: "living room", view: "Vista principal" },
  { name: "Cocina", type: "kitchen", view: "Vista funcional" },
  { name: "Dormitorio", type: "bedroom", view: "Vista nocturna" },
  { name: "Bano", type: "bathroom", view: "Vista compacta" }
];

let processed = false;
let activeStyle = "Japandi";
let uploadedImageDataUrl = "";
let uploadedImageDataUrls = [];
let remoteImageUrl = "";
let previewObjectUrl = "";
let previewObjectUrls = [];
let renderedRooms = [];

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

function resetPreview() {
  previewObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  previewObjectUrls = [];
  previewObjectUrl = "";
  previewGallery.innerHTML = "";
  planPreview.hidden = true;
}

function createPreviewCard({ title, subtitle, url, kind }) {
  const card = document.createElement("article");
  card.className = "preview-card";
  const media = document.createElement("div");
  media.className = "preview-frame";

  if (kind === "image") {
    const image = document.createElement("img");
    image.src = url;
    image.alt = `Previsualizacion de ${title}`;
    media.append(image);
  } else if (kind === "pdf") {
    const frame = document.createElement("iframe");
    frame.src = url;
    frame.title = `Previsualizacion PDF de ${title}`;
    media.append(frame);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "preview-fallback";
    fallback.innerHTML = `<strong>Vista previa no disponible</strong><small>${subtitle}</small>`;
    media.append(fallback);
  }

  card.innerHTML = `
    <div class="preview-card-header">
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(subtitle)}</small>
    </div>
  `;
  card.append(media);

  if (url) {
    const actions = document.createElement("div");
    actions.className = "preview-actions";
    actions.innerHTML = `
      <a class="secondary-button" href="${url}" target="_blank" rel="noopener">Abrir archivo</a>
      <small>${kind === "pdf" ? "PDF visible para revision" : "Referencia lista"}</small>
    `;
    card.append(actions);
  }

  previewGallery.append(card);
}

function showPreviewFromFiles(files) {
  resetPreview();
  planPreview.hidden = false;
  previewStatus.textContent = `${files.length} archivo${files.length === 1 ? "" : "s"} anexado${files.length === 1 ? "" : "s"}`;

  files.forEach((file) => {
    const url = URL.createObjectURL(file);
    previewObjectUrls.push(url);
    const extension = (file.name.split(".").pop() || "").toLowerCase();

    if (file.type.startsWith("image/")) {
      createPreviewCard({
        title: file.name,
        subtitle: "Imagen enviada al modelo para analisis",
        url,
        kind: "image"
      });
      return;
    }

    if (file.type === "application/pdf" || extension === "pdf") {
      createPreviewCard({
        title: file.name,
        subtitle: "PDF previsualizado. Conversion IA pendiente",
        url,
        kind: "pdf"
      });
      return;
    }

    createPreviewCard({
      title: file.name,
      subtitle: "Formato sin vista previa",
      url,
      kind: "fallback"
    });
  });
}

function showPreviewFromUrl(value) {
  resetPreview();
  planPreview.hidden = false;
  previewStatus.textContent = "URL cargada. Si no aparece, el servidor remoto bloquea la vista previa.";
  createPreviewCard({
    title: "URL del plano",
    subtitle: "URL publica enviada al modelo",
    url: value,
    kind: "image"
  });
}

function clearPipeline() {
  pipelineItems.forEach((item) => {
    item.classList.remove("active", "done");
  });
}

function processPlan() {
  if (!planPreview.hidden) {
    planPreview.scrollIntoView({ behavior: "smooth", block: "start" });
  }
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

  renderedRooms[index] = {
    ...room,
    image: data.image,
    model: data.model || ""
  };
  pdfButton.disabled = renderedRooms.filter(Boolean).length === 0;
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

function handleFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  const firstFile = files[0];
  const extension = firstFile.name.split(".").pop() || "file";
  const accepted = ["pdf", "jpg", "jpeg", "png", "gif"];
  const invalid = files.find((file) => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    return !accepted.includes(ext);
  });

  if (invalid) {
    setFileCard(invalid.name, "ERR", "Formato no soportado");
    return;
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  const pdfFiles = files.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
  setFileCard(
    files.length === 1 ? firstFile.name : `${files.length} archivos anexados`,
    files.length === 1 ? extension : "SET",
    `${formatBytes(totalSize)} total. ${imageFiles.length} imagen(es), ${pdfFiles.length} PDF(s).`
  );
  showPreviewFromFiles(files);
  remoteImageUrl = "";
  uploadedImageDataUrl = "";
  uploadedImageDataUrls = [];

  Promise.all(
    imageFiles.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.addEventListener("load", () => resolve(String(reader.result || "")));
          reader.readAsDataURL(file);
        })
    )
  ).then((images) => {
    uploadedImageDataUrls = images.filter(Boolean);
    uploadedImageDataUrl = uploadedImageDataUrls[0] || "";
    fileMeta.textContent = uploadedImageDataUrls.length
      ? `${uploadedImageDataUrls.length} imagen(es) listas para render real. ${pdfFiles.length} PDF(s) en preview.`
      : "PDF(s) previsualizados. Para render real automatico agrega una imagen o URL.";
  });
}

fileInput.addEventListener("change", (event) => {
  handleFiles(event.target.files);
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
  handleFiles(event.dataTransfer.files);
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
    uploadedImageDataUrls = [];
    setFileCard(path, extension, "URL valida. El backend descargara el recurso.");
    showPreviewFromUrl(value);
  } catch {
    setFileCard("URL invalida", "ERR", "Revisa el protocolo y dominio del enlace.");
    resetPreview();
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
  pdfButton.disabled = true;
  renderedRooms = [];
  renderStatus.textContent = `Generando render real en estilo ${activeStyle}`;
  createRoomRenderCards();

  const basePayload = {
    imageDataUrl: uploadedImageDataUrl,
    imageDataUrls: uploadedImageDataUrls,
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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getPlanPreviewForReport() {
  if (uploadedImageDataUrls.length) {
    return uploadedImageDataUrls
      .map((image, index) => `<img class="plan-image" src="${image}" alt="Plano adjuntado ${index + 1}" />`)
      .join("");
  }

  if (remoteImageUrl) {
    return `<img class="plan-image" src="${escapeHtml(remoteImageUrl)}" alt="Plano adjuntado por URL" />`;
  }

  return `
    <div class="plan-missing">
      <strong>Plano no embebido en el reporte</strong>
      <span>Para incluirlo en el PDF, sube el plano como JPG, PNG o GIF, o usa una URL publica de imagen.</span>
    </div>
  `;
}

function buildReportHtml() {
  const completedRooms = renderedRooms.filter(Boolean);
  const date = new Date().toLocaleString("es-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Reporte blueprint-2-real</title>
        <style>
          @page { size: letter; margin: 18mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #171a18;
            font-family: Arial, Helvetica, sans-serif;
            background: #fff;
          }
          header {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            padding-bottom: 18px;
            border-bottom: 2px solid #0d6b57;
          }
          h1 {
            margin: 0;
            font-size: 34px;
            line-height: 1;
          }
          h2 {
            margin: 28px 0 12px;
            font-size: 20px;
          }
          p, span, small {
            color: #5f6861;
            line-height: 1.5;
          }
          .meta {
            text-align: right;
            font-size: 12px;
          }
          .summary {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin: 18px 0 8px;
          }
          .summary div {
            border: 1px solid #d8ddd6;
            border-radius: 10px;
            padding: 10px;
          }
          .summary strong {
            display: block;
            color: #0d6b57;
            font-size: 18px;
          }
          .plan-wrap {
            display: grid;
            min-height: 260px;
            place-items: center;
            border: 1px solid #d8ddd6;
            border-radius: 12px;
            overflow: hidden;
            background: #f7f8f5;
          }
          .plan-image {
            max-width: 100%;
            max-height: 420px;
            object-fit: contain;
          }
          .plan-missing {
            display: grid;
            gap: 8px;
            padding: 28px;
            text-align: center;
          }
          .renders {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .render {
            break-inside: avoid;
            border: 1px solid #d8ddd6;
            border-radius: 12px;
            overflow: hidden;
          }
          .render img {
            width: 100%;
            aspect-ratio: 1 / 1;
            object-fit: cover;
            display: block;
          }
          .render div {
            padding: 12px;
          }
          .render strong {
            display: block;
            font-size: 16px;
          }
          footer {
            margin-top: 28px;
            padding-top: 14px;
            border-top: 1px solid #d8ddd6;
            font-size: 11px;
            color: #5f6861;
          }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>blueprint-2-real</h1>
            <p>Reporte de renderizacion interior para cliente</p>
          </div>
          <div class="meta">
            <strong>Fecha</strong><br />
            ${escapeHtml(date)}<br /><br />
            <strong>Estilo</strong><br />
            ${escapeHtml(activeStyle)}
          </div>
        </header>

        <section class="summary">
          <div><strong>${completedRooms.length}</strong><span>ambientes renderizados</span></div>
          <div><strong>${escapeHtml(document.querySelector("#floorSelect").value)}</strong><span>piso</span></div>
          <div><strong>${escapeHtml(document.querySelector("#wallSelect").value)}</strong><span>paredes</span></div>
          <div><strong>${escapeHtml(document.querySelector("#furnishSelect").value)}</strong><span>mobiliario</span></div>
        </section>

        <h2>Plano adjuntado</h2>
        <section class="plan-wrap">
          ${getPlanPreviewForReport()}
        </section>

        <h2>Renders por ambiente</h2>
        <section class="renders">
          ${completedRooms
            .map(
              (room) => `
                <article class="render">
                  <img src="${room.image}" alt="Render ${escapeHtml(room.name)}" />
                  <div>
                    <strong>${escapeHtml(room.name)} - ${escapeHtml(room.view)}</strong>
                    <small>Modelo: ${escapeHtml(room.model || "OpenRouter")}</small>
                  </div>
                </article>
              `
            )
            .join("")}
        </section>

        <footer>
          Generado por blueprint-2-real. Las imagenes son visualizaciones generadas por IA a partir del plano y parametros seleccionados.
        </footer>
      </body>
    </html>
  `;
}

pdfButton.addEventListener("click", () => {
  if (!renderedRooms.filter(Boolean).length) {
    renderStatus.textContent = "Genera al menos un render antes de crear el PDF";
    return;
  }

  const reportWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!reportWindow) {
    renderStatus.textContent = "Permite ventanas emergentes para generar el reporte PDF";
    return;
  }

  reportWindow.document.open();
  reportWindow.document.write(buildReportHtml());
  reportWindow.document.close();
  reportWindow.addEventListener("load", () => {
    reportWindow.focus();
    reportWindow.print();
  });
});
