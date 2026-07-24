import { computed, ref } from "vue";
import { defineStore } from "pinia";

export type TerritoryStatus = "neutral" | "owned" | "contested";
export type TerritoryKind = "capital" | "farm" | "mine" | "spirit" | "watch" | "ruins";
export type ArmyStance = "assault" | "guard" | "flank";
export type TerritoryResources = { wood: number; stone: number; spirit: number };
export type BattleReport = { id: string; at: number; title: string; result: "victory" | "defeat" | "info"; detail: string };
export type TerritoryNode = {
  id: string; name: string; kind: TerritoryKind; x: number; y: number;
  income: TerritoryResources; power: number; status: TerritoryStatus; level: number;
  garrison: number; lastCollectedAt: number; dispatchedAt: number; enemyAt: number; links: string[];
};

const now = () => Date.now();
const INITIAL_NODES: TerritoryNode[] = [
  { id:"capital",name:"万象城",kind:"capital",x:50,y:51,income:{wood:3,stone:3,spirit:4},power:1,status:"owned",level:1,garrison:120,lastCollectedAt:now(),dispatchedAt:0,enemyAt:0,links:["cloud-farm","east-farm","black-mine","red-mine"] },
  { id:"cloud-farm",name:"云禾原",kind:"farm",x:30,y:32,income:{wood:7,stone:1,spirit:2},power:42,status:"neutral",level:1,garrison:42,lastCollectedAt:0,dispatchedAt:0,enemyAt:0,links:["capital","star-lake","jade-ruins","bamboo-ward"] },
  { id:"east-farm",name:"东篱田契",kind:"farm",x:73,y:31,income:{wood:6,stone:2,spirit:2},power:48,status:"neutral",level:1,garrison:48,lastCollectedAt:0,dispatchedAt:0,enemyAt:0,links:["capital","star-lake","sea-gate","wind-terrace"] },
  { id:"black-mine",name:"玄铁矿脉",kind:"mine",x:18,y:57,income:{wood:1,stone:8,spirit:1},power:54,status:"neutral",level:1,garrison:54,lastCollectedAt:0,dispatchedAt:0,enemyAt:0,links:["capital","mist-valley","bamboo-ward","stone-gate"] },
  { id:"red-mine",name:"赤霞矿场",kind:"mine",x:82,y:59,income:{wood:2,stone:7,spirit:1},power:60,status:"neutral",level:1,garrison:60,lastCollectedAt:0,dispatchedAt:0,enemyAt:0,links:["capital","moon-spring","wind-terrace","south-watch"] },
  { id:"star-lake",name:"星澜河口",kind:"spirit",x:42,y:20,income:{wood:2,stone:2,spirit:9},power:68,status:"neutral",level:1,garrison:68,lastCollectedAt:0,dispatchedAt:0,enemyAt:0,links:["cloud-farm","east-farm","north-watch","jade-ruins"] },
  { id:"moon-spring",name:"月泉灵眼",kind:"spirit",x:65,y:75,income:{wood:1,stone:2,spirit:11},power:76,status:"neutral",level:1,garrison:76,lastCollectedAt:0,dispatchedAt:0,enemyAt:0,links:["red-mine","south-watch","mist-valley","south-gate"] },
  { id:"north-watch",name:"北境哨塔",kind:"watch",x:52,y:8,income:{wood:3,stone:4,spirit:3},power:72,status:"neutral",level:1,garrison:72,lastCollectedAt:0,dispatchedAt:0,enemyAt:0,links:["star-lake","jade-ruins","sea-gate"] },
  { id:"south-watch",name:"南岭关",kind:"watch",x:48,y:91,income:{wood:3,stone:5,spirit:2},power:82,status:"neutral",level:1,garrison:82,lastCollectedAt:0,dispatchedAt:0,enemyAt:0,links:["moon-spring","mist-valley","south-gate"] },
  { id:"jade-ruins",name:"青玉遗址",kind:"ruins",x:11,y:18,income:{wood:2,stone:3,spirit:7},power:90,status:"neutral",level:1,garrison:90,lastCollectedAt:0,dispatchedAt:0,enemyAt:0,links:["cloud-farm","star-lake","north-watch"] },
  { id:"sea-gate",name:"瀚海渡口",kind:"ruins",x:89,y:19,income:{wood:5,stone:3,spirit:5},power:96,status:"neutral",level:1,garrison:96,lastCollectedAt:0,dispatchedAt:0,enemyAt:0,links:["east-farm","north-watch","wind-terrace"] },
  { id:"mist-valley",name:"迷雾谷地",kind:"ruins",x:18,y:82,income:{wood:4,stone:4,spirit:6},power:108,status:"neutral",level:1,garrison:108,lastCollectedAt:0,dispatchedAt:0,enemyAt:0,links:["black-mine","moon-spring","south-watch","stone-gate"] },
  { id:"bamboo-ward",name:"青篁驿",kind:"farm",x:8,y:42,income:{wood:8,stone:1,spirit:2},power:66,status:"neutral",level:1,garrison:66,lastCollectedAt:0,dispatchedAt:0,enemyAt:0,links:["cloud-farm","black-mine","stone-gate"] },
  { id:"wind-terrace",name:"听风台",kind:"spirit",x:91,y:43,income:{wood:2,stone:2,spirit:10},power:78,status:"neutral",level:1,garrison:78,lastCollectedAt:0,dispatchedAt:0,enemyAt:0,links:["east-farm","red-mine","sea-gate"] },
  { id:"stone-gate",name:"叠石隘",kind:"watch",x:31,y:72,income:{wood:2,stone:6,spirit:3},power:92,status:"neutral",level:1,garrison:92,lastCollectedAt:0,dispatchedAt:0,enemyAt:0,links:["black-mine","mist-valley","bamboo-ward","south-gate"] },
  { id:"south-gate",name:"云渡旧关",kind:"ruins",x:72,y:88,income:{wood:4,stone:4,spirit:8},power:116,status:"neutral",level:1,garrison:116,lastCollectedAt:0,dispatchedAt:0,enemyAt:0,links:["moon-spring","south-watch","stone-gate"] },
];
const cloneNodes = () => INITIAL_NODES.map(n => ({ ...n, income:{...n.income}, links:[...n.links] }));
const clamp = (n:number,min:number,max:number) => Math.min(max,Math.max(min,n));
const stanceBonus: Record<ArmyStance, Record<ArmyStance, number>> = {
  assault:{ assault:1, guard:.82, flank:1.2 }, guard:{ assault:1.2, guard:1, flank:.82 }, flank:{ assault:.82, guard:1.2, flank:1 },
};
const enemyStanceFor = (node: TerritoryNode): ArmyStance => node.kind === "watch" ? "guard" : node.kind === "ruins" ? "flank" : "assault";

export const useTerritoryStore = defineStore("territory", () => {
  const nodes = ref<TerritoryNode[]>(cloneNodes());
  const resources = ref<TerritoryResources>({ wood:160, stone:130, spirit:80 });
  const actionPoints = ref(8); const maxActionPoints = ref(12); const lastActionAt = ref(now());
  const incomeRemainder = ref<TerritoryResources>({ wood:0, stone:0, spirit:0 });
  const lastRaidAt = ref(0);
  const army = ref({ troops:180, maxTroops:220, morale:100, stance:"assault" as ArmyStance });
  const selectedId = ref("capital"); const lastAction = ref("万象军府已经开营。选择相邻据点，配置阵型后出征。");
  const reports = ref<BattleReport[]>([]);

  const ownedNodes = computed(() => nodes.value.filter(n => n.status === "owned"));
  const selectedNode = computed(() => nodes.value.find(n => n.id === selectedId.value) || nodes.value[0]);
  const isReachable = (node: TerritoryNode) => node.id === "capital" || node.links.some(id => nodes.value.find(n => n.id === id)?.status === "owned");
  const reachableNodes = computed(() => nodes.value.filter(n => n.status === "neutral" && isReachable(n)));
  const incomePerHour = computed(() => ownedNodes.value.reduce((t,n) => ({ wood:t.wood+n.income.wood*n.level, stone:t.stone+n.income.stone*n.level, spirit:t.spirit+n.income.spirit*n.level }), {wood:0,stone:0,spirit:0}));
  const watchBonus = computed(() => ownedNodes.value.filter(n => n.kind === "watch").reduce((s,n) => s+n.level*5,0));
  const totalPower = computed(() => Math.floor(army.value.troops*(.75+army.value.morale/200)+ownedNodes.value.reduce((s,n)=>s+n.garrison*.18+n.level*5,0)+watchBonus.value));
  const territoryProgress = computed(() => Math.round(ownedNodes.value.length/nodes.value.length*100));
  const raidCooldownSeconds = computed(() => Math.max(0, Math.ceil((lastRaidAt.value + 600000 - now()) / 1000)));

  const addReport = (title:string,result:BattleReport["result"],detail:string) => { reports.value.unshift({id:`${now()}-${Math.random()}`,at:now(),title,result,detail}); reports.value=reports.value.slice(0,12); };
  const select = (id:string) => { if(nodes.value.some(n=>n.id===id)) selectedId.value=id; };
  const setStance = (stance:ArmyStance) => { army.value.stance=stance; lastAction.value=`军阵已切换为${stance === "assault" ? "破阵" : stance === "guard" ? "镇守" : "奇袭"}。`; };
  const tick = () => {
    const current=now(); let changed=false;
    if(actionPoints.value>=maxActionPoints.value) lastActionAt.value=current;
    else {
      const recovered=Math.floor(Math.max(0,current-lastActionAt.value)/900000);
      if(recovered>0){ actionPoints.value=clamp(actionPoints.value+recovered,0,maxActionPoints.value); lastActionAt.value=actionPoints.value>=maxActionPoints.value?current:lastActionAt.value+recovered*900000; changed=true; }
    }
    const gained:TerritoryResources={wood:0,stone:0,spirit:0};
    for(const node of nodes.value){
      if(node.status!=="owned" || !node.lastCollectedAt) continue;
      const hours=Math.min(12,Math.max(0,(current-node.lastCollectedAt)/3600000));
      if(hours>=1/12){ gained.wood+=node.income.wood*node.level*hours; gained.stone+=node.income.stone*node.level*hours; gained.spirit+=node.income.spirit*node.level*hours; node.lastCollectedAt=current; changed=true; }
    }
    for(const key of ["wood","stone","spirit"] as const){
      const total=incomeRemainder.value[key]+gained[key]; const whole=Math.floor(total+1e-9);
      resources.value[key]+=whole; incomeRemainder.value[key]=Math.max(0,total-whole);
    }
    return changed;
  };
  const march = (id:string) => {
    tick(); const node=nodes.value.find(n=>n.id===id); if(!node || node.status!=="neutral") return false;
    if(!isReachable(node)){ lastAction.value=`「${node.name}」供给线未接通。`; return false; }
    if(actionPoints.value<2){ lastAction.value="行动力不足，每15分钟恢复1点。"; return false; }
    if(army.value.troops<30){ lastAction.value="兵力不足30，先在万象城征募。"; return false; }
    actionPoints.value-=2;
    const enemyStance=enemyStanceFor(node); const modifier=stanceBonus[army.value.stance][enemyStance];
    const attack=army.value.troops*(.72+army.value.morale/250)*modifier + watchBonus.value;
    const defense=node.garrison*(.92+node.level*.08);
    const victory=attack>=defense*.9;
    const losses=clamp(Math.round(node.garrison*(victory ? .18 : .34)/modifier),8,victory ? 48 : 76);
    army.value.troops=clamp(army.value.troops-losses,0,army.value.maxTroops);
    army.value.morale=clamp(army.value.morale+(victory?6:-14),35,120);
    if(victory){ node.status="owned"; node.garrison=Math.max(18,Math.round(army.value.troops*.18)); node.lastCollectedAt=now(); lastAction.value=`攻取「${node.name}」，损失${losses}兵力，供给线向前延伸。`; addReport(`攻取 ${node.name}`,"victory",`我方${Math.round(attack)} 对 敌方${Math.round(defense)}；阵型倍率${modifier.toFixed(2)}，损失${losses}。`); }
    else { node.garrison=Math.max(12,Math.round(node.garrison-attack*.32)); lastAction.value=`进攻「${node.name}」失利，损失${losses}兵力，守军降至${node.garrison}。`; addReport(`进攻 ${node.name} 受挫`,"defeat",`我方${Math.round(attack)} 对 敌方${Math.round(defense)}；调整阵型或征募后再战。`); }
    return true;
  };
  const recruit = () => {
    tick(); const missing=army.value.maxTroops-army.value.troops; if(missing<=0){lastAction.value="军府兵力已满。";return false;}
    const amount=Math.min(40,missing); const cost={wood:amount*2,stone:amount,spirit:Math.ceil(amount/4)};
    if(resources.value.wood<cost.wood||resources.value.stone<cost.stone||resources.value.spirit<cost.spirit){lastAction.value=`征募${amount}兵需木${cost.wood}/石${cost.stone}/灵${cost.spirit}。`;return false;}
    resources.value.wood-=cost.wood; resources.value.stone-=cost.stone; resources.value.spirit-=cost.spirit; army.value.troops+=amount; army.value.morale=clamp(army.value.morale+3,0,120); lastAction.value=`万象军府征募${amount}名乡勇。`; addReport("军府征募","info",`兵力恢复${amount}，当前${army.value.troops}/${army.value.maxTroops}。`); return true;
  };
  const fortify = (id:string) => {
    tick(); const node=nodes.value.find(n=>n.id===id); if(!node||node.status!=="owned")return false;
    const cost={wood:20*node.level,stone:26*node.level,spirit:8*node.level}; if(resources.value.wood<cost.wood||resources.value.stone<cost.stone||resources.value.spirit<cost.spirit){lastAction.value=`筑防需木${cost.wood}/石${cost.stone}/灵${cost.spirit}。`;return false;}
    resources.value.wood-=cost.wood;resources.value.stone-=cost.stone;resources.value.spirit-=cost.spirit;node.garrison+=24+node.level*8;lastAction.value=`「${node.name}」守军增至${node.garrison}。`;return true;
  };
  const upgrade = (id:string) => {
    const node=nodes.value.find(n=>n.id===id);if(!node||node.status!=="owned")return false;if(node.level>=5){lastAction.value="据点已达到Lv.5。";return false;}
    const cost={wood:node.level*45,stone:node.level*38,spirit:node.level*18};if(resources.value.wood<cost.wood||resources.value.stone<cost.stone||resources.value.spirit<cost.spirit){lastAction.value=`升级需木${cost.wood}/石${cost.stone}/灵${cost.spirit}。`;return false;}
    resources.value.wood-=cost.wood;resources.value.stone-=cost.stone;resources.value.spirit-=cost.spirit;node.level++;node.garrison+=20;army.value.maxTroops+=node.kind==="capital"?20:4;lastAction.value=`「${node.name}」升至Lv.${node.level}，产出与驻防提高。`;return true;
  };
  const triggerRaid = () => {
    tick();
    if(nodes.value.some(n=>n.status==="contested")){lastAction.value="已有据点告急，请先完成回援。";return false;}
    const cooldown=Math.ceil((lastRaidAt.value+600000-now())/60000);if(cooldown>0){lastAction.value=`军情演练整备中，约${cooldown}分钟后可再次发起。`;return false;}
    if(actionPoints.value<1){lastAction.value="行动力不足，无法进行敌袭演练。";return false;} const candidates=ownedNodes.value.filter(n=>n.id!=="capital"&&n.status==="owned");const node=candidates[Math.floor(Math.random()*candidates.length)];if(!node){lastAction.value="先占领一处外围领地。";return false;}actionPoints.value--;lastRaidAt.value=now();node.status="contested";node.enemyAt=now();node.garrison=Math.max(node.garrison,40+node.level*20);selectedId.value=node.id;lastAction.value=`警报：「${node.name}」遭到敌袭！`;addReport(`${node.name} 告急`,"info",`敌军压境，当前守军${node.garrison}。`);return true;
  };
  const resolveRaid = (id:string) => {
    tick();const node=nodes.value.find(n=>n.id===id);if(!node||node.status!=="contested")return false;if(actionPoints.value<2){lastAction.value="回援需要2点行动力。";return false;}actionPoints.value-=2;
    const defense=node.garrison+army.value.troops*.35+watchBonus.value;const enemy=node.power*(1+node.level*.16);const victory=defense>=enemy;const loss=Math.min(army.value.troops,Math.round(enemy*(victory?.12:.22)));army.value.troops-=loss;
    if(victory){node.status="owned";node.enemyAt=0;army.value.morale=clamp(army.value.morale+4,0,120);lastAction.value=`守住「${node.name}」，援军损失${loss}。`;addReport(`守住 ${node.name}`,"victory",`防御${Math.round(defense)} 对 敌军${Math.round(enemy)}。`);}else{node.status="neutral";node.enemyAt=0;node.garrison=Math.round(enemy*.55);army.value.morale=clamp(army.value.morale-10,35,120);lastAction.value=`「${node.name}」失守，可沿供给线重新夺回。`;addReport(`${node.name} 失守`,"defeat",`防御${Math.round(defense)} 对 敌军${Math.round(enemy)}。`);}return true;
  };
  const finite=(value:any,fallback:number,min:number,max:number)=>{const parsed=Number(value);return Number.isFinite(parsed)?clamp(parsed,min,max):fallback;};
  const serialize=()=>({version:3,nodes:nodes.value,resources:resources.value,incomeRemainder:incomeRemainder.value,actionPoints:actionPoints.value,maxActionPoints:maxActionPoints.value,lastActionAt:lastActionAt.value,lastRaidAt:lastRaidAt.value,army:army.value,lastAction:lastAction.value,selectedId:selectedId.value,reports:reports.value});
  const deserialize=(data:any={})=>{
    if(Array.isArray(data.nodes)){const saved=new Map<string,Partial<TerritoryNode>>(data.nodes.filter((n:any)=>n&&typeof n.id==="string").map((n:TerritoryNode)=>[n.id,n]));nodes.value=cloneNodes().map(base=>{const old=saved.get(base.id);if(!old)return base;const status:TerritoryStatus=["neutral","owned","contested"].includes(String(old.status))?old.status as TerritoryStatus:base.status;return{...base,status,level:Math.round(finite(old.level,base.level,1,5)),garrison:Math.round(finite(old.garrison??old.power,base.garrison,0,100000)),lastCollectedAt:finite(old.lastCollectedAt,status==="owned"?now():0,0,now()),dispatchedAt:finite(old.dispatchedAt,0,0,now()),enemyAt:status==="contested"?finite(old.enemyAt,now(),0,now()):0};});}
    for(const key of ["wood","stone","spirit"] as const){resources.value[key]=Math.floor(finite(data.resources?.[key],resources.value[key],0,1000000000));incomeRemainder.value[key]=finite(data.incomeRemainder?.[key],0,0,.999999);}
    maxActionPoints.value=Math.round(finite(data.maxActionPoints,12,8,20));actionPoints.value=Math.round(finite(data.actionPoints??Math.ceil(finite(data.commandPower,100,0,200)/10),8,0,maxActionPoints.value));lastActionAt.value=finite(data.lastActionAt,now(),0,now());lastRaidAt.value=finite(data.lastRaidAt,0,0,now());
    const savedArmy=data.army||{};army.value={troops:Math.round(finite(savedArmy.troops,army.value.troops,0,100000)),maxTroops:Math.round(finite(savedArmy.maxTroops,army.value.maxTroops,100,100000)),morale:Math.round(finite(savedArmy.morale,army.value.morale,35,120)),stance:["assault","guard","flank"].includes(savedArmy.stance)?savedArmy.stance:"assault"};army.value.troops=Math.min(army.value.troops,army.value.maxTroops);
    lastAction.value=typeof data.lastAction==="string"?data.lastAction.slice(0,300):lastAction.value;selectedId.value=nodes.value.some(n=>n.id===data.selectedId)?String(data.selectedId):"capital";reports.value=Array.isArray(data.reports)?data.reports.filter((r:any)=>r&&typeof r.title==="string"&&["victory","defeat","info"].includes(r.result)).slice(0,12).map((r:any)=>({...r,title:r.title.slice(0,80),detail:String(r.detail||"").slice(0,300),at:finite(r.at,now(),0,now())})):[];tick();
  };
  return {nodes,resources,actionPoints,maxActionPoints,army,lastAction,selectedId,reports,ownedNodes,selectedNode,reachableNodes,incomePerHour,totalPower,territoryProgress,raidCooldownSeconds,isReachable,select,setStance,tick,march,recruit,fortify,upgrade,triggerRaid,resolveRaid,serialize,deserialize};
});
