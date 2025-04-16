run: clean
	. venv/bin/activate && python3 run.py

OUTPUT_DIR := $(CURDIR)/output
LOGS_DIR := $(CURDIR)/logs

clean-output:
	@if [ -d "$(OUTPUT_DIR)" ]; then \
		echo "Removing directory: $(OUTPUT_DIR)"; \
		rm -rf "$(OUTPUT_DIR)"; \
	else \
		echo "No directory to clean at: $(OUTPUT_DIR)"; \
	fi

clean:
	@for dir in $(LOGS_DIR) $(OUTPUT_DIR); do \
		if [ -d "$$dir" ]; then \
			echo "Removing directory: $$dir"; \
			rm -rf "$$dir"; \
		else \
			echo "No directory to clean at: $$dir"; \
		fi \
	done

build:
	@echo "Building frontend..."
	cd frontend && npm run build

dev:
	@echo "Starting dev server..."
	cd frontend && npm run dev

eval: clean-output
	. venv/bin/activate && python3 scripts/logeval.py

test:
	. venv/bin/activate && pytest

install:
	@echo "Setting up Python virtual environment..."
	./setup.sh
	@echo "Activating virtual environment and installing dependencies..."
	. venv/bin/activate && pip3 install -r requirements.txt
	@echo "Setting up frontend dependencies..."
	cd frontend && npm install --no-audit --no-fund

start:
	@echo "Setting up Python virtual environment..."
	./setup.sh
	@echo "Activating virtual environment and installing dependencies..."
	. venv/bin/activate && pip3 install --upgrade pip && pip3 install -r requirements.txt
	@echo "Setting up frontend dependencies..."
	cd frontend && npm install --no-audit --no-fund
	@echo "Building frontend..."
	cd frontend && npm run build
	@echo "Starting application..."
	. venv/bin/activate && python3 run.py
