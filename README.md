# Skill Tournaments - Microservices

Microservices system for managing skill-based tournaments. Built with NestJS, Kafka, NATS, PostgreSQL and Prisma.

## What it does

- Players can join tournaments by game type (fps, rts, moba etc)
- If there's already an open tournament for that game type, the player joins it. Otherwise a new one is created
- Players can't join the same tournament twice
- Player data lives in a separate user service and is fetched via NATS on every request (no caching)
- All communication between gateway and tournament service goes through Kafka (request-reply pattern)
- Tournament data is stored in PostgreSQL via Prisma

## Architecture

```
Client (curl)
    |
    | HTTP (port 3000)
    v
 Gateway (NestJS)
    |
    | Kafka
    v
 Tournament Service (NestJS)
    |           |
    | NATS      | Prisma
    v           v
 User Service  PostgreSQL
```

3 services, no direct HTTP calls between them. Gateway talks to tournament service through Kafka. Tournament service talks to user service through NATS.

## How to run

You need Docker Desktop installed. Thats it - everything else runs inside containers.

```bash
docker compose up --build
```

First time takes a few minutes (pulling images, installing deps). Wait until you see these two lines:

```
Gateway is running on port 3000
Tournament service is listening on Kafka
```

Then you're good to go.

## Visual tracing (1.5s delay between steps)

The app has built-in visual tracing - each step in the request flow is logged with a 1.5 second delay so you can watch the request travel through all the services in real time.

**Watch the logs in the terminal where docker compose is running.** When you send a curl request from another terminal, you'll see color-coded output like:

```
[GATEWAY]          --> HTTP POST /tournaments/join received
[GATEWAY]          --> Sending to Kafka topic: tournament.join
[TOURNAMENT]       <-- Received from Kafka: tournament.join
[TOURNAMENT]       --> Requesting player via NATS: user.get-by-id
[USER SERVICE]     <-- NATS request: user.get-by-id { userId: "player-1" }
[USER SERVICE]         Found: Alice (platinum)
[USER SERVICE]     --> NATS reply sent
[TOURNAMENT]       <-- NATS reply: Alice (platinum)
[TOURNAMENT]       --> PostgreSQL: finding open fps/ranked tournament...
[TOURNAMENT]       <-- PostgreSQL: created new tournament a1b2c3d4...
[TOURNAMENT]       --> PostgreSQL: creating player entry...
[TOURNAMENT]       <-- PostgreSQL: entry created for Alice
[TOURNAMENT]       --> Sending reply via Kafka
[GATEWAY]          <-- Kafka reply received
[GATEWAY]          --> HTTP 200 response sent
```

Each line appears ~1.5s after the previous one so you can follow the full flow: HTTP -> Kafka -> NATS -> PostgreSQL and back.

## Testing

Open a separate terminal tab and run these curls. The responses show up in this terminal, the trace logs show up in the docker compose terminal.

**Join a tournament:**
```bash
curl -s -X POST http://localhost:3000/tournaments/join \
  -H "Content-Type: application/json" \
  -d '{"playerId":"player-1","gameType":"fps","tournamentType":"ranked","entryFee":10}' | jq
```

**Another player joins the same tournament:**
```bash
curl -s -X POST http://localhost:3000/tournaments/join \
  -H "Content-Type: application/json" \
  -d '{"playerId":"player-2","gameType":"fps","tournamentType":"ranked","entryFee":10}' | jq
```

**Duplicate join (should fail with 409):**
```bash
curl -s -X POST http://localhost:3000/tournaments/join \
  -H "Content-Type: application/json" \
  -d '{"playerId":"player-1","gameType":"fps","tournamentType":"ranked","entryFee":10}' | jq
```

**Unknown player (should fail with 404):**
```bash
curl -s -X POST http://localhost:3000/tournaments/join \
  -H "Content-Type: application/json" \
  -d '{"playerId":"player-999","gameType":"fps","tournamentType":"ranked","entryFee":10}' | jq
```

**Missing fields (should fail with 400, never hits Kafka):**
```bash
curl -s -X POST http://localhost:3000/tournaments/join \
  -H "Content-Type: application/json" \
  -d '{"playerId":"player-1","gameType":"fps"}' | jq
```

**Get all tournaments for a player:**
```bash
curl -s http://localhost:3000/tournaments/players/player-1 | jq
```

## Available players

Hardcoded in user service:

| ID | Name | Tier |
|----|------|------|
| player-1 | Alice | platinum |
| player-2 | Bob | gold |
| player-3 | Charlie | silver |
| player-4 | Diana | bronze |

## Cleanup

```bash
docker compose down        # stop everything
docker compose down -v     # stop + wipe database
```
