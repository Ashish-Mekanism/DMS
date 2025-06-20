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
- [x] Workflow triggered
- [ ] Dependencies installed
- [ ] PM2 deployment successful
- [ ] Application running

## ⚠️ ISSUE IDENTIFIED: Runner Stopped

**Problem:** The GitHub Actions self-hosted runner is no longer running on the server.

**Solution:** SSH into the server and restart the runner.

### Quick Fix:
1. SSH into server: `ssh ubuntu@ip-172-31-15-232`
2. Copy and run the `restart-runner.sh` script on the server
3. Or manually restart: `cd ~/actions-runner && sudo ./svc.sh start`

### Manual Commands:
```bash
# On the server (ubuntu@ip-172-31-15-232):
ps aux | grep Runner.Listener  # Check if running
sudo systemctl restart actions.runner.*  # If service exists
# OR
cd ~/actions-runner && ./run.sh  # Manual start
```
