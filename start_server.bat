@echo off
echo ========================================
echo    肉串大战 - 手机访问服务器
echo ========================================
echo.
echo 正在启动服务器...
echo.
ipconfig | findstr "IPv4"
echo.
echo 手机浏览器访问上面的IP地址:8000
echo 例如: http://192.168.1.100:8000
echo.
echo 按 Ctrl+C 停止服务器
echo ========================================
cd /d "%~dp0"
python -m http.server 8000
