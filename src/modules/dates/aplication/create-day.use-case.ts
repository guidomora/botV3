import { Injectable } from "@nestjs/common";
import { GenerateDatetime } from "../dateTime-build/generate-datetime";
import { DateTime } from "src/lib/datetime/datetime.type";

@Injectable()
export class CreateDayUseCase {
    constructor(
        private readonly generateDatetime: GenerateDatetime,
    ) {}

    public createDateTime(date?: string): DateTime {
        const dateTime = this.generateDatetime.createDateTime(date)
        return dateTime
    }

    public createOneDayWithBookings(date?: string): DateTime {
        const dateTime = this.generateDatetime.createOneDayWithBookings(date)
        return dateTime
    }

    public createNextDay(date:Date): string {
        const dateTime = this.generateDatetime.createNextDay(date)
        return dateTime
    }
}