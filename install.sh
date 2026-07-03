#!/bin/bash
# ============================================================
# 桃源乡 一键安装脚本
# 前后端分离版：Express+MySQL后端 + nginx前端
# https://github.com/3026591236/taoyuan-custom
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ============================================================
# 0. 检查 root
# ============================================================
[[ $EUID -ne 0 ]] && error "请用 root 用户运行此脚本"

# ============================================================
# 1. 交互式配置
# ============================================================
echo -e "${CYAN}"
echo "╔══════════════════════════════════════╗"
echo "║     桃源乡 一键安装脚本              ║"
echo "║     前后端分离版                     ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"

read -p "安装目录 [/opt/taoyuan-src]: " INSTALL_DIR
INSTALL_DIR=${INSTALL_DIR:-/opt/taoyuan-src}

read -p "前端部署目录 [/opt/taoyuan-frontend]: " FRONTEND_DIR
FRONTEND_DIR=${FRONTEND_DIR:-/opt/taoyuan-frontend}

read -p "后端部署目录 [/opt/taoyuan-backend]: " BACKEND_DIR
BACKEND_DIR=${BACKEND_DIR:-/opt/taoyuan-backend}

read -p "游戏端口 [8084]: " GAME_PORT
GAME_PORT=${GAME_PORT:-8084}

read -p "后端端口 [3001]: " API_PORT
API_PORT=${API_PORT:-3001}

read -p "MySQL 数据库名 [taoyuan]: " DB_NAME
DB_NAME=${DB_NAME:-taoyuan}

read -p "MySQL 用户名 [taoyuan]: " DB_USER
DB_USER=${DB_NAME:-taoyuan}

read -p "MySQL 密码 [taoyuan2026]: " DB_PASS
DB_PASS=${DB_PASS:-taoyuan2026}

echo ""
echo -e "${CYAN}--- 管理员账号配置 ---${NC}"
read -p "管理员用户名: " ADMIN_USER
[[ -z "$ADMIN_USER" ]] && error "管理员用户名不能为空"
read -s -p "管理员密码（至少6位）: " ADMIN_PASS
echo ""
[[ ${#ADMIN_PASS} -lt 6 ]] && error "密码至少6位"

echo ""
echo -e "${YELLOW}安装配置确认：${NC}"
echo "  安装目录: $INSTALL_DIR"
echo "  前端目录: $FRONTEND_DIR"
echo "  后端目录: $BACKEND_DIR"
echo "  游戏端口: $GAME_PORT"
echo "  后端端口: $API_PORT"
echo "  数据库:   $DB_NAME"
echo "  数据库用户: $DB_USER"
echo "  管理员:   $ADMIN_USER"
echo ""
read -p "确认开始安装？[Y/n]: " CONFIRM
[[ "$CONFIRM" == "n" || "$CONFIRM" == "N" ]] && { echo "已取消"; exit 0; }

# ============================================================
# 2. 安装系统依赖
# ============================================================
info "安装系统依赖..."

if command -v apt-get &>/dev/null; then
    apt-get update -qq
    apt-get install -y -qq curl git nginx mysql-server nodejs npm python3 2>/dev/null || true
    # NodeSource for newer Node.js
    if [[ "$(node -v 2>/dev/null | cut -d. -f1 | tr -d v)" -lt 18 ]]; then
        info "安装 Node.js 18+..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash - 2>/dev/null || true
        apt-get install -y -qq nodejs 2>/dev/null || true
    fi
elif command -v yum &>/dev/null; then
    yum install -y curl git nginx mysql-server nodejs npm python3 2>/dev/null || true
    if [[ "$(node -v 2>/dev/null | cut -d. -f1 | tr -d v)" -lt 18 ]]; then
        info "安装 Node.js 18+..."
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash - 2>/dev/null || true
        yum install -y nodejs 2>/dev/null || true
    fi
fi

# npm -> pm2
npm install -g pm2 2>/dev/null || true

info "系统依赖安装完成"

# ============================================================
# 3. 启动 MySQL
# ============================================================
info "配置 MySQL..."

if ! systemctl is-active --quiet mysql 2>/dev/null && ! systemctl is-active --quiet mariadb 2>/dev/null; then
    systemctl start mysql 2>/dev/null || systemctl start mariadb 2>/dev/null || true
    systemctl enable mysql 2>/dev/null || systemctl enable mariadb 2>/dev/null || true
fi

# 创建数据库和用户
mysql -u root <<MYSQL_SCRIPT
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
MYSQL_SCRIPT

info "MySQL 配置完成"

# ============================================================
# 4. 克隆代码
# ============================================================
info "克隆代码仓库..."

if [[ -d "$INSTALL_DIR/.git" ]]; then
    warn "$INSTALL_DIR 已存在，拉取最新代码..."
    cd "$INSTALL_DIR" && git pull origin main 2>/dev/null || true
else
    git clone https://github.com/3026591236/taoyuan-custom.git "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ============================================================
# 5. 初始化数据库表结构
# ============================================================
info "初始化数据库表结构..."
mysql -u root "$DB_NAME" < backend/schema.sql 2>/dev/null || \
mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < backend/schema.sql

# ============================================================
# 6. 构建前端
# ============================================================
info "安装前端依赖并构建..."
cd "$INSTALL_DIR"
npm install --legacy-peer-deps 2>/dev/null || npm install
npx vite build 2>/dev/null || { error "前端构建失败，请检查 Node.js 版本 (需 18+)"; }

mkdir -p "$FRONTEND_DIR"
cp -r docs/* "$FRONTEND_DIR/"
info "前端构建完成，已部署到 $FRONTEND_DIR"

# ============================================================
# 7. 部署后端
# ============================================================
info "部署后端..."
mkdir -p "$BACKEND_DIR"
cp backend/index.mjs "$BACKEND_DIR/"
cp backend/package.json "$BACKEND_DIR/"
cd "$BACKEND_DIR"
npm install --production 2>/dev/null || npm install

# 写入环境变量配置
cat > "$BACKEND_DIR/.env" <<EOF
DB_HOST=localhost
DB_USER=$DB_USER
DB_PASS=$DB_PASS
DB_NAME=$DB_NAME
PORT=$API_PORT
EOF

# 修改 index.mjs 中的数据库连接信息
sed -i "s/host: 'localhost', user: 'taoyuan', password: 'taoyuan2026'/host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || '$DB_USER', password: process.env.DB_PASS || '$DB_PASS'/" "$BACKEND_DIR/index.mjs"
sed -i "s/database: 'taoyuan'/database: process.env.DB_NAME || '$DB_NAME'/" "$BACKEND_DIR/index.mjs"
sed -i "s/const PORT = 3001/const PORT = process.env.PORT || $API_PORT/" "$BACKEND_DIR/index.mjs"

info "后端部署完成"

# ============================================================
# 8. 配置 nginx
# ============================================================
info "配置 nginx..."

cat > /etc/nginx/sites-available/taoyuan <<NGINX
server {
    listen $GAME_PORT;
    server_name _;
    root $FRONTEND_DIR;
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

    location ~* .(js|css|png|jpg|jpeg|svg|woff2|ico)$ {
        expires 30d;
        add_header Cache-Control public;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/taoyuan /etc/nginx/sites-enabled/ 2>/dev/null || true
nginx -t 2>/dev/null && systemctl reload nginx || systemctl restart nginx
systemctl enable nginx 2>/dev/null || true

info "nginx 配置完成"

# ============================================================
# 9. 启动后端
# ============================================================
info "启动后端服务..."
cd "$BACKEND_DIR"
pm2 delete taoyuan-api 2>/dev/null || true
pm2 start index.mjs --name taoyuan-api
pm2 save

# 设置 pm2 开机自启
pm2 startup 2>/dev/null | tail -1 | bash 2>/dev/null || true
pm2 save

sleep 2
if pm2 list 2>/dev/null | grep -q "taoyuan-api.*online"; then
    info "后端服务启动成功"
else
    warn "后端服务可能未正常启动，请检查: pm2 logs taoyuan-api"
fi

# ============================================================
# 10. 创建管理员账号
# ============================================================
info "创建管理员账号..."

# 用 curl 调用注册接口
RESULT=$(curl -s -X POST "http://127.0.0.1:$API_PORT/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" 2>/dev/null)

if echo "$RESULT" | grep -q "token"; then
    info "管理员账号 $ADMIN_USER 创建成功！"
else
    # 如果注册失败（可能已存在），直接在数据库设为admin
    warn "注册接口返回: $RESULT"
    warn "尝试直接设置管理员..."
    mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "UPDATE users SET role='admin' WHERE username='$ADMIN_USER';" 2>/dev/null
    info "已将 $ADMIN_USER 设为管理员"
fi

# ============================================================
# 11. 完成
# ============================================================
echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗"
echo -e "║     🎉 桃源乡安装完成！              ║"
echo -e "╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "  游戏地址: ${CYAN}http://$(hostname -I | awk '{print $1}'):$GAME_PORT/${NC}"
echo -e "  管理员:   ${CYAN}$ADMIN_USER${NC}"
echo -e "  后台地址: ${CYAN}http://$(hostname -I | awk '{print $1}'):$GAME_PORT/#/admin${NC}"
echo ""
echo -e "  常用命令:"
echo -e "    查看后端日志: ${YELLOW}pm2 logs taoyuan-api${NC}"
echo -e "    重启后端:     ${YELLOW}pm2 restart taoyuan-api${NC}"
echo -e "    重启nginx:    ${YELLOW}systemctl reload nginx${NC}"
echo -e "    更新游戏:     ${YELLOW}cd $INSTALL_DIR && git pull && npm install && npx vite build && cp -r docs/* $FRONTEND_DIR/ && cp backend/index.mjs $BACKEND_DIR/ && pm2 restart taoyuan-api${NC}"
echo ""
