declare module 'tesseract.js' {
  export interface TesseractWorker {
    loadLanguage(lang: string): Promise<void>;
    initialize(lang: string): Promise<void>;
    setParameters(params: Record<string, string | number | boolean>): Promise<void>;
    recognize(image: any): Promise<{ data: { text: string } }>;
    terminate(): Promise<void>;
  }

  export function createWorker(options?: any): Promise<TesseractWorker>;
}
