import Module from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = Module.createRequire(import.meta.url);
const ts = require("typescript");

Module._extensions[".ts"] = function loadTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const vitestStubPath = path.join(__dirname, "_vitestStub.cjs");
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveWithVitestStub(request, parent, isMain, options) {
  if (request === "vitest") {
    return vitestStubPath;
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

const args = process.argv.slice(2);
const requestedPaths = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === "--runTestsByPath") {
    for (let j = i + 1; j < args.length && !args[j].startsWith("--"); j += 1) {
      requestedPaths.push(args[j]);
      i = j;
    }
  }
}

const testPaths = (requestedPaths.length > 0
  ? requestedPaths.map((p) => (path.isAbsolute(p) ? p : path.join(process.cwd(), p)))
  : fs
      .readdirSync(__dirname)
      .filter((file) => file.endsWith(".test.ts"))
      .map((file) => path.join(__dirname, file))
).filter((value, index, self) => self.indexOf(value) === index);

for (const testPath of testPaths) {
  require(testPath);
}

const vitest = require("vitest");
if (typeof vitest.runSuites !== "function") {
  throw new Error("Vitest stub missing runSuites export");
}
await vitest.runSuites();
