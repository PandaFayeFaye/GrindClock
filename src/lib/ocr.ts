// Tesseract.js loaded from a CDN on demand -- avoids bundling the wasm/worker
// assets into the app bundle for a feature most sessions won't touch.
const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";

declare global {
  interface Window {
    Tesseract?: {
      recognize: (
        image: File | string,
        lang: string,
        opts?: Record<string, unknown>,
      ) => Promise<{ data: { text: string } }>;
    };
  }
}

let loadPromise: Promise<void> | null = null;

function loadTesseract(): Promise<void> {
  if (window.Tesseract) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = TESSERACT_CDN;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load OCR library"));
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}

export async function recognizeImageText(file: File, onProgress?: (pct: number) => void): Promise<string> {
  await loadTesseract();
  if (!window.Tesseract) throw new Error("OCR library did not load");
  const result = await window.Tesseract.recognize(file, "chi_sim+eng", {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text" && onProgress) onProgress(Math.round(m.progress * 100));
    },
  });
  return result.data.text;
}
