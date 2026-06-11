declare module 'html-pdf-node' {
  interface Options {
    format?: 'A4' | 'A3' | 'Letter';
    margin?: { top?: string; right?: string; bottom?: string; left?: string };
    printBackground?: boolean;
    args?: string[];
    executablePath?: string;
  }
  interface File {
    content?: string;
    url?: string;
  }
  function generatePdf(file: File, options: Options): Promise<Buffer>;
  export = { generatePdf };
}
