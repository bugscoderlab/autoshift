#!/bin/bash
# Installation script with Python 3.14 compatibility workaround

echo "Installing dependencies..."

# Try to install pydantic with pre-built wheels first
echo "Attempting to install pydantic from pre-built wheels..."
pip install --only-binary :all: "pydantic>=2.10.0" "pydantic-core>=2.10.0" 2>/dev/null

if [ $? -ne 0 ]; then
    echo "Warning: Could not install pydantic from pre-built wheels."
    echo "This usually means Python 3.14 wheels are not available yet."
    echo ""
    echo "Solutions:"
    echo "1. Use Python 3.11, 3.12, or 3.13 instead:"
    echo "   python3.11 -m venv myvenv"
    echo "   source myvenv/bin/activate"
    echo ""
    echo "2. Or try installing from source (may take longer):"
    echo "   pip install --no-binary pydantic-core pydantic"
    exit 1
fi

# Install remaining dependencies
echo "Installing remaining dependencies..."
pip install -r requirements.txt

echo "Installation complete!"

