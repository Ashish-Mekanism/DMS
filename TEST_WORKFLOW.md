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
- [ ] Workflow triggered
- [ ] Dependencies installed
- [ ] PM2 deployment successful
- [ ] Application running
