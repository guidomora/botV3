import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DatesService } from '../service/dates.service';
import { UpdateDateDto } from '../dto/update-date.dto';

@Controller('dates')
export class DatesController {
  constructor(private readonly datesService: DatesService) {}

  @Post()
  create(): Promise<string> {
    return this.datesService.createDate();
  }

  @Post('/next-date')
  createNextDate(): Promise<string> {
    return this.datesService.createNextDate();
  }

  @Get()
  findAll() {

  }

  @Get(':id')
  findOne(@Param('id') id: string) {

  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDateDto: UpdateDateDto) {

  }

  @Delete(':id')
  remove(@Param('id') id: string) {

  }
}
