// sharp@0.35 trae sus tipos en lib/index.d.ts pero su mapa "exports" no los expone
// bajo moduleResolution NodeNext. Declaración mínima y tipada de lo que usamos acá.
declare module "sharp" {
  interface Sharp {
    resize(width: number, height: number, opts?: { kernel?: string }): Sharp;
    sharpen(opts?: { sigma?: number; m1?: number; m2?: number }): Sharp;
    png(opts?: { compressionLevel?: number }): Sharp;
    toBuffer(): Promise<Buffer>;
  }
  function sharp(input: Buffer): Sharp;
  export default sharp;
}
