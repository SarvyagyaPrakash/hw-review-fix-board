.PHONY: setup collect clean discover classify experiments evaluate export web-dev web-build test all

PYTHON := .venv/bin/python
PYTEST := .venv/bin/pytest

setup:
	@echo "Setting up Python virtual environment and Node dependencies..."
	python3 -m venv .venv
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -r pipeline/requirements.txt
	npm install

collect:
	@echo "Collecting reviews from Google Play..."
	$(PYTHON) pipeline/collect.py --per-star 1000 --sleep 2.0

clean:
	@echo "Cleaning and anonymising reviews..."
	$(PYTHON) pipeline/clean.py

discover:
	@echo "Discovering and freezing taxonomy..."
	$(PYTHON) pipeline/discover.py

classify:
	@echo "Classifying reviews and verifying evidence substrings..."
	$(PYTHON) pipeline/classify.py

experiments:
	@echo "Generating experiment library..."
	$(PYTHON) pipeline/experiments.py

evaluate:
	@echo "Running pipeline evaluation..."
	$(PYTHON) pipeline/evaluate.py

export:
	@echo "Exporting public datasets and validating schemas..."
	$(PYTHON) pipeline/export.py
	$(PYTHON) scripts/make_memo.py

web-dev:
	@echo "Starting web development server..."
	npm run dev

web-build:
	@echo "Building production web bundle..."
	npm run build

test:
	@echo "Running Python and Vitest test suites..."
	$(PYTEST) tests/
	npm test

all: collect clean discover classify experiments evaluate export test web-build
	@echo "End-to-end pipeline and web build finished successfully."
