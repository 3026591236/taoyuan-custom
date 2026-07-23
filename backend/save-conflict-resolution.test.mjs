import assert from "node:assert/strict";

function resolveRuntimeConflict({ localPageId, localSequence, serverPageId, serverSequence }) {
  const samePage = Boolean(serverPageId) && localPageId === serverPageId;
  if (!samePage) return "external-conflict";
  if (localSequence > serverSequence) return "retry-runtime";
  return "load-server";
}

function resolveHomeEntry() {
  // Home never uploads browser payloads. It only loads the database authority.
  return "load-server";
}

const runtimeCases = [
  ["same page newer runtime state retries", { localPageId: "page-a", localSequence: 8, serverPageId: "page-a", serverSequence: 7 }, "retry-runtime"],
  ["same page completed write loads authority", { localPageId: "page-a", localSequence: 8, serverPageId: "page-a", serverSequence: 8 }, "load-server"],
  ["different page remains protected", { localPageId: "page-b", localSequence: 10, serverPageId: "page-c", serverSequence: 9 }, "external-conflict"],
  ["legacy writer remains protected", { localPageId: "page-b", localSequence: 10, serverPageId: "", serverSequence: 0 }, "external-conflict"],
];

for (const [name, input, expected] of runtimeCases) {
  assert.equal(resolveRuntimeConflict(input), expected, name);
  console.log(`ok - ${name}`);
}

assert.equal(resolveHomeEntry(), "load-server", "home page only loads database authority");
console.log("ok - home page only loads database authority");
