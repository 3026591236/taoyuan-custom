import assert from "node:assert/strict";
import fs from "node:fs";

const sourcePath = new URL("../backend/index.mjs", import.meta.url);
const source = fs.readFileSync(sourcePath, "utf8");

assert.match(source, /async function auth\(req, db = pool\)/);
assert.match(source, /async function requireAdmin\(req, res, db = pool\)/);
assert.match(source, /const \[rows\] = await db\.execute\(/);
assert.match(source, /const \[users\] = await db\.execute\(/);

const connectionFirstRoutes = [
  ["post", "/api/characters/:id/rename"],
  ["post", "/api/characters"],
  ["post", "/api/saves/:slot/consume-protected"],
  ["put", "/api/saves/:slot"],
  ["post", "/api/checkin"],
  ["post", "/api/mails/:id/claim"],
  ["post", "/api/events/world-boss/claim-cycle"],
  ["get", "/api/floating-welfare"],
  ["post", "/api/floating-welfare/claim"],
  ["post", "/api/admin/mails"],
];

for (const [method, route] of connectionFirstRoutes) {
  const marker = `app.${method}(\"${route}\"`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `missing ${method.toUpperCase()} ${route}`);
  const block = source.slice(start, start + 900);
  if (route === "/api/admin/mails") {
    assert.match(block, /requireAdmin\(req, res, conn\)/, route);
  } else {
    assert.match(block, /auth\(req, conn\)/, route);
  }
}

const unsafeConnectionAuth = /const conn = await pool\.getConnection\(\);[\s\S]{0,500}?auth\(req\)(?!\s*,)/g;
assert.equal([...source.matchAll(unsafeConnectionAuth)].length, 0);

for (const [method, route] of [
  ["post", "/api/characters/:id/rename"],
  ["post", "/api/characters"],
  ["put", "/api/saves/:slot"],
  ["post", "/api/checkin"],
  ["post", "/api/mails/:id/claim"],
  ["get", "/api/floating-welfare"],
  ["post", "/api/floating-welfare/claim"],
]) {
  const start = source.indexOf(`app.${method}(\"${route}\"`);
  const block = source.slice(start, start + 5000);
  assert.match(block, /SELECT id FROM users WHERE id = \? FOR UPDATE/, route);
}

assert.match(source, /V3\.3\.33 后端连接池与事务稳定性修复/);
console.log("V3.3.33 backend reliability checks passed");
