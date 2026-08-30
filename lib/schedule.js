import moment from "moment-timezone";
import { distributeTimesOnDate } from "./timestamps.js";
import { validateConfig } from "./validate.js";

export function buildPlan(config) {
    const validation = validateConfig(config);
    if (!validation.ok) {
        const err = new Error("Invalid configuration");
        err.validation = validation.errors;
        throw err;
    }

    const timezone = config.timezone || "Asia/Kolkata";
    const mode = config.mode || "scheduled";
    const startHour = config.startHour;
    const endHour = config.endHour;

    const plan = config.schedule.map((entry) => {
        let times;
        if (mode === "random") {
            times = randomDistribute(config, entry, timezone, startHour, endHour);
        } else {
            times = distributeTimesOnDate(timezone, entry.date, entry.commits, startHour, endHour);
        }
        return {
            date: entry.date,
            requested: entry.commits,
            times: times.map((t) => t.format()),
        };
    });

    return { timezone, mode, plan };
}

function randomDistribute(config, entry, timezone, startHour, endHour) {
    let { random } = config;
    if (!random || typeof random !== "object") {
        return distributeTimesOnDate(timezone, entry.date, entry.commits, startHour, endHour);
    }

    const count = entry.commits;
    const dayStartMs =
        (random.dayStartMs !== undefined ? random.dayStartMs : 9 * 3600 * 1000);
    const daySpanMs =
        (random.daySpanMs !== undefined ? random.daySpanMs : 11 * 3600 * 1000);

    const times = [];
    const used = new Set();
    let guard = 0;
    while (times.length < count && guard < count * 2000) {
        guard++;
        const offset = Math.floor(Math.random() * daySpanMs) + dayStartMs;
        const t = moment
            .tz(entry.date, "YYYY-MM-DD", true, timezone)
            .startOf("day")
            .add(offset, "ms");
        if (t.format("YYYY-MM-DD") !== entry.date) continue;
        const key = t.valueOf();
        if (used.has(key)) continue;
        used.add(key);
        times.push(t);
    }
    if (times.length < count) {
        throw new Error(`Could not generate ${count} unique random times for ${entry.date}`);
    }
    times.sort((a, b) => a.valueOf() - b.valueOf());
    return times;
}
