import { Body, Controller, Get, HttpException, HttpStatus, Param, Post } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { JoinTournamentDto } from './dto/join-tournament.dto';

// Tracing delay in ms (set TRACE_DELAY to 0 to disable visual tracing)
const TRACE_DELAY = 1500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const trace = async (msg: string) => {
  console.log(`\x1b[36m[GATEWAY]\x1b[0m          ${msg}`);
  if (TRACE_DELAY > 0) await sleep(TRACE_DELAY);
};

@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post('join')
  async join(@Body() dto: JoinTournamentDto) {
    try {
      await trace(`--> HTTP POST /tournaments/join received`);
      await trace(`    { playerId: "${dto.playerId}", gameType: "${dto.gameType}", entryFee: ${dto.entryFee} }`);
      await trace(`--> Sending to Kafka topic: tournament.join`);
      const result = await this.tournamentsService.join(dto);
      await trace(`<-- Kafka reply received`);
      await trace(`--> HTTP 200 response sent`);
      return result;
    } catch (error) {
      await trace(`<-- ERROR: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to join tournament',
        error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('players/:playerId')
  async getMyTournaments(@Param('playerId') playerId: string) {
    try {
      await trace(`--> HTTP GET /tournaments/players/${playerId} received`);
      await trace(`--> Sending to Kafka topic: tournament.get-my-tournaments`);
      const result = await this.tournamentsService.getMyTournaments(playerId);
      await trace(`<-- Kafka reply received`);
      await trace(`--> HTTP 200 response sent`);
      return result;
    } catch (error) {
      await trace(`<-- ERROR: ${error.message}`);
      throw new HttpException(
        error.message || 'Failed to retrieve tournaments',
        error.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
