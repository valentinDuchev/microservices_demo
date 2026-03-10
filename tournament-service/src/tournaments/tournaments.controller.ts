import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TournamentsService } from './tournaments.service';

interface JoinTournamentPayload {
  playerId: string;
  gameType: string;
  tournamentType: string;
  entryFee: number;
}

interface GetMyTournamentsPayload {
  playerId: string;
}

@Controller()
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  /**
   * Handles the tournament.join command from the gateway over Kafka.
   * The service will fetch the player from the user service via NATS before
   * persisting the tournament entry.
   */
  @MessagePattern('tournament.join')
  joinTournament(@Payload() payload: any) {
    // Payload may arrive as a JSON string (KafkaJS serialization) or parsed object
    const data: JoinTournamentPayload =
      typeof payload === 'string' ? JSON.parse(payload) : (payload?.data ?? payload);
    return this.tournamentsService.joinTournament(data);
  }

  /**
   * Handles the tournament.get-my-tournaments query from the gateway over Kafka.
   * Reads tournament entries for the given player from Postgres.
   */
  @MessagePattern('tournament.get-my-tournaments')
  getMyTournaments(@Payload() payload: any) {
    const data: GetMyTournamentsPayload =
      typeof payload === 'string' ? JSON.parse(payload) : (payload?.data ?? payload);
    return this.tournamentsService.getMyTournaments(data.playerId);
  }
}
