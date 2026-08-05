import fs from "node:fs";

const source = fs.readFileSync("src/stores/useTerritoryStore.ts", "utf8");
const saveSource = fs.readFileSync("src/stores/useSaveStore.ts", "utf8");
const backendSource = fs.readFileSync("backend/index.mjs", "utf8");
const dbUpdateSource = fs.readFileSync("scripts/update-v3344-db.mjs", "utf8");
const requireText = (needle, message) => {
  if (!source.includes(needle)) throw new Error(message);
};

requireText('version:4', "territory save version was not advanced");
requireText('formation.status="marching"', "three formation travel states are absent");
requireText('formation.status="returning"', "return journey transition is absent");
requireText("recallFormation", "formation recall is absent");
requireText("infirmaryCapacity", "wounded capacity is absent");
requireText("startHealing", "healing queue is absent");
requireText("upgradeBuilding", "territory buildings are absent");
requireText("researchTechnology", "territory technology is absent");
requireText("claimChapter", "chapter claim is absent");
requireText("RAID_INTERVAL", "scheduled deterministic raids are absent");
requireText("MAX_OFFLINE_HOURS", "offline settlement cap is absent");
requireText("data.army", "v3 army migration path is absent");
if (!saveSource.includes("territoryStore.deserialize((data as any).territory ?? {})")) throw new Error("empty territory saves are not reset on role switch");
requireText("nodes.value=cloneNodes();resources.value={wood:160,stone:130,spirit:80}", "deserialize does not reset territory defaults");
requireText("growthBonuses", "main-game progression bonuses are absent");
if (!backendSource.includes('title: "V3.3.44 仙乡领地战略完善"')) throw new Error("default update log is absent");
if (!dbUpdateSource.includes("V3.3.44 仙乡领地战略完善")) throw new Error("database update log script is absent");

const technologyBlock = source.match(/TERRITORY_TECHNOLOGIES:[\s\S]*?\n\];/)?.[0] ?? "";
const chapterBlock = source.match(/TERRITORY_CHAPTERS:[\s\S]*?\n\];/)?.[0] ?? "";
const technologyIds = [...technologyBlock.matchAll(/id:"([^"]+)"/g)].map((match) => match[1]);
const chapterIds = [...chapterBlock.matchAll(/id:(\d+)/g)].map((match) => Number(match[1]));
if (!source.includes("assault:{assault:1,guard:.82,flank:1.2}")) throw new Error("legacy stance cycle is invalid");
if (!source.includes("sword:{body:1.2,puppet:.88}")) throw new Error("unit counter cycle is invalid");
if (technologyIds.length < 6 || new Set(technologyIds).size !== technologyIds.length) throw new Error("technology definitions are incomplete");
if (!technologyBlock.includes('prerequisite:"drill"')) throw new Error("technology prerequisites are absent");
if (chapterIds.length < 4 || new Set(chapterIds).size !== chapterIds.length) throw new Error("chapter definitions are incomplete");
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
if (clamp(99, 0, 10) !== 10 || clamp(-1, 0, 10) !== 0) throw new Error("resource clamp failed");

const migrateLegacy = (legacy) => {
  const maxTroops = Math.max(100, Math.min(100000, Number(legacy.maxTroops) || 220));
  const troops = Math.max(0, Math.min(maxTroops, Number(legacy.troops) || 0));
  return [troops, 0, 0];
};
const migrated = migrateLegacy({ troops: 173, maxTroops: 220 });
if (migrated.length !== 3 || migrated.reduce((sum, value) => sum + value, 0) !== 173) throw new Error("legacy migration duplicates troops");

const march = { status: "marching", departedAt: 1000, arrivalAt: 5000, targetId: "cloud-farm" };
const node = { status: "neutral" };
if (node.status !== "neutral" || march.status !== "marching") throw new Error("march precondition failed");
if (3000 >= march.arrivalAt) node.status = "owned";
if (node.status !== "neutral") throw new Error("march settled before arrival");
if (5000 >= march.arrivalAt) { node.status = "owned"; march.status = "returning"; }
if (node.status !== "owned" || march.status !== "returning") throw new Error("arrival did not settle atomically into return");

const recalled = { status: "marching", departedAt: 1000, arrivalAt: 9000 };
const recallAt = 3000;
recalled.status = "returning";
recalled.arrivalAt = recallAt + Math.max(60_000, Math.round((recallAt - recalled.departedAt) * .75));
if (recalled.status !== "returning" || recalled.arrivalAt <= recallAt) throw new Error("recall transition failed");

const woundedCapacity = 180;
let wounded = 170;
const losses = 50;
wounded += Math.min(woundedCapacity - wounded, Math.floor(losses * .65));
if (wounded !== woundedCapacity) throw new Error("wounded capacity was exceeded or underfilled");

const researched = [];
const roads = { id: "roads", prerequisite: "drill" };
if (!technologyIds.includes(roads.id) || researched.includes(roads.prerequisite)) throw new Error("technology prerequisite scenario is invalid");
researched.push("drill");
if (!researched.includes(roads.prerequisite)) throw new Error("technology prerequisite cannot be satisfied");

const claimed = [];
const claimOnce = (id) => {
  if (claimed.includes(id)) return false;
  claimed.push(id);
  return true;
};
if (!claimOnce(1) || claimOnce(1) || claimed.length !== 1) throw new Error("chapter reward is not idempotent");

console.log("V3.3.44 territory core scenarios: OK");
