import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { readFile, writeFile } from "node:fs/promises";
const root = process.cwd();
const deps = process.env.PEPE_DEP_ROOT || root;
const require = createRequire(resolve(deps, "package.json"));
const task = process.argv[2];
if (task === "typecheck") {
  const ts = require("typescript");
  const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  if (deps !== root) {
    parsed.options.baseUrl = root;
    parsed.options.paths = {
      three: [resolve(deps, "node_modules/@types/three/index.d.ts")],
      "three/*": [resolve(deps, "node_modules/@types/three/*")],
    };
  }
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const errors = ts.getPreEmitDiagnostics(program);
  if (errors.length)
    console.error(
      ts.formatDiagnosticsWithColorAndContext(errors, {
        getCurrentDirectory: () => root,
        getCanonicalFileName: (f) => f,
        getNewLine: () => "\n",
      }),
    );
  else console.log("Typecheck passed.");
  process.exitCode = errors.length ? 1 : 0;
} else if (task === "test") {
  await import("./test.mjs");
} else {
  const vite = await import(pathToFileURL(require.resolve("vite")));
  const config = {
    configFile: false,
    root,
    base: "./",
    cacheDir: resolve(deps, ".vite-cache"),
    resolve: {
      alias: [
        {
          find: /^three$/,
          replacement: resolve(
            deps,
            "node_modules/three/build/three.module.js",
          ),
        },
        {
          find: /^three\/(.*)/,
          replacement: resolve(deps, "node_modules/three/$1"),
        },
      ],
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      target: "es2022",
      chunkSizeWarningLimit: 650,
      assetsInlineLimit: 50000,
      modulePreload: false,
      rollupOptions: { output: { format: "iife", inlineDynamicImports: true } },
    },
    server: { host: "127.0.0.1" },
    preview: { host: "127.0.0.1" },
  };
  if (task === "build") {
    await vite.build(config);
    // A self-contained classic bundle also loads in an opaque iframe on hosts
    // without CORS headers. There are no dynamic imports or external chunks.
    const entryPath = resolve(root, "dist/index.html");
    const html = await readFile(entryPath, "utf8");
    await writeFile(
      entryPath,
      html
        .replace('type="module" crossorigin', "defer")
        .replace('rel="stylesheet" crossorigin', 'rel="stylesheet"'),
    );
  } else if (task === "dev") {
    const server = await vite.createServer(config);
    await server.listen();
    server.printUrls();
  } else if (task === "preview") {
    const server = await vite.preview(config);
    server.printUrls();
  } else throw new Error("Unknown task " + task);
}
