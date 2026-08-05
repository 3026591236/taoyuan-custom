<template>
  <section class="territory-view">
    <div class="map-viewport" @pointerdown="startPan" @pointermove="pan" @pointerup="endPan" @pointercancel="endPan" @wheel.prevent="onWheel">
      <div class="strategic-map" :style="mapTransform">
        <img class="terrain-art" src="/assets/territory/wanxiang-territory-map.svg" alt="万象仙乡山河地图" draggable="false" />
        <svg class="supply-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <line v-for="route in routes" :key="route.id" :x1="route.from.x" :y1="route.from.y" :x2="route.to.x" :y2="route.to.y" :class="{ active: route.active, frontier: route.frontier }" />
        </svg>
        <div v-for="node in store.nodes.filter(n => n.status === 'owned')" :key="`domain-${node.id}`" class="domain" :style="{ left: `${node.x}%`, top: `${node.y}%` }" />
        <button v-for="node in store.nodes" :key="node.id" class="territory-node" :class="[node.status, { selected: node.id === store.selectedId, capital: node.kind === 'capital', reachable: store.isReachable(node) }]" :style="{ left: `${node.x}%`, top: `${node.y}%` }" @pointerdown.stop @click.stop="selectNode(node.id)">
          <span class="node-building"><span>{{ nodeIcons[node.kind] }}</span></span>
          <span class="node-copy"><b>{{ node.name }}</b><small>Lv.{{ node.level }} · {{ node.status === 'neutral' ? `守军${node.garrison}` : `驻防${node.garrison}` }}</small></span>
          <i v-if="node.status === 'contested'" class="alarm">!</i>
          <i v-if="formationAt(node.id)" class="march-dot"><Navigation :size="10" /></i>
        </button>
      </div>
      <div class="mist-edge top" /><div class="mist-edge bottom" />
    </div>

    <header class="top-hud glass">
      <div class="brand"><span class="seal">乡</span><div><p>万象仙乡</p><h1>山河领地</h1></div></div>
      <div class="resource-hud">
        <div><span>木材</span><b>{{ compact(store.resources.wood) }}</b><small>+{{ store.incomePerHour.wood }}/时</small></div>
        <div><span>石料</span><b>{{ compact(store.resources.stone) }}</b><small>+{{ store.incomePerHour.stone }}/时</small></div>
        <div><span>灵晶</span><b>{{ compact(store.resources.spirit) }}</b><small>+{{ store.incomePerHour.spirit }}/时</small></div>
        <div><span>行动力</span><b>{{ store.actionPoints }}/{{ store.maxActionPoints }}</b><small>15分+1</small></div>
      </div>
      <div class="top-actions">
        <button title="返回仙乡" @click="leaveTerritory"><House :size="16" /><span>返回</span></button>
        <button title="恢复全图" @click="resetView"><Maximize2 :size="16" /></button>
        <button title="定位主城" @click="focusNode('capital')"><LocateFixed :size="16" /></button>
      </div>
    </header>

    <aside class="army-panel glass desktop-panel">
      <div class="panel-title"><Swords :size="16" /><span>万象军府</span><em>势力 {{ store.totalPower }}</em></div>
      <FormationList />
      <FormationControls />
    </aside>

    <aside v-if="selected" class="node-panel glass desktop-panel">
      <NodeHeader />
      <div class="panel-tabs"><button :class="{ active: nodeTab === 'intel' }" @click="nodeTab = 'intel'">情报</button><button :class="{ active: nodeTab === 'build' }" :disabled="selected.status !== 'owned'" @click="nodeTab = 'build'">建设</button></div>
      <NodeIntel v-if="nodeTab === 'intel'" />
      <NodeBuild v-else />
    </aside>

    <section class="bottom-hud glass desktop-bottom">
      <div class="campaign-summary"><span>山河控制 {{ store.territoryProgress }}%</span><b>{{ activeChapter?.name || '山河尽归' }}</b><small>{{ activeChapter?.description || '全部章节均已完成' }}</small></div>
      <div class="march-summary">
        <article v-for="item in activeFormations" :key="item.id"><Navigation :size="13" /><div><b>{{ item.name }}</b><small>{{ statusName(item.status) }} · {{ nodeName(item.targetId) }}</small></div><time>{{ countdown(item.arrivalAt) }}</time></article>
        <p v-if="!activeFormations.length">当前没有行军队列</p>
      </div>
      <div class="bottom-actions"><button @click="openDrawer('tech')"><FlaskConical :size="16" />科技</button><button @click="openDrawer('chapter')"><ListChecks :size="16" />任务</button><button @click="openDrawer('report')"><ScrollText :size="16" />军报</button></div>
    </section>

    <section class="mobile-work glass" :class="{ expanded: mobileExpanded }">
      <button class="work-grip" aria-label="展开或收起" @click="mobileExpanded = !mobileExpanded"><ChevronUp :size="17" /></button>
      <nav>
        <button v-for="item in mobileNav" :key="item.id" :class="{ active: mobileTab === item.id }" @click="setMobileTab(item.id)"><component :is="item.icon" :size="17" /><span>{{ item.label }}</span></button>
      </nav>
      <div class="mobile-content">
        <template v-if="mobileTab === 'army'"><FormationList /><FormationControls /></template>
        <MarchList v-else-if="mobileTab === 'march'" />
        <template v-else-if="mobileTab === 'node'"><NodeHeader /><NodeIntel /></template>
        <template v-else-if="mobileTab === 'develop'"><NodeHeader /><NodeBuild /><h3 class="mobile-section-title">军府科技</h3><TechList /></template>
        <template v-else><ChapterList /><h3 class="mobile-section-title">山河军报</h3><ReportList /></template>
      </div>
    </section>

    <aside v-if="drawer" class="work-drawer glass">
      <header><div><small>领地军务</small><b>{{ drawerTitle }}</b></div><button title="关闭" @click="drawer = null"><X :size="17" /></button></header>
      <TechList v-if="drawer === 'tech'" />
      <ChapterList v-else-if="drawer === 'chapter'" />
      <ReportList v-else />
    </aside>

    <div class="zoom-hud glass"><button title="放大" @click="zoom(.1)"><Plus :size="15" /></button><span>{{ Math.round(zoomLevel * 100) }}%</span><button title="缩小" @click="zoom(-.1)"><Minus :size="15" /></button></div>
    <div class="last-action">{{ store.lastAction }}</div>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, onUnmounted, ref } from "vue";
import { ArrowUpCircle, Castle, ChevronUp, FlaskConical, HeartPulse, House, ListChecks, LocateFixed, Maximize2, Minus, Navigation, Plus, Route, ScrollText, ShieldAlert, ShieldCheck, Swords, Users, X } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { TERRITORY_CHAPTERS, TERRITORY_TECHNOLOGIES, useTerritoryStore, type ArmyStance, type BuildingType, type FormationStatus, type TerritoryKind, type UnitType } from "@/stores/useTerritoryStore";
import { useSaveStore } from "@/stores/useSaveStore";

const store = useTerritoryStore();
const saveStore = useSaveStore();
const router = useRouter();
const selected = computed(() => store.selectedNode!);
const formation = computed(() => store.selectedFormation!);
const nodeTab = ref<"intel" | "build">("intel");
const drawer = ref<"tech" | "chapter" | "report" | null>(null);
const mobileTab = ref<"army" | "march" | "node" | "develop" | "report">("node");
const mobileExpanded = ref(true);
const clock = ref(Date.now());
const zoomLevel = ref(1);
const offset = ref({ x: 0, y: 0 });
const dragging = ref(false);
const pointerStart = ref({ x: 0, y: 0 });
const offsetStart = ref({ x: 0, y: 0 });
const nodeIcons: Record<TerritoryKind, string> = { capital: "城", farm: "田", mine: "矿", spirit: "灵", watch: "关", ruins: "遗" };
const kindNames: Record<TerritoryKind, string> = { capital: "仙乡主城", farm: "灵田资源区", mine: "矿脉资源区", spirit: "灵脉资源区", watch: "边境关隘", ruins: "古迹资源区" };
const statusNames = { owned: "我方", neutral: "中立", contested: "告急" };
const stanceOptions: { id: ArmyStance; name: string }[] = [{ id: "assault", name: "破阵" }, { id: "guard", name: "镇守" }, { id: "flank", name: "奇袭" }];
const unitOptions: { id: UnitType; name: string }[] = [{ id: "sword", name: "剑修" }, { id: "body", name: "体修" }, { id: "talisman", name: "符修" }, { id: "beast", name: "灵兽" }, { id: "puppet", name: "傀儡" }];
const buildingOptions: { id: BuildingType; name: string; desc: string }[] = [{ id: "production", name: "聚灵工坊", desc: "提高该据点产出" }, { id: "defense", name: "灵纹城垣", desc: "提高守备与医馆容量" }, { id: "march", name: "驭风驿站", desc: "提高全军行军速度" }];
const mobileNav = [{ id: "army" as const, label: "军阵", icon: Swords }, { id: "march" as const, label: "行军", icon: Navigation }, { id: "node" as const, label: "据点", icon: Castle }, { id: "develop" as const, label: "发展", icon: FlaskConical }, { id: "report" as const, label: "军报", icon: ScrollText }];
const activeFormations = computed(() => store.formations.filter(item => item.status === "marching" || item.status === "returning"));
const activeChapter = computed(() => TERRITORY_CHAPTERS.find(chapter => !store.claimedChapters.includes(chapter.id)));
const drawerTitle = computed(() => drawer.value === "tech" ? "军府科技" : drawer.value === "chapter" ? "山河章节" : "山河军报");
const routes = computed(() => { const seen = new Set<string>(); return store.nodes.flatMap(from => from.links.flatMap(targetId => { const to = store.nodes.find(node => node.id === targetId); const id = [from.id, targetId].sort().join(":"); if (!to || seen.has(id)) return []; seen.add(id); return [{ id, from, to, active: from.status === "owned" && to.status === "owned", frontier: (from.status === "owned" && to.status === "neutral") || (to.status === "owned" && from.status === "neutral") }]; })); });
const mapTransform = computed(() => ({ transform: `translate(${offset.value.x}px,${offset.value.y}px) scale(${zoomLevel.value})` }));
const save = () => saveStore.autoSave();
const run = (action: () => boolean) => { if (action()) save(); };
const compact = (value: number) => value >= 100000 ? `${(value / 10000).toFixed(1)}万` : String(value);
const nodeName = (id: string) => store.nodes.find(node => node.id === id)?.name || "万象城";
const unitName = (id: UnitType) => unitOptions.find(item => item.id === id)?.name || id;
const statusName = (status: FormationStatus) => ({ idle: "待命", marching: "行军", returning: "返程", garrison: "驻守", healing: "治疗" })[status];
const countdown = (at: number) => { const seconds = Math.max(0, Math.ceil((at - clock.value) / 1000)); if (!seconds) return "即将完成"; const hours = Math.floor(seconds / 3600); const minutes = Math.floor(seconds % 3600 / 60); const remaining = seconds % 60; return hours ? `${hours}时${minutes}分` : `${minutes}:${String(remaining).padStart(2, "0")}`; };
const formationAt = (id: string) => activeFormations.value.find(item => item.targetId === id);
const selectNode = (id: string) => { store.select(id); nodeTab.value = "intel"; mobileTab.value = "node"; if (window.innerWidth <= 760) mobileExpanded.value = true; };
const focusNode = (id: string) => { const node = store.nodes.find(item => item.id === id); if (!node) return; store.select(id); zoomLevel.value = 1.2; offset.value = { x: (50 - node.x) * 4, y: (50 - node.y) * 3 }; };
const selectFormation = (id: string) => { store.selectFormation(id); save(); };
const setStance = (id: ArmyStance) => run(() => store.setStance(id));
const setUnit = (id: UnitType) => run(() => store.setUnitType(id));
const march = () => run(() => store.march(store.selectedId));
const recall = (id: string) => run(() => store.recallFormation(id));
const recruit = () => run(() => store.recruit());
const heal = () => run(() => store.startHealing());
const resolve = () => run(() => store.resolveRaid(store.selectedId));
const fortify = () => run(() => store.fortify(store.selectedId));
const upgrade = () => run(() => store.upgrade(store.selectedId));
const build = (slot: number, type: BuildingType) => run(() => store.upgradeBuilding(store.selectedId, slot, type));
const research = (id: string) => run(() => store.researchTechnology(id));
const claim = (id: number) => run(() => store.claimChapter(id));
const openDrawer = (mode: "tech" | "chapter" | "report") => drawer.value = drawer.value === mode ? null : mode;
const setMobileTab = (id: typeof mobileTab.value) => { mobileTab.value = id; mobileExpanded.value = true; };
const leaveTerritory = () => { if (store.tick()) save(); void router.push({ name: "home" }); };

const FormationList = defineComponent({ setup: () => () => h("div", { class: "formation-list" }, store.formations.map(item => h("button", { class: { active: item.id === store.selectedFormationId }, onClick: () => selectFormation(item.id) }, [h("span", { class: `unit-seal ${item.unitType}` }, unitName(item.unitType).slice(0, 1)), h("div", [h("b", item.name), h("small", `${unitName(item.unitType)} · ${statusName(item.status)}`)]), h("em", `${item.troops}/${item.maxTroops}`)]))) });
const FormationControls = defineComponent({ setup: () => () => h("div", { class: "formation-controls" }, [
  h("div", { class: "formation-stats" }, [h("span", `士气 ${formation.value?.morale ?? 0}`), h("span", `伤兵 ${store.wounded}/${store.infirmaryCapacity}`)]),
  h("label", ["兵种", h("select", { value: formation.value?.unitType, disabled: formation.value?.status !== "idle", onChange: (event: Event) => setUnit((event.target as HTMLSelectElement).value as UnitType) }, unitOptions.map(item => h("option", { value: item.id }, item.name)))]),
  h("div", { class: "stances" }, stanceOptions.map(item => h("button", { class: { active: formation.value?.stance === item.id }, onClick: () => setStance(item.id) }, item.name))),
  h("div", { class: "dual-actions" }, [h("button", { disabled: formation.value?.status !== "idle", onClick: recruit }, [h(Users, { size: 14 }), "征募40兵"]), h("button", { disabled: !store.wounded || !!store.healingAmount || formation.value?.status !== "idle", onClick: heal }, [h(HeartPulse, { size: 14 }), store.healingAmount ? `治疗 ${countdown(store.healingCompleteAt)}` : "治疗伤兵"])])
]) });
const NodeHeader = defineComponent({ setup: () => () => h("div", { class: "selected-head" }, [h("span", { class: "selected-icon" }, nodeIcons[selected.value.kind]), h("div", [h("h2", selected.value.name), h("p", `${kindNames[selected.value.kind]} · Lv.${selected.value.level}`)]), h("span", { class: ["status", selected.value.status] }, statusNames[selected.value.status])]) });
const NodeIntel = defineComponent({ setup: () => () => h("div", { class: "node-intel" }, [
  h("div", { class: "node-stats" }, [h("div", [h("span", "驻防"), h("b", String(selected.value.garrison))]), h("div", [h("span", "每时产出"), h("b", `木${selected.value.income.wood * selected.value.level} 石${selected.value.income.stone * selected.value.level} 灵${selected.value.income.spirit * selected.value.level}`)])]),
  selected.value.status === "neutral" ? h("div", { class: ["supply-note", { blocked: !store.isReachable(selected.value) }] }, [h(Route, { size: 14 }), store.isReachable(selected.value) ? `${formation.value.name}已选定，兵种与阵型将在抵达时结算。` : "供给线未接通，需先占领相邻据点。"]) : null,
  selected.value.status === "contested" ? h("div", { class: "supply-note danger" }, [h(ShieldAlert, { size: 14 }), "敌军正在围攻，选择空闲军阵出发回援，抵达后结算。"]) : null,
  h("div", { class: "node-actions" }, selected.value.status === "neutral" ? [h("button", { class: "primary", disabled: !store.isReachable(selected.value) || formation.value?.status !== "idle" || formation.value?.troops < 30, onClick: march }, [h(Swords, { size: 15 }), "出征 · 2行动力"])] : selected.value.status === "contested" ? [h("button", { class: "danger-button", disabled: formation.value?.status !== "idle" || formation.value?.troops < 20, onClick: resolve }, [h(ShieldCheck, { size: 15 }), "出发回援 · 2行动力"])] : [h("button", { class: "primary", onClick: upgrade }, [h(ArrowUpCircle, { size: 15 }), "升级据点"]), h("button", { onClick: fortify }, [h(Castle, { size: 15 }), "增筑驻防"])])
]) });
const NodeBuild = defineComponent({ setup: () => () => h("div", { class: "build-list" }, selected.value.status !== "owned" ? [h("p", { class: "empty" }, "占领据点后才能进行建设。")] : selected.value.buildings.map((slot, index) => h("article", { key: index }, [h("header", [h("b", `建筑槽 ${index + 1}`), h("span", slot ? `${buildingOptions.find(item => item.id === slot.type)?.name} Lv.${slot.level}` : "空闲")]), slot ? h("p", buildingOptions.find(item => item.id === slot.type)?.desc) : h("div", { class: "build-options" }, buildingOptions.map(item => h("button", { onClick: () => build(index, item.id) }, item.name))), slot ? h("button", { disabled: slot.level >= 3, onClick: () => build(index, slot.type) }, slot.level >= 3 ? "已满级" : "升级建筑") : null]))) });
const MarchList = defineComponent({ setup: () => () => h("div", { class: "march-list" }, activeFormations.value.length ? activeFormations.value.map(item => h("article", [h(Navigation, { size: 17 }), h("div", [h("b", item.name), h("small", `${statusName(item.status)}至${nodeName(item.targetId)}`)]), h("time", countdown(item.arrivalAt)), item.status === "marching" ? h("button", { onClick: () => recall(item.id) }, "召回") : null])) : [h("p", { class: "empty" }, "三支军阵均未行军。")] ) });
const TechList = defineComponent({ setup: () => () => h("div", { class: "drawer-list" }, TERRITORY_TECHNOLOGIES.map(tech => { const done = store.researchedTechnologies.includes(tech.id); const locked = !!tech.prerequisite && !store.researchedTechnologies.includes(tech.prerequisite); return h("article", [h("div", [h("b", tech.name), h("small", tech.description)]), h("p", `木${tech.cost.wood} 石${tech.cost.stone} 灵${tech.cost.spirit}`), h("button", { disabled: done || locked, onClick: () => research(tech.id) }, done ? "已研究" : locked ? "前置未完成" : "研究")]); })) });
const ChapterList = defineComponent({ setup: () => () => h("div", { class: "drawer-list" }, TERRITORY_CHAPTERS.map(chapter => { const done = store.claimedChapters.includes(chapter.id); const available = store.chapterAvailable(chapter); return h("article", [h("div", [h("b", `${chapter.id}. ${chapter.name}`), h("small", chapter.description)]), h("p", `奖励 木${chapter.reward.wood} 石${chapter.reward.stone} 灵${chapter.reward.spirit}`), h("button", { disabled: done || !available, onClick: () => claim(chapter.id) }, done ? "已领取" : available ? "领取" : "进行中")]); })) });
const ReportList = defineComponent({ setup: () => () => h("div", { class: "report-list" }, store.reports.length ? store.reports.map(report => h("article", { class: report.result }, [h("header", [h("b", report.title), h("time", new Date(report.at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }))]), h("p", report.detail)])) : [h("p", { class: "empty" }, "尚无军报。")] ) });

const zoom = (amount: number) => zoomLevel.value = Math.min(1.65, Math.max(.82, zoomLevel.value + amount));
const resetView = () => { zoomLevel.value = 1; offset.value = { x: 0, y: 0 }; };
const onWheel = (event: WheelEvent) => zoom(event.deltaY > 0 ? -.08 : .08);
const startPan = (event: PointerEvent) => { dragging.value = true; pointerStart.value = { x: event.clientX, y: event.clientY }; offsetStart.value = { ...offset.value }; (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); };
const pan = (event: PointerEvent) => { if (!dragging.value) return; offset.value = { x: Math.max(-500, Math.min(500, offsetStart.value.x + event.clientX - pointerStart.value.x)), y: Math.max(-350, Math.min(350, offsetStart.value.y + event.clientY - pointerStart.value.y)) }; };
const endPan = () => dragging.value = false;
let timer: number | undefined;
onMounted(() => { if (store.tick()) save(); timer = window.setInterval(() => { clock.value = Date.now(); if (store.tick()) save(); }, 1000); });
onUnmounted(() => { if (timer) window.clearInterval(timer); if (store.tick()) save(); });
</script>

<style scoped>
*{box-sizing:border-box}.territory-view{position:fixed;inset:0;z-index:35;overflow:hidden;background:#10282b;color:#f2ead3;font-family:inherit;min-height:100dvh}.map-viewport{position:absolute;inset:0;overflow:hidden;cursor:grab;touch-action:none}.map-viewport:active{cursor:grabbing}.strategic-map{position:absolute;inset:-5%;width:110%;height:110%;transform-origin:center;will-change:transform}.terrain-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;user-select:none}.mist-edge{position:absolute;left:0;right:0;height:120px;pointer-events:none}.mist-edge.top{top:0;background:linear-gradient(#07181ed8,transparent)}.mist-edge.bottom{bottom:0;background:linear-gradient(transparent,#07181ee8)}.supply-lines{position:absolute;inset:0;width:100%;height:100%;z-index:3;pointer-events:none}.supply-lines line{stroke:#d6c18780;stroke-width:.28;stroke-dasharray:1.1 1.2}.supply-lines line.frontier{stroke:#efd679;stroke-width:.38;animation:routePulse 1.8s infinite}.supply-lines line.active{stroke:#72dfb1;stroke-width:.48;stroke-dasharray:none}.domain{position:absolute;z-index:2;width:12%;aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,#56d99e35 0 32%,#56d99e13 52%,transparent 72%);border:1px solid #5dd9a522;pointer-events:none}.territory-node{position:absolute;z-index:5;transform:translate(-50%,-50%);border:0;background:none;color:#eee4cc;display:flex;align-items:center;gap:7px;cursor:pointer;padding:4px}.node-building{width:38px;height:38px;display:grid;place-items:center;transform:rotate(45deg);border:2px solid #cbb87a;background:#17312e;box-shadow:0 5px 16px #071414cc}.node-building span{transform:rotate(-45deg);font-weight:900;color:#e6cc80}.node-copy{display:flex;flex-direction:column;text-align:left;padding:4px 7px;background:#07191dcc;border:1px solid #c8b67766;white-space:nowrap}.node-copy b{font-size:11px}.node-copy small{font-size:8px;color:#a9b7aa}.territory-node.owned .node-building{border-color:#65d7a2;background:#174b3d}.territory-node.reachable.neutral .node-building{border-color:#efd46d;animation:nodeGlow 1.8s infinite}.territory-node.contested .node-building{border-color:#ef7967;background:#582d2a;animation:alarmPulse 1s infinite}.territory-node.selected{z-index:7}.territory-node.selected .node-building{transform:rotate(45deg) scale(1.18);box-shadow:0 0 0 4px #ffe58b30}.territory-node.capital .node-building{width:50px;height:50px;background:#6a412d;border-color:#ffe08a}.alarm{position:absolute;left:27px;top:-4px;width:18px;height:18px;border-radius:50%;background:#e75f50;color:#fff;font-style:normal;font-size:12px;line-height:18px}.march-dot{position:absolute;right:-5px;bottom:-5px;width:20px;height:20px;display:grid;place-items:center;border-radius:50%;background:#e7ca70;color:#102421}.glass{border:1px solid #d8c58942;background:#0b201fdf;box-shadow:0 10px 30px #020b0dcc;backdrop-filter:blur(10px)}button,select{font:inherit}.top-hud{position:absolute;z-index:12;left:18px;right:18px;top:14px;height:68px;display:flex;align-items:center;padding:0 16px}.brand{display:flex;align-items:center;gap:9px;min-width:210px}.seal{width:38px;height:38px;display:grid;place-items:center;border:1px solid #e4c36b;color:#f1d680;background:#6d3828}.brand p,.brand h1{margin:0}.brand p{font-size:9px;color:#b9c3b5;letter-spacing:2px}.brand h1{font-size:19px;color:#ecd487}.resource-hud{flex:1;display:grid;grid-template-columns:repeat(4,minmax(80px,115px));justify-content:center}.resource-hud>div{padding:3px 12px;border-left:1px solid #d6c38426;min-width:0}.resource-hud span,.resource-hud small{display:block;font-size:9px;color:#9fb0a8}.resource-hud b{font-size:15px;color:#f2dda0}.resource-hud small{color:#6ed7ad}.top-actions{display:flex;gap:6px}.top-actions button,.zoom-hud button,.work-drawer header button{border:1px solid #d6c38444;background:#0a1a1d;color:#e8dab5;display:flex;align-items:center;justify-content:center;gap:5px;height:32px;padding:0 9px;cursor:pointer}.army-panel{position:absolute;z-index:11;left:18px;top:98px;width:260px;padding:12px}.node-panel{position:absolute;z-index:11;right:18px;top:98px;width:320px;padding:13px}.panel-title{display:flex;align-items:center;gap:6px;color:#ecd487;font-size:12px;margin-bottom:9px}.panel-title em{margin-left:auto;font-size:9px;color:#8fa59a;font-style:normal}.formation-list{display:grid;gap:5px}.formation-list>button{height:48px;width:100%;border:1px solid #cbb67b35;background:#091b1b;color:#d7d0b8;display:grid;grid-template-columns:34px 1fr auto;align-items:center;text-align:left;padding:5px 7px;cursor:pointer}.formation-list>button.active{border-color:#e9ca70;background:#4d4029}.formation-list div{min-width:0}.formation-list b,.formation-list small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.formation-list b{font-size:11px}.formation-list small{font-size:8px;color:#91a39a}.formation-list em{font-size:10px;font-style:normal}.unit-seal{width:28px;height:28px;display:grid;place-items:center;border:1px solid #d1bc7e;color:#eedb9e}.formation-controls{margin-top:9px}.formation-stats{display:flex;justify-content:space-between;font-size:9px;color:#aab8b0}.formation-controls label{display:grid;grid-template-columns:36px 1fr;align-items:center;margin:7px 0;font-size:9px;color:#9fafaa}.formation-controls select{height:29px;background:#0a191a;color:#e7d9b4;border:1px solid #cbb67b4d;padding:0 6px}.stances{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.stances button,.dual-actions button{height:31px;border:1px solid #cbb67b40;background:#0a1a1d;color:#b9c2ba;cursor:pointer}.stances button.active{border-color:#efd373;background:#6a522f;color:#fff}.dual-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:6px}.dual-actions button{display:flex;align-items:center;justify-content:center;gap:4px;color:#b9e8d2}.selected-head{display:flex;align-items:center;gap:8px}.selected-icon{width:38px;height:38px;display:grid;place-items:center;border:1px solid #dfc777;color:#ead17c;background:#5b3c28;font-weight:bold}.selected-head h2,.selected-head p{margin:0}.selected-head h2{font-size:15px;color:#efd687}.selected-head p{font-size:9px;color:#9cafaa}.status{margin-left:auto;font-size:8px;border:1px solid;padding:3px 5px}.status.owned{color:#6ed7ad}.status.neutral{color:#e0cb83}.status.contested{color:#ef8b79}.panel-tabs{display:grid;grid-template-columns:1fr 1fr;margin-top:10px;border-bottom:1px solid #d6c38433}.panel-tabs button{height:30px;border:0;background:none;color:#81968d;cursor:pointer}.panel-tabs button.active{color:#efd47f;border-bottom:2px solid #d9ba61}.node-stats{display:grid;grid-template-columns:75px 1fr;margin-top:5px;border-bottom:1px solid #d6c38420}.node-stats div{padding:8px 3px}.node-stats span,.node-stats b{display:block}.node-stats span{font-size:8px;color:#8fa099}.node-stats b{font-size:10px;color:#d9c98f}.supply-note{display:flex;gap:6px;align-items:flex-start;padding:8px;margin-top:8px;font-size:9px;line-height:1.45;color:#dfcf8d;background:#d1bd7410}.supply-note.blocked{color:#c99075;background:#aa533510}.supply-note.danger{color:#f09a88;background:#a43e301d}.node-actions{display:flex;gap:6px;margin-top:8px}.node-actions button{flex:1;min-height:34px;border:1px solid #d4c17c55;background:#132825;color:#d9d0b6;display:flex;align-items:center;justify-content:center;gap:4px;font-size:10px;cursor:pointer}.node-actions .primary{background:#a5803d;color:#101d1b;border-color:#e3c66d}.node-actions .danger-button{background:#7d332b;color:#fff}.build-list{display:grid;gap:7px;margin-top:8px}.build-list article{border:1px solid #d6c38429;background:#091b1b;padding:8px}.build-list header{display:flex;justify-content:space-between;font-size:10px}.build-list header span{color:#e2cd86}.build-list p{font-size:9px;color:#8fa099}.build-list>article>button,.build-options button{border:1px solid #d4c17c55;background:#17322d;color:#cde0d3;height:29px;font-size:9px;cursor:pointer}.build-options{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:7px}.desktop-bottom{position:absolute;z-index:12;left:18px;right:18px;bottom:14px;height:72px;display:grid;grid-template-columns:230px 1fr 250px;align-items:center;padding:8px 12px}.campaign-summary span,.campaign-summary b,.campaign-summary small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.campaign-summary span{font-size:8px;color:#65d7a2}.campaign-summary b{font-size:12px;color:#ecd487}.campaign-summary small{font-size:8px;color:#8fa099}.march-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;padding:0 12px}.march-summary article{display:grid;grid-template-columns:17px 1fr auto;align-items:center;gap:4px;border-left:1px solid #d6c38435;padding:3px 7px;min-width:0}.march-summary div{min-width:0}.march-summary b,.march-summary small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.march-summary b{font-size:9px}.march-summary small{font-size:8px;color:#84988f}.march-summary time{font-size:9px;color:#e8d17f}.march-summary>p{grid-column:1/4;text-align:center;font-size:9px;color:#7f9289}.bottom-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.bottom-actions button{height:38px;border:1px solid #d6c38442;background:#102725;color:#d9c68b;display:flex;align-items:center;justify-content:center;gap:4px;font-size:10px;cursor:pointer}.work-drawer{position:absolute;z-index:18;right:18px;top:98px;bottom:98px;width:400px;padding:13px;overflow:auto}.work-drawer>header{position:sticky;top:-13px;background:#0b201f;padding:5px 0 10px;display:flex;justify-content:space-between;align-items:center;z-index:2}.work-drawer header small,.work-drawer header b{display:block}.work-drawer header small{font-size:8px;color:#82968d}.work-drawer header b{color:#ecd487}.drawer-list{display:grid;gap:7px}.drawer-list article{display:grid;grid-template-columns:1fr auto;gap:3px 10px;border:1px solid #d6c38429;background:#091b1b;padding:9px}.drawer-list b,.drawer-list small{display:block}.drawer-list b{font-size:11px;color:#ddce9e}.drawer-list small,.drawer-list p{font-size:9px;color:#8fa099;margin:2px 0}.drawer-list button{grid-column:2;grid-row:1/3;min-width:62px;border:1px solid #d4c17c55;background:#17322d;color:#cde0d3;cursor:pointer}.report-list{display:grid;gap:5px}.report-list article{padding:8px;border-bottom:1px solid #d3c07c20}.report-list header{display:flex;justify-content:space-between;gap:8px}.report-list b{font-size:10px}.report-list time{font-size:8px;color:#7f9289;white-space:nowrap}.report-list p,.empty{font-size:9px;color:#a6b3ab;margin:4px 0}.report-list .victory b{color:#70d9aa}.report-list .defeat b{color:#ee8a78}.march-list{display:grid;gap:5px}.march-list article{display:grid;grid-template-columns:22px 1fr auto auto;align-items:center;gap:6px;padding:7px;border:1px solid #d6c38429}.march-list b,.march-list small{display:block}.march-list b{font-size:10px}.march-list small{font-size:8px;color:#8fa099}.march-list time{font-size:10px;color:#ead17b}.march-list button{height:28px;border:1px solid #d87969;background:#5f2f2b;color:#f4b1a6}.zoom-hud{position:absolute;z-index:11;left:18px;bottom:98px;display:flex;align-items:center}.zoom-hud button{width:31px;padding:0}.zoom-hud span{width:42px;text-align:center;font-size:9px}.last-action{position:absolute;z-index:10;left:50%;bottom:98px;transform:translateX(-50%);max-width:46%;padding:5px 9px;background:#07191dbd;border:1px solid #d6c3842b;color:#d8cba6;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mobile-work{display:none}button:disabled,select:disabled{opacity:.38;cursor:not-allowed}@keyframes routePulse{50%{stroke-opacity:.25}}@keyframes nodeGlow{50%{box-shadow:0 0 18px #f0d26c}}@keyframes alarmPulse{50%{box-shadow:0 0 22px #ef6758}}
@media(max-width:760px), (max-height:600px) and (orientation:landscape){.territory-view{height:100dvh}.top-hud{left:6px;right:6px;top:max(6px,env(safe-area-inset-top));height:78px;padding:5px 7px;display:grid;grid-template-columns:1fr auto;grid-template-rows:34px 34px}.brand{min-width:0}.brand p{display:none}.brand h1{font-size:14px}.seal{width:29px;height:29px}.top-actions{justify-self:end}.top-actions button{width:31px;padding:0}.top-actions button span{display:none}.resource-hud{grid-column:1/3;grid-row:2;grid-template-columns:repeat(4,minmax(0,1fr));width:100%}.resource-hud>div{padding:1px 5px;text-align:center}.resource-hud span{font-size:8px}.resource-hud b{font-size:11px;display:block;overflow:hidden;text-overflow:ellipsis}.resource-hud small{display:none}.desktop-panel,.desktop-bottom,.work-drawer,.zoom-hud,.last-action{display:none}.strategic-map{inset:0;width:100%;height:100%}.territory-node .node-copy{display:none}.territory-node .node-building{width:31px;height:31px}.territory-node.capital .node-building{width:40px;height:40px}.mobile-work{display:block;position:absolute;z-index:15;left:6px;right:6px;bottom:max(6px,env(safe-area-inset-bottom));height:116px;padding:0 8px calc(6px + env(safe-area-inset-bottom));transition:height .2s ease;overflow:hidden}.mobile-work.expanded{height:min(48dvh,430px)}.work-grip{position:absolute;top:0;left:50%;transform:translateX(-50%);width:52px;height:18px;border:0;background:none;color:#afbfaf}.mobile-work.expanded .work-grip svg{transform:rotate(180deg)}.mobile-work nav{height:58px;margin-top:14px;display:grid;grid-template-columns:repeat(5,1fr);border-bottom:1px solid #d6c38424}.mobile-work nav button{min-width:0;border:0;background:none;color:#81958d;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:8px}.mobile-work nav button.active{color:#efd47f}.mobile-content{height:calc(100% - 72px);overflow-y:auto;overflow-x:hidden;padding:7px 1px}.mobile-content .formation-list{grid-template-columns:repeat(3,minmax(0,1fr))}.mobile-content .formation-list>button{height:52px;grid-template-columns:26px 1fr;padding:4px}.mobile-content .formation-list em{display:none}.mobile-content .unit-seal{width:22px;height:22px}.mobile-content .selected-head{position:sticky;top:-7px;background:#0b201f;padding:4px 0;z-index:2}.mobile-content .node-stats{grid-template-columns:70px 1fr}.mobile-content .build-options{grid-template-columns:1fr}.mobile-content .drawer-list article{grid-template-columns:1fr 65px}.mobile-section-title{margin:12px 2px 6px;color:#ecd487;font-size:11px;font-weight:600}.mobile-content .march-list article{grid-template-columns:20px minmax(0,1fr) auto}.mobile-content .march-list article>button{grid-column:2/4;width:100%}.mist-edge.top{height:100px}.mist-edge.bottom{height:180px}.march-dot{right:-9px}.alarm{left:22px}.node-actions button{min-height:38px}}
@media(max-width:380px){.mobile-content .formation-list{grid-template-columns:1fr}.mobile-work.expanded{height:52dvh}.resource-hud>div{padding:1px 2px}.resource-hud b{font-size:10px}}
</style>
