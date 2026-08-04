import crypto from "node:crypto";
import mysql from "../backend/node_modules/mysql2/promise.js";

const updateLog = {
  title: "V3.3.42 转生条件与龙颜丹说明修复",
  date: "2026-08-04",
  content: "处理游戏内反馈#96—#97：轮回殿的灵气与铜钱条件现在会像轮回材料一样按是否备齐显示绿色或黄色，并同时展示当前铜钱与所需铜钱；修正龙颜丹丹方中“体/精+20%”的错误说明，统一为实际效果“永久体力上限+20”，并明确上品、极品炼制品质会额外增加体魄与悟性经验。仅修正界面反馈与说明，原有数值和旧存档均不变。",
};
const feedbacks = [
  [
    96,
    "f6228d4b-925d-4d20-bf0e-8be092c3fd86",
    "已修正龙颜丹说明。实际效果一直是永久体力上限+20点，并非增加20%；上品或极品炼制品质还会额外增加体魄与悟性经验。本次统一了丹方与物品说明，原数值不变。",
  ],
  [
    97,
    "039e31f8-0f61-4dea-8389-4ffa0a077fb2",
    "已修复轮回殿条件颜色：灵气和铜钱达到本次转生要求时会显示绿色，不足时显示黄色；铜钱也会同时显示当前数量与所需数量，方便直接核对。",
  ],
];
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
  for (const [id, expectedUserId, detail] of feedbacks) {
    const [rows] = await connection.execute(
      "SELECT user_id FROM feedbacks WHERE id = ? FOR UPDATE",
      [id],
    );
    if (rows.length !== 1 || rows[0].user_id !== expectedUserId) {
      throw new Error(`feedback #${id} ownership mismatch`);
    }
    const reply = `已在 V3.3.42 处理。${detail}感谢反馈，已发放处理奖励。`;
    await connection.execute(
      "UPDATE feedbacks SET status = 'resolved', admin_reply = ?, replied_at = NOW() WHERE id = ?",
      [reply, id],
    );
    await connection.execute(
      `INSERT IGNORE INTO user_mails
       (id,user_id,legacy_mail_id,title,content,rewards,from_name)
       VALUES (?,?,?,?,?,?,'万象仙乡制作组')`,
      [
        crypto.randomUUID(),
        expectedUserId,
        `feedback-adoption-${id}`,
        `V3.3.42 反馈 #${id} 处理奖励`,
        `你提交的反馈#${id}已处理。${detail}`,
        JSON.stringify(reward),
      ],
    );
  }

  const [configRows] = await connection.execute(
    "SELECT value FROM config WHERE `key` = 'updateLogs' FOR UPDATE",
  );
  const logs = configRows.length
    ? JSON.parse(configRows[0].value || "[]")
    : [];
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
    "SELECT id,status,admin_reply,replied_at FROM feedbacks WHERE id IN (96,97) ORDER BY id",
  );
  const [mailRows] = await connection.query(
    "SELECT legacy_mail_id,user_id,claimed,COUNT(*) count FROM user_mails WHERE legacy_mail_id IN (?) GROUP BY legacy_mail_id,user_id,claimed ORDER BY legacy_mail_id",
    [feedbacks.map(([id]) => `feedback-adoption-${id}`)],
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
