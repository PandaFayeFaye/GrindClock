// Tesseract.js loaded from a CDN on demand -- avoids bundling the wasm/worker
// assets into the app bundle for a feature most sessions won't touch.
// Pinned to an EXACT version (not a floating "@5") -- Tesseract.js resolves its
// worker-script/core-wasm/language-data URLs from its own package version, and
// a version drift between the loaded script and what it then tries to fetch is
// a well-known cause of it silently producing garbage text instead of an error.
const TESSERACT_VERSION = "5.1.1";
const TESSERACT_CDN = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js`;

const OCR_TIMEOUT_MS = 30_000;

declare global {
  interface Window {
    Tesseract?: {
      recognize: (
        image: File | string,
        lang: string,
        opts?: Record<string, unknown>,
      ) => Promise<{ data: { text: string; confidence: number } }>;
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("OCR timed out")), ms)),
  ]);
}

// Tesseract can "succeed" while returning pure noise (most often a version
// mismatch between the loaded script and the worker/core/lang data it then
// fetches) -- reject obviously-garbage output instead of handing it to the
// parser and letting the user save nonsense.
function looksLikeGarbage(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 2) return true;
  const meaningfulChars = trimmed.match(/[一-鿿0-9]/g)?.length ?? 0;
  return meaningfulChars / trimmed.length < 0.35;
}

export async function recognizeImageText(file: File, onProgress?: (pct: number) => void): Promise<string> {
  await withTimeout(loadTesseract(), OCR_TIMEOUT_MS);
  if (!window.Tesseract) throw new Error("OCR library did not load");
  const result = await withTimeout(
    window.Tesseract.recognize(file, "chi_sim+eng", {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === "recognizing text" && onProgress) onProgress(Math.round(m.progress * 100));
      },
    }),
    OCR_TIMEOUT_MS,
  );
  if (looksLikeGarbage(result.data.text)) {
    throw new Error("OCR produced unreadable output");
  }
  return result.data.text;
}
