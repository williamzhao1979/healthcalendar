#!/bin/bash

# 创建HTTPS开发证书的脚本

# 创建证书目录
mkdir -p certs

# 生成私钥
openssl genrsa -out certs/key.pem 2048

# 生成证书签名请求
openssl req -new -key certs/key.pem -out certs/csr.pem -subj "/C=US/ST=Development/L=Development/O=HealthCalendar/CN=localhost"

# 生成自签名证书
openssl x509 -req -days 365 -in certs/csr.pem -signkey certs/key.pem -out certs/cert.pem

# 清理临时文件
rm certs/csr.pem

echo "HTTPS certificates generated successfully!"
echo "You can now run: npm run dev:https"
echo "Access via: https://localhost:3443"
