import { IsString, IsNumber, IsPositive, IsNotEmpty } from 'class-validator';

export class JoinTournamentDto {
  @IsString()
  @IsNotEmpty()
  playerId: string;

  @IsString()
  @IsNotEmpty()
  gameType: string;

  @IsString()
  @IsNotEmpty()
  tournamentType: string;

  @IsNumber()
  @IsPositive()
  entryFee: number;
}
