import { Injectable } from '@nestjs/common';
import { CreateAiDto } from '../dto/create-ai.dto';
import { UpdateAiDto } from '../dto/update-ai.dto';
import { OpenAiConfig } from '../config/openai.config';

@Injectable()
export class AiService {
  constructor(private readonly openAi: OpenAiConfig) {}

  async sendMessage(message: string): Promise<string> {
    const response = await this.openAi.getClient().chat.completions.create({
      model: 'gpt-4o', // o el modelo que uses
      messages: [{ role: 'user', content: message }],
    });

    return response.choices[0]?.message?.content ?? 'No response from OpenAI';
  }


  create(createAiDto: CreateAiDto) {
    return 'This action adds a new ai';
  }

  findAll() {
    return `This action returns all ai`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ai`;
  }

  update(id: number, updateAiDto: UpdateAiDto) {
    return `This action updates a #${id} ai`;
  }

  remove(id: number) {
    return `This action removes a #${id} ai`;
  }
}
