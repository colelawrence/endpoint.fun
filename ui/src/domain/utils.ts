export function jsonToB64(some: any): string {
  return Buffer.from(some, 'utf-8').toString('base64');
}
