import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { LlmController } from './llm.controller';
import { WarudoService } from './warudo.service';

@Module({
  controllers: [LlmController],
  providers: [LlmService, WarudoService],
  exports: [LlmService],
})
export class LlmModule {}
