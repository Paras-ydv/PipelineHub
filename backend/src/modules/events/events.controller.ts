import { Controller, Get, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('events')
export class EventsController {
  constructor(private svc: EventsService) {}

  @Get()
  findAll() { return this.svc.findAll(); }
}
