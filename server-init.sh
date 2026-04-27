#!/bin/bash
# ============================================
# 服务器初始化脚本（仅需运行一次）
# ============================================

# 安装 Node.js 18
echo "安装 Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 安装 PM2
echo "安装 PM2..."
npm install -g pm2

# 安装 Nginx
echo "安装 Nginx..."
apt-get install -y nginx

# 开放防火墙
echo "配置防火墙..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw --force enable

# 创建项目目录
mkdir -p /var/www/usb-manage

echo "=========================================="
echo "初始化完成！"
echo "请上传项目文件到 /var/www/usb-manage"
echo "然后运行: pm2 start /var/www/usb-manage/ecosystem.config.json"
echo "=========================================="
