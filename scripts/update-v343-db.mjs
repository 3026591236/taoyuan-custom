import crypto from "node:crypto";
import mysql from "../backend/node_modules/mysql2/promise.js";

const feedbackId = 98;
const expectedUserId = "039e31f8-0f61-4dea-8389-4ffa0a077fb2";
const detail =
  "灵兽森林与幽冥洞窟现已增加连续挑战：胜利后会自动完整拾取掉落并进入下一轮，最多连续100轮；遇到秘境抉择会暂停，选择后自动继续；资源不足、战败或纳戒放不下全部掉落时会安全停止。原有消耗、掉落和怪物数值不变。";
const updateLog = {
  title: "V3.3.43 秘境连续挑战",
  date: "2026-08-05",
  content:
    "处理游戏内反馈#98：灵兽森林与幽冥洞窟新增连续挑战，可在每轮胜利后自动原子拾取掉落并继续进入，最多连续100轮；遇到秘境抉择时暂停并在选择后自动继续，资源不足、战败或纳戒无法完整接收掉落时自动停止，未拾取掉落仍保留在结算页。两个秘境原有消耗、掉落、怪物数值与旧存档均不变。",
};
const reward = {
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
  const [rows] = await connection.execute(
    "SELECT user_id FROM feedbacks WHERE id = ? FOR UPDATE",
    [feedbackId],
  );
  if (rows.length !== 1 || rows[0].user_id !== expectedUserId)
    throw new Error(`feedback #${feedbackId} ownership mismatch`);

  const reply = `已在 V3.3.43 处理。${detail}感谢反馈，已发放处理奖励。`;
  await connection.execute(
    "UPDATE feedbacks SET status = 'resolved', admin_reply = ?, replied_at = NOW() WHERE id = ?",
    [reply, feedbackId],
  );
  await connection.execute(
    `INSERT IGNORE INTO user_mails
     (id,user_id,legacy_mail_id,title,content,rewards,from_name)
     VALUES (?,?,?,?,?,?,'万象仙乡制作组')`,
    [
      crypto.randomUUID(),
      expectedUserId,
      `feedback-adoption-${feedbackId}`,
      `V3.3.43 反馈 #${feedbackId} 处理奖励`,
      `你提交的反馈#${feedbackId}已采纳。${detail}`,
      JSON.stringify(reward),
    ],
  );

  const [configRows] = await connection.execute(
    "SELECT value FROM config WHERE `key` = 'updateLogs' FOR UPDATE",
  );
  const logs = configRows.length ? JSON.parse(configRows[0].value || "[]") : [];
  const next = [
    updateLog,
    ...logs.filter((item) => item?.title !== updateLog.title),
  ].slice(0, 100);
  const value = JSON.stringify(next);
  if (value.includes("�")) throw new Error("updateLogs contains replacement characters");
  await connection.execute(
    "INSERT INTO config (`key`,value) VALUES ('updateLogs',?) ON DUPLICATE KEY UPDATE value=VALUES(value)",
    [value],
  );
  await connection.commit();

  const [statusRows] = await connection.execute(
    "SELECT id,status,admin_reply,replied_at FROM feedbacks WHERE id = ?",
    [feedbackId],
  );
  const [mailRows] = await connection.execute(
    "SELECT legacy_mail_id,user_id,claimed,COUNT(*) count FROM user_mails WHERE legacy_mail_id = ? GROUP BY legacy_mail_id,user_id,claimed",
    [`feedback-adoption-${feedbackId}`],
  );
  console.log(
    JSON.stringify(
      { top: next[0]?.title, feedbacks: statusRows, mails: mailRows },
      null,
      2,
    ),
  );
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
