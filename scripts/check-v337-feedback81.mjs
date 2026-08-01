import fs from "node:fs";

const layout = fs.readFileSync("src/views/GameLayout.vue", "utf8");
const backend = fs.readFileSync("backend/index.mjs", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const dbUpdate = fs.readFileSync("scripts/update-v337-db.mjs", "utf8");

for (const [ok, message] of [
  [layout.includes("let lastRealtimeSaveRetryable = false"), "retry classification"],
  [layout.includes("const retryDelays = [0, 500, 1000]"), "bounded retry delays"],
  [layout.includes("flushRealtimeSaveCurrent(4000)"), "bounded attempt timeout"],
  [layout.includes("waitForRealtimeSaveIdle(Math.max(0, deadline - Date.now())))) {\n      lastRealtimeSaveRetryable = true"), "busy timeout retry"],
  [layout.includes("if (!lastRealtimeSaveRetryable) return false"), "non-retryable stop"],
  [layout.includes("await flushSleepSaveWithRetry()"), "sleep retry integration"],
  [layout.includes("lastRealtimeSaveRetryable = !e?.status || e.status >= 500"), "network and server retry"],
  [layout.includes("lastRealtimeSaveRetryable = false;\n      return false;\n    }\n    // 自动保存失败"), "business conflict stop"],
  [backend.includes("V3.3.37 休息写档重试"), "update log"],
  [pkg.version === "3.3.37", "package version"],
  [dbUpdate.includes('mailSourceId = "feedback-adoption-81"'), "idempotent reward source"],
  [dbUpdate.includes(".slice(0, 100)"), "bounded update log"],
]) {
  if (!ok) throw new Error(`Missing ${message}`);
}

console.log("V3.3.37 feedback #81 static contracts: OK");
