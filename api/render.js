const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

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
      if (body.length > 10_000_000) {
        reject(new Error("Payload demasiado grande. Usa una imagen optimizada menor a 10 MB."));
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

function buildPrompt({ style, floor, walls, furnish, fidelity, sourceKind, roomName, roomType }) {
  return [
    `Create one photorealistic architectural interior render for the ${roomName || roomType || "selected room"} from the provided floor plan reference.`,
    "Preserve the floor plan geometry, wall openings, doors, windows, circulation paths, and room proportions as much as possible.",
    "Focus only on this room. Do not render a collage, whole apartment overview, or unrelated rooms.",
    "Interpret the plan as a residential interior and furnish the room with coherent, correctly scaled furniture and appliances.",
    `Interior style: ${style || "Japandi"}.`,
    `Floor material: ${floor || "natural oak"}.`,
    `Wall finish: ${walls || "warm white plaster"}.`,
    `Furnishing level: ${furnish || "complete"}.`,
    `Geometry fidelity target: ${fidelity || 88} percent.`,
    sourceKind === "url"
      ? "The floor plan is provided as a remote image URL."
      : "The floor plan is provided as an uploaded image.",
    "Do not add impossible doors, extra windows, warped walls, duplicate toilets, or blocked pathways.",
    "Output a polished, realistic interior visualization suitable for a client presentation."
  ].join(" ");
}

function findGeneratedImage(result) {
  const message = result.choices?.[0]?.message;
  const image = message?.images?.[0]?.image_url?.url;
  return image || null;
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
    const { imageDataUrl, imageUrl, style, floor, walls, furnish, fidelity, roomName, roomType } = body;
    const sourceKind = imageUrl ? "url" : "upload";
    const prompt = buildPrompt({
      style,
      floor,
      walls,
      furnish,
      fidelity,
      sourceKind,
      roomName,
      roomType
    });

    const content = [{ type: "text", text: prompt }];

    if (imageDataUrl) {
      content.push({ type: "image_url", image_url: { url: imageDataUrl } });
    } else if (imageUrl) {
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
        model: process.env.OPENROUTER_RENDER_MODEL || "google/gemini-2.5-flash-image",
        modalities: ["image", "text"],
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
      model: result.model,
      id: result.id
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error.message || "No se pudo procesar la solicitud."
    });
  }
}
