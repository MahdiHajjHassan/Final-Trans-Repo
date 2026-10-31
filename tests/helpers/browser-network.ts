import type { Browser } from "@playwright/test";

/** Settle deliberate Docker bridge changes before application actions resume. */
export async function settleBrowserNetwork(browser: Browser, origin: string) {
  const probe = await browser.newContext({ ignoreHTTPSErrors: false });
  try {
    const page = await probe.newPage();
    let stable = 0;
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        // Three network-idle health navigations cover delayed network-change
        // notifications after Compose reports the changed service healthy.
        const response = await page.goto(`${origin}/api/health`, {
          waitUntil: "networkidle",
          timeout: 5000,
        });
        if (response?.status() !== 200)
          throw new Error(`Browser HTTPS health probe failed: HTTP ${response?.status()}`);
        if (++stable === 3) return;
      } catch (error) {
        const transient =
          String(error).includes("ERR_NETWORK_CHANGED") ||
          String(error).includes(
            'interrupted by another navigation to "chrome-error://chromewebdata/"',
          );
        if (!transient) throw error;
        stable = 0;
      }
    }
    throw new Error("Browser network did not stabilize after the Docker service change");
  } finally {
    await probe.close();
  }
}
