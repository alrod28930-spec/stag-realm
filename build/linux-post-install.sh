#!/bin/bash

# Post-installation script for StagAlgo on Linux
# Sets up necessary permissions and desktop integration

set -e

echo "Configuring StagAlgo permissions and desktop integration..."

# Add user to audio group for microphone access
if groups $USER | grep -q '\baudio\b'; then
    echo "User already in audio group"
else
    echo "Adding user to audio group for microphone access..."
    sudo usermod -a -G audio $USER
fi

# Set up PulseAudio permissions
if [ -d "/etc/pulse" ]; then
    echo "Configuring PulseAudio permissions..."
    sudo mkdir -p /etc/pulse/system.pa.d/
    echo "load-module module-native-protocol-unix auth-anonymous=1 socket=/tmp/pulse-socket" | sudo tee /etc/pulse/system.pa.d/stagalgo.pa > /dev/null
fi

# Create udev rules for hardware access
echo "Setting up hardware access rules..."
sudo mkdir -p /etc/udev/rules.d/
cat << 'EOF' | sudo tee /etc/udev/rules.d/99-stagalgo.rules > /dev/null
# StagAlgo hardware access rules
SUBSYSTEM=="usb", ATTRS{idVendor}=="*", ATTRS{idProduct}=="*", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="sound", GROUP="audio", MODE="0664"
KERNEL=="controlC[0-9]*", GROUP="audio", MODE="0664"
EOF

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Set executable permissions
chmod +x /opt/StagAlgo/stagalgo

# Create desktop entry
mkdir -p ~/.local/share/applications/
cat << 'EOF' > ~/.local/share/applications/stagalgo.desktop
[Desktop Entry]
Name=StagAlgo
Comment=Professional Trading Platform
Exec=/opt/StagAlgo/stagalgo
Icon=/opt/StagAlgo/resources/icon.png
Terminal=false
Type=Application
Categories=Office;Finance;
Keywords=trading;finance;stocks;crypto;algorithms;
StartupNotify=true
EOF

# Update desktop database
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database ~/.local/share/applications/
fi

# Set up MIME types
mkdir -p ~/.local/share/mime/packages/
cat << 'EOF' > ~/.local/share/mime/packages/stagalgo.xml
<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
  <mime-type type="application/x-stagalgo">
    <comment>StagAlgo Trading File</comment>
    <glob pattern="*.stagalgo"/>
    <icon name="stagalgo"/>
  </mime-type>
</mime-info>
EOF

# Update MIME database
if command -v update-mime-database &> /dev/null; then
    update-mime-database ~/.local/share/mime/
fi

echo "StagAlgo installation completed successfully!"
echo ""
echo "IMPORTANT: You may need to log out and back in for audio group permissions to take effect."
echo "You can now launch StagAlgo from the Applications menu or by running 'stagalgo' in terminal."
echo ""
echo "For voice features to work properly, please ensure:"
echo "1. Your microphone is connected and working"
echo "2. PulseAudio or ALSA is properly configured"
echo "3. You have granted microphone permissions when prompted"

exit 0