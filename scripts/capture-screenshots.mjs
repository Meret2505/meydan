import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "https://meydan-chi.vercel.app";
const OUT = "play/screenshots";
mkdirSync(OUT, { recursive: true });

// 9:16 phone viewport, 2x DSF → 1080×1920 PNGs (Play's standard phone size).
const VIEWPORT = { width: 540, height: 960 };
const DSF = 2;

async function shot(page, name) {
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log("✓", name);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: DSF });
const page = await ctx.newPage();

try {
  // 1. Login splash (RU) — primary brand frame
  await page.goto(`${BASE}/ru/login`);
  await shot(page, "01-login-ru");

  // 2. Phone login form (RU) — call-to-action input
  await page.goto(`${BASE}/ru/login/phone`);
  await shot(page, "02-phone-login-ru");

  // 3. Phone login form with content typed (shows the formatted phone field)
  await page.locator('input[name="phone"]').click();
  await page.keyboard.type("65123456", { delay: 30 });
  await page.locator('input[name="password"]').click();
  await page.keyboard.type("password", { delay: 30 });
  await shot(page, "03-phone-login-filled");

  // 4. Login splash (TM) — Turkmen variant
  await page.goto(`${BASE}/tm/login`);
  await shot(page, "04-login-tm");

  // 5. Privacy policy
  await page.goto(`${BASE}/ru/privacy`);
  await shot(page, "05-privacy-ru");

  // 6. Offline screen
  await page.goto(`${BASE}/ru/offline`);
  await shot(page, "06-offline-ru");
} finally {
  await browser.close();
}
