@echo off
REM Windows版本的证书生成脚本

REM 创建证书目录
if not exist certs mkdir certs

REM 检查OpenSSL是否可用
where openssl >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo OpenSSL not found. Please install OpenSSL or use Git Bash.
    echo Download from: https://slproweb.com/products/Win32OpenSSL.html
    pause
    exit /b 1
)

REM 生成私钥
openssl genrsa -out certs/key.pem 2048

REM 生成证书签名请求
openssl req -new -key certs/key.pem -out certs/csr.pem -subj "/C=US/ST=Development/L=Development/O=HealthCalendar/CN=localhost"

REM 生成自签名证书
openssl x509 -req -days 365 -in certs/csr.pem -signkey certs/key.pem -out certs/cert.pem

REM 清理临时文件
del certs\csr.pem

echo HTTPS certificates generated successfully!
echo You can now run: npm run dev:https
echo Access via: https://localhost:3443
pause
