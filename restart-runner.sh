#!/bin/bash

# GitHub Actions Runner Restart Script
# Run this script on your server (ubuntu@ip-172-31-15-232)

echo "🔍 Checking for GitHub Actions Runner..."

# Check if runner is already running
if pgrep -f "Runner.Listener" > /dev/null; then
    echo "✅ Runner is already running!"
    ps aux | grep Runner.Listener | grep -v grep
    exit 0
fi

echo "⚠️  Runner is not running. Attempting to start..."

# Try to start as a service first
if sudo systemctl list-units | grep -q "actions.runner"; then
    echo "🔄 Found systemd service, restarting..."
    sudo systemctl restart actions.runner.*
    sudo systemctl enable actions.runner.*
    sleep 5
    
    if pgrep -f "Runner.Listener" > /dev/null; then
        echo "✅ Runner restarted successfully via systemd!"
        exit 0
    fi
fi

# Try to find runner directory and start manually
RUNNER_DIR=""
for dir in "/home/ubuntu/actions-runner" "/opt/actions-runner" "/home/*/actions-runner"; do
    if [ -d "$dir" ] && [ -f "$dir/run.sh" ]; then
        RUNNER_DIR="$dir"
        break
    fi
done

if [ -n "$RUNNER_DIR" ]; then
    echo "📁 Found runner directory: $RUNNER_DIR"
    cd "$RUNNER_DIR"
    
    # Try to start as a service
    if [ -f "./svc.sh" ]; then
        echo "🔄 Starting runner as a service..."
        sudo ./svc.sh start
        sleep 5
        
        if pgrep -f "Runner.Listener" > /dev/null; then
            echo "✅ Runner started successfully as a service!"
            exit 0
        fi
    fi
    
    # Start manually
    echo "🔄 Starting runner manually..."
    nohup ./run.sh > runner.log 2>&1 &
    sleep 5
    
    if pgrep -f "Runner.Listener" > /dev/null; then
        echo "✅ Runner started successfully!"
        echo "📋 Runner process:"
        ps aux | grep Runner.Listener | grep -v grep
    else
        echo "❌ Failed to start runner. Check the logs:"
        echo "   - Check $RUNNER_DIR/runner.log"
        echo "   - Check $RUNNER_DIR/_diag/ directory for diagnostic logs"
    fi
else
    echo "❌ Could not find GitHub Actions runner directory!"
    echo "   Please ensure the runner is properly installed."
fi
