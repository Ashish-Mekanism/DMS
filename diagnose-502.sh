#!/bin/bash

# 502 Bad Gateway Troubleshooting Script
# Run this on your server (ubuntu@ip-172-31-15-232)

echo "🔍 Diagnosing 502 Bad Gateway Error..."
echo "======================================"

echo ""
echo "1️⃣ Checking PM2 Status:"
echo "------------------------"
pm2 list
pm2 logs --lines 20

echo ""
echo "2️⃣ Checking Application Port:"
echo "-----------------------------"
netstat -tlnp | grep :3000 || echo "❌ No process listening on port 3000"

echo ""
echo "3️⃣ Checking All Node.js Processes:"
echo "----------------------------------"
ps aux | grep node | grep -v grep

echo ""
echo "4️⃣ Checking System Resources:"
echo "-----------------------------"
df -h
free -h

echo ""
echo "5️⃣ Checking Nginx Configuration:"
echo "--------------------------------"
sudo nginx -t
echo ""
echo "Nginx sites-enabled:"
ls -la /etc/nginx/sites-enabled/

echo ""
echo "6️⃣ Checking Nginx Error Logs:"
echo "-----------------------------"
sudo tail -20 /var/log/nginx/error.log

echo ""
echo "7️⃣ Testing Direct Application Access:"
echo "------------------------------------"
echo "Testing localhost:3000..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3000/initadmin/ifasapp || echo "❌ Failed to connect to application"

echo ""
echo "8️⃣ Environment Variables:"
echo "------------------------"
cd ~/actions-runner/_work/DMS-BE/DMS-BE 2>/dev/null || cd /home/ubuntu/actions-runner/_work/*/DMS-BE 2>/dev/null || echo "Could not find deployed code directory"
pwd
ls -la .env 2>/dev/null || echo "No .env file found"

echo ""
echo "🔧 Quick Fixes to Try:"
echo "====================="
echo "1. Restart PM2: pm2 restart all"
echo "2. Check app logs: pm2 logs DMS-BE"
echo "3. Restart manually: cd ~/actions-runner/_work/DMS-BE/DMS-BE && node app.js"
echo "4. Restart nginx: sudo systemctl restart nginx"
