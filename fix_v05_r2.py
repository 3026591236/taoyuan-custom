#!/usr/bin/env python3
"""Fix V0.5 round 2 - remaining TS errors."""

# ============================================================
# Fix 1: useCombatStore.ts line 97 - Monster | undefined
# ============================================================
print("=== Fix 1: useCombatStore.ts line 97 ===")
path = '/opt/taoyuan-src/src/stores/useCombatStore.ts'
with open(path, 'r') as f:
    content = f.read()

# The random monster selection returns Monster | undefined
old = "const m = zone.monsters[Math.floor(Math.random() * zone.monsters.length)]\n    startFight(m)"
new = "const m = zone.monsters[Math.floor(Math.random() * zone.monsters.length)]!\n    startFight(m)"

assert old in content, "Could not find monster selection line in useCombatStore.ts"
content = content.replace(old, new)

with open(path, 'w') as f:
    f.write(content)
print("Fixed: added non-null assertion to monster selection")


# ============================================================
# Fix 2: SectView.vue line 118 - Object possibly undefined
# ============================================================
print("\n=== Fix 2: SectView.vue line 118 ===")
path = '/opt/taoyuan-src/src/views/game/SectView.vue'
with open(path, 'r') as f:
    content = f.read()

# currentSect.value?.skills[idx] could be undefined
# Fix: add non-null assertion or optional chaining
old = "addLog(`${currentSect.value?.skills[idx].name} 升级到 Lv.${level + 1}！`)"
new = "addLog(`${currentSect.value?.skills[idx]?.name ?? '技能'} 升级到 Lv.${level + 1}！`)"

assert old in content, "Could not find addLog line in SectView.vue"
content = content.replace(old, new)

with open(path, 'w') as f:
    f.write(content)
print("Fixed: added optional chaining to currentSect.value?.skills[idx]?.name")

print("\n=== Round 2 fixes applied! ===")
