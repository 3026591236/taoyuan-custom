import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const inventory = read("src/stores/useInventoryStore.ts");
const shop = read("src/stores/useShopStore.ts");
const processing = read("src/data/processing.ts");
const items = read("src/data/items.ts");
const crops = read("src/data/crops.ts");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(
  /id:\s*["']osmanthus_tea["'][\s\S]*?seedId:\s*["']seed_osmanthus_tea["']/.test(crops),
  "legacy osmanthus_tea crop definition is missing",
);
assert(
  /id:\s*["']brewed_osmanthus_tea["'][\s\S]*?category:\s*["']processed["']/.test(items),
  "brewed_osmanthus_tea must remain a processed item",
);
assert(
  /id:\s*["']brew_osmanthus["'][\s\S]*?outputItemId:\s*["']brewed_osmanthus_tea["']/.test(processing),
  "new osmanthus processing must output brewed_osmanthus_tea",
);
for (const [name, source] of [["inventory", inventory], ["shop", shop]]) {
  assert(
    !/itemId\s*:\s*["']brewed_osmanthus_tea["']/.test(source),
    `${name} deserialization must not rewrite legacy osmanthus_tea inventory`,
  );
  assert(
    !/itemIdSchemaVersion|marketItemIdSchemaVersion|migrateLegacyOsmanthusTea/.test(source),
    `${name} still contains the unsafe legacy migration path`,
  );
}
console.log("osmanthus tea compatibility assertions passed");
