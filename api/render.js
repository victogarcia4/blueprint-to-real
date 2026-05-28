const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_RENDER_MODEL = "black-forest-labs/flux.2-klein-4b";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 25_000_000) {
        reject(new Error("Payload demasiado grande. Usa imagenes optimizadas o menos archivos."));
        request.destroy();
      }
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON invalido."));
      }
    });

    request.on("error", reject);
  });
}

function buildPrompt({ style, floor, walls, furnish, fidelity, sourceKind, roomName, roomType, referenceCount }) {
  const isWholeHouse = roomType === "whole house";
  const framing = isWholeHouse
    ? "Create a single elegant front facade render of the complete house from outside at street or garden level. Show only the exterior elevation, roofline, windows, doors, entry, exterior materials, landscaping, and outdoor context."
    : `Create a single photorealistic eye-level interior render of only the ${roomName || roomType || "selected room"}. The camera must be inside that room, not above the plan.`;

  return [
    framing,
    "Use the attached plan only as spatial reference. Do not copy the floor plan drawing into the final image.",
    "Do not create a top-down plan, blueprint, dollhouse, exploded axonometric, multi-level collage, exterior-and-plan hybrid, or split-level diagram.",
    isWholeHouse
      ? "The result must not show the inside of the house, cutaway interiors, rooms, furniture, appliances, exposed floor plans, sectional views, or open-wall views. Keep walls opaque and render a normal exterior facade photograph."
      : "The result must look like a realistic client-facing interior photograph taken from standing height.",
    "Respect approximate wall openings, doors, windows, circulation paths, and room proportions as much as possible.",
    "Furnish with coherent, correctly scaled furniture and appliances.",
    `Interior style: ${style || "Japandi"}.`,
    `Floor material: ${floor || "natural oak"}.`,
    `Wall finish: ${walls || "warm white plaster"}.`,
    `Furnishing level: ${furnish || "complete"}.`,
    `Geometry fidelity target: ${fidelity || 88} percent.`,
    `Reference files available to analyze: ${referenceCount || 1}. Use all attached images as references when deciding exterior, plan, room layout, and style.`,
    sourceKind === "url"
      ? "The floor plan is provided as a remote image URL."
      : "The floor plan is provided as an uploaded image.",
    "Do not add impossible doors, extra windows, warped walls, duplicate toilets, blocked pathways, or unrelated floors.",
    isWholeHouse
      ? "Output a polished, realistic exterior facade visualization suitable for a client presentation."
      : "Output a polished, realistic interior visualization suitable for a client presentation."
  ].join(" ");
}

function findGeneratedImage(result) {
  const message = result.choices?.[0]?.message;
  const image = message?.images?.[0]?.image_url?.url;
  return image || null;
}

function selectRenderModel() {
  if (process.env.OPENROUTER_RENDER_MODEL) {
    return process.env.OPENROUTER_RENDER_MODEL;
  }

  return DEFAULT_RENDER_MODEL;
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.end();
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Metodo no permitido." });
    return;
  }

  if (!process.env.OPENROUTER_API_KEY) {
    sendJson(response, 500, {
      error: "Falta OPENROUTER_API_KEY en Vercel.",
      setup: "Agrega OPENROUTER_API_KEY en Project Settings > Environment Variables y vuelve a desplegar."
    });
    return;
  }

  try {
    const body = await parseBody(request);
    const { imageDataUrl, imageDataUrls, imageUrl, style, floor, walls, furnish, fidelity, roomName, roomType } = body;
    const referenceImages = Array.isArray(imageDataUrls) && imageDataUrls.length ? imageDataUrls : imageDataUrl ? [imageDataUrl] : [];
    const sourceKind = imageUrl ? "url" : "upload";
    const selectedModel = selectRenderModel();
    const prompt = buildPrompt({
      style,
      floor,
      walls,
      furnish,
      fidelity,
      sourceKind,
      roomName,
      roomType,
      referenceCount: referenceImages.length + (imageUrl ? 1 : 0)
    });

    const content = [{ type: "text", text: prompt }];

    referenceImages.slice(0, 4).forEach((image) => {
      content.push({ type: "image_url", image_url: { url: image } });
    });

    if (!referenceImages.length && imageUrl) {
      content.push({ type: "image_url", image_url: { url: imageUrl } });
    }

    const openRouterResponse = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://blueprint-2-real.vercel.app",
        "X-Title": "blueprint-2-real"
      },
      body: JSON.stringify({
        model: selectedModel,
        modalities: ["image"],
        messages: [
          {
            role: "user",
            content
          }
        ],
        image_config: {
          aspect_ratio: "1:1"
        }
      })
    });

    const result = await openRouterResponse.json();

    if (!openRouterResponse.ok) {
      sendJson(response, openRouterResponse.status, {
        error: result.error?.message || "OpenRouter no pudo generar el render.",
        details: result.error || result
      });
      return;
    }

    const image = findGeneratedImage(result);

    if (!image) {
      sendJson(response, 502, {
        error: "La respuesta no incluyo una imagen generada.",
        details: result
      });
      return;
    }

    sendJson(response, 200, {
      image,
      model: result.model || selectedModel,
      id: result.id
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error.message || "No se pudo procesar la solicitud."
    });
  }
}
