import crypto from "node:crypto";
import mysql from "../backend/node_modules/mysql2/promise.js";

const feedbackId = 81;
const userId = "039e31f8-0f61-4dea-8389-4ffa0a077fb2";
const mailSourceId = "feedback-adoption-81";
const reply = "已确认并在 V3.3.37 优化。休息前的云端存档保护原本遇到一次短暂写入失败就会立即取消本次休息；现在遇到网络波动、服务器瞬时错误或同页面可恢复冲突时，会在约15秒保护窗口内有限重试。多设备冲突、存档校验拒绝等确定性错误仍会立即停止，避免覆盖服务器权威进度。核验显示你提交反馈前后及之后的云档均持续成功写入，没有发生数据丢失。感谢反馈，已发放采纳奖励。";
const updateLog = {
  title: "V3.3.37 休息写档重试",
  date: "2026-08-01",
  content: "处理游戏内反馈#81：休息前若遇到短暂网络波动、服务器瞬时错误或同页面可恢复的存档冲突，会在约15秒保护窗口内有限重试，不再因单次写入失败立即取消休息；多设备冲突、存档校验拒绝等确定性错误仍立即停止，避免覆盖服务器权威进度。休息日结算规则与旧存档均不变。",
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
    throw new Error("feedback #81 ownership mismatch");
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
      "V3.3.37 反馈采纳奖励",
      "你提交的反馈#81已处理：休息前云端写档现会对瞬时失败进行有限重试。感谢你帮助完善游戏体验。",
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
