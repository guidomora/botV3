import { Injectable } from "@nestjs/common";
import { daysOfWeek, months, timeList } from "src/constants/dates-info/dates-info";
import { TablesInfo } from "src/constants/tables-info/tables-info";
import { DateTime } from "src/lib/datetime/datetime.type";

@Injectable()
export class GenerateDatetime {

    public createDateTime(date?: string): DateTime {
        const day = date ?? this.createOneDay();
        const dateTime: string[][] = [];

        timeList.forEach(schedule => {
            if (schedule === '') {
                dateTime.push(["", schedule]);
            } else dateTime.push([day, schedule]);
        });
        return dateTime;
    }

    public createOneDayWithBookings(date?: string): DateTime {
        const day = date ?? this.createOneDay();
        const dateTime: string[][] = [];

        timeList.forEach(schedule => {
            if (schedule === '') {
                dateTime.push(["", schedule]);
            } else dateTime.push([day, schedule, TablesInfo.BOOKED, TablesInfo.AVAILABLE]);
        });
        return dateTime;
    }

    // fromThisDay is the number of days to add to the current date
    public createOneDay(fromThisDay: number = 0): string {
        const today = new Date()
        today.setDate(today.getDate() + fromThisDay);
        const dayName = daysOfWeek[today.getDay()]
        const dayNumber = String(today.getDate()).padStart(2, '0')
        const monthName = months[today.getMonth()]
        const year = today.getFullYear()
        const dayFormatted = String(today.getDate()).padStart(2, '0');
        const monthFormatted = String(today.getMonth() + 1).padStart(2, '0');

        const ddmmyy = `${dayFormatted}/${monthFormatted}/${year}`;


        const day = `${dayName} ${dayNumber} de ${monthName} ${year} ${ddmmyy}`
        return day
    }

    public createNextDay(date:Date): string {
        date.setDate(date.getDate() + 1);
        const dayName = daysOfWeek[date.getDay()]
        const dayNumber = String(date.getDate()).padStart(2, '0')
        const monthName = months[date.getMonth()]
        const year = date.getFullYear()
        const dayFormatted = String(date.getDate()).padStart(2, '0');
        const monthFormatted = String(date.getMonth() + 1).padStart(2, '0');

        const ddmmyy = `${dayFormatted}/${monthFormatted}/${year}`;


        const day = `${dayName} ${dayNumber} de ${monthName} ${year} ${ddmmyy}`
        return day
    }
}