import crypto from "node:crypto";
import mysql from "../backend/node_modules/mysql2/promise.js";

const updateLog = {
  title: "V3.3.41 战力显示与连续历练提示",
  date: "2026-08-04",
  content: "处理游戏内反馈#91—#95：主界面状态栏新增与排行榜完全同口径的总战力实时显示，点击可进入角色页查看战力构成；连续历练每轮自动拾取成功后新增明确浮字和日志，纳戒空间不足时仍停止并保留未拾取掉落；确认并重新发布万象行药庐的纸张常驻供应与修仙市集的龙葵补给；完整恢复V3.3.40源码并重新构建，修复个别玩家旧前端资源导致的排版或商品未刷新问题。旧存档无需迁移。",
};
const feedbacks = [
  [91, "ee11c2cc-d543-47b0-935a-3964fdadbaea", "已用完整生产源码重新构建并发布前端，修复此前部分资源版本不一致可能造成的排版错乱。请关闭旧页面后重新打开；若仍有局部异常，可在原反馈继续说明设备和页面。"],
  [92, "f6228d4b-925d-4d20-bf0e-8be092c3fd86", "已确认并重新发布纸张常驻供应：进入万象市集→万象行药庐，可按30文/张批量购买。此前是V3.3.40源码与线上资源未完整同步导致部分页面未显示。"],
  [93, "f6228d4b-925d-4d20-bf0e-8be092c3fd86", "已确认并重新发布龙葵补给：进入万象市集→修仙市集，可按2200文/份购买；洞府百草园的现实日领取来源仍保留。此前是V3.3.40源码与线上资源未完整同步导致部分页面未显示。"],
  [94, "039e31f8-0f61-4dea-8389-4ffa0a077fb2", "经核查，连续历练原逻辑会在进入下一轮前原子拾取全部掉落，但提示不够直观。现已为每轮自动拾取增加明确浮字和日志；纳戒空间不足时会停止连续历练并把未拾取掉落保留在结算页，不会静默丢失。"],
  [95, "039e31f8-0f61-4dea-8389-4ffa0a077fb2", "已采纳：主界面顶部状态栏现会实时显示与战力排行榜完全相同口径的总战力，升级或更换装备后可直接看到变化；点击战力可进入角色页查看战力与相关构成。"],
];
const reward = { money: 10000, spiritStone: 100, items: [{ itemId: "forge_blueprint", quantity: 2 }, { itemId: "jade_slip", quantity: 2 }] };

const connection = await mysql.createConnection({
  host: process.env.TAOYUAN_DB_HOST || "localhost",
  user: process.env.TAOYUAN_DB_USER || "taoyuan",
  password: process.env.TAOYUAN_DB_PASSWORD,
  database: process.env.TAOYUAN_DB_NAME || "taoyuan",
  charset: "utf8mb4",
});
try {
  await connection.beginTransaction();
  for (const [id, expectedUserId, detail] of feedbacks) {
    const [rows] = await connection.execute("SELECT user_id FROM feedbacks WHERE id = ? FOR UPDATE", [id]);
    if (rows.length !== 1 || rows[0].user_id !== expectedUserId) throw new Error(`feedback #${id} ownership mismatch`);
    const reply = `已在 V3.3.41 处理。${detail}感谢反馈，已发放处理奖励。`;
    await connection.execute("UPDATE feedbacks SET status = 'resolved', admin_reply = ?, replied_at = NOW() WHERE id = ?", [reply, id]);
    await connection.execute(
      `INSERT IGNORE INTO user_mails (id,user_id,legacy_mail_id,title,content,rewards,from_name)
       VALUES (?,?,?,?,?,?,'万象仙乡制作组')`,
      [crypto.randomUUID(), expectedUserId, `feedback-adoption-${id}`, `V3.3.41 反馈 #${id} 处理奖励`, `你提交的反馈#${id}已处理。${detail}`, JSON.stringify(reward)],
    );
  }
  const [configRows] = await connection.execute("SELECT value FROM config WHERE `key` = 'updateLogs' FOR UPDATE");
  const logs = configRows.length ? JSON.parse(configRows[0].value || "[]") : [];
  const next = [updateLog, ...logs.filter((item) => item?.title !== updateLog.title)].slice(0, 100);
  const value = JSON.stringify(next);
  if (value.includes("�")) throw new Error("updateLogs contains replacement characters");
  await connection.execute("INSERT INTO config (`key`,value) VALUES ('updateLogs',?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [value]);
  await connection.commit();

  const [statusRows] = await connection.execute("SELECT id,status,admin_reply,replied_at FROM feedbacks WHERE id BETWEEN 91 AND 95 ORDER BY id");
  const ids = feedbacks.map(([id]) => `feedback-adoption-${id}`);
  const [mailRows] = await connection.query("SELECT legacy_mail_id,user_id,claimed,COUNT(*) count FROM user_mails WHERE legacy_mail_id IN (?) GROUP BY legacy_mail_id,user_id,claimed ORDER BY legacy_mail_id", [ids]);
  console.log(JSON.stringify({ top: next[0]?.title, feedbacks: statusRows, mails: mailRows }, null, 2));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
