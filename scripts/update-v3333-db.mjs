import mysql from "../backend/node_modules/mysql2/promise.js";

const entry = {
  title: "V3.3.33 后端连接池与事务稳定性修复",
  date: "2026-07-31",
  content:
    "修复高并发保存、签到、邮件、福利等事务接口先占用数据库连接、再通过同一连接池鉴权造成连接池自锁，最终令全部API超时但PM2仍显示在线的问题；事务接口现复用当前连接完成鉴权，并统一按账号、角色、存档、奖励账本顺序加锁，降低并发保存与奖励结算产生数据库死锁的概率。存档结构、奖励规则与玩家数据均不变。",
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
    "SELECT value FROM config WHERE `key` = ? FOR UPDATE",
    ["updateLogs"],
  );
  const logs = rows.length ? JSON.parse(rows[0].value || "[]") : [];
  const next = [entry, ...logs.filter((item) => item?.title !== entry.title)];
  const value = JSON.stringify(next);
  await connection.execute(
    "INSERT INTO config (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
    ["updateLogs", value],
  );
  await connection.commit();
  const replacementCharacters = (value.match(/�/g) || []).length;
  if (replacementCharacters) throw new Error("updateLogs contains replacement characters");
  console.log(JSON.stringify({ count: next.length, top: next[0], replacementCharacters }));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
