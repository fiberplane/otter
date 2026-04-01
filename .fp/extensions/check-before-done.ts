import type { ExtensionInit } from "@fiberplane/extensions";
import { spawn } from "node:child_process";

function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => {
      stdout += d;
    });
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d;
    });
    proc.on("error", reject);
    proc.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

const init: ExtensionInit = (fp) => {
  const checksRaw = fp.config.get("checks", "bun run check");
  const checks = checksRaw
    .split(",")
    .map((s: string) => s.trim())
    .filter(Boolean);

  fp.on("issue:status:changing", async ({ to }) => {
    if (to !== "done") {
      return undefined;
    }

    for (const check of checks) {
      const [cmd, ...args] = check.split(" ");
      const result = await runCommand(cmd, args, fp.projectDir);
      if (result.code !== 0) {
        const output = (result.stderr || result.stdout).slice(0, 500);
        return {
          code: "CHECK_FAILED",
          message: `"${check}" failed (exit ${result.code}). Fix issues before marking done.\n${output}`,
        };
      }
    }

    return undefined;
  });

  fp.log.info(`Check-before-done loaded — will run: ${checks.join(", ")}`);
};

export default init;
