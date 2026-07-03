/// <reference types="../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../root/.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
const username = ref('');
const password = ref('');
const user = ref(null);
const keyword = ref('');
const activeTab = ref('basic');
const adminTabs = [
    { key: 'basic', label: '基础配置' },
    { key: 'about', label: '关于/赞助' },
    { key: 'updates', label: '更新记录' },
    { key: 'players', label: '玩家管理' },
    { key: 'gm', label: 'GM邮件' }
];
const message = ref('');
const messageType = ref('ok');
const config = reactive({ siteName: '桃源乡', announcement: '', announcementIntervalHours: 24, updateLogs: [], aboutQqText: '', aboutQqUrl: '', aboutGithubUrl: '', aboutTapTapUrl: '', sponsorAlipayImageUrl: '', sponsorWechatImageUrl: '', sponsorAfdianUrl: '', registrationEnabled: true, maintenanceMode: false });
const overview = reactive({ stats: { userCount: 0, saveCount: 0, sessionCount: 0 }, users: [] });
const ALL_ITEMS = [
    { id: 'mana_recovery_pill', name: '回灵丹', category: '丹药' },
    { id: 'qi_gathering_pill', name: '聚气丹', category: '丹药' },
    { id: 'foundation_pill', name: '筑基丹', category: '丹药' },
    { id: 'dew_grass', name: '凝露草', category: '灵植' },
    { id: 'spirit_rice', name: '蕴灵稻', category: '灵植' },
    { id: 'vermilion_fruit', name: '朱果', category: '灵植' },
    { id: 'moonlight_rice', name: '月光稻', category: '灵植' },
    { id: 'phoenix_pepper', name: '凤椒', category: '灵植' },
    { id: 'snow_lotus', name: '雪莲', category: '灵植' },
    { id: 'fairy_chrysanthemum', name: '仙菊', category: '灵植' },
    { id: 'golden_melon', name: '金瓜', category: '灵植' },
    { id: 'jade_tea', name: '玉茶', category: '灵植' },
    { id: 'pearl_grain', name: '珍珠米', category: '灵植' },
    { id: 'lotus_tea', name: '莲茶', category: '灵植' },
    { id: 'purple_bamboo', name: '紫竹', category: '灵植' },
    { id: 'golden_fruit', name: '金果', category: '灵植' },
    { id: 'celestial_rice', name: '天稻', category: '灵植' },
    { id: 'saint_rice', name: '圣稻', category: '灵植' },
    { id: 'dragon_melon', name: '龙瓜', category: '灵植' },
    { id: 'primordial_melon', name: '混沌瓜', category: '灵植' },
    { id: 'seed_dew_grass', name: '凝露草种子', category: '种子' },
    { id: 'seed_spirit_rice', name: '蕴灵稻种子', category: '种子' },
    { id: 'seed_vermilion_fruit', name: '朱果种子', category: '种子' },
    { id: 'seed_moonlight_rice', name: '月光稻种子', category: '种子' },
    { id: 'seed_phoenix_pepper', name: '凤椒种子', category: '种子' },
    { id: 'seed_snow_lotus', name: '雪莲种子', category: '种子' },
    { id: 'seed_fairy_chrysanthemum', name: '仙菊种子', category: '种子' },
    { id: 'seed_golden_melon', name: '金瓜种子', category: '种子' },
    { id: 'seed_jade_tea', name: '玉茶种子', category: '种子' },
    { id: 'seed_pearl_grain', name: '珍珠米种子', category: '种子' },
    { id: 'seed_lotus_tea', name: '莲茶种子', category: '种子' },
    { id: 'seed_purple_bamboo', name: '紫竹种子', category: '种子' },
    { id: 'seed_golden_fruit', name: '金果种子', category: '种子' },
    { id: 'seed_celestial_rice', name: '天稻种子', category: '种子' },
    { id: 'seed_saint_rice', name: '圣稻种子', category: '种子' },
    { id: 'seed_dragon_melon', name: '龙瓜种子', category: '种子' },
    { id: 'seed_primordial_melon', name: '混沌瓜种子', category: '种子' },
    { id: 'vegetable_seed', name: '青菜种子', category: '种子' },
    { id: 'carrot_seed', name: '胡萝卜种子', category: '种子' },
    { id: 'turnip_seed', name: '芜菁种子', category: '种子' },
    { id: 'cabbage_seed', name: '卷心菜种子', category: '种子' },
    { id: 'tomato_seed', name: '番茄种子', category: '种子' },
    { id: 'potato_seed', name: '土豆种子', category: '种子' },
    { id: 'sunflower_seed', name: '向日葵种子', category: '种子' },
    { id: 'cotton_seed', name: '棉花种子', category: '种子' },
    { id: 'flax_seed', name: '亚麻种子', category: '种子' },
    { id: 'hemp_seed', name: '大麻种子', category: '种子' },
    { id: 'tea_seed', name: '茶叶种子', category: '种子' },
    { id: 'iron_ore', name: '铁矿', category: '矿石' },
    { id: 'gold_ore', name: '金矿', category: '矿石' },
    { id: 'silver_ore', name: '银矿', category: '矿石' },
    { id: 'copper_ore', name: '铜矿', category: '矿石' },
    { id: 'stone', name: '石头', category: '矿石' },
    { id: 'wood', name: '木头', category: '材料' },
    { id: 'leather', name: '皮革', category: '材料' },
    { id: 'cloth', name: '布料', category: '材料' },
    { id: 'magic_crystal', name: '魔法水晶', category: '材料' },
    { id: 'spirit_stone', name: '灵石', category: '材料' },
    { id: 'bamboo', name: '竹子', category: '材料' },
    { id: 'flower', name: '花', category: '材料' },
    { id: 'tree_seeds', name: '树苗', category: '材料' },
    { id: 'mushroom', name: '蘑菇', category: '材料' },
    { id: 'axe', name: '斧头', category: '工具' },
    { id: 'pickaxe', name: '镐', category: '工具' },
    { id: 'hoe', name: '锄头', category: '工具' },
    { id: 'watering_can', name: '水壶', category: '工具' },
    { id: 'fishing_rod', name: '钓竿', category: '工具' },
    { id: 'basket', name: '篮子', category: '工具' },
    { id: 'fertilizer', name: '肥料', category: '工具' },
    { id: 'pesticide', name: '杀虫剂', category: '工具' },
    { id: 'sprinkler', name: '洒水器', category: '工具' },
    { id: 'scarecrow', name: '稻草人', category: '工具' },
    { id: 'vegetable', name: '青菜', category: '食材' },
    { id: 'carrot', name: '胡萝卜', category: '食材' },
    { id: 'turnip', name: '芜菁', category: '食材' },
    { id: 'cabbage', name: '卷心菜', category: '食材' },
    { id: 'tomato', name: '番茄', category: '食材' },
    { id: 'potato', name: '土豆', category: '食材' },
    { id: 'sunflower', name: '向日葵', category: '食材' },
    { id: 'cotton', name: '棉花', category: '食材' },
    { id: 'flax', name: '亚麻', category: '食材' },
    { id: 'hemp', name: '大麻', category: '食材' },
    { id: 'tea_leaf', name: '茶叶', category: '食材' },
    { id: 'milk', name: '牛奶', category: '食材' },
    { id: 'egg', name: '蛋', category: '食材' },
    { id: 'honey', name: '蜂蜜', category: '食材' },
    { id: 'meat', name: '肉', category: '食材' },
    { id: 'bread', name: '面包', category: '食材' },
    { id: 'cheese', name: '奶酪', category: '食材' },
    { id: 'wine', name: '葡萄酒', category: '食材' },
    { id: 'beer', name: '啤酒', category: '食材' },
    { id: 'honey_cake', name: '蜂蜜蛋糕', category: '食材' },
    { id: 'flour', name: '面粉', category: '食材' },
    { id: 'sugar', name: '糖', category: '食材' },
    { id: 'salt', name: '盐', category: '食材' },
    { id: 'oil', name: '油', category: '食材' },
    { id: 'vinegar', name: '醋', category: '食材' },
    { id: 'soy_sauce', name: '酱油', category: '食材' },
    { id: 'spice', name: '香料', category: '食材' },
    { id: 'rare_fish', name: '稀有鱼类', category: '食材' },
    { id: 'common_fish', name: '普通鱼类', category: '食材' },
    { id: 'jade', name: '翡翠', category: '宝石' },
    { id: 'amber', name: '琥珀', category: '宝石' },
    { id: 'pearl', name: '珍珠', category: '宝石' },
    { id: 'diamond', name: '钻石', category: '宝石' },
    { id: 'ruby', name: '红宝石', category: '宝石' },
    { id: 'sapphire', name: '蓝宝石', category: '宝石' },
    { id: 'emerald', name: '绿宝石', category: '宝石' },
    { id: 'topaz', name: '黄玉', category: '宝石' },
    { id: 'opal', name: '蛋白石', category: '宝石' },
    { id: 'onyx', name: '玛瑙', category: '宝石' },
    { id: 'tiger_eye', name: '虎眼石', category: '宝石' },
    { id: 'obsidian', name: '黑曜石', category: '宝石' },
    { id: 'quartz', name: '石英', category: '宝石' },
    { id: 'turquoise', name: '绿松石', category: '宝石' },
    { id: 'garnet', name: '石榴石', category: '宝石' },
    { id: 'amethyst', name: '紫水晶', category: '宝石' },
    { id: 'citrine', name: '黄水晶', category: '宝石' },
    { id: 'aquamarine', name: '海蓝宝石', category: '宝石' },
    { id: 'moonstone', name: '月光石', category: '宝石' },
    { id: 'bloodstone', name: '血石', category: '宝石' },
    { id: 'legendary_gem', name: '传奇宝石', category: '宝石' },
    { id: 'rare_gem', name: '稀有宝石', category: '宝石' },
    { id: 'common_gem', name: '普通宝石', category: '宝石' },
    { id: 'potion', name: '药水', category: '道具' },
    { id: 'elixir', name: '仙丹', category: '道具' },
    { id: 'scroll', name: '卷轴', category: '道具' },
    { id: 'treasure_map', name: '藏宝图', category: '道具' },
    { id: 'ancient_relic', name: '古代遗物', category: '道具' },
    { id: 'chest', name: '箱子', category: '家具' },
    { id: 'bed', name: '床', category: '家具' },
    { id: 'table', name: '桌子', category: '家具' },
    { id: 'chair', name: '椅子', category: '家具' },
    { id: 'lantern', name: '灯笼', category: '家具' },
    { id: 'torch', name: '火把', category: '家具' },
    { id: 'trap', name: '陷阱', category: '家具' },
    { id: 'fence', name: '栅栏', category: '家具' },
    { id: 'well', name: '水井', category: '家具' },
    { id: 'mill', name: '磨坊', category: '家具' },
    { id: 'furnace', name: '熔炉', category: '家具' },
    { id: 'anvil', name: '铁砧', category: '家具' },
    { id: 'loom', name: '织布机', category: '家具' },
    { id: 'kiln', name: '窑', category: '家具' },
    { id: 'workbench', name: '工作台', category: '家具' },
    { id: 'bookshelf', name: '书架', category: '家具' },
    { id: 'spirit_oil', name: '灵油', category: '特殊' },
    { id: 'ink', name: '墨', category: '特殊' },
    { id: 'paper', name: '纸', category: '特殊' }
];
const categories = computed(() => {
    return ['丹药', '灵植', '种子', '矿石', '材料', '工具', '食材', '宝石', '道具', '家具', '特殊'];
});
const gmMail = reactive({
    to: 'all',
    title: '系统奖励',
    content: '',
    rewards: { money: 0, stamina: 0, items: [] }
});
const token = () => localStorage.getItem('taoyuan_account_token') || '';
const headers = () => ({ 'content-type': 'application/json', authorization: `Bearer ${token()}` });
const setMsg = (m, t = 'ok') => { message.value = m; messageType.value = t; };
async function api(path, options = {}) {
    const res = await fetch(path, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
        throw new Error(data.error || '请求失败');
    return data;
}
async function loadMe() { const data = await api('/api/me', { headers: headers() }); user.value = data.user; }
async function loadConfig() { Object.assign(config, await api(user.value?.role === 'admin' ? '/api/admin/config' : '/api/config', { headers: headers() })); }
async function loadOverview() { if (user.value?.role === 'admin')
    Object.assign(overview, await api('/api/admin/overview', { headers: headers() })); }
async function refreshAll() { try {
    await loadMe();
    await loadConfig();
    await loadOverview();
    setMsg('后台数据已刷新');
}
catch (e) {
    setMsg(e.message, 'error');
} }
async function login() {
    try {
        const data = await api('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: username.value, password: password.value }) });
        localStorage.setItem('taoyuan_account_token', data.token);
        user.value = data.user;
        await loadConfig();
        await loadOverview();
        setMsg('登录成功');
    }
    catch (e) {
        setMsg(e.message, 'error');
    }
}
async function register() {
    try {
        const data = await api('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: username.value, password: password.value }) });
        localStorage.setItem('taoyuan_account_token', data.token);
        user.value = data.user;
        await loadConfig();
        await loadOverview();
        setMsg(data.message || '注册成功');
    }
    catch (e) {
        setMsg(e.message, 'error');
    }
}
function addUpdateLog() {
    config.updateLogs ||= [];
    config.updateLogs.unshift({ date: new Date().toISOString().slice(0, 10), title: '', content: '' });
}
async function saveConfig() {
    try {
        Object.assign(config, await api('/api/admin/config', { method: 'PUT', headers: headers(), body: JSON.stringify(config) }));
        setMsg('配置已保存');
    }
    catch (e) {
        setMsg(e.message, 'error');
    }
}
async function banUser(u) {
    if (!confirm(`确定封禁账号「${u.username}」？该玩家会被踢下线并不能再登录。`))
        return;
    try {
        await api(`/api/admin/users/${encodeURIComponent(u.id)}/ban`, { method: 'POST', headers: headers() });
        await loadOverview();
        setMsg('已封禁账号');
    }
    catch (e) {
        setMsg(e.message, 'error');
    }
}
async function unbanUser(u) {
    try {
        await api(`/api/admin/users/${encodeURIComponent(u.id)}/unban`, { method: 'POST', headers: headers() });
        await loadOverview();
        setMsg('已解封账号');
    }
    catch (e) {
        setMsg(e.message, 'error');
    }
}
async function resetPassword(u) {
    const password = prompt(`请输入「${u.username}」的新密码，至少6位：`);
    if (!password)
        return;
    if (password.length < 6) {
        setMsg('新密码至少6位', 'error');
        return;
    }
    try {
        await api(`/api/admin/users/${encodeURIComponent(u.id)}/reset-password`, { method: 'POST', headers: headers(), body: JSON.stringify({ password }) });
        await loadOverview();
        setMsg('密码已重置');
    }
    catch (e) {
        setMsg(e.message, 'error');
    }
}
function addGmItem() {
    gmMail.rewards.items.push({ itemId: '', quantity: 1, quality: 'normal' });
}
async function sendGmMail() {
    if (!gmMail.to) {
        setMsg('请选择收件人', 'error');
        return;
    }
    if (!confirm(gmMail.to === 'all' ? '确定给全体玩家发送这封奖励邮件？' : '确定给该玩家发送这封奖励邮件？'))
        return;
    try {
        await api('/api/admin/mails', { method: 'POST', headers: headers(), body: JSON.stringify(gmMail) });
        gmMail.title = '系统奖励';
        gmMail.content = '';
        gmMail.rewards.money = 0;
        gmMail.rewards.stamina = 0;
        gmMail.rewards.items = [];
        await loadOverview();
        setMsg('GM 邮件已发送');
    }
    catch (e) {
        setMsg(e.message, 'error');
    }
}
const filteredUsers = computed(() => {
    const k = keyword.value.trim().toLowerCase();
    if (!k)
        return overview.users;
    return overview.users.filter((u) => String(u.username).toLowerCase().includes(k));
});
function formatTime(v) { return v ? new Date(v).toLocaleString() : '无'; }
function formatSize(n) { return n > 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n || 0} B`; }
onMounted(async () => { try {
    await loadMe();
    await loadConfig();
    await loadOverview();
}
catch { } });
const __VLS_ctx = {
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "min-h-screen px-4 py-8 flex justify-center" },
});
/** @type {__VLS_StyleScopedClasses['min-h-screen']} */ ;
/** @type {__VLS_StyleScopedClasses['px-4']} */ ;
/** @type {__VLS_StyleScopedClasses['py-8']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "game-panel w-full max-w-4xl space-y-4" },
});
/** @type {__VLS_StyleScopedClasses['game-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
/** @type {__VLS_StyleScopedClasses['max-w-4xl']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-4']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "flex items-center justify-between gap-3" },
});
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h1, __VLS_intrinsics.h1)({
    ...{ class: "text-accent text-xl" },
});
/** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
    ...{ onClick: (...[$event]) => {
            return __VLS_ctx.router.push('/');
            // @ts-ignore
            [router,];
        } },
    ...{ class: "btn" },
});
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-xs text-muted" },
});
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
if (!__VLS_ctx.user) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-4 space-y-3" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-4']} */ ;
    /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm text-muted" },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ class: "input" },
        placeholder: "用户名",
    });
    (__VLS_ctx.username);
    /** @type {__VLS_StyleScopedClasses['input']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ class: "input" },
        placeholder: "密码",
        type: "password",
    });
    (__VLS_ctx.password);
    /** @type {__VLS_StyleScopedClasses['input']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.login) },
        ...{ class: "btn flex-1 justify-center" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.register) },
        ...{ class: "btn flex-1 justify-center" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
}
else {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border border-accent/20 rounded-xs p-3 text-sm flex flex-wrap justify-between gap-2" },
    });
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
    /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
    /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
        ...{ class: "text-accent" },
    });
    /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
    (__VLS_ctx.user.username);
    (__VLS_ctx.user.role);
    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
        ...{ onClick: (__VLS_ctx.refreshAll) },
        ...{ class: "btn text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    if (__VLS_ctx.user.role !== 'admin') {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-danger text-sm" },
        });
        /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    }
    else {
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "grid grid-cols-1 md:grid-cols-3 gap-3" },
        });
        /** @type {__VLS_StyleScopedClasses['grid']} */ ;
        /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
        /** @type {__VLS_StyleScopedClasses['md:grid-cols-3']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-muted text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-accent text-2xl" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
        (__VLS_ctx.overview.stats.userCount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-muted text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-accent text-2xl" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
        (__VLS_ctx.overview.stats.saveCount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-3" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-muted text-xs" },
        });
        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "text-accent text-2xl" },
        });
        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
        /** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
        (__VLS_ctx.overview.stats.sessionCount);
        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
            ...{ class: "border border-accent/20 rounded-xs p-2 flex flex-wrap gap-2" },
        });
        /** @type {__VLS_StyleScopedClasses['border']} */ ;
        /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
        /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
        /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
        for (const [tab] of __VLS_vFor((__VLS_ctx.adminTabs))) {
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (...[$event]) => {
                        if (!!(!__VLS_ctx.user))
                            throw 0;
                        if (!!(__VLS_ctx.user.role !== 'admin'))
                            throw 0;
                        return __VLS_ctx.activeTab = tab.key;
                        // @ts-ignore
                        [user, user, user, user, username, password, login, register, refreshAll, overview, overview, overview, adminTabs, activeTab,];
                    } },
                key: (tab.key),
                ...{ class: "btn text-xs" },
                ...{ class: (__VLS_ctx.activeTab === tab.key ? '!bg-accent !text-bg' : '') },
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            (tab.label);
            // @ts-ignore
            [activeTab,];
        }
        if (__VLS_ctx.activeTab === 'basic') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs p-3 space-y-3" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
                ...{ class: "text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "block text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ class: "input" },
            });
            (__VLS_ctx.config.siteName);
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "block text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.textarea)({
                value: (__VLS_ctx.config.announcement),
                ...{ class: "input min-h-28" },
            });
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            /** @type {__VLS_StyleScopedClasses['min-h-28']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "block text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ class: "input" },
                type: "number",
                min: "0",
                max: "720",
            });
            (__VLS_ctx.config.announcementIntervalHours);
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "flex items-center gap-2 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "checkbox",
            });
            (__VLS_ctx.config.registrationEnabled);
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "flex items-center gap-2 text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                type: "checkbox",
            });
            (__VLS_ctx.config.maintenanceMode);
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.saveConfig) },
                ...{ class: "btn w-full justify-center" },
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        }
        if (__VLS_ctx.activeTab === 'about') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs p-3 space-y-3" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
                ...{ class: "text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "block text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ class: "input" },
                placeholder: "例如：718630139",
            });
            (__VLS_ctx.config.aboutQqText);
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "block text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ class: "input" },
                placeholder: "https://qm.qq.com/...",
            });
            (__VLS_ctx.config.aboutQqUrl);
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "block text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ class: "input" },
                placeholder: "https://github.com/...",
            });
            (__VLS_ctx.config.aboutGithubUrl);
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "block text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ class: "input" },
                placeholder: "https://www.taptap.cn/app/...",
            });
            (__VLS_ctx.config.aboutTapTapUrl);
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "block text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ class: "input" },
                placeholder: "留空使用默认图片，或填写 https://...",
            });
            (__VLS_ctx.config.sponsorAlipayImageUrl);
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "block text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ class: "input" },
                placeholder: "留空使用默认图片，或填写 https://...",
            });
            (__VLS_ctx.config.sponsorWechatImageUrl);
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "block text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ class: "input" },
                placeholder: "https://afdian.com/a/...",
            });
            (__VLS_ctx.config.sponsorAfdianUrl);
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.saveConfig) },
                ...{ class: "btn w-full justify-center" },
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        }
        if (__VLS_ctx.activeTab === 'updates') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs p-3 space-y-3" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between gap-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
                ...{ class: "text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.addUpdateLog) },
                ...{ class: "btn text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            for (const [log, idx] of __VLS_vFor((__VLS_ctx.config.updateLogs))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (idx),
                    ...{ class: "border border-accent/10 rounded-xs p-2 space-y-2" },
                });
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "grid grid-cols-1 md:grid-cols-3 gap-2" },
                });
                /** @type {__VLS_StyleScopedClasses['grid']} */ ;
                /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['md:grid-cols-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                    ...{ class: "input" },
                    placeholder: "日期，如 2026-07-03",
                });
                (log.date);
                /** @type {__VLS_StyleScopedClasses['input']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                    ...{ class: "input md:col-span-2" },
                    placeholder: "标题",
                });
                (log.title);
                /** @type {__VLS_StyleScopedClasses['input']} */ ;
                /** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.textarea)({
                    value: (log.content),
                    ...{ class: "input min-h-20" },
                    placeholder: "更新内容",
                });
                /** @type {__VLS_StyleScopedClasses['input']} */ ;
                /** @type {__VLS_StyleScopedClasses['min-h-20']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.user))
                                throw 0;
                            if (!!(__VLS_ctx.user.role !== 'admin'))
                                throw 0;
                            if (!(__VLS_ctx.activeTab === 'updates'))
                                throw 0;
                            return __VLS_ctx.config.updateLogs.splice(idx, 1);
                            // @ts-ignore
                            [activeTab, activeTab, activeTab, config, config, config, config, config, config, config, config, config, config, config, config, config, config, saveConfig, saveConfig, addUpdateLog,];
                        } },
                    ...{ class: "btn text-xs text-danger" },
                });
                /** @type {__VLS_StyleScopedClasses['btn']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
                // @ts-ignore
                [];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.saveConfig) },
                ...{ class: "btn w-full justify-center" },
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        }
        if (__VLS_ctx.activeTab === 'players') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs p-3 space-y-3" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex flex-wrap items-center justify-between gap-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
                ...{ class: "text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ class: "input max-w-xs" },
                placeholder: "搜索用户名",
            });
            (__VLS_ctx.keyword);
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            /** @type {__VLS_StyleScopedClasses['max-w-xs']} */ ;
            if (__VLS_ctx.filteredUsers.length === 0) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            }
            for (const [u] of __VLS_vFor((__VLS_ctx.filteredUsers))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (u.id),
                    ...{ class: "border border-accent/10 rounded-xs p-3 space-y-2" },
                });
                /** @type {__VLS_StyleScopedClasses['border']} */ ;
                /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
                /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
                /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex flex-wrap items-center justify-between gap-2 text-sm" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-accent" },
                });
                /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                (u.username);
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-muted ml-2" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
                (u.role);
                if (u.disabled) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                        ...{ class: "text-danger ml-2" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
                    /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                    ...{ class: "text-muted ml-2" },
                });
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                /** @type {__VLS_StyleScopedClasses['ml-2']} */ ;
                (__VLS_ctx.formatTime(u.createdAt));
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "flex flex-wrap items-center gap-2" },
                });
                /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                /** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
                /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    ...{ class: "text-xs text-muted" },
                });
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                (u.saveCount);
                (__VLS_ctx.formatTime(u.lastSaveAt));
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.user))
                                throw 0;
                            if (!!(__VLS_ctx.user.role !== 'admin'))
                                throw 0;
                            if (!(__VLS_ctx.activeTab === 'players'))
                                throw 0;
                            return __VLS_ctx.resetPassword(u);
                            // @ts-ignore
                            [activeTab, saveConfig, keyword, filteredUsers, filteredUsers, formatTime, formatTime, resetPassword,];
                        } },
                    ...{ class: "btn text-xs" },
                });
                /** @type {__VLS_StyleScopedClasses['btn']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                if (!u.disabled && u.id !== __VLS_ctx.user.id) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.user))
                                    throw 0;
                                if (!!(__VLS_ctx.user.role !== 'admin'))
                                    throw 0;
                                if (!(__VLS_ctx.activeTab === 'players'))
                                    throw 0;
                                if (!(!u.disabled && u.id !== __VLS_ctx.user.id))
                                    throw 0;
                                return __VLS_ctx.banUser(u);
                                // @ts-ignore
                                [user, banUser,];
                            } },
                        ...{ class: "btn text-xs text-danger" },
                    });
                    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
                }
                if (u.disabled) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(!__VLS_ctx.user))
                                    throw 0;
                                if (!!(__VLS_ctx.user.role !== 'admin'))
                                    throw 0;
                                if (!(__VLS_ctx.activeTab === 'players'))
                                    throw 0;
                                if (!(u.disabled))
                                    throw 0;
                                return __VLS_ctx.unbanUser(u);
                                // @ts-ignore
                                [unbanUser,];
                            } },
                        ...{ class: "btn text-xs" },
                    });
                    /** @type {__VLS_StyleScopedClasses['btn']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                }
                if (u.saves.length === 0) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "text-xs text-muted" },
                    });
                    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                }
                else {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                        ...{ class: "grid grid-cols-1 md:grid-cols-3 gap-2" },
                    });
                    /** @type {__VLS_StyleScopedClasses['grid']} */ ;
                    /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
                    /** @type {__VLS_StyleScopedClasses['md:grid-cols-3']} */ ;
                    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                    for (const [save] of __VLS_vFor((u.saves))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            key: (save.slot),
                            ...{ class: "border border-accent/10 rounded-xs p-2 text-xs space-y-1" },
                        });
                        /** @type {__VLS_StyleScopedClasses['border']} */ ;
                        /** @type {__VLS_StyleScopedClasses['border-accent/10']} */ ;
                        /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['p-2']} */ ;
                        /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                        /** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "flex justify-between" },
                        });
                        /** @type {__VLS_StyleScopedClasses['flex']} */ ;
                        /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                            ...{ class: "text-accent" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
                        (save.slot + 1);
                        __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({});
                        (__VLS_ctx.formatSize(save.rawSize));
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                        (save.playerName || '未知');
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                        (save.year ? `第${save.year}年 ` : '');
                        (save.season || '');
                        (save.day ? ` 第${save.day}天` : '');
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
                        (save.money ?? '未知');
                        __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                            ...{ class: "text-muted" },
                        });
                        /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
                        (__VLS_ctx.formatTime(save.updatedAt));
                        // @ts-ignore
                        [formatTime, formatSize,];
                    }
                }
                // @ts-ignore
                [];
            }
        }
        if (__VLS_ctx.activeTab === 'gm') {
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "border border-accent/20 rounded-xs p-3 space-y-3" },
            });
            /** @type {__VLS_StyleScopedClasses['border']} */ ;
            /** @type {__VLS_StyleScopedClasses['border-accent/20']} */ ;
            /** @type {__VLS_StyleScopedClasses['rounded-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['p-3']} */ ;
            /** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between gap-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
                ...{ class: "text-accent" },
            });
            /** @type {__VLS_StyleScopedClasses['text-accent']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.addGmItem) },
                ...{ class: "btn text-xs" },
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "block text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
                value: (__VLS_ctx.gmMail.to),
                ...{ class: "input" },
            });
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                value: "all",
            });
            for (const [u] of __VLS_vFor((__VLS_ctx.overview.users))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                    key: (u.id),
                    value: (u.id),
                });
                (u.username);
                (u.role);
                // @ts-ignore
                [overview, activeTab, addGmItem, gmMail,];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "block text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ class: "input" },
                placeholder: "例如：开服补偿",
            });
            (__VLS_ctx.gmMail.title);
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "block text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.textarea)({
                value: (__VLS_ctx.gmMail.content),
                ...{ class: "input min-h-20" },
                placeholder: "给玩家看的说明",
            });
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            /** @type {__VLS_StyleScopedClasses['min-h-20']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "grid grid-cols-1 md:grid-cols-2 gap-2" },
            });
            /** @type {__VLS_StyleScopedClasses['grid']} */ ;
            /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
            /** @type {__VLS_StyleScopedClasses['md:grid-cols-2']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "block text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ class: "input" },
                type: "number",
                min: "0",
                placeholder: "0",
            });
            (__VLS_ctx.gmMail.rewards.money);
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "block text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                ...{ class: "input" },
                type: "number",
                min: "0",
                placeholder: "0",
            });
            (__VLS_ctx.gmMail.rewards.stamina);
            /** @type {__VLS_StyleScopedClasses['input']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "space-y-2" },
            });
            /** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                ...{ class: "flex items-center justify-between gap-2" },
            });
            /** @type {__VLS_StyleScopedClasses['flex']} */ ;
            /** @type {__VLS_StyleScopedClasses['items-center']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
            /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
                ...{ class: "block text-sm" },
            });
            /** @type {__VLS_StyleScopedClasses['block']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
            __VLS_asFunctionalElement1(__VLS_intrinsics.span, __VLS_intrinsics.span)({
                ...{ class: "text-xs text-muted" },
            });
            /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
            /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
            for (const [item, idx] of __VLS_vFor((__VLS_ctx.gmMail.rewards.items))) {
                __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
                    key: (idx),
                    ...{ class: "grid grid-cols-1 md:grid-cols-12 gap-2" },
                });
                /** @type {__VLS_StyleScopedClasses['grid']} */ ;
                /** @type {__VLS_StyleScopedClasses['grid-cols-1']} */ ;
                /** @type {__VLS_StyleScopedClasses['md:grid-cols-12']} */ ;
                /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
                    value: (item.itemId),
                    ...{ class: "input md:col-span-5" },
                });
                /** @type {__VLS_StyleScopedClasses['input']} */ ;
                /** @type {__VLS_StyleScopedClasses['md:col-span-5']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                    value: "",
                });
                for (const [cat] of __VLS_vFor((__VLS_ctx.categories))) {
                    __VLS_asFunctionalElement1(__VLS_intrinsics.optgroup, __VLS_intrinsics.optgroup)({
                        key: (cat),
                        label: (cat),
                    });
                    for (const [mi] of __VLS_vFor((__VLS_ctx.ALL_ITEMS.filter(i => i.category === cat)))) {
                        __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                            key: (mi.id),
                            value: (mi.id),
                        });
                        (mi.name);
                        // @ts-ignore
                        [gmMail, gmMail, gmMail, gmMail, gmMail, categories, ALL_ITEMS,];
                    }
                    // @ts-ignore
                    [];
                }
                __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
                    ...{ class: "input md:col-span-2" },
                    type: "number",
                    min: "1",
                    placeholder: "数量",
                });
                (item.quantity);
                /** @type {__VLS_StyleScopedClasses['input']} */ ;
                /** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.select, __VLS_intrinsics.select)({
                    value: (item.quality),
                    ...{ class: "input md:col-span-3" },
                });
                /** @type {__VLS_StyleScopedClasses['input']} */ ;
                /** @type {__VLS_StyleScopedClasses['md:col-span-3']} */ ;
                __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                    value: "normal",
                });
                __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                    value: "fine",
                });
                __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                    value: "excellent",
                });
                __VLS_asFunctionalElement1(__VLS_intrinsics.option, __VLS_intrinsics.option)({
                    value: "supreme",
                });
                __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(!__VLS_ctx.user))
                                throw 0;
                            if (!!(__VLS_ctx.user.role !== 'admin'))
                                throw 0;
                            if (!(__VLS_ctx.activeTab === 'gm'))
                                throw 0;
                            return __VLS_ctx.gmMail.rewards.items.splice(idx, 1);
                            // @ts-ignore
                            [gmMail,];
                        } },
                    ...{ class: "btn text-xs text-danger md:col-span-2 justify-center" },
                });
                /** @type {__VLS_StyleScopedClasses['btn']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
                /** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
                /** @type {__VLS_StyleScopedClasses['md:col-span-2']} */ ;
                /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
                // @ts-ignore
                [];
            }
            __VLS_asFunctionalElement1(__VLS_intrinsics.button, __VLS_intrinsics.button)({
                ...{ onClick: (__VLS_ctx.sendGmMail) },
                ...{ class: "btn w-full justify-center" },
            });
            /** @type {__VLS_StyleScopedClasses['btn']} */ ;
            /** @type {__VLS_StyleScopedClasses['w-full']} */ ;
            /** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
        }
    }
}
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
        ...{ class: "text-sm" },
        ...{ class: (__VLS_ctx.messageType === 'error' ? 'text-danger' : 'text-accent') },
    });
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    (__VLS_ctx.message);
}
// @ts-ignore
[sendGmMail, message, message, messageType,];
const __VLS_export = (await import('vue')).defineComponent({});
export default {};
