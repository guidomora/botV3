import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AiService } from '../service/ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // @Post()
  // interactWithAi(@Body('message') message: string) {
  //   return this.aiService.interactWithAi(message);
  // }
  // @Post()
  // create(@Body() createAiDto: CreateAiDto) {
  //   return this.aiService.create(createAiDto);
  // }

  // @Get()
  // findAll() {
  //   return this.aiService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.aiService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateAiDto: UpdateAiDto) {
  //   return this.aiService.update(+id, updateAiDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.aiService.remove(+id);
  // }
}
