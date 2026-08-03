import crypto from "node:crypto";
import mysql from "../backend/node_modules/mysql2/promise.js";

const updateLog = {
  title: "V3.3.39 连续历练与快捷操作",
  date: "2026-08-03",
  content: "处理游戏内反馈#83—#87：快捷栏支持打开后连续使用，数字键1—5可快速触发对应槽位，并增加并发保护；红尘历练新增最多100轮的连续历练，战败、资源不足或纳戒无法完整接收掉落时自动停止；育种图鉴未育种条目改为灰色可点，可查看两种亲本和甜度、产量门槛，品种名与完整属性仍需育种解锁；修复改名卡首次可批量购买绕过每游戏年1张限制的问题并明确提示；杂货铺新增晴天娃娃，可将明日天气设为晴天。旧存档无需迁移。",
};
const feedbacks = [
  [83, "f6228d4b-925d-4d20-bf0e-8be092c3fd86", "新增晴天娃娃，可在杂货铺购买并将明日天气设为晴天。"],
  [84, "f6228d4b-925d-4d20-bf0e-8be092c3fd86", "已修复改名卡首次可批量购买、绕过每游戏年1张限制的问题，并补充准确提示。"],
  [85, "039e31f8-0f61-4dea-8389-4ffa0a077fb2", "育种图鉴未育种条目已改为灰色可点，可直接查看两种亲本和甜度、产量门槛；完成育种后再解锁品种名与完整属性。"],
  [86, "f6228d4b-925d-4d20-bf0e-8be092c3fd86", "红尘历练已新增连续历练，可随时停止，最多100轮；战败、资源不足或纳戒无法完整接收掉落时自动停止。"],
  [87, "ee11c2cc-d543-47b0-935a-3964fdadbaea", "快捷栏现在使用后保持打开，支持连续点击，并可按数字键1—5快速使用对应槽位；已增加防重复触发保护。"],
];
const rewards = { money: 10000, spiritStone: 100, items: [{ itemId: "forge_blueprint", quantity: 2 }, { itemId: "jade_slip", quantity: 2 }] };

const connection = await mysql.createConnection({
  host: process.env.TAOYUAN_DB_HOST || "localhost",
  user: process.env.TAOYUAN_DB_USER || "taoyuan",
  password: process.env.TAOYUAN_DB_PASSWORD,
  database: process.env.TAOYUAN_DB_NAME || "taoyuan",
  charset: "utf8mb4",
});
try {
  await connection.beginTransaction();
  for (const [id, userId, detail] of feedbacks) {
    const [rows] = await connection.execute("SELECT user_id FROM feedbacks WHERE id = ? FOR UPDATE", [id]);
    if (rows.length !== 1 || rows[0].user_id !== userId) throw new Error(`feedback #${id} ownership mismatch`);
    const reply = `已采纳并在 V3.3.39 上线。${detail}感谢反馈，已发放采纳奖励。`;
    await connection.execute("UPDATE feedbacks SET status = 'resolved', admin_reply = ?, replied_at = NOW() WHERE id = ?", [reply, id]);
    await connection.execute(
      `INSERT IGNORE INTO user_mails (id,user_id,legacy_mail_id,title,content,rewards,from_name)
       VALUES (?,?,?,?,?,?,'系统')`,
      [crypto.randomUUID(), userId, `feedback-adoption-${id}`, "V3.3.39 反馈采纳奖励", `你提交的反馈#${id}已处理。${detail}`, JSON.stringify(rewards)],
    );
  }
  const [configRows] = await connection.execute("SELECT value FROM config WHERE `key` = 'updateLogs' FOR UPDATE");
  const logs = configRows.length ? JSON.parse(configRows[0].value || "[]") : [];
  const next = [updateLog, ...logs.filter((item) => item?.title !== updateLog.title)].slice(0, 100);
  const value = JSON.stringify(next);
  if (value.includes("�")) throw new Error("updateLogs contains replacement characters");
  await connection.execute("INSERT INTO config (`key`,value) VALUES ('updateLogs',?) ON DUPLICATE KEY UPDATE value=VALUES(value)", [value]);
  await connection.commit();
  const [statusRows] = await connection.execute("SELECT id,status FROM feedbacks WHERE id BETWEEN 83 AND 87 ORDER BY id");
  const [mailRows] = await connection.execute("SELECT legacy_mail_id,COUNT(*) count FROM user_mails WHERE legacy_mail_id IN (?,?,?,?,?) GROUP BY legacy_mail_id ORDER BY legacy_mail_id", feedbacks.map(([id]) => `feedback-adoption-${id}`));
  console.log(JSON.stringify({ top: next[0].title, feedbacks: statusRows, mails: mailRows }));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
