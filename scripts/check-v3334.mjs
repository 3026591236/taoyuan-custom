import assert from "node:assert/strict";
import fs from "node:fs";

const guild = fs.readFileSync("src/stores/useGuildStore.ts", "utf8");
const retention = fs.readFileSync("src/stores/useRetentionStore.ts", "utf8");
const longTerm = fs.readFileSync("src/stores/useLongTermStore.ts", "utf8");
const cultivation = fs.readFileSync("src/stores/useCultivationStore.ts", "utf8");
const breeding = fs.readFileSync("src/stores/useBreedingStore.ts", "utf8");
const breedingView = fs.readFileSync("src/views/game/BreedingView.vue", "utf8");
const sectView = fs.readFileSync("src/views/game/SectView.vue", "utf8");
const knowledge = fs.readFileSync("src/data/knowledgeBase.ts", "utf8");

assert.match(sectView, /const MERIT_TREASURY = \[/);
assert.match(sectView, /const redeemMerit = [\s\S]*sectMerit -= item\.cost[\s\S]*item\.reward\(\)/);
assert.doesNotMatch(sectView.slice(sectView.indexOf("const redeemMerit")), /sectContribution -= item\.cost/);

assert.match(longTerm, /SECT_PROJECT_MAX_LEVEL = 10/);
assert.match(longTerm, /if \(current >= SECT_PROJECT_MAX_LEVEL\)[\s\S]*已达Lv\.\$\{SECT_PROJECT_MAX_LEVEL\}满级[\s\S]*let gain = 0/);
assert.match(longTerm, /Math\.min\(0\.2, cappedSectProjectLevel\("spirit_array"\) \* 0\.02\)/);
assert.match(longTerm, /Math\.min\(0\.2, cappedSectProjectLevel\("craft_hall"\) \* 0\.02\)/);
assert.match(longTerm, /Math\.min\(0\.25, cappedSectProjectLevel\("sword_platform"\) \* 0\.03\)/);
assert.match(sectView, /:disabled="project\.maxed"/);
assert.match(sectView, /Math\.min\(10,Math\.max\(1,Number\(level\)\|\|1\)\)/);

assert.match(cultivation, /\{ name: "仙府", cost: 15000, slots: 5, auraRegen: 20 \}/);
assert.match(cultivation, /\{ name: "洞府", cost: 6000, slots: 3, auraRegen: 12 \}/);

assert.match(breeding, /const sortBreedingBox = \(\): void =>/);
assert.match(breeding, /getStarRating\(b\) - getStarRating\(a\)/);
assert.match(breedingView, /一键整理/);
assert.match(breedingView, /breedingStore\.sortBreedingBox\(\)/);

assert.match(retention, /id: "weekly_daily_20"[\s\S]*title: "周令·勤修十二课"[\s\S]*target: 12/);
assert.match(retention, /case "guildContribution":[\s\S]*return guildStore\.totalContributionEarned/);
assert.match(guild, /const totalContributionEarned = ref\(0\)/);
assert.match(guild, /const earnContribution = [\s\S]*contributionPoints\.value \+= safe[\s\S]*totalContributionEarned\.value \+= safe/);
assert.match(guild, /totalContributionEarned: totalContributionEarned\.value/);
assert.match(guild, /totalContributionEarned\.value = Math\.max/);
assert.match(guild, /if \(item\.contributionCost\)[\s\S]*contributionPoints\.value \+= item\.contributionCost/);
assert.match(knowledge, /V3\.3\.34：周令委托与仙盟贡献怎么算/);

const sample = [
  { cropId: "rice", stars: 2, total: 100, generation: 1, id: "b" },
  { cropId: "cabbage", stars: 5, total: 90, generation: 0, id: "a" },
  { cropId: "rice", stars: 4, total: 120, generation: 2, id: "c" },
];
const sorted = [...sample].sort((a,b)=>a.cropId.localeCompare(b.cropId)||b.stars-a.stars||b.total-a.total||b.generation-a.generation||a.id.localeCompare(b.id));
assert.deepEqual(sorted.map(x=>x.id), ["a","c","b"]);
assert.deepEqual([...sorted].sort((a,b)=>a.cropId.localeCompare(b.cropId)||b.stars-a.stars||b.total-a.total||b.generation-a.generation||a.id.localeCompare(b.id)), sorted);

console.log("V3.3.34 feedback 70-75 scenarios: OK");
