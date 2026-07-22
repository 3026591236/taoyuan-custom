import { computed, ref } from "vue";
import { defineStore } from "pinia";

export type TerritoryStatus = "neutral" | "owned" | "contested";
export type TerritoryKind = "capital" | "farm" | "mine" | "spirit" | "watch" | "ruins";

export type TerritoryNode = {
  id: string;
  name: string;
  kind: TerritoryKind;
  x: number;
  y: number;
  income: { wood: number; stone: number; spirit: number };
  power: number;
  status: TerritoryStatus;
  level: number;
  lastCollectedAt: number;
  dispatchedAt: number;
  enemyAt: number;
};

const INITIAL_NODES: TerritoryNode[] = [
  { id: "capital", name: "万象城", kind: "capital", x: 50, y: 51, income: { wood: 3, stone: 3, spirit: 4 }, power: 1, status: "owned", level: 1, lastCollectedAt: Date.now(), dispatchedAt: 0, enemyAt: 0 },
  { id: "cloud-farm", name: "云禾原", kind: "farm", x: 30, y: 32, income: { wood: 7, stone: 1, spirit: 2 }, power: 12, status: "neutral", level: 1, lastCollectedAt: 0, dispatchedAt: 0, enemyAt: 0 },
  { id: "east-farm", name: "东篱田契", kind: "farm", x: 73, y: 31, income: { wood: 6, stone: 2, spirit: 2 }, power: 18, status: "neutral", level: 1, lastCollectedAt: 0, dispatchedAt: 0, enemyAt: 0 },
  { id: "black-mine", name: "玄铁矿脉", kind: "mine", x: 18, y: 57, income: { wood: 1, stone: 8, spirit: 1 }, power: 26, status: "neutral", level: 1, lastCollectedAt: 0, dispatchedAt: 0, enemyAt: 0 },
  { id: "red-mine", name: "赤霞矿场", kind: "mine", x: 82, y: 59, income: { wood: 2, stone: 7, spirit: 1 }, power: 34, status: "neutral", level: 1, lastCollectedAt: 0, dispatchedAt: 0, enemyAt: 0 },
  { id: "star-lake", name: "星澜河口", kind: "spirit", x: 42, y: 20, income: { wood: 2, stone: 2, spirit: 9 }, power: 42, status: "neutral", level: 1, lastCollectedAt: 0, dispatchedAt: 0, enemyAt: 0 },
  { id: "moon-spring", name: "月泉灵眼", kind: "spirit", x: 65, y: 75, income: { wood: 1, stone: 2, spirit: 11 }, power: 55, status: "neutral", level: 1, lastCollectedAt: 0, dispatchedAt: 0, enemyAt: 0 },
  { id: "north-watch", name: "北境哨塔", kind: "watch", x: 52, y: 9, income: { wood: 3, stone: 4, spirit: 3 }, power: 30, status: "neutral", level: 1, lastCollectedAt: 0, dispatchedAt: 0, enemyAt: 0 },
  { id: "south-watch", name: "南岭关", kind: "watch", x: 48, y: 88, income: { wood: 3, stone: 5, spirit: 2 }, power: 48, status: "neutral", level: 1, lastCollectedAt: 0, dispatchedAt: 0, enemyAt: 0 },
  { id: "jade-ruins", name: "青玉遗址", kind: "ruins", x: 12, y: 23, income: { wood: 2, stone: 3, spirit: 7 }, power: 62, status: "neutral", level: 1, lastCollectedAt: 0, dispatchedAt: 0, enemyAt: 0 },
  { id: "sea-gate", name: "瀚海渡口", kind: "ruins", x: 87, y: 23, income: { wood: 5, stone: 3, spirit: 5 }, power: 70, status: "neutral", level: 1, lastCollectedAt: 0, dispatchedAt: 0, enemyAt: 0 },
  { id: "mist-valley", name: "迷雾谷地", kind: "ruins", x: 24, y: 81, income: { wood: 4, stone: 4, spirit: 6 }, power: 82, status: "neutral", level: 1, lastCollectedAt: 0, dispatchedAt: 0, enemyAt: 0 },
];

const cloneNodes = () => INITIAL_NODES.map((node) => ({ ...node, income: { ...node.income } }));

export const useTerritoryStore = defineStore("territory", () => {
  const nodes = ref<TerritoryNode[]>(cloneNodes());
  const resources = ref({ wood: 80, stone: 60, spirit: 35 });
  const commandPower = ref(100);
  const lastAction = ref("欢迎来到仙乡领地。先占领一处资源点，再派遣队伍建立收益。");
  const selectedId = ref("capital");
  const mapZoom = ref(1);

  const ownedNodes = computed(() => nodes.value.filter((node) => node.status === "owned"));
  const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedId.value) || nodes.value[0]);
  const incomePerHour = computed(() => ownedNodes.value.reduce((total, node) => ({
    wood: total.wood + node.income.wood * node.level,
    stone: total.stone + node.income.stone * node.level,
    spirit: total.spirit + node.income.spirit * node.level,
  }), { wood: 0, stone: 0, spirit: 0 }));
  const totalPower = computed(() => ownedNodes.value.reduce((sum, node) => sum + node.power + node.level * 8, 0) + commandPower.value);

  const select = (id: string) => { if (nodes.value.some((node) => node.id === id)) selectedId.value = id; };
  const tick = () => {
    const now = Date.now();
    for (const node of nodes.value) {
      if (node.status !== "owned" || !node.lastCollectedAt) continue;
      const hours = Math.min(12, Math.max(0, (now - node.lastCollectedAt) / 3600000));
      if (hours > 0.01 && !node.dispatchedAt) {
        resources.value.wood += Math.floor(node.income.wood * node.level * hours);
        resources.value.stone += Math.floor(node.income.stone * node.level * hours);
        resources.value.spirit += Math.floor(node.income.spirit * node.level * hours);
        node.lastCollectedAt = now;
      }
    }
  };
  const occupy = (id: string) => {
    const node = nodes.value.find((entry) => entry.id === id);
    if (!node || node.status === "owned") return false;
    if (commandPower.value < node.power) { lastAction.value = `队伍战力不足，需要 ${node.power} 点调度力。`; return false; }
    commandPower.value -= Math.max(4, Math.floor(node.power / 4));
    node.status = "owned"; node.lastCollectedAt = Date.now();
    lastAction.value = `已占领「${node.name}」，开始产出领地资源。`;
    selectedId.value = id;
    return true;
  };
  const dispatch = (id: string) => {
    const node = nodes.value.find((entry) => entry.id === id);
    if (!node || node.status !== "owned" || node.dispatchedAt) return false;
    if (commandPower.value < 10) { lastAction.value = "调度力不足，先收回其他队伍或等待恢复。"; return false; }
    commandPower.value -= 10; node.dispatchedAt = Date.now();
    lastAction.value = `「${node.name}」的采集队已出发，短暂后可收回本轮收益。`;
    return true;
  };
  const recall = (id: string) => {
    const node = nodes.value.find((entry) => entry.id === id);
    if (!node || !node.dispatchedAt) return false;
    const elapsed = Math.max(1, (Date.now() - node.dispatchedAt) / 60000);
    const multiplier = Math.min(3, 0.6 + elapsed / 8);
    resources.value.wood += Math.floor(node.income.wood * node.level * multiplier);
    resources.value.stone += Math.floor(node.income.stone * node.level * multiplier);
    resources.value.spirit += Math.floor(node.income.spirit * node.level * multiplier);
    node.dispatchedAt = 0; node.lastCollectedAt = Date.now(); commandPower.value += 6;
    lastAction.value = `采集队从「${node.name}」返回，带回一批资源。`;
    return true;
  };
  const upgrade = (id: string) => {
    const node = nodes.value.find((entry) => entry.id === id);
    if (!node || node.status !== "owned") return false;
    const cost = { wood: node.level * 35, stone: node.level * 28, spirit: node.level * 12 };
    if (resources.value.wood < cost.wood || resources.value.stone < cost.stone || resources.value.spirit < cost.spirit) {
      lastAction.value = `升级需要 木材${cost.wood} / 石料${cost.stone} / 灵晶${cost.spirit}。`; return false;
    }
    resources.value.wood -= cost.wood; resources.value.stone -= cost.stone; resources.value.spirit -= cost.spirit; node.level += 1;
    lastAction.value = `「${node.name}」升级至 Lv.${node.level}，产出提高。`; return true;
  };
  const resolveRaid = (id: string) => {
    const node = nodes.value.find((entry) => entry.id === id);
    if (!node || node.status !== "contested") return false;
    const defense = node.power + node.level * 10;
    if (commandPower.value + totalPower.value / 5 >= defense) {
      node.status = "owned"; node.enemyAt = 0; commandPower.value = Math.max(0, commandPower.value - 12); lastAction.value = `成功击退来犯势力，守住「${node.name}」。`;
    } else {
      node.status = "neutral"; node.enemyAt = 0; commandPower.value = Math.max(0, commandPower.value - 20); lastAction.value = `「${node.name}」失守，调度队伍重新夺回它。`;
    }
    return true;
  };
  const triggerRaid = () => {
    const owned = ownedNodes.value.filter((node) => node.id !== "capital");
    const node = owned[Math.floor(Math.random() * owned.length)];
    if (!node) { lastAction.value = "领地还很稳固，暂时没有敌袭。"; return; }
    node.status = "contested"; node.enemyAt = Date.now(); lastAction.value = `警报：${node.name} 遭到敌袭，立即调度守军！`; selectedId.value = node.id;
  };
  const serialize = () => ({ nodes: nodes.value, resources: resources.value, commandPower: commandPower.value, lastAction: lastAction.value, selectedId: selectedId.value });
  const deserialize = (data: any = {}) => {
    if (Array.isArray(data.nodes)) nodes.value = data.nodes.map((node: TerritoryNode) => ({ ...node, income: { ...node.income } }));
    resources.value = { ...resources.value, ...(data.resources || {}) }; commandPower.value = Number(data.commandPower ?? 100); lastAction.value = String(data.lastAction || lastAction.value); selectedId.value = String(data.selectedId || "capital");
  };
  return { nodes, resources, commandPower, lastAction, selectedId, mapZoom, ownedNodes, selectedNode, incomePerHour, totalPower, select, tick, occupy, dispatch, recall, upgrade, resolveRaid, triggerRaid, serialize, deserialize };
});
