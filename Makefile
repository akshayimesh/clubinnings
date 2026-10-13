.PHONY: install db-up db-down migrate migrate-test dev-api dev-web test

install:
	cd backend && npm install
	cd frontend && npm install

db-up:
	docker compose up -d --wait

db-down:
	docker compose down

migrate:
	cd backend && npm run migrate

migrate-test:
	cd backend && npm run migrate:test

dev-api:
	cd backend && npm run dev

dev-web:
	cd frontend && npm run dev

test: db-up
	cd backend && npm test
	cd frontend && npm run typecheck
