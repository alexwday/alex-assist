#!/bin/bash
# Check pip configuration and PyPI sources
echo "=== Pip Configuration ==="
pip config list

echo -e "\n=== Pip Index URLs ==="
pip config get global.index-url
pip config get global.extra-index-url

echo -e "\n=== Testing PyPI Access ==="
pip index versions html2text 2>/dev/null | head -20
