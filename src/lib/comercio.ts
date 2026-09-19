export const comercioCorto = (comercio: string): string =>
  comercio.split(" - ")[0].trim();