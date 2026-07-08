#!/usr/bin/env bash
set -euo pipefail

# 桃源乡 / 我从种田开始修仙 一键安装脚本
# 支持 Ubuntu/Debian。建议用 sudo/root 执行。
# 示例：
#   sudo bash scripts/install.sh
#   DOMAIN=example.com DB_PASSWORD='your-password' sudo -E bash scripts/install.sh

APP_DIR=${APP_DIR:-/opt/taoyuan-src}
WEB_DIR=${WEB_DIR:-/opt/taoyuan-frontend}
API_DIR=${API_DIR:-/opt/taoyuan-backend}
DB_NAME=${DB_NAME:-taoyuan}
DB_USER=${DB_USER:-taoyuan}
DB_PASSWORD=${DB_PASSWORD:-}
API_PORT=${API_PORT:-3001}
PM2_NAME=${PM2_NAME:-taoyuan-api}
DOMAIN=${DOMAIN:-_}
WRITE_NGINX=${WRITE_NGINX:-0}
NGINX_SITE=${NGINX_SITE:-/etc/nginx/sites-available/taoyuan}
REPO_URL=${REPO_URL:-https://github.com/3026591236/taoyuan-custom.git}

need_cmd() { command -v "$1" >/dev/null 2>&1; }
run_as_root() {
  if [ "$(id -u)" -ne 0 ]; then
    echo "请用 root 或 sudo 执行：sudo -E bash scripts/install.sh" >&2
    exit 1
  fi
}
rand_password() {
  if need_cmd openssl; then openssl rand -base64 24 | tr -d '\n'
  else date +%s%N | sha256sum | awk '{print $1}'
  fi
}

run_as_root
if [ -z "$DB_PASSWORD" ]; then
  DB_PASSWORD=$(rand_password)
  echo "已自动生成数据库密码（只显示一次，请保存）：$DB_PASSWORD"
fi

echo "== 1/8 安装系统依赖 =="
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl git rsync nginx mysql-server build-essential ca-certificates

if ! need_cmd node; then
  echo "== 安装 Node.js 22 =="
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

if ! need_cmd pm2; then
  echo "== 安装 PM2 =="
  npm install -g pm2
fi

echo "Node: $(node -v)"
echo "npm:  $(npm -v)"
echo "PM2:  $(pm2 -v)"

echo "== 2/8 准备源码目录 =="
if [ ! -d "$APP_DIR/.git" ]; then
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" pull --ff-only || true
fi
cd "$APP_DIR"

echo "== 3/8 安装前端依赖 =="
npm install

echo "== 4/8 安装后端依赖 =="
mkdir -p "$API_DIR"
if [ -d "$APP_DIR/backend" ]; then
  (cd "$APP_DIR/backend" && npm install)
fi

echo "== 5/8 初始化 MySQL 数据库和账号 =="
mysql <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
ALTER USER '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "== 6/8 构建前端 =="
npm run build

echo "== 7/8 部署文件 =="
mkdir -p "$WEB_DIR" "$API_DIR"
rsync -a --delete --exclude downloads "$APP_DIR/docs/" "$WEB_DIR/"
mkdir -p "$WEB_DIR/downloads"
cp "$APP_DIR/backend/index.mjs" "$API_DIR/index.mjs"
if [ -f "$APP_DIR/backend/package.json" ]; then
  cp "$APP_DIR/backend/package.json" "$API_DIR/package.json"
  (cd "$API_DIR" && npm install --omit=dev)
fi
cat > "$API_DIR/.env" <<EOF
TAOYUAN_DB_HOST=localhost
TAOYUAN_DB_NAME=$DB_NAME
TAOYUAN_DB_USER=$DB_USER
TAOYUAN_DB_PASSWORD=$DB_PASSWORD
PORT=$API_PORT
EOF
chmod 600 "$API_DIR/.env"

echo "== 8/8 启动后端和配置 Nginx =="
cd "$API_DIR"
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  pm2 start index.mjs --name "$PM2_NAME" --update-env
fi
pm2 save || true

if [ "$WRITE_NGINX" = "1" ]; then
  cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    root $WEB_DIR;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:$API_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header Authorization \$http_authorization;
        proxy_read_timeout 60s;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
        add_header Cache-Control no-cache;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|svg|webp|woff2|ico)$ {
        expires 30d;
        add_header Cache-Control public;
    }
}
EOF
  ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/taoyuan
  nginx -t
  systemctl reload nginx
else
  echo "未写入 Nginx 配置。如需自动写入：WRITE_NGINX=1 DOMAIN=你的域名 sudo -E bash scripts/install.sh"
fi

echo "安装完成。"
echo "前端目录：$WEB_DIR"
echo "后端目录：$API_DIR"
echo "PM2 进程：$PM2_NAME"
echo "数据库：$DB_NAME / $DB_USER"
echo "本机检查：curl http://127.0.0.1:$API_PORT/api/config"
