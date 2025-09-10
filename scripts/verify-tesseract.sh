#!/bin/bash

# Tesseract OCR Verification Script
# Checks if Tesseract is properly installed and working

echo "🔍 Checking Tesseract OCR installation..."
echo ""

# Check if tesseract command exists
if ! command -v tesseract >/dev/null 2>&1; then
    echo "❌ Tesseract OCR is not installed or not in PATH"
    echo ""
    echo "📦 Installation instructions:"
    echo ""
    echo "Ubuntu/Debian:"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install -y tesseract-ocr tesseract-ocr-eng"
    echo ""
    echo "CentOS/RHEL:"
    echo "  sudo yum install -y tesseract"
    echo ""
    echo "Fedora:"
    echo "  sudo dnf install -y tesseract"
    echo ""
    echo "Arch Linux:"
    echo "  sudo pacman -S --noconfirm tesseract tesseract-data-eng"
    echo ""
    echo "macOS (Homebrew):"
    echo "  brew install tesseract tesseract-lang"
    echo ""
    echo "Windows:"
    echo "  Download from: https://github.com/UB-Mannheim/tesseract/wiki"
    echo "  Add to PATH: C:\\Program Files\\Tesseract-OCR"
    echo ""
    exit 1
fi

echo "✅ Tesseract OCR is installed"

# Check version
echo ""
echo "📋 Tesseract version:"
tesseract --version

# Check available languages
echo ""
echo "🌍 Available languages:"
tesseract --list-langs 2>/dev/null || echo "  Could not list languages (this is normal if no language packs are installed)"

# Test basic functionality
echo ""
echo "🧪 Testing basic functionality..."

# Create a simple test image (if ImageMagick is available)
if command -v convert >/dev/null 2>&1; then
    echo "Creating test image..."
    echo "TEST TEXT" | convert -background white -fill black -pointsize 24 -gravity center label:@- /tmp/test.png 2>/dev/null
    if [ -f "/tmp/test.png" ]; then
        echo "Running OCR on test image..."
        tesseract /tmp/test.png /tmp/test_output -l eng --dpi 300 quiet 2>/dev/null
        if [ -f "/tmp/test_output.txt" ]; then
            result=$(cat /tmp/test_output.txt)
            if [[ "$result" == *"TEST"* ]]; then
                echo "✅ OCR test passed!"
            else
                echo "⚠️  OCR test completed but results may vary"
            fi
            rm -f /tmp/test.png /tmp/test_output.txt
        else
            echo "⚠️  Could not run OCR test (missing test image or language data)"
        fi
    else
        echo "⚠️  Could not create test image (ImageMagick not available)"
    fi
else
    echo "⚠️  Skipping OCR test (ImageMagick not available for test image creation)"
fi

echo ""
echo "🎉 Tesseract OCR verification complete!"
echo ""
echo "💡 Tips:"
echo "  - For better OCR accuracy, install additional language packs"
echo "  - Use high-resolution images (300+ DPI) for best results"
echo "  - The setup scripts will install Tesseract automatically on supported systems"