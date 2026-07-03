#!/usr/bin/env python3
"""Update version and git commit/push."""
import json, subprocess, os

os.chdir('/opt/taoyuan-src')

# Update package.json version
with open('package.json', 'r') as f:
    pkg = json.load(f)
pkg['version'] = '2.5.0'
with open('package.json', 'w') as f:
    json.dump(pkg, f, indent=2)
    f.write('\n')
print(f"Updated package.json version to {pkg['version']}")

# Add db.json update record if it exists in data dir
db_path = '/opt/taoyuan-data/db.json'
if os.path.exists(db_path):
    with open(db_path, 'r') as f:
        db = json.load(f)
    if 'versionHistory' not in db:
        db['versionHistory'] = []
    db['versionHistory'].append({
        'version': 'V0.5',
        'description': '修仙大版本：秘境探索/炼器/门派/法宝/境界扩展',
        'date': '2026-07-03'
    })
    with open(db_path, 'w') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    print("Updated db.json with V0.5 record")

# Git operations
subprocess.run(['git', 'add', '-A'], check=True)
subprocess.run(['git', 'commit', '-m', 'feat: V0.5 秘境探索+炼器+门派+法宝+境界扩展'], check=True)
print("Git committed")

# Push
result = subprocess.run(['git', 'push', 'origin', 'main'], capture_output=True, text=True)
print(f"Push stdout: {result.stdout}")
print(f"Push stderr: {result.stderr}")
print(f"Push returncode: {result.returncode}")
