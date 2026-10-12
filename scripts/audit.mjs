import assert from "node:assert/strict";
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { resolve, dirname, join, relative } from "node:path";
import { createHash } from "node:crypto";

// Inventory the deliverable without opening repository metadata or private inputs.
const excluded = new Set([
  ".git", ".github", ".imd", ".agents", ".codex", ".aws",
  "node_modules", ".playwright-mcp", ".vite", ".vite-cache", ".cache",
  "coverage", "playwright-report", "test-results",
]);
const root = process.cwd();
const reportPath = "artifacts/export-audit.json";
async function inventory(dir = "") {
  const files = [];
  for (const entry of await readdir(join(root, dir), { withFileTypes: true })) {
    const path = dir ? `${dir}/${entry.name}` : entry.name;
    if (excluded.has(entry.name) || entry.name.startsWith(".env") || path === "test/scratch" || path.endsWith(".tsbuildinfo")) continue;
    assert.equal(entry.isSymbolicLink(), false, `No symlink/submodule deliverable: ${path}`);
    if (entry.isDirectory()) files.push(...await inventory(path));
    else if (entry.isFile()) files.push({ path, bytes: (await stat(path)).size });
  }
  return files.sort((a, b) => a.path.localeCompare(b.path));
}
const files = await inventory();
for (const file of files) {
  assert.ok(!/\.(?:tgz|tar|zip|map)$/.test(file.path), `Unnecessary packaging artifact: ${file.path}`);
  assert.notEqual(file.path, ".gitmodules", "No git submodule");
}
const required = [
  "dist/index.html", "dist/pepe-game.json", "dist/cover.svg", "dist/favicon.svg",
  "src/main.ts", "src/engine.ts", "src/view.ts", "src/assets/outfit-latin.woff2",
  "package.json", "package-lock.json", "README.md", "DESIGN.md", "BUDGET.md",
  "artifacts/validation.md", "artifacts/engine-tests.json", "artifacts/browser-tests.json",
  "artifacts/campaign-test.json", "artifacts/build-checks.txt",
  ".imd-responses.json", "artifacts/revision/before.json", "artifacts/revision/after.json",
  "scripts/seed-sandbox-check.mjs", "artifacts/seed-revision/before.json",
  "artifacts/seed-revision/after.json", "artifacts/seed-revision/build-checks.txt",
];
for (const path of required) assert.ok(files.some((f) => f.path === path), path);
const html = await readFile("dist/index.html", "utf8");
for (const pattern of [/<title>Pepe Bros/, /name="description"/, /property="og:title"/, /property="og:image"/, /rel="icon"/]) assert.match(html, pattern);
const assetUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
assetUrls.push(html.match(/property="og:image"\s+content="([^"]+)"/)[1]);
for (const url of assetUrls) {
  assert.ok(url.startsWith("./"), `Relative URL: ${url}`);
  assert.ok(files.some((f) => f.path === `dist/${url.slice(2)}`), `Present runtime asset: ${url}`);
}
assert.match(html, /<script defer src=/);
assert.doesNotMatch(html, /type="module"|crossorigin/);
const manifest = JSON.parse(await readFile("dist/pepe-game.json", "utf8"));
assert.equal(manifest.schemaVersion, "pepe-browser-game/1");
assert.equal(manifest.entry, "index.html");
assert.equal(manifest.cover, "cover.svg");
assert.match(await readFile("dist/cover.svg", "utf8"), /viewBox="0 0 1200 630"/);
const publicFiles = files.filter((f) => f.path.startsWith("public/"));
for (const file of publicFiles) assert.deepEqual(await readFile(file.path), await readFile(file.path.replace(/^public\//, "dist/")));
const bundle = await readFile(`dist/${assetUrls.find((p) => p.endsWith(".js")).slice(2)}`, "utf8");
assert.match(bundle, /data:font\/woff2;base64,/);
assert.doesNotMatch(bundle, /__playtestClock|__controller|X-Game-Submission|pepe-bros-toolchain/);
const engine = JSON.parse(await readFile("artifacts/engine-tests.json", "utf8"));
const browser = JSON.parse(await readFile("artifacts/browser-tests.json", "utf8"));
const campaign = JSON.parse(await readFile("artifacts/campaign-test.json", "utf8"));
const revision = JSON.parse(await readFile("artifacts/revision/after.json", "utf8"));
const seedRevision = JSON.parse(await readFile("artifacts/seed-revision/after.json", "utf8"));
const responses = JSON.parse(await readFile(".imd-responses.json", "utf8")).responses;
assert.ok(engine.results.every((r) => r.passed));
assert.ok(browser.results.every((r) => r.passed));
assert.deepEqual(browser.errors, []);
assert.deepEqual(browser.failedRequests, []);
assert.equal(campaign.passed, true);
assert.equal(campaign.outcome.mode, "won");
assert.equal(campaign.outcome.level, 7);
assert.equal(revision.passed, true);
assert.deepEqual(revision.errors, []);
assert.deepEqual(revision.failedRequests, []);
assert.equal(revision.bundleSha256, createHash("sha256").update(bundle).digest("hex"));
assert.equal(seedRevision.passed, true);
assert.ok(seedRevision.results.every((r) => r.passed));
assert.deepEqual(seedRevision.errors, []);
assert.deepEqual(seedRevision.failedRequests, []);
assert.equal(seedRevision.bundleSha256, createHash("sha256").update(bundle).digest("hex"));
assert.equal(responses.length, 1);
assert.equal(responses[0].finding, "faa429c6bfd7972ce07ad601e1f8019335a3b8f9922d858f77b5bafec7a7d110");
assert.ok(responses.every((r) => /^[a-f0-9]{64}$/.test(r.finding) && r.verdict === "fixed" && r.detail.length > 0));
assert.ok((await stat(".gitignore")).size <= 512);
const checkedLinks = [];
for (const path of ["README.md", "DESIGN.md", "artifacts/validation.md"]) {
  const text = await readFile(path, "utf8");
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^(?:https?:|mailto:)/.test(target)) continue;
    const local = relative(root, resolve(dirname(path), target));
    assert.ok(!local.startsWith(".."), `Local documentation link: ${local}`);
    if (local !== reportPath) await stat(local);
    checkedLinks.push({ from: path, to: local });
  }
}
const exportFiles = [];
for (const f of files.filter((f) => f.path.startsWith("dist/"))) exportFiles.push({
  ...f, sha256: createHash("sha256").update(await readFile(f.path)).digest("hex"),
});
const otherBytes = files.filter((f) => f.path !== reportPath).reduce((sum, f) => sum + f.bytes, 0);
const report = {
  date: new Date().toISOString(), command: "node scripts/audit.mjs", passed: true,
  basis: "Uncompressed bytes of all deliverable files, including this report. Repository metadata, private inputs, dependency/cache directories and disposable test/scratch are excluded without reading their contents. No Git mutation was performed.",
  limitBytes: 8388608, totalBytes: 0, remainingBytes: 0,
  distBytes: exportFiles.reduce((sum, f) => sum + f.bytes, 0),
  ignoreFileBytes: (await stat(".gitignore")).size, ignoreFileBudget: 512,
  relativeEntryAssets: assetUrls, manifest, exportFiles, checkedLinks,
  verification: { engineChecks: engine.results.length, browserChecks: browser.results.length, revisionChecks: revision.results.length, seedRevisionChecks: seedRevision.results.length, reviewResponses: responses.length, campaign: campaign.outcome.mode, seed: campaign.seed, score: campaign.outcome.score },
  inventory: files.filter((f) => f.path !== reportPath),
};
// The self-inclusive byte total converges when its decimal digit count is stable.
for (let attempt = 0; attempt < 5; attempt++) {
  const bytes = Buffer.byteLength(JSON.stringify(report, null, 2) + "\n");
  report.totalBytes = otherBytes + bytes;
  report.remainingBytes = report.limitBytes - report.totalBytes;
}
assert.ok(report.totalBytes < report.limitBytes, "Complete deliverable fits within 8 MiB");
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
console.log(`PASS export audit: ${report.totalBytes.toLocaleString()} / ${report.limitBytes.toLocaleString()} bytes; dist ${report.distBytes.toLocaleString()} bytes; ${checkedLinks.length} local documentation links.`);
