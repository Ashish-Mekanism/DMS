# Workflow Test

This file is created to test the GitHub Actions CI/CD pipeline.

Created on: $(date)
Purpose: Verify that the self-hosted runner picks up and executes the workflow correctly.

## Expected Behavior:
1. Runner should detect the push to main branch
2. Execute all steps in the dev-release.yml workflow
3. Deploy the application using PM2
4. Application should be accessible after deployment

## Status:
- [x] Workflow triggered ✅
- [x] Dependencies installed ✅ 
- [x] PM2 deployment completed ✅
- [❌] Application responding (502 Bad Gateway)

## 🚨 CURRENT ISSUE: 502 Bad Gateway

**Problem:** Nginx returns 502 Bad Gateway error
- **Error**: nginx/1.24.0 (Ubuntu) - 502 Bad Gateway
- **Cause**: Application not responding on expected port or crashed

**Possible Causes:**
1. Node.js app not running on port 3000
2. PM2 process crashed after deployment
3. Environment variables missing (DB connection)
4. Nginx proxy configuration mismatch

### Diagnostic Steps:
1. SSH into server: `ssh ubuntu@ip-172-31-15-232`
2. Run diagnostic script: `./diagnose-502.sh`
3. Check PM2 status: `pm2 list && pm2 logs DMS-BE`
4. Test direct access: `curl http://localhost:3000/initadmin/ifasapp`

### Quick Fixes:
```bash
# On server:
pm2 restart all
pm2 logs DMS-BE --lines 20
sudo systemctl restart nginx
```
