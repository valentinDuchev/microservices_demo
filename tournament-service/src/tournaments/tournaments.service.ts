import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientNats, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

// Tracing delay in ms (set TRACE_DELAY to 0 to disable visual tracing)
const TRACE_DELAY = 1500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const trace = async (msg: string) => {
  console.log(`\x1b[33m[TOURNAMENT]\x1b[0m      ${msg}`);
  if (TRACE_DELAY > 0) await sleep(TRACE_DELAY);
};

interface JoinTournamentPayload {
  playerId: string;
  gameType: string;
  tournamentType: string;
  entryFee: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  skillTier: string;
}

@Injectable()
export class TournamentsService implements OnModuleInit {
  constructor(
    @Inject('USER_SERVICE') private readonly natsClient: ClientNats,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    await this.natsClient.connect();
  }

  async joinTournament(payload: JoinTournamentPayload) {
    const { playerId, gameType, tournamentType, entryFee } = payload;

    await trace(`<-- Received from Kafka: tournament.join`);
    await trace(`--> Requesting player via NATS: user.get-by-id { userId: "${playerId}" }`);

    const user = await firstValueFrom<User | null>(
      this.natsClient.send('user.get-by-id', { userId: playerId }),
    );

    if (!user) {
      await trace(`<-- NATS reply: player not found`);
      throw new RpcException({
        statusCode: 404,
        message: `Player with id "${playerId}" was not found`,
      });
    }

    await trace(`<-- NATS reply: ${user.name} (${user.skillTier})`);
    await trace(`--> PostgreSQL: finding open ${gameType}/${tournamentType} tournament...`);

    let tournament = await this.prisma.tournament.findFirst({
      where: { gameType, tournamentType, status: 'OPEN' },
    });

    if (!tournament) {
      tournament = await this.prisma.tournament.create({
        data: { gameType, tournamentType, entryFee, status: 'OPEN' },
      });
      await trace(`<-- PostgreSQL: created new tournament ${tournament.id.slice(0, 8)}...`);
    } else {
      await trace(`<-- PostgreSQL: found existing tournament ${tournament.id.slice(0, 8)}...`);
    }

    const existingEntry = await this.prisma.tournamentPlayer.findUnique({
      where: {
        tournamentId_playerId: {
          tournamentId: tournament.id,
          playerId,
        },
      },
    });

    if (existingEntry) {
      await trace(`<-- PostgreSQL: duplicate entry — ${user.name} already joined`);
      throw new RpcException({
        statusCode: 409,
        message: `Player "${user.name}" has already joined this tournament`,
      });
    }

    await trace(`--> PostgreSQL: creating player entry...`);

    const player = await this.prisma.tournamentPlayer.create({
      data: {
        tournamentId: tournament.id,
        playerId,
        playerName: user.name,
        entryFee,
      },
    });

    await trace(`<-- PostgreSQL: entry created for ${user.name}`);
    await trace(`--> Sending reply via Kafka`);

    return {
      success: true,
      message: `${user.name} successfully joined the tournament`,
      tournament: {
        id: tournament.id,
        gameType: tournament.gameType,
        tournamentType: tournament.tournamentType,
        status: tournament.status,
      },
      entry: {
        id: player.id,
        playerId: player.playerId,
        playerName: player.playerName,
        entryFee: player.entryFee,
        joinedAt: player.joinedAt,
      },
    };
  }

  async getMyTournaments(playerId: string) {
    await trace(`<-- Received from Kafka: tournament.get-my-tournaments`);
    await trace(`--> PostgreSQL: querying tournaments for ${playerId}...`);

    const entries = await this.prisma.tournamentPlayer.findMany({
      where: { playerId },
      include: { tournament: true },
      orderBy: { joinedAt: 'desc' },
    });

    await trace(`<-- PostgreSQL: found ${entries.length} tournament(s)`);
    await trace(`--> Sending reply via Kafka`);

    return entries.map((entry) => ({
      tournamentId: entry.tournamentId,
      gameType: entry.tournament.gameType,
      tournamentType: entry.tournament.tournamentType,
      status: entry.tournament.status,
      entryFee: entry.entryFee,
      joinedAt: entry.joinedAt,
    }));
  }
}
