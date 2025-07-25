import { Injectable } from "@nestjs/common";
import { GenerateDatetime } from "../dateTime-build/generate-datetime";

@Injectable()
export class CreateDayUseCase {
    constructor(
        private readonly generateDatetime: GenerateDatetime,
    ) {}

    public createDateTime(): string[][] {
        const dateTime = this.generateDatetime.createDateTime()
        return dateTime
    }

    public createOneDayWithBookings(): string[][] {
        const dateTime = this.generateDatetime.createOneDayWithBookings()
        return dateTime
    }
}