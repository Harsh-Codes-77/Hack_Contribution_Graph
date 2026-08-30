import moment from "moment-timezone";

const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 20;

export function isValidTimezone(tz) {
    return moment.tz.zone(tz) !== null;
}

export function defaultTimezone() {
    return "Asia/Kolkata";
}

export function dateInTimezone(tz, dateStr) {
    if (!isValidTimezone(tz)) throw new Error(`Invalid timezone: ${tz}`);
    const m = moment.tz(dateStr, "YYYY-MM-DD", true, tz);
    if (!m.isValid()) throw new Error(`Invalid date: ${dateStr}`);
    return m;
}

export function distributeTimesOnDate(tz, dateStr, count, startHour, endHour) {
    if (!Number.isInteger(count) || count <= 0) {
        throw new Error(`Commit count must be a positive integer, got: ${count}`);
    }

    const dayStart = dateInTimezone(tz, dateStr).startOf("day");
    const dayEnd = dateInTimezone(tz, dateStr).endOf("day");

    const s = clamp(startHour === undefined ? DEFAULT_START_HOUR : startHour, 0, 23);
    const e = clamp(endHour === undefined ? DEFAULT_END_HOUR : endHour, 1, 24);
    let low = s;
    let high = e;
    if (high <= low) high = low + 1;

    const windowStart = dayStart.clone().hour(low);
    const windowEnd = dayStart.clone().hour(high).minute(0).second(0).millisecond(0);
    const spanMs = windowEnd.valueOf() - windowStart.valueOf();

    const times = [];
    if (count === 1) {
        times.push(windowStart.clone().minute(30));
        return times;
    }

    for (let i = 0; i < count; i++) {
        const p = count === 1 ? 0.5 : i / (count - 1);
        const t = windowStart.clone().add(Math.round(spanMs * p), "ms");
        times.push(t);
    }

    for (const t of times) {
        if (t.isBefore(dayStart) || t.isAfter(dayEnd)) {
            throw new Error(`Generated timestamp escapes the configured day ${dateStr}: ${t.format()}`);
        }
        if (t.format("YYYY-MM-DD") !== dateStr) {
            throw new Error(`Timestamp ${t.format()} does not match configured date ${dateStr}`);
        }
    }

    return times;
}

function clamp(n, min, max) {
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
}
