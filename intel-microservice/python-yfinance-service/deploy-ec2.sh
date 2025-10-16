#!/bin/bash

# AWS EC2 Deployment Script
# xStocksFun Python Intel Service
# Author: Production Deployment Team
# Description: Automated deployment script for EC2 t2.micro instance

set -e

# Application Configuration
APP_NAME="xstocksfun-intel"
APP_DIR="/home/ubuntu/xstocksfun-intel"
DOCKER_IMAGE="xstocksfun-intel:latest"
CONTAINER_NAME="xstocksfun-intel"
PORT=8000

# Color codes for output formatting
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: System Update
log_info "Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# Step 2: Docker Installation
log_info "Verifying Docker installation..."
if ! command -v docker &> /dev/null; then
    log_warn "Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    rm get-docker.sh
    log_info "Docker installed successfully"
else
    log_info "Docker is already installed"
fi

# Step 3: Application Directory Setup
log_info "Creating application directory structure..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Step 4: Environment Configuration
log_info "Configuring environment variables..."
if [ ! -f .env ]; then
    cat > .env << 'EOF'
# Python Intel Service Configuration
ALLOWED_ORIGINS=https://xstocksfun.vercel.app,http://localhost:3000,http://localhost:3007
PYTHONDONTWRITEBYTECODE=1
PYTHONUNBUFFERED=1
EOF
    log_info "Environment file created"
    log_warn "Review and update .env file with production credentials"
else
    log_info "Environment file already exists"
fi

# Step 5: Container Cleanup
log_info "Stopping existing containers..."
sudo docker stop "$CONTAINER_NAME" 2>/dev/null || true
sudo docker rm "$CONTAINER_NAME" 2>/dev/null || true

# Step 6: Docker Image Build
log_info "Building Docker image..."
sudo docker build -f Dockerfile.aws -t "$DOCKER_IMAGE" .

# Step 7: Container Deployment
log_info "Deploying application container..."
sudo docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "$PORT:8000" \
  --env-file .env \
  "$DOCKER_IMAGE"

# Step 8: Health Verification
log_info "Verifying container health..."
sleep 5
if sudo docker ps | grep -q "$CONTAINER_NAME"; then
    log_info "Container is running successfully"
    echo "Recent logs:"
    sudo docker logs --tail 20 "$CONTAINER_NAME"
else
    log_error "Container failed to start"
    sudo docker logs "$CONTAINER_NAME"
    exit 1
fi

# Step 9: Log Rotation Configuration
log_info "Configuring log rotation..."
sudo tee /etc/logrotate.d/docker-containers > /dev/null << 'EOF'
/var/lib/docker/containers/*/*.log {
  rotate 7
  daily
  compress
  size=10M
  missingok
  delaycompress
  copytruncate
}
EOF

# Deployment Summary
echo ""
echo "========================================================"
echo "Deployment completed successfully"
echo "========================================================"
echo ""
echo "Service URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):$PORT"
echo "Health Check: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):$PORT/health"
echo ""
echo "Container Management Commands:"
echo "  View logs:    sudo docker logs -f $CONTAINER_NAME"
echo "  Restart:      sudo docker restart $CONTAINER_NAME"
echo "  Stop:         sudo docker stop $CONTAINER_NAME"
echo "  Rebuild:      sudo docker build -f Dockerfile.aws -t $DOCKER_IMAGE . && sudo docker restart $CONTAINER_NAME"
echo ""
echo "Required Next Steps:"
echo "1. Configure AWS Security Group to allow inbound traffic on port $PORT"
echo "2. Update frontend environment to use EC2 public IP or domain"
echo "3. Optional: Configure custom domain with Route 53 and SSL certificate"
echo ""
