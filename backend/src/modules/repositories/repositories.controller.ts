import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, UseGuards, Request
} from '@nestjs/common';
import { RepositoriesService } from './repositories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IsString, IsOptional, IsBoolean, IsArray, IsEnum } from 'class-validator';
import { RepoLanguage } from '@prisma/client';

export class CreateRepoDto {
  @IsString() name: string;
  @IsString() owner: string;
  @IsString() branch: string;
  @IsEnum(RepoLanguage) language: RepoLanguage;
  @IsOptional() @IsString() githubToken?: string;
  @IsOptional() @IsArray() eventTypes?: string[];
  @IsOptional() @IsString() environment?: string;
  @IsOptional() pipelineConfig?: any;
}

export class UpdateRepoDto {
  @IsOptional() @IsString() branch?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() autoDemo?: boolean;
  @IsOptional() @IsString() githubToken?: string;
  @IsOptional() @IsArray() eventTypes?: string[];
  @IsOptional() pipelineConfig?: any;
}

@UseGuards(JwtAuthGuard)
@Controller('repositories')
export class RepositoriesController {
  constructor(private svc: RepositoriesService) {}

  @Get()
  findAll(@Request() req) {
    return this.svc.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateRepoDto, @Request() req) {
    return this.svc.create(dto, req.user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRepoDto) {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.svc.toggle(id);
  }

  @Patch(':id/demo')
  toggleDemo(@Param('id') id: string) {
    return this.svc.toggleDemo(id);
  }

  @Post(':id/webhook/register')
  registerWebhook(@Param('id') id: string, @Body('webhookUrl') webhookUrl: string) {
    return this.svc.registerWebhook(id, webhookUrl);
  }
}
