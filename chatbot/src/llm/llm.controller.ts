import { Controller, Post, Body } from '@nestjs/common';
import { LlmService } from './llm.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

@Controller('chat')
export class LlmController {
  constructor(private readonly llmService: LlmService) {}

  @Post()
  async chat(@Body() chatRequestDto: ChatRequestDto): Promise<ChatResponseDto> {
    return await this.llmService.chat(chatRequestDto.message);
  }
}
