import { execSync } from "node:child_process";

try {
  execSync("git config core.hooksPath .githooks", { stdio: "inherit" });
  console.log("✅ Git hooks path configured to .githooks");
} catch (err) {
  console.error("❌ Failed to configure hooksPath", err);
  process.exit(1);
}
