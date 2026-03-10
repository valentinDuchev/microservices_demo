import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UsersService } from './users.service';

// Tracing delay in ms (set TRACE_DELAY to 0 to disable visual tracing)
const TRACE_DELAY = 1500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const trace = async (msg: string) => {
  console.log(`\x1b[32m[USER SERVICE]\x1b[0m    ${msg}`);
  if (TRACE_DELAY > 0) await sleep(TRACE_DELAY);
};

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern('user.get-by-id')
  async getById(@Payload() data: { userId: string }) {
    await trace(`<-- NATS request: user.get-by-id { userId: "${data.userId}" }`);
    const user = this.usersService.findById(data.userId);
    if (user) {
      await trace(`    Found: ${user.name} (${user.skillTier})`);
    } else {
      await trace(`    Not found: ${data.userId}`);
    }
    await trace(`--> NATS reply sent`);
    return user;
  }

  @MessagePattern('user.get-all')
  async getAll() {
    await trace(`<-- NATS request: user.get-all`);
    const users = this.usersService.findAll();
    await trace(`--> NATS reply: ${users.length} users`);
    return users;
  }
}
