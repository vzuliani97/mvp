.PHONY: up down reset test logs

up:
	docker compose up --build

down:
	docker compose down

reset:
	docker compose down -v
	docker compose up --build

test:
	docker compose --profile test run --rm --build backend-test

logs:
	docker compose logs -f backend postgres
