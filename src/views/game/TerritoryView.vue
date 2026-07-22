<template>
  <section class="territory-view">
    <header class="territory-header">
      <div>
        <p class="eyebrow">万象仙乡 · 战略经营</p>
        <h1>仙乡领地</h1>
        <p class="muted">拓展灵脉、调度队伍，把一座仙乡经营成自己的势力范围。</p>
      </div>
      <div class="territory-actions">
        <button class="icon-button" title="恢复地图视野" @click="resetView"><Maximize2 :size="16" /></button>
        <button class="action-button danger" @click="raid"><ShieldAlert :size="15" /> 敌袭演练</button>
      </div>
    </header>

    <div class="territory-layout">
      <main class="map-shell">
        <div class="map-toolbar">
          <span><MapPinned :size="15" /> 山河战略图</span>
          <div class="zoom-controls">
            <button title="缩小" @click="zoom(-0.1)"><Minus :size="14" /></button>
            <span>{{ Math.round(zoomLevel * 100) }}%</span>
            <button title="放大" @click="zoom(0.1)"><Plus :size="14" /></button>
          </div>
        </div>
        <div ref="mapViewport" class="map-viewport" @pointerdown="startPan" @pointermove="pan" @pointerup="endPan" @pointercancel="endPan" @wheel.prevent="onWheel">
          <div class="strategic-map" :style="mapTransform">
            <div class="mountain mountain-a" /><div class="mountain mountain-b" /><div class="mountain mountain-c" />
            <div class="river river-a" /><div class="river river-b" />
            <div class="road road-a" /><div class="road road-b" /><div class="road road-c" />
            <button v-for="node in store.nodes" :key="node.id" class="territory-node" :class="[node.status, { selected: node.id === store.selectedId, capital: node.kind === 'capital' }]" :style="{ left: `${node.x}%`, top: `${node.y}%` }" @click.stop="select(node.id)">
              <span class="node-icon">{{ icons[node.kind] }}</span><span class="node-name">{{ node.name }}</span><small>Lv.{{ node.level }}</small>
              <i v-if="node.dispatchedAt" class="dispatch-dot" /><i v-if="node.status === 'contested'" class="raid-dot">!</i>
            </button>
          </div>
          <div class="map-hint">拖动查看山河 · 滚轮缩放</div>
        </div>
        <div class="map-legend"><span><i class="legend owned" />已控制 {{ store.ownedNodes.length }}</span><span><i class="legend neutral" />可拓展 {{ store.nodes.filter(n => n.status === 'neutral').length }}</span><span><i class="legend contested" />告急 {{ store.nodes.filter(n => n.status === 'contested').length }}</span></div>
      </main>

      <aside class="territory-sidebar">
        <div class="resource-strip"><div><span>木材</span><strong>{{ store.resources.wood }}</strong></div><div><span>石料</span><strong>{{ store.resources.stone }}</strong></div><div><span>灵晶</span><strong>{{ store.resources.spirit }}</strong></div></div>
        <div class="command-card"><div><span>调度力</span><strong>{{ store.commandPower }}</strong></div><div><span>势力战力</span><strong>{{ store.totalPower }}</strong></div><div class="income"><span>每小时产出</span><em>木 {{ store.incomePerHour.wood }} · 石 {{ store.incomePerHour.stone }} · 灵 {{ store.incomePerHour.spirit }}</em></div></div>
        <div class="selected-card" v-if="selected">
          <div class="selected-title"><span class="large-icon">{{ icons[selected.kind] }}</span><div><p>{{ selected.name }}</p><small>{{ kindLabels[selected.kind] }} · 战力 {{ selected.power }}</small></div><span class="status-label" :class="selected.status">{{ statusLabels[selected.status] }}</span></div>
          <p class="selected-desc">{{ descriptions[selected.kind] }}</p>
          <div class="income-line"><span>基础产出</span><b>木 {{ selected.income.wood }} · 石 {{ selected.income.stone }} · 灵 {{ selected.income.spirit }}</b></div>
          <div v-if="selected.status === 'contested'" class="alert-box"><ShieldAlert :size="16" /> 领地正在遭受攻击，守住它才能保留收益。</div>
          <div class="card-actions">
            <button v-if="selected.status === 'neutral'" class="action-button primary" @click="occupy"><Flag :size="15" /> 占领领地</button>
            <button v-else-if="selected.status === 'contested'" class="action-button danger" @click="resolve"><Swords :size="15" /> 调度守军</button>
            <button v-else-if="selected.dispatchedAt" class="action-button primary" @click="recall"><PackageCheck :size="15" /> 收回队伍</button>
            <button v-else class="action-button primary" @click="dispatch"><Send :size="15" /> 派遣采集</button>
            <button v-if="selected.status === 'owned'" class="action-button" @click="upgrade"><ArrowUpCircle :size="15" /> 升级</button>
          </div>
        </div>
        <div class="event-card"><span class="event-mark">◆</span><p>{{ store.lastAction }}</p></div>
        <div class="tip-card"><strong>领地法则</strong><p>先占领资源点，再派遣队伍获取短期收益。升级领地会提高长期产出，敌袭演练可测试守军调度。</p></div>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { ArrowUpCircle, Flag, MapPinned, Maximize2, Minus, PackageCheck, Plus, Send, ShieldAlert, Swords } from "lucide-vue-next";
import { useTerritoryStore, type TerritoryKind } from "@/stores/useTerritoryStore";
import { useSaveStore } from "@/stores/useSaveStore";

const store = useTerritoryStore(); const saveStore = useSaveStore();
const zoomLevel = ref(1); const offset = ref({ x: 0, y: 0 }); const dragging = ref(false); const pointerStart = ref({ x: 0, y: 0 }); const offsetStart = ref({ x: 0, y: 0 });
const icons: Record<TerritoryKind, string> = { capital: "城", farm: "田", mine: "矿", spirit: "灵", watch: "关", ruins: "遗" };
const kindLabels: Record<TerritoryKind, string> = { capital: "仙乡主城", farm: "灵田资源区", mine: "矿脉资源区", spirit: "灵脉资源区", watch: "边境哨站", ruins: "古迹资源区" };
const descriptions: Record<TerritoryKind, string> = { capital: "万象仙乡的核心城池，连接所有拓展路线。", farm: "肥沃的灵田，稳定产出木材与少量灵晶。", mine: "深藏地脉的矿场，能持续供应石料。", spirit: "灵气汇聚之地，是灵晶产出的核心来源。", watch: "守望山河的前线据点，提升势力调度效率。", ruins: "等待探索的古老遗址，蕴含多种稀有资源。" };
const statusLabels = { owned: "已控制", neutral: "未占领", contested: "告急" };
const selected = computed(() => store.selectedNode);
const mapTransform = computed(() => ({ transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${zoomLevel.value})` }));
const select = (id: string) => store.select(id); const zoom = (n: number) => { zoomLevel.value = Math.min(1.7, Math.max(.72, zoomLevel.value + n)); };
const resetView = () => { zoomLevel.value = 1; offset.value = { x: 0, y: 0 }; };
const startPan = (event: PointerEvent) => { dragging.value = true; pointerStart.value = { x: event.clientX, y: event.clientY }; offsetStart.value = { ...offset.value }; (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId); };
const pan = (event: PointerEvent) => { if (!dragging.value) return; offset.value = { x: offsetStart.value.x + event.clientX - pointerStart.value.x, y: offsetStart.value.y + event.clientY - pointerStart.value.y }; };
const endPan = () => { dragging.value = false; };
const onWheel = (event: WheelEvent) => zoom(event.deltaY > 0 ? -.08 : .08);
const occupy = () => { store.occupy(store.selectedId); saveStore.autoSave(); }; const dispatch = () => { store.dispatch(store.selectedId); saveStore.autoSave(); }; const recall = () => { store.recall(store.selectedId); saveStore.autoSave(); }; const upgrade = () => { store.upgrade(store.selectedId); saveStore.autoSave(); }; const resolve = () => { store.resolveRaid(store.selectedId); saveStore.autoSave(); }; const raid = () => { store.triggerRaid(); saveStore.autoSave(); };
onMounted(() => { store.tick(); }); onUnmounted(() => { store.tick(); });
</script>

<style scoped>
.territory-view{min-height:100%;color:rgb(var(--color-text));padding:4px 2px 18px}.territory-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px}.eyebrow{font-size:10px;color:var(--color-accent);letter-spacing:.14em;margin:0 0 4px}.territory-header h1{font-size:22px;color:var(--color-accent);margin:0 0 3px}.muted{font-size:11px;color:var(--color-muted);margin:0}.territory-actions,.zoom-controls,.card-actions{display:flex;gap:6px;align-items:center}.icon-button,.zoom-controls button{border:1px solid rgba(200,164,92,.3);background:rgba(0,0,0,.18);color:var(--color-muted);padding:7px;cursor:pointer}.action-button{display:inline-flex;align-items:center;justify-content:center;gap:5px;border:1px solid rgba(200,164,92,.35);background:rgba(0,0,0,.2);color:rgb(var(--color-text));padding:8px 10px;font-size:11px;cursor:pointer}.action-button.primary{background:var(--color-accent);color:rgb(var(--color-bg));border-color:var(--color-accent)}.action-button.danger{border-color:rgba(219,100,80,.55);color:#f39b86}.territory-layout{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:12px}.map-shell,.territory-sidebar>*{border:1px solid rgba(200,164,92,.25);background:rgba(16,24,27,.78)}.map-toolbar{height:38px;display:flex;justify-content:space-between;align-items:center;padding:0 10px;color:var(--color-accent);font-size:11px}.map-toolbar>span{display:flex;gap:6px;align-items:center}.zoom-controls{color:var(--color-muted);font-size:10px}.zoom-controls button{padding:4px 6px}.map-viewport{height:min(66vh,620px);min-height:420px;overflow:hidden;position:relative;cursor:grab;background:#192c2d}.map-viewport:active{cursor:grabbing}.strategic-map{position:absolute;inset:-8%;width:116%;height:116%;transform-origin:center;background:radial-gradient(circle at 50% 48%,rgba(235,191,96,.16),transparent 20%),linear-gradient(140deg,#183d3a,#25483d 44%,#173537);overflow:hidden}.strategic-map:after{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:40px 40px;pointer-events:none}.mountain{position:absolute;width:42%;height:23%;background:linear-gradient(145deg,rgba(11,33,35,.7),rgba(74,105,83,.4));clip-path:polygon(0 90%,20% 36%,33% 65%,55% 8%,73% 54%,100% 25%,100% 100%,0 100%);opacity:.75}.mountain-a{left:-4%;top:2%}.mountain-b{right:-8%;top:38%;transform:rotate(8deg)}.mountain-c{left:20%;bottom:-5%;transform:rotate(180deg);opacity:.55}.river{position:absolute;background:rgba(70,184,190,.4);height:7px;border-radius:100%;filter:blur(1px);transform-origin:left}.river-a{width:85%;left:-4%;top:45%;transform:rotate(-20deg)}.river-b{width:55%;right:-6%;top:78%;transform:rotate(25deg)}.road{position:absolute;height:2px;background:rgba(225,191,113,.34);transform-origin:left}.road-a{width:70%;left:18%;top:52%;transform:rotate(-20deg)}.road-b{width:65%;left:47%;top:52%;transform:rotate(-55deg)}.road-c{width:62%;left:47%;top:52%;transform:rotate(72deg)}.territory-node{position:absolute;transform:translate(-50%,-50%);z-index:2;min-width:65px;padding:5px 7px 4px;border:1px solid rgba(208,185,113,.42);background:rgba(15,30,30,.93);color:rgb(var(--color-text));cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:1px;box-shadow:0 4px 12px rgba(0,0,0,.28)}.territory-node:hover,.territory-node.selected{border-color:#ffe28a;box-shadow:0 0 0 2px rgba(255,226,138,.22),0 5px 16px rgba(0,0,0,.4)}.territory-node.owned{border-color:rgba(98,208,155,.7)}.territory-node.contested{border-color:#ed806f;animation:pulse 1.3s infinite}.territory-node.capital{min-width:82px;padding:7px 9px;border-color:#ffe28a;background:rgba(65,48,28,.95)}.node-icon{font-size:15px;color:#ffe28a;font-weight:bold}.node-name{font-size:10px;white-space:nowrap}.territory-node small{font-size:8px;color:var(--color-muted)}.dispatch-dot,.raid-dot{position:absolute;right:-5px;top:-5px;width:15px;height:15px;border-radius:50%;font-style:normal;font-size:9px;text-align:center;line-height:15px}.dispatch-dot{background:#67d4ca}.raid-dot{background:#dc6758;color:white}.map-hint{position:absolute;bottom:8px;left:10px;color:rgba(255,255,255,.55);font-size:10px;pointer-events:none}.map-legend{display:flex;gap:14px;padding:8px 10px;color:var(--color-muted);font-size:10px}.legend{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px}.legend.owned{background:#62d09b}.legend.neutral{background:#d0b971}.legend.contested{background:#ed806f}.territory-sidebar{display:flex;flex-direction:column;gap:9px}.territory-sidebar>*{padding:10px}.resource-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;text-align:center}.resource-strip span,.command-card span{display:block;color:var(--color-muted);font-size:10px}.resource-strip strong{font-size:17px;color:#ffe28a}.command-card{display:grid;grid-template-columns:1fr 1fr;gap:10px}.command-card strong{font-size:18px;color:var(--color-accent)}.command-card .income{grid-column:1/-1;border-top:1px solid rgba(200,164,92,.16);padding-top:8px}.command-card em{font-size:10px;color:#8ad8c1;font-style:normal}.selected-title{display:flex;align-items:center;gap:8px}.large-icon{width:32px;height:32px;display:grid;place-items:center;border:1px solid rgba(255,226,138,.45);color:#ffe28a;font-weight:bold}.selected-title p{margin:0;color:var(--color-accent);font-size:14px}.selected-title small{color:var(--color-muted);font-size:10px}.status-label{margin-left:auto;font-size:9px;padding:3px 5px;border:1px solid}.status-label.owned{color:#62d09b}.status-label.neutral{color:#d0b971}.status-label.contested{color:#ed806f}.selected-desc{font-size:10px;color:var(--color-muted);line-height:1.5;margin:9px 0}.income-line{display:flex;justify-content:space-between;gap:8px;border-top:1px solid rgba(200,164,92,.15);padding:8px 0;font-size:10px;color:var(--color-muted)}.income-line b{color:#8ad8c1;font-weight:normal}.card-actions{flex-wrap:wrap}.card-actions .action-button{flex:1;min-width:100px}.alert-box{display:flex;gap:6px;align-items:center;color:#f39b86;font-size:10px;padding:7px;background:rgba(164,55,45,.12);margin-bottom:8px}.event-card{display:flex;gap:8px;align-items:flex-start;color:#d9c68b;font-size:11px;line-height:1.5}.event-card p{margin:0}.event-mark{color:#ffe28a}.tip-card{font-size:10px;line-height:1.5;color:var(--color-muted)}.tip-card strong{color:var(--color-accent);display:block;margin-bottom:4px}.tip-card p{margin:0}@keyframes pulse{50%{box-shadow:0 0 0 4px rgba(237,128,111,.15)}}
@media(max-width:800px){.territory-layout{grid-template-columns:1fr}.territory-header h1{font-size:19px}.map-viewport{height:55vh;min-height:390px}.territory-sidebar{display:grid;grid-template-columns:1fr 1fr}.territory-sidebar>*{min-width:0}.selected-card,.event-card,.tip-card{grid-column:1/-1}.resource-strip{grid-column:1/-1}}
</style>
