import crypto from "node:crypto";
import mysql from "../node_modules/mysql2/promise.js";

const updateLog = {
  title: "V3.3.40 元神秘境与材料供给修复",
  date: "2026-08-03",
  content: "处理游戏内反馈#88—#90：8转正式开放元神秘境、10转开放元神秘境深层，胜利可获得固定元神经验及魂晶、太虚尘、养魂类材料，轮回殿节点可直接前往；修仙市集新增龙葵高价补给，万象行药庐新增纸张常驻供应，并同步准确来源；绿松石饰品加工明确为投入绿松石×2、推进3个游戏日后手动收取，完成状态持续提示，满包取消或拆机改为原子退料以防损失。旧存档按现有转数直接解锁，无需迁移。",
};
const details = {
  88: "经核查云档，加工实际未丢失：绿松石饰品于3个游戏日后完成，并在反馈后正常收取。现已明确投入绿松石×2、推进3个游戏日及手动收取流程，增加预计产物和成品留机提示，并修复满包取消或拆机时可能退料不完整的风险。",
  89: "已补齐稳定来源：纸可在万象行药庐以30文常驻购买；龙葵保留百草园现实日随机来源，并在修仙市集增加2200文高价应急补给；物品来源与百晓说明已同步。",
  90: "已正式实现8转元神秘境与10转元神秘境深层，可从轮回殿节点或地图的修仙之途进入秘境探索；战斗胜利固定获得元神经验，并有魂晶、太虚尘及养魂类材料掉落。现有8转/10转旧档按转数直接解锁。",
};
const rewards = {
  88: { money: 8000, spiritStone: 80, items: [{ itemId: "jade_slip", quantity: 2 }] },
  89: { money: 12000, spiritStone: 100, items: [{ itemId: "longkui", quantity: 3 }, { itemId: "paper", quantity: 20 }] },
  90: { money: 15000, spiritStone: 150, items: [{ itemId: "soul_crystal", quantity: 8 }, { itemId: "soul_mending_pill", quantity: 2 }] },
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
  for (const id of [88, 89, 90]) {
    const [rows] = await connection.execute(
      "SELECT id,user_id,status FROM feedbacks WHERE id = ? FOR UPDATE",
      [id],
    );
    if (rows.length !== 1 || !rows[0].user_id) throw new Error(`feedback #${id} missing owner`);
    const reply = `已在 V3.3.40 处理。${details[id]}感谢反馈，已发放处理奖励。`;
    await connection.execute(
      "UPDATE feedbacks SET status = 'resolved', admin_reply = ?, replied_at = NOW() WHERE id = ?",
      [reply, id],
    );
    await connection.execute(
      `INSERT IGNORE INTO user_mails (id,user_id,legacy_mail_id,title,content,rewards,from_name)
       VALUES (?,?,?,?,?,?,'万象仙乡制作组')`,
      [
        crypto.randomUUID(),
        rows[0].user_id,
        `feedback-adoption-${id}`,
        `V3.3.40 反馈 #${id} 处理奖励`,
        `你提交的反馈#${id}已处理。${details[id]}`,
        JSON.stringify(rewards[id]),
      ],
    );
  }
  const [configRows] = await connection.execute(
    "SELECT value FROM config WHERE `key` = 'updateLogs' FOR UPDATE",
  );
  const logs = configRows.length ? JSON.parse(configRows[0].value || "[]") : [];
  const next = [updateLog, ...logs.filter((item) => item?.title !== updateLog.title)].slice(0, 100);
  const value = JSON.stringify(next);
  if (value.includes("�")) throw new Error("updateLogs contains replacement characters");
  await connection.execute(
    "INSERT INTO config (`key`,value) VALUES ('updateLogs',?) ON DUPLICATE KEY UPDATE value=VALUES(value)",
    [value],
  );
  await connection.commit();

  const [statusRows] = await connection.execute(
    "SELECT id,status,admin_reply,replied_at FROM feedbacks WHERE id IN (88,89,90) ORDER BY id",
  );
  const [mailRows] = await connection.execute(
    "SELECT legacy_mail_id,user_id,claimed,COUNT(*) count FROM user_mails WHERE legacy_mail_id IN ('feedback-adoption-88','feedback-adoption-89','feedback-adoption-90') GROUP BY legacy_mail_id,user_id,claimed ORDER BY legacy_mail_id",
  );
  console.log(JSON.stringify({ top: next[0].title, feedbacks: statusRows, mails: mailRows }, null, 2));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
