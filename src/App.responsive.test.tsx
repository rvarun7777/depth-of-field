import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const VITE_BIN = fileURLToPath(
  new URL("../node_modules/vite/bin/vite.js", import.meta.url)
);

async function getOpenPort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  server.close();
  await once(server, "close");

  if (!address || typeof address === "string") {
    throw new Error("Could not allocate a local test port");
  }

  return address.port;
}

async function startVite(port: number) {
  const appUrl = `http://127.0.0.1:${port}/depth-of-field/`;
  const server = spawn(
    process.execPath,
    [VITE_BIN, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  let output = "";
  server.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  server.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(appUrl);
      if (response.ok) {
        return { server, appUrl };
      }
    } catch {
      // Keep polling until the dev server accepts connections.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  server.kill();
  throw new Error(`Vite server did not start:\n${output}`);
}

test("phone layouts fit the viewport with touch controls and collapsed tips", async () => {
  const port = await getOpenPort();
  const { server, appUrl } = await startVite(port);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

    await page.goto(appUrl, { waitUntil: "networkidle" });

    const sensorSelect = page.getByRole("combobox").first();
    const width = await sensorSelect.evaluate((select) => ({
      client: select.clientWidth,
      scroll: select.scrollWidth,
    }));

    for (const screenWidth of [320, 360, 390, 430, 768, 1280]) {
      await page.setViewportSize({ width: screenWidth, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `no horizontal overflow at ${screenWidth}px`);
      const tips = page.getByRole("button", { name: "Show tips" });
      assert.equal(await tips.getAttribute("aria-expanded"), "false");
      if (screenWidth < 768) {
        assert.ok((await tips.boundingBox())!.height >= 44);
        const goalSelect = page.getByLabel("What are you photographing?");
        assert.ok((await goalSelect.boundingBox())!.height >= 44);
        assert.equal(await goalSelect.evaluate(e => getComputedStyle(e).fontSize), "16px");
        const cameraLink = page.getByRole("link", { name: "Camera & lens", exact: true });
        await cameraLink.click();
        assert.equal(new URL(page.url()).hash, "#camera-controls");
      }
    }
    await browser.close();

    assert.ok(
      width.client >= width.scroll,
      `expected sensor select visible width ${width.client}px to fit ${width.scroll}px of content`
    );
  } finally {
    await browser?.close();
    server.kill();
    await once(server, "exit").catch(() => undefined);
  }
});


test("photo coach loads valid lessons and explains live settings on mobile", async () => {
  const port = await getOpenPort();
  const { server, appUrl } = await startVite(port);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "en-US" });
    await page.goto(appUrl, { waitUntil: "networkidle" });
    const coach = page.getByRole("region", { name: "Photography coach" });
    assert.equal(await coach.getByRole("button", { name: "Show tips" }).getAttribute("aria-expanded"), "false");
    await coach.getByRole("button", { name: "Show tips" }).click();
    const goal = page.getByLabel("What are you photographing?");
    for (const [value, label, focal, aperture] of [
      ["portrait", "portrait of my wife", "55", "5.6"],
      ["together", "both of us in focus", "35", "8"],
      ["scenery", "scenery and buildings", "18", "8"],
    ]) {
      await goal.selectOption(value);
      await coach.getByRole("button", { name: `Load ${label} lesson` }).click();
      assert.equal(await page.getByRole("combobox", { name: "Camera", exact: true }).inputValue(), "nikon-d5500");
      assert.match(await page.getByRole("combobox", { name: "Lens", exact: true }).inputValue(), /18-55mm/);
      assert.equal(await page.getByRole("slider", { name: "focal length", exact: true }).getAttribute("aria-valuenow"), focal);
      assert.equal(await page.getByRole("slider", { name: "aperture", exact: true }).getAttribute("aria-valuenow"), aperture);
      assert.match(await coach.innerText(), /Close to the simulator/);
    }
    const apertureSlider = page.getByRole("slider", { name: "aperture", exact: true });
    await apertureSlider.focus();
    await page.keyboard.press("Home");
    assert.match(await coach.innerText(), /brighter than the simulator/);
    await page.getByRole("button", { name: "Toggle color mode" }).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    await coach.getByRole("button", { name: "Hide tips" }).click();
    assert.equal(await coach.getByRole("button", { name: "Show tips" }).getAttribute("aria-expanded"), "false");
    await coach.getByRole("button", { name: "Show tips" }).click();
    assert.equal(await coach.getByRole("button", { name: "Hide tips" }).getAttribute("aria-expanded"), "true");
  } finally {
    await browser?.close();
    server.kill();
    await once(server, "exit").catch(() => undefined);
  }
});


test("automatic D5500 settings follow light and yield to manual edits", async () => {
  const port = await getOpenPort();
  const { server, appUrl } = await startVite(port);
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, locale: "en-US" });
    await page.goto(appUrl, { waitUntil: "networkidle" });
    const automatic = page.getByRole("checkbox", { name: "Automatically adapt settings to the light" });
    assert.equal(await automatic.isChecked(), true);
    const intensity = page.getByRole("slider", { name: "Light intensity", exact: true });
    await intensity.focus(); await page.keyboard.press("Home");
    const dimIso = Number(await page.getByRole("combobox", { name: "Photo ISO", exact: true }).inputValue());
    await intensity.focus(); await page.keyboard.press("End");
    await page.waitForFunction(dim => Number(document.querySelector<HTMLSelectElement>('[aria-label="Photo ISO"]')?.value) < dim, dimIso);
    await page.getByLabel("What are you photographing?").selectOption("together");
    await page.waitForFunction(() => document.querySelector('[role="slider"][aria-label="aperture"]')?.getAttribute('aria-valuenow') === '8');
    const aperture = page.getByRole("slider", { name: "aperture", exact: true });
    await aperture.focus(); await page.keyboard.press("Home");
    assert.equal(await automatic.isChecked(), false);
    const manualAperture = await aperture.getAttribute("aria-valuenow");
    const manualIso = await page.getByRole("combobox", { name: "Photo ISO", exact: true }).inputValue();
    await intensity.focus(); await page.keyboard.press("Home");
    assert.equal(await aperture.getAttribute("aria-valuenow"), manualAperture);
    assert.equal(await page.getByRole("combobox", { name: "Photo ISO", exact: true }).inputValue(), manualIso);
    await page.getByText("Automatically adapt settings to the light", { exact: true }).click();
    assert.equal(await automatic.isChecked(), true);
    await page.getByRole("combobox", { name: "Camera", exact: true }).selectOption("sony-a6700");
    assert.match(await page.getByRole("region", { name: "Automatic photo settings" }).innerText(), /Automatic settings are paused/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  } finally {
    await browser?.close();
    server.kill();
    await once(server, "exit").catch(() => undefined);
  }
});
