#!/bin/bash
set -euo pipefail

# CONFIGURATION — fill in before running
SSH_PUBLIC_KEY=""

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root." >&2
  exit 1
fi

if [[ -z "$SSH_PUBLIC_KEY" ]]; then
  echo "SSH_PUBLIC_KEY must be set before running this script." >&2
  exit 1
fi

apt update && apt upgrade -y
apt install -y curl wget git ufw fail2ban unattended-upgrades build-essential

ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8000/tcp
ufw --force enable

cat > /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled = true
bantime = 1h
findtime = 10m
maxretry = 5
EOF
systemctl restart fail2ban

echo 'APT::Periodic::Update-Package-Lists "1";' > /etc/apt/apt.conf.d/20auto-upgrades
echo 'APT::Periodic::Unattended-Upgrade "1";' >> /etc/apt/apt.conf.d/20auto-upgrades

mkdir -p /root/.ssh
echo "$SSH_PUBLIC_KEY" >> /root/.ssh/authorized_keys
chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys

sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
