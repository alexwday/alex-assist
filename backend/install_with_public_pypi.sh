#!/bin/bash
# Try installing with public PyPI as fallback for missing packages
# This adds the public PyPI as an extra index URL

pip install -r requirements.txt \
  --extra-index-url https://pypi.org/simple
