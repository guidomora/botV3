import { Injectable } from "@nestjs/common";
import { GenerateDatetime } from "../dateTime-build/generate-datetime";

@Injectable()
export class CreateDayUseCase {
    constructor(
        private readonly generateDatetime: GenerateDatetime,
    ) {}

    public createDateTime(date?: string): string[][] {
        const dateTime = this.generateDatetime.createDateTime(date)
        return dateTime
    }

    public createOneDayWithBookings(date?: string): string[][] {
        const dateTime = this.generateDatetime.createOneDayWithBookings(date)
        return dateTime
    }

    public createNextDay(date:Date): string {
        const dateTime = this.generateDatetime.createNextDay(date)
        return dateTime
    }
}