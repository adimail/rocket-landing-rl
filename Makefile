run: clean
	python3 run.py

DIRS_TO_CLEAN := $(CURDIR)/logs $(CURDIR)/output

clean:
	@for dir in $(DIRS_TO_CLEAN); do \
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

eval:
	python3 scripts/logeval.py

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
	. venv/bin/activate && pip3 install --upgrade pip3 && pip3 install -r requirements.txt
	@echo "Setting up frontend dependencies..."
	cd frontend && npm install --no-audit --no-fund
	@echo "Building frontend..."
	cd frontend && npm run build
	@echo "Starting application..."
	. venv/bin/activate && python3 run.py
