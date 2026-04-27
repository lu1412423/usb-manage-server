#!/bin/bash

# ============================================
# 腾讯云 Lighthouse 部署脚本
# ============================================

# 配置（请根据实际情况修改）
SERVER_IP="your_server_ip"          # 服务器IP
SERVER_USER="root"                   # 用户名
SERVER_PORT="22"                     # SSH端口
PROJECT_DIR="/var/www/usb-manage"    # 服务器上的项目目录

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   USB管理系统 - 腾讯云部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 1. 检查本地环境
echo -e "\n${YELLOW}[1/6] 检查本地配置...${NC}"
if [ "$SERVER_IP" == "your_server_ip" ]; then
    echo -e "${RED}错误：请先修改脚本中的 SERVER_IP 配置！${NC}"
    exit 1
fi
echo "目标服务器: $SERVER_USER@$SERVER_IP:$SERVER_PORT"

# 2. 创建临时部署目录
echo -e "\n${YELLOW}[2/6] 准备部署文件...${NC}"
DEPLOY_TMP="/tmp/usb-manage-deploy"
rm -rf "$DEPLOY_TMP"
mkdir -p "$DEPLOY_TMP"

# 复制项目文件（排除 node_modules）
rsync -av --exclude='node_modules' --exclude='.git' --exclude='*.db' . "$DEPLOY_TMP/"
echo "文件已打包"

# 3. 上传文件到服务器
echo -e "\n${YELLOW}[3/6] 上传文件到服务器...${NC}"
ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_IP" "mkdir -p $PROJECT_DIR"
rsync -avz -e "ssh -p $SERVER_PORT" --delete "$DEPLOY_TMP/" "$SERVER_USER@$SERVER_IP:$PROJECT_DIR/"
echo "文件上传完成"

# 4. 在服务器上安装依赖和配置
echo -e "\n${YELLOW}[4/6] 在服务器上安装依赖...${NC}"
ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
set -e
cd /var/www/usb-manage

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "安装 Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi

# 安装 PM2
npm install -g pm2

# 安装项目依赖
npm install

# 配置 PM2
pm2 delete usb-manage 2>/dev/null || true
pm2 start npm --name "usb-manage" -- start
pm2 save
pm2 startup

echo "安装完成"
ENDSSH

# 5. 配置防火墙
echo -e "\n${YELLOW}[5/6] 配置防火墙...${NC}"
ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_IP" << 'ENDSSH'
ufw allow 3000/tcp 2>/dev/null || true
echo "端口 3000 已开放"
ENDSSH

# 6. 完成
echo -e "\n${YELLOW}[6/6] 部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "访问地址: http://$SERVER_IP:3000"
echo -e "管理命令: ssh -p $SERVER_PORT $SERVER_USER@$SERVER_IP"
echo -e "查看日志: pm2 logs usb-manage"
echo -e "重启服务: pm2 restart usb-manage"
echo -e "${GREEN}========================================${NC}"

# 清理临时文件
rm -rf "$DEPLOY_TMP"
