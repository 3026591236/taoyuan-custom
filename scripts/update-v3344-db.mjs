import mysql from "../backend/node_modules/mysql2/promise.js";

const updateLog = {
  title: "V3.3.44 仙乡领地战略完善",
  date: "2026-08-05",
  content:
    "仙乡领地升级为完整战略经营玩法：新增三支独立军阵、五类兵种与阵型克制、真实行军和返程倒计时、途中召回、伤兵营与治疗；据点新增双建筑槽，军府新增六项科技与四章山河目标，敌军会按现实时间动态袭扰。角色战力、宗门工程和空闲灵兽会提供有上限的统帅、产出、行军或治疗加成。旧领地存档会自动迁移，原据点、资源、兵力、士气、等级和巡境数据均保留。",
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
    "SELECT value FROM config WHERE `key` = 'updateLogs' FOR UPDATE",
  );
  const logs = rows.length ? JSON.parse(rows[0].value || "[]") : [];
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
  console.log(JSON.stringify({ top: next[0]?.title, count: next.length }, null, 2));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
