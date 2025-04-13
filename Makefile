run:
	python3 run.py

LOGS_DIR := $(CURDIR)/logs

clean:
	@if [ -d "$(LOGS_DIR)" ]; then \
		echo "Removing logs directory: $(LOGS_DIR)"; \
		rm -rf "$(LOGS_DIR)"; \
	else \
		echo "No logs directory to clean."; \
	fi


build:
	@echo "Building frontend..."
	cd frontend && npm run build

dev:
	@echo "Starting dev server..."
	cd frontend && npm run dev

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
	. venv/bin/activate && pip3 install --upgrade pip3 && pip3 install -r requirements.txt
	@echo "Setting up frontend dependencies..."
	cd frontend && npm install --no-audit --no-fund
	@echo "Building frontend..."
	cd frontend && npm run build
	@echo "Starting application..."
	. venv/bin/activate && python3 run.py
