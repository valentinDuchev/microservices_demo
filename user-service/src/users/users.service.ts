import { Injectable } from '@nestjs/common';

export interface User {
  id: string;
  name: string;
  email: string;
  skillTier: string;
}

// Hardcoded user store. The user service owns user identity and is the sole
// source of truth for player data. No other service stores or caches this data.
const USERS: User[] = [
  { id: 'player-1', name: 'Alice',   email: 'alice@example.com',   skillTier: 'platinum' },
  { id: 'player-2', name: 'Bob',     email: 'bob@example.com',     skillTier: 'gold'     },
  { id: 'player-3', name: 'Charlie', email: 'charlie@example.com', skillTier: 'silver'   },
  { id: 'player-4', name: 'Diana',   email: 'diana@example.com',   skillTier: 'bronze'   },
];

@Injectable()
export class UsersService {
  findById(userId: string): User | null {
    return USERS.find((user) => user.id === userId) ?? null;
  }

  findAll(): User[] {
    return USERS;
  }
}
