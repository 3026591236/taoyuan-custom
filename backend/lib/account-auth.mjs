import bcrypt from "bcryptjs";
export function validateNewPassword(value) {
  const password = String(value ?? "");
  return password.length >= 6 ? { ok: true, password } : { ok: false, message: "新密码至少6位" };
}
export function verifyAndHashPassword(currentPassword, storedHash, newPassword) {
  const checked = validateNewPassword(newPassword);
  if (!checked.ok) return checked;
  if (!String(storedHash || "").startsWith("$2") || !bcrypt.compareSync(String(currentPassword || ""), String(storedHash)))
    return { ok: false, message: "旧密码错误" };
  return { ok: true, hash: bcrypt.hashSync(checked.password, 12) };
}
