import crypto from "node:crypto";
import mysql from "../backend/node_modules/mysql2/promise.js";

const feedbackId = 82;
const userId = "039e31f8-0f61-4dea-8389-4ffa0a077fb2";
const mailSourceId = "feedback-adoption-82";
const reply = "已确认并在 V3.3.38 优化。灵石仍保留为修炼、炼器和布阵会直接消耗的材料，避免改成独立货币后破坏现有玩法和旧存档；灵石及其他可堆叠物品的单格上限已由999提升至99999。纳戒物品页现提供常驻一键整理，可自动合并旧存档里分散的同类堆叠并重新排序，纳戒、临时纳戒、储物匣及各类入包结算使用同一上限。感谢反馈，已发放采纳奖励。";
const updateLog = {
  title: "V3.3.38 纳戒扩容与一键整理",
  date: "2026-08-01",
  content: "处理游戏内反馈#82：灵石及其他可堆叠物品的单格上限由999提升至99999，纳戒、临时纳戒、储物匣及购买、采集、钓鱼等入包结算统一使用同一上限；纳戒物品页提供常驻一键整理，可自动合并旧存档中的同类分散堆叠并按类别、物品和品质排序。灵石仍保留为可用于修炼、炼器和布阵的材料，旧存档无需迁移。",
};
const rewards = {
  money: 10000,
  spiritStone: 100,
  items: [
    { itemId: "forge_blueprint", quantity: 2 },
    { itemId: "jade_slip", quantity: 2 },
  ],
};

const connection = await mysql.createConnection({
  host: process.env.TAOYUAN_DB_HOST || "localhost",
  user: process.env.TAOYUAN_DB_USER || "taoyuan",
  password: process.env.TAOYUAN_DB_PASSWORD,
  database: process.env.TAOYUAN_DB_NAME || "taoyuan",
  charset: "utf8mb4",
});

try {
  await connection.beginTransaction();
  const [feedbackRows] = await connection.execute(
    "SELECT id, user_id FROM feedbacks WHERE id = ? FOR UPDATE",
    [feedbackId],
  );
  if (feedbackRows.length !== 1 || feedbackRows[0].user_id !== userId) {
    throw new Error("feedback #82 ownership mismatch");
  }
  await connection.execute(
    "UPDATE feedbacks SET status = 'resolved', admin_reply = ?, replied_at = NOW() WHERE id = ?",
    [reply, feedbackId],
  );

  const [configRows] = await connection.execute(
    "SELECT value FROM config WHERE `key` = 'updateLogs' FOR UPDATE",
  );
  const logs = configRows.length ? JSON.parse(configRows[0].value || "[]") : [];
  const nextLogs = [
    updateLog,
    ...logs.filter((item) => item?.title !== updateLog.title),
  ].slice(0, 100);
  const logsJson = JSON.stringify(nextLogs);
  if (logsJson.includes("�")) throw new Error("updateLogs contains replacement characters");
  await connection.execute(
    "INSERT INTO config (`key`, value) VALUES ('updateLogs', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
    [logsJson],
  );

  await connection.execute(
    `INSERT IGNORE INTO user_mails
     (id, user_id, legacy_mail_id, title, content, rewards, from_name)
     VALUES (?, ?, ?, ?, ?, ?, '系统')`,
    [
      crypto.randomUUID(),
      userId,
      mailSourceId,
      "V3.3.38 反馈采纳奖励",
      "你提交的反馈#82已处理：可堆叠物品单格上限提升至99999，纳戒新增常驻一键整理。感谢你帮助完善游戏体验。",
      JSON.stringify(rewards),
    ],
  );
  await connection.commit();

  const [mailRows] = await connection.execute(
    "SELECT id, claimed FROM user_mails WHERE user_id = ? AND legacy_mail_id = ?",
    [userId, mailSourceId],
  );
  console.log(JSON.stringify({
    feedbackId,
    status: "resolved",
    updateLog: nextLogs[0].title,
    updateLogCount: nextLogs.length,
    mailCount: mailRows.length,
    mailClaimed: mailRows[0]?.claimed ?? null,
  }));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
