import { Controller, Post, Get, Body, Query, Inject } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'

@Controller('fitness')
export class FitnessController {
  constructor(
    @Inject('FITNESS_SERVICE') private readonly fitnessClient: ClientProxy,
  ) {}

  @Post()
  async upsertFitness(
    @Body('userId') userId: string,
    @Body('updates') updates: any,
  ) {
    return firstValueFrom(
      this.fitnessClient.send({ cmd: 'upsertFitness' }, { userId, updates }),
    )
  }

  @Get()
  async getFitness(@Query('userId') userId: string) {
    return firstValueFrom(
      this.fitnessClient.send({ cmd: 'getAllFitness' }, userId),
    )
  }
}
