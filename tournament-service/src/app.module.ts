import { Module } from '@nestjs/common';
import { TournamentsModule } from './tournaments/tournaments.module';

@Module({
  imports: [TournamentsModule],
})
export class AppModule {}
