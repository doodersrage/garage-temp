declare module "cloudflare:email" {
  export class EmailMessage {
    constructor(from: string, to: string, raw: string);
  }
}

declare module "cloudflare:workers" {
  export const env: {
    MAILER: { send: (message: unknown) => Promise<void> };
  };
}
