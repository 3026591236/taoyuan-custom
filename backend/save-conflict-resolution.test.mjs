import assert from "node:assert/strict";

function resolveConflict({ localPageId, previousPageId, localSequence, serverPageId, serverSequence }) {
  const samePage = Boolean(serverPageId) && [localPageId, previousPageId].includes(serverPageId);
  if (!samePage) return "external-conflict";
  if (localSequence > serverSequence) return "retry-local";
  return "load-server";
}

const cases = [
  ["same page newer local state retries", { localPageId: "page-a", previousPageId: "", localSequence: 8, serverPageId: "page-a", serverSequence: 7 }, "retry-local"],
  ["same page equal sequence keeps authority", { localPageId: "page-a", previousPageId: "", localSequence: 8, serverPageId: "page-a", serverSequence: 8 }, "load-server"],
  ["same page stale request keeps authority", { localPageId: "page-a", previousPageId: "", localSequence: 7, serverPageId: "page-a", serverSequence: 8 }, "load-server"],
  ["refresh recognizes previous page newer local", { localPageId: "page-b", previousPageId: "page-a", localSequence: 9, serverPageId: "page-a", serverSequence: 8 }, "retry-local"],
  ["refresh recognizes completed previous page write", { localPageId: "page-b", previousPageId: "page-a", localSequence: 8, serverPageId: "page-a", serverSequence: 8 }, "load-server"],
  ["different page remains protected", { localPageId: "page-b", previousPageId: "page-a", localSequence: 10, serverPageId: "page-c", serverSequence: 9 }, "external-conflict"],
  ["legacy writer remains protected", { localPageId: "page-b", previousPageId: "page-a", localSequence: 10, serverPageId: "", serverSequence: 0 }, "external-conflict"],
];

for (const [name, input, expected] of cases) {
  assert.equal(resolveConflict(input), expected, name);
  console.log(`ok - ${name}`);
}
