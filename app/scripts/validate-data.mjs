import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const dataDir = resolve(import.meta.dirname, "../../data");
const schemaDir = join(dataDir, "schema");

const ajv = new Ajv2020({ allErrors: true, strict: false });

const foldersToSchemas = [
  { folder: "packs", schema: "pack.schema.json" },
  { folder: "parameters", schema: "register.schema.json" },
  { folder: "tables", schema: "table.schema.json" },
  { folder: "test-vectors", schema: "vectors.schema.json" },
];

let checked = 0;
let failed = 0;

for (const { folder, schema } of foldersToSchemas) {
  const schemaPath = join(schemaDir, schema);
  const schemaObj = JSON.parse(readFileSync(schemaPath, "utf8"));
  const validate = ajv.compile(schemaObj);
  const targetDir = join(dataDir, folder);
  if (!existsSync(targetDir)) {
    continue;
  }
  const files = readdirSync(targetDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const filePath = join(targetDir, file);
    const payload = JSON.parse(readFileSync(filePath, "utf8"));
    checked += 1;
    if (!validate(payload)) {
      failed += 1;
      console.error(`FAIL ${folder}/${file}:`, validate.errors);
    } else {
      console.log(`PASS ${folder}/${file}`);
    }
  }
}

console.log(`Schema check complete: ${checked} file(s) checked, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}

