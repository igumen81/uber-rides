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
const testFiles = fs
  .readdirSync(__dirname)
  .filter((file) => file.endsWith(".test.ts"))
  .map((file) => path.join(__dirname, file))
  .sort();

for (const file of testFiles) {
  require(file);
}

const vitest = require("vitest");
if (typeof vitest.runSuites !== "function") {
  throw new Error("Vitest stub missing runSuites export");
}
await vitest.runSuites();
