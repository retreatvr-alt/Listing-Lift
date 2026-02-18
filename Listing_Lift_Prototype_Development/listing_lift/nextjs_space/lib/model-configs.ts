export const MODEL_OPTIONS = [
  { id: "gpt-image-1.5", label: "GPT Image 1.5", description: "Strong photorealism", badge: "Default" },
  { id: "flux-kontext", label: "FLUX.1 Kontext", description: "Best for structural edits", badge: null },
  { id: "qwen-image-edit", label: "Qwen Image Edit", description: "SOTA consistency", badge: null },
  { id: "magnific", label: "Magnific Upscaler", description: "Detail enhancement", badge: "Upscaler" },
];

export const DEFAULT_MODEL_ID = "gpt-image-1.5";

export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  "gpt-image-1.5": "GPT Image 1.5",
  "flux-kontext": "FLUX.1 Kontext",
  "qwen-image-edit": "Qwen Image Edit",
  "magnific": "Magnific Upscaler",
};

export const ALLOWED_MODELS = ["gpt-image-1.5", "flux-kontext", "qwen-image-edit", "magnific"];
