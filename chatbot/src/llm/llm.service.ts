import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import * as fs from 'fs';
import * as path from 'path';
import { WarudoService } from './warudo.service';

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly grokClient: OpenAI;
  private conversationHistory: ChatCompletionMessageParam[] = [];

  constructor(
    private configService: ConfigService,
    private warudoService: WarudoService,
  ) {
    const grokApiKey = this.configService.get<string>('GROK_API_KEY');

    if (!grokApiKey) {
      throw new Error('GROK_API_KEY가 환경 변수에 설정되지 않았습니다.');
    }

    this.grokClient = new OpenAI({
      apiKey: grokApiKey,
      baseURL: 'https://api.x.ai/v1',
    });
  }

  async onModuleInit() {
    try {
      const systemInstruction = fs.readFileSync(
        path.join(__dirname, 'system-instructions.md'),
        'utf8',
      );
      this.conversationHistory.push({
        role: 'system',
        content: systemInstruction,
      });
    } catch (error) {
      console.error('Error loading system instructions:', error);
    }
  }

  async chat(userMessage: string) {
    console.log('User message:\n', userMessage); // 사용자 입력 로그

    // 사용자 메시지를 대화 기록에 추가
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    try {
      let responseLLM = await this.getLLMResponse(this.conversationHistory);

      console.log('LLM response:\n', responseLLM); // LLM 응답 로그

      // Warudo에 동작 변화 메시지 전송
      const poseChangeMatch = responseLLM.match(/\[Pose\]:\s*(.*)/);
      console.log('Pose change match:\n', poseChangeMatch);

      if (poseChangeMatch) {
        const poseAction = poseChangeMatch[1];
        const messageWarudo = JSON.stringify({ action: poseAction });
        console.log('Sending message to Warudo:\n', messageWarudo);
        this.warudoService.sendMessageToWarudo(messageWarudo);
      }

      // TTS, POSE 태그 제거
      responseLLM = responseLLM.replace(/\[TTS\]:/g, '').trim();
      responseLLM = responseLLM.replace(/\[Pose\]:\s*.*\n?/g, '').trim();

      // Action과 Item 여부로 과금 판단
      const actionMatch = responseLLM.match(/\[Action\]:\s*(.*)/);
      const itemMatch = responseLLM.match(/\[Item\]:\s*(.*)/);
      const isPaid = !!(actionMatch && itemMatch);

      if (isPaid) {
        // [Action]과 [Item] 항목 제거
        responseLLM = responseLLM.replace(actionMatch[0], '').trim();
        responseLLM = responseLLM.replace(itemMatch[0], '').trim();
      }

      // LLM 응답 메시지를 대화 기록에 추가
      this.conversationHistory.push({
        role: 'assistant',
        content: responseLLM,
      });

      return {
        message: responseLLM,
        isPaid,
      };
    } catch (error) {
      console.error('Error calling Grok API:', error);
      throw error;
    }
  }

  private async getLLMResponse(messages: ChatCompletionMessageParam[]) {
    try {
      const completion = await this.grokClient.chat.completions.create({
        model: 'grok-2-1212',
        messages,
      });

      if (completion?.choices?.[0]?.message?.content) {
        return completion.choices[0].message.content;
      } else {
        throw new Error('Grok API 응답이 유효하지 않습니다.');
      }
    } catch (error) {
      console.error('Error calling Grok API:', error);
      throw error;
    }
  }
}
