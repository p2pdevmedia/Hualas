import { createRequire } from 'node:module';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const playwrightPackage =
  process.env.PLAYWRIGHT_CORE_PACKAGE ??
  '/tmp/hualas-playwright/node_modules/playwright-core';
const { chromium } = require(playwrightPackage);

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3003';
const chromePath =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const root = process.cwd();
const demoPath = join(root, 'docs/video-profesores-web-demo.json');
const framesDir = join(root, 'docs/video-profesores-web-frames');

const demo = JSON.parse(await readFile(demoPath, 'utf8'));

async function waitForApp(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => document.fonts?.ready ?? Promise.resolve());
  await page
    .addStyleTag({
      content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
      [data-nextjs-toast], nextjs-portal {
        display: none !important;
      }
    `,
    })
    .catch(() => {});
  const laterButton = page.getByRole('button', { name: /despu[eé]s/i });
  if (
    await laterButton
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await laterButton
      .first()
      .click()
      .catch(() => {});
  }
  await page.waitForTimeout(650);
}

async function go(page, route) {
  await page.goto(new URL(route, baseURL).href, {
    waitUntil: 'domcontentloaded',
  });
  await waitForApp(page);
}

async function shot(page, name) {
  await page.evaluate(() => {
    document.body.style.cursor = 'none';
  });
  const target = join(framesDir, `${name}.png`);
  await page.screenshot({ path: target, fullPage: false });
  console.log(target);
}

async function main() {
  await rm(framesDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Salta',
    colorScheme: 'light',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  await go(page, '/login');
  await shot(page, '01-login');

  await page.locator('input[name="email"]').fill(demo.login.email);
  await page.locator('input[name="password"]').fill(demo.login.password);
  await page.locator('button[type="submit"]').click();
  await page
    .waitForURL(/\/my-activities|\/activities|\/$/, {
      timeout: 15000,
    })
    .catch(() => {});

  await go(page, demo.routes.agenda);
  await shot(page, '02-agenda');

  const detailButton = page
    .getByRole('button', { name: /ver detalle/i })
    .first();
  if (await detailButton.count()) {
    await detailButton.click();
    await waitForApp(page);
    await shot(page, '03-agenda-detail');
  } else {
    await shot(page, '03-agenda-detail');
  }

  await go(page, demo.routes.session);
  await shot(page, '04-session-hub');

  await go(page, demo.routes.attendance);
  await shot(page, '05-attendance');

  await go(page, demo.routes.observations);
  await shot(page, '06-observations');

  await go(page, demo.routes.description);
  await shot(page, '07-description');

  await go(page, demo.routes.information);
  await shot(page, '08-family-info');

  const reportButton = page
    .getByRole('button', { name: /hacer reporte/i })
    .first();
  if (await reportButton.count()) {
    await reportButton.scrollIntoViewIfNeeded();
    await reportButton.click();
    await waitForApp(page);
  }
  await shot(page, '09-report-modal');

  await go(page, demo.routes.chat);
  await page
    .waitForSelector('text=Ana Vidal', { timeout: 10000 })
    .catch(() => {});
  await waitForApp(page);
  await shot(page, '10-chat');

  await go(page, demo.routes.news);
  await shot(page, '11-news');

  await go(page, demo.routes.payments);
  await shot(page, '12-payments-history');

  const bankingTab = page.getByRole('tab', { name: /mis datos bancarios/i });
  if (await bankingTab.count()) {
    await bankingTab.click();
    await waitForApp(page);
  }
  await shot(page, '13-payments-banking');

  await context.close();
  await browser.close();
}

await main();
