import { chromium, firefox, webkit } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const root = process.cwd(),
  slugs = [JSON.parse(await readFile("package.json", "utf8")).name];
const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(req.url.split("?")[0]),
      file = path.resolve(root, "." + url);
    if (file !== root && !file.startsWith(root + path.sep)) throw Error();
    const name = url.endsWith("/") ? path.join(file, "index.html") : file;
    res.setHeader(
      "Content-Type",
      name.endsWith(".js")
        ? "text/javascript"
        : name.endsWith(".css")
          ? "text/css"
          : "text/html",
    );
    res.end(await readFile(name));
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const evidence = [];
const { execFileSync } = await import("node:child_process");
execFileSync(
  process.platform === "win32" ? "python" : "python3",
  [
    "-c",
    "import pathlib,zipfile; z=next(pathlib.Path('.').glob('dist/*-1.0.0.zip')); zipfile.ZipFile(z).extractall('.package-qa')",
  ],
  { stdio: "inherit" },
);
try {
  for (const slug of slugs) {
    await mkdir(`evidence`, { recursive: true });
    for (const [browserName, type] of Object.entries({
      chromium,
      firefox,
      webkit,
    })) {
      const browser = await type.launch({ headless: true });
      for (const [mode, entry] of [
        ["source", `${base}/`],
        ["package", `${base}/.package-qa/index.html`],
      ]) {
        const context = await browser.newContext({
            viewport: { width: 1280, height: 900 },
          }),
          page = await context.newPage(),
          errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        console.log(`${slug}: ${browserName} ${mode}`);
        await page.goto(entry);
        await page.locator("#summary").waitFor();
        assert.equal(
          await page.locator("#form").evaluate((f) => f.checkValidity()),
          true,
        );
        assert.ok(await page.locator("#summary").textContent());
        if (slug !== "picture-hanging-helper") {
          const options = page.locator("#diagram-option option");
          const last = (await options.count()) - 1;
          await page.locator("#diagram-option").selectOption(String(last));
          assert.equal(
            await page.locator("#diagram-option").inputValue(),
            String(last),
          );
          assert.match(
            await page.locator("#diagram-caption").textContent(),
            /Shown orientation/,
          );
        }
        await page.locator("#name").fill("A <safe> plan");
        await page.locator("#name").press("Enter");
        assert.equal(
          await page.locator("#plan-title").textContent(),
          "A <safe> plan",
        );
        await page.locator("#save").click();
        await page.getByText("Saved plans (1/100)", { exact: true }).waitFor();
        assert.equal(
          await page.locator("#saved strong").textContent(),
          "A <safe> plan",
        );
        const first = JSON.parse(
          await page.evaluate(
            (slug) => localStorage.getItem(`forge:${slug}:v1`),
            slug,
          ),
        );
        assert.equal(first.plans.length, 1);
        await page
          .locator("#saved button")
          .filter({ hasText: "Delete" })
          .click();
        await page.locator("#confirm-cancel").click();
        assert.equal(
          JSON.parse(
            await page.evaluate(
              (slug) => localStorage.getItem(`forge:${slug}:v1`),
              slug,
            ),
          ).plans.length,
          1,
        );
        await page
          .locator("#saved button")
          .filter({ hasText: "Delete" })
          .click();
        await page.locator("#confirm-apply").click();
        await page.locator("#undo").click();
        await page.getByText("Saved plans (1/100)", { exact: true }).waitFor();
        const downloadEvent = page.waitForEvent("download");
        await page.locator("#export").click();
        const dl = await downloadEvent;
        const downloaded = await readFile(await dl.path(), "utf8");
        assert.deepEqual(JSON.parse(downloaded), first);
        await page.locator("#import").setInputFiles({
          name: "backup.json",
          mimeType: "application/json",
          buffer: Buffer.from(downloaded),
        });
        await page.locator("#confirm").waitFor();
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("#confirm").isVisible(), false);
        await page.locator("#import").setInputFiles({
          name: "invalid.json",
          mimeType: "application/json",
          buffer: Buffer.from("{bad"),
        });
        await page.waitForFunction(() =>
          document
            .querySelector("#notice")
            .textContent.includes("not valid JSON"),
        );
        assert.match(
          await page.locator("#notice").textContent(),
          /not valid JSON/,
        );
        await page.locator("#import").setInputFiles({
          name: "backup.json",
          mimeType: "application/json",
          buffer: Buffer.from(downloaded),
        });
        await page.locator("#confirm-apply").click();
        await page.waitForFunction(() =>
          document
            .querySelector("#notice")
            .textContent.includes("Backup imported"),
        );
        assert.match(
          await page.locator("#notice").textContent(),
          /Backup imported/,
        );
        // A competing tab writes another valid list. Current tab must preserve it.
        const other = await context.newPage();
        await other.goto(entry);
        const raced = {
          ...first,
          plans: [{ ...first.plans[0], name: "Other tab" }],
        };
        await other.evaluate(
          ({ slug, bytes }) => localStorage.setItem(`forge:${slug}:v1`, bytes),
          { slug, bytes: JSON.stringify(raced) },
        );
        await page.locator("#storage-alert").waitFor();
        await page.locator("#save").click();
        assert.equal(
          JSON.parse(
            await page.evaluate(
              (slug) => localStorage.getItem(`forge:${slug}:v1`),
              slug,
            ),
          ).plans[0].name,
          "Other tab",
        );
        await other.close();
        // Unreadable storage stays byte-identical; reviewed replacement recovers it.
        await page.evaluate(
          (slug) =>
            localStorage.setItem(`forge:${slug}:v1`, "{original broken bytes"),
          slug,
        );
        await page.reload();
        await page.locator("#raw").waitFor();
        await page.locator("#save").click();
        assert.equal(
          await page.evaluate(
            (slug) => localStorage.getItem(`forge:${slug}:v1`),
            slug,
          ),
          "{original broken bytes",
        );
        await page.locator("#import").setInputFiles({
          name: "backup.json",
          mimeType: "application/json",
          buffer: Buffer.from(downloaded),
        });
        assert.equal(
          await page.evaluate(
            (slug) => localStorage.getItem(`forge:${slug}:v1`),
            slug,
          ),
          "{original broken bytes",
        );
        await page.locator("#confirm-apply").click();
        assert.equal(
          JSON.parse(
            await page.evaluate(
              (slug) => localStorage.getItem(`forge:${slug}:v1`),
              slug,
            ),
          ).plans.length,
          1,
        );

        // A slow prior file must never replace the latest selected preview.
        await page.evaluate(() => {
          const original = File.prototype.text;
          File.prototype.text = async function () {
            if (this.name === "slow.json")
              await new Promise((resolve) => setTimeout(resolve, 250));
            return original.call(this);
          };
        });
        const oldFile = {
            ...first,
            plans: [{ ...first.plans[0], name: "Old selection" }],
          },
          newFile = {
            ...first,
            plans: [{ ...first.plans[0], name: "Latest selection" }],
          };
        await page.locator("#import").setInputFiles({
          name: "slow.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(oldFile)),
        });
        await page.locator("#import").setInputFiles({
          name: "latest.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(newFile)),
        });
        await page.locator("#confirm").waitFor();
        await page.waitForTimeout(350);
        assert.match(
          await page.locator("#confirm-text").textContent(),
          /latest.json/,
        );
        await page.locator("#confirm-apply").click();
        assert.equal(
          JSON.parse(
            await page.evaluate(
              (slug) => localStorage.getItem(`forge:${slug}:v1`),
              slug,
            ),
          ).plans[0].name,
          "Latest selection",
        );
        // Recovery cannot replace another tab's repair of the original corrupt bytes.
        await page.evaluate(
          (slug) =>
            localStorage.setItem(`forge:${slug}:v1`, "{corrupt-original"),
          slug,
        );
        await page.reload();
        const repair = await context.newPage();
        await repair.goto(entry);
        await repair.evaluate(
          ({ slug, bytes }) => localStorage.setItem(`forge:${slug}:v1`, bytes),
          { slug, bytes: JSON.stringify(newFile) },
        );
        await page.waitForFunction(() =>
          document
            .querySelector("#storage-alert")
            .textContent.includes("changed in another tab"),
        );
        await page.locator("#import").setInputFiles({
          name: "older.json",
          mimeType: "application/json",
          buffer: Buffer.from(JSON.stringify(oldFile)),
        });
        await page.locator("#confirm").waitFor();
        await page.locator("#confirm-apply").click();
        assert.equal(
          JSON.parse(
            await page.evaluate(
              (slug) => localStorage.getItem(`forge:${slug}:v1`),
              slug,
            ),
          ).plans[0].name,
          "Latest selection",
        );
        await repair.close();
        await page.reload();
        // A new read failure on an initially empty store must not lead to a write.
        const emptyContext = await browser.newContext(),
          emptyPage = await emptyContext.newPage();
        await emptyPage.goto(entry);
        await emptyPage.locator("#summary").waitFor();
        await emptyPage.evaluate(() => {
          window.writeAttempts = 0;
          Storage.prototype.getItem = function () {
            throw new DOMException("read blocked", "SecurityError");
          };
          Storage.prototype.setItem = function () {
            window.writeAttempts++;
          };
        });
        await emptyPage.locator("#save").click();
        assert.equal(await emptyPage.evaluate(() => window.writeAttempts), 0);
        await emptyContext.close();

        // Quota failure must retain old storage and in-memory saved list.
        await page.evaluate(() => {
          Storage.prototype.setItem = function () {
            throw new DOMException("full", "QuotaExceededError");
          };
        });
        await page.locator("#save").click();
        assert.match(
          await page.locator("#notice").textContent(),
          /Could not save/,
        );
        assert.equal(await page.locator("#saved strong").count(), 1);
        await page.reload();
        await page.locator("#name").fill("W".repeat(120));
        await page.locator("#name").press("Enter");
        await page.setViewportSize({ width: 390, height: 844 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await page.screenshot({
          path: `evidence/${browserName}-${mode}-390.png`,
          fullPage: true,
        });
        if (browserName === "chromium" && mode === "package") {
          await page.pdf({
            path: `evidence/print-guide.pdf`,
            format: "A4",
            printBackground: true,
          });
        }
        assert.deepEqual(errors, []);
        evidence.push({
          browser: browserName,
          mode,
          flows:
            "calculate keyboard submit; save; delete/cancel/undo; export contents; import/cancel/Escape/invalid/confirm; stale-tab refusal; unreadable storage/reviewed recovery; quota failure; 390px no page overflow",
          status: "passed",
        });
        await context.close();
      }
      const direct = await browser.newPage();
      const requests = [];
      direct.on("request", (r) => {
        if (/^https?:/.test(r.url())) requests.push(r.url());
      });
      await direct.goto(
        "file:///" +
          path.join(root, ".package-qa", "index.html").replaceAll("\\", "/"),
      );
      await direct.locator("#summary").waitFor();
      assert.ok(await direct.locator("#summary").textContent());
      assert.deepEqual(requests, []);
      await direct.close();
      evidence.push({
        browser: browserName,
        mode: "file-package",
        status: "passed",
        flows: "direct offline entry calculates without network requests",
      });
      await browser.close();
    }
    await writeFile(
      `evidence/browser-verification.json`,
      JSON.stringify(
        {
          date: new Date().toISOString(),
          tool: slug,
          results: evidence.splice(0),
        },
        null,
        2,
      ),
    );
  }
  console.log(
    "Geometry browser acceptance passed for all tools, engines, source and package modes.",
  );
} finally {
  server.close();
}
