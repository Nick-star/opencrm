import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = mkdtempSync(join(tmpdir(), "opencrm-e2e-"));
const binary = join(directory, "api");
process.on("exit", () => rmSync(directory, { recursive: true, force: true }));
const build = spawnSync("go", ["build", "-o", binary, "./cmd/api"], {
  cwd: "../backend",
  stdio: "inherit",
});
if (build.status !== 0) process.exit(build.status ?? 1);
const api = spawn(binary, [], {
  env: { ...process.env, HTTP_ADDR: "127.0.0.1:18080", DATABASE_PATH: join(directory, "test.db") },
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => api.kill(signal));
api.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
api.on("exit", (code) => process.exit(code ?? 1));
