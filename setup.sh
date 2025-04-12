#!/bin/bash

set -e
set -u
set -o pipefail

command_exists() {
	command -v "$1" >/dev/null 2>&1
}

echo "Checking system dependencies..."

if ! command_exists python3; then
	echo "Error: Python3 is not installed. Please install it and try again."
	exit 1
fi

if ! command_exists node; then
	echo "Error: Node.js is not installed. Please install it and try again."
	exit 1
fi

if ! command_exists npm; then
	echo "Error: npm is not installed. Please install it and try again."
	exit 1
fi

if [ ! -d "venv" ]; then
	echo "Creating Python virtual environment..."
	python3 -m venv venv
fi

echo "Setup completed successfully!"
