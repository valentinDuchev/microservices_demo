import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JoinTournamentDto } from './dto/join-tournament.dto';

@Injectable()
export class TournamentsService implements OnModuleInit {
  constructor(
    @Inject('TOURNAMENT_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {}

  /**
   * Subscribe to reply topics before the module initialises so that the Kafka
   * client knows which topics to listen on for request-reply messages.
   */
  async onModuleInit() {
    this.kafkaClient.subscribeToResponseOf('tournament.join');
    this.kafkaClient.subscribeToResponseOf('tournament.get-my-tournaments');
    await this.kafkaClient.connect();
  }

  async join(dto: JoinTournamentDto) {
    // JSON.stringify before send — KafkaJS calls .toString() on non-string
    // values, producing "[object Object]" instead of valid JSON.
    return firstValueFrom(
      this.kafkaClient.send('tournament.join', JSON.stringify(dto)),
    );
  }

  async getMyTournaments(playerId: string) {
    return firstValueFrom(
      this.kafkaClient.send(
        'tournament.get-my-tournaments',
        JSON.stringify({ playerId }),
      ),
    );
  }
}
