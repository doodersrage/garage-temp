declare module "*?raw" {
  const contents: string;
  export default contents;
}

declare module "cloudflare:email" {
  export class EmailMessage {
    constructor(from: string, to: string, raw: string);
  }
}

declare module "cloudflare:workers" {
  export const env: Record<string, unknown> & {
    MAILER?: { send: (message: unknown) => Promise<void> };
  };
}
