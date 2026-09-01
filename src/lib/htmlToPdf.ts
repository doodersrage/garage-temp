import { env as cloudflareEnv } from "cloudflare:workers";

export type HtmlToPdfOptions = {
  format?: "letter" | "a4";
  printBackground?: boolean;
};

function getBrowserBinding(): BrowserRun | undefined {
  try {
    return (cloudflareEnv as { BROWSER?: BrowserRun }).BROWSER;
  } catch {
    return undefined;
  }
}

/** Render HTML to PDF bytes via Cloudflare Browser Run (when bound). */
export async function renderHtmlToPdf(
  html: string,
  options: HtmlToPdfOptions = {},
): Promise<Uint8Array | null> {
  const browser = getBrowserBinding();
  if (!browser) return null;

  try {
    const response = await browser.quickAction("pdf", {
      html,
      pdfOptions: {
        format: options.format ?? "letter",
        printBackground: options.printBackground ?? true,
        margin: {
          top: "0.5in",
          right: "0.5in",
          bottom: "0.5in",
          left: "0.5in",
        },
      },
    });

    if (!response.ok) {
      console.error("Browser Run PDF failed:", response.status, await response.text().catch(() => ""));
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/pdf")) {
      console.error("Browser Run PDF returned unexpected content type:", contentType);
      return null;
    }

    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    console.error("Browser Run PDF error:", error);
    return null;
  }
}
