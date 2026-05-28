const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
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

function buildPrompt({ style, floor, walls, furnish, fidelity, sourceKind }) {
  return [
    "Create a photorealistic architectural interior render from the provided floor plan reference.",
    "Preserve the floor plan geometry, wall openings, doors, windows, circulation paths, and room proportions as much as possible.",
    "Interpret the plan as a residential interior and furnish each visible room with coherent, correctly scaled furniture and appliances.",
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

function findGeneratedImage(output) {
  for (const item of output || []) {
    if (item.type === "image_generation_call" && item.result) {
      return item.result;
    }

    if (Array.isArray(item.content)) {
      const image = item.content.find((content) => content.type === "image_generation_call");
      if (image?.result) return image.result;
    }
  }

  return null;
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Metodo no permitido." });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    sendJson(response, 500, {
      error: "Falta OPENAI_API_KEY en Vercel.",
      setup: "Agrega OPENAI_API_KEY en Project Settings > Environment Variables y vuelve a desplegar."
    });
    return;
  }

  try {
    const body = await parseBody(request);
    const { imageDataUrl, imageUrl, style, floor, walls, furnish, fidelity } = body;
    const sourceKind = imageUrl ? "url" : "upload";
    const prompt = buildPrompt({ style, floor, walls, furnish, fidelity, sourceKind });

    const content = [{ type: "input_text", text: prompt }];

    if (imageDataUrl) {
      content.push({ type: "input_image", image_url: imageDataUrl });
    } else if (imageUrl) {
      content.push({ type: "input_image", image_url: imageUrl });
    }

    const openAiResponse = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_RENDER_MODEL || "gpt-5-mini",
        input: [
          {
            role: "user",
            content
          }
        ],
        tools: [
          {
            type: "image_generation",
            size: "1024x1024",
            quality: "medium",
            format: "png"
          }
        ],
        tool_choice: { type: "image_generation" }
      })
    });

    const result = await openAiResponse.json();

    if (!openAiResponse.ok) {
      sendJson(response, openAiResponse.status, {
        error: result.error?.message || "OpenAI no pudo generar el render.",
        details: result.error || result
      });
      return;
    }

    const imageBase64 = findGeneratedImage(result.output);

    if (!imageBase64) {
      sendJson(response, 502, {
        error: "La respuesta no incluyo una imagen generada.",
        details: result
      });
      return;
    }

    sendJson(response, 200, {
      image: `data:image/png;base64,${imageBase64}`,
      model: result.model,
      id: result.id
    });
  } catch (error) {
    sendJson(response, 400, {
      error: error.message || "No se pudo procesar la solicitud."
    });
  }
}
