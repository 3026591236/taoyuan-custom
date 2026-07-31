import mysql from "../backend/node_modules/mysql2/promise.js";

const entry = {
  title: "V3.3.34 宗门成长与周令减负",
  date: "2026-07-31",
  content: "处理反馈#70—#75：排行榜同步卡住的问题已由V3.3.33后端连接池修复覆盖；宗门新增功勋宝库；聚灵阵、百工堂、试剑台明确Lv.10硬上限并在满级前阻止扣料；仙府槽位由3扩至5；育种灵种箱增加一键整理；周令委托目标由20降为12，并改用累计获得贡献统计仙盟声望，消费贡献不再令进度倒退。旧任务ID、已有领取记录及存档结构兼容。",
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
  const [rows] = await connection.execute("SELECT value FROM config WHERE `key` = ? FOR UPDATE", ["updateLogs"]);
  const logs = rows.length ? JSON.parse(rows[0].value || "[]") : [];
  const next = [entry, ...logs.filter((item) => item?.title !== entry.title)];
  const value = JSON.stringify(next);
  await connection.execute("INSERT INTO config (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)", ["updateLogs", value]);
  await connection.commit();
  const replacementCharacters = (value.match(/�/g) || []).length;
  if (replacementCharacters) throw new Error("updateLogs contains replacement characters");
  console.log(JSON.stringify({ count: next.length, top: next[0], replacementCharacters }));
} catch (error) {
  await connection.rollback();
  throw error;
} finally { await connection.end(); }
