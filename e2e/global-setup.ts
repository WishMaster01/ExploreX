import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export default async function globalSetup() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!process.env.E2E_AUTH_STATE && (!email || !password)) {
    throw new Error(
      "Provide E2E_AUTH_STATE or both E2E_EMAIL and E2E_PASSWORD for a disposable Clerk test account.",
    );
  }
  if (!email || !password || process.env.E2E_AUTH_STATE) return;

  const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
  const browser = await chromium.launch({
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {}),
  });
  try {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    await page.goto("/sign-in");
    await page.getByRole("textbox", { name: /email address/i }).fill(email);
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByRole("textbox", { name: /password/i }).fill(password);
    await page.getByRole("button", { name: /continue|sign in/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), {
      timeout: 30_000,
    });
    const stateFile = path.resolve(process.cwd(), ".playwright/auth.json");
    await mkdir(path.dirname(stateFile), { recursive: true });
    await context.storageState({ path: stateFile });
    await context.close();
  } finally {
    await browser.close();
  }
}
