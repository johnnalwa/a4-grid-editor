// CDN-based PDF processing to avoid local dependency issues

export interface PdfPageImage {
  src: string;
  name: string;
  width: number;
  height: number;
}

/**
 * Dynamically loads PDF.js from CDN
 */
async function loadPdfJs(): Promise<any> {
  const PDFJS_VERSION = "3.11.174";
  
  if (typeof window === "undefined") return null;

  const setWorker = (pdfjsLib: any) => {
    if (pdfjsLib && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;
    }
    return pdfjsLib;
  };

  if ((window as any).pdfjsLib) {
    return setWorker((window as any).pdfjsLib);
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    // Standard UMD build for best compatibility
    script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
    script.async = true;
    
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (pdfjsLib) {
        resolve(setWorker(pdfjsLib));
      } else {
        reject(new Error("pdfjsLib not found on window after script load"));
      }
    };
    
    script.onerror = () => reject(new Error("Failed to load PDF.js script from CDN"));
    document.head.appendChild(script);
  });
}

/**
 * Converts a PDF file into an array of PNG images (one per page)
 */
export async function convertPdfToImages(file: File): Promise<PdfPageImage[]> {
  const pdfjs = await loadPdfJs();
  if (!pdfjs) throw new Error("PDF.js could not be loaded");
  
  // Re-assert workerSrc with the same version
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  }
  
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const images: PdfPageImage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    // Use scale 2 for better quality
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    images.push({
      src: canvas.toDataURL("image/png"),
      name: `${file.name.replace(/\.pdf$/i, "")}-page-${i}.png`,
      width: viewport.width,
      height: viewport.height,
    });
    
    // Cleanup to prevent memory leaks
    canvas.width = 0;
    canvas.height = 0;
  }

  return images;
}
