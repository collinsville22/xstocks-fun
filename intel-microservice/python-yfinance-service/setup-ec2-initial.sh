#!/bin/bash

# Initial EC2 Instance Setup Script
# xStocksFun Python Intel Service
# Run this script once when first accessing the EC2 instance

set -e

readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo "========================================================"
echo "Initial EC2 Instance Setup"
echo "xStocksFun Python Intel Service"
echo "========================================================"
echo ""

# System Update
log_info "Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# Essential Tools Installation
log_info "Installing essential tools..."
sudo apt-get install -y -qq \
    git \
    curl \
    wget \
    vim \
    htop \
    unzip

# Docker Installation
log_info "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
rm get-docker.sh

# Docker Compose Installation
log_info "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Application Directory Setup
log_info "Setting up application directory..."
mkdir -p /home/ubuntu/xstocksfun-intel
cd /home/ubuntu/xstocksfun-intel

echo ""
echo "========================================================"
echo "Initial setup completed successfully"
echo "========================================================"
echo ""
echo "Next Steps:"
echo "1. Transfer application files to this directory"
echo "2. Create and configure .env file with production credentials"
echo "3. Execute deploy-ec2.sh to start the application"
echo ""
echo "File Transfer Command (from local machine):"
echo "  scp -i your-key.pem -r ./intel-microservice/python-yfinance-service/* ubuntu@YOUR_EC2_IP:/home/ubuntu/xstocksfun-intel/"
echo ""
