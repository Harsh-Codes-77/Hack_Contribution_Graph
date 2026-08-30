import { isValidTimezone } from "./timestamps.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateConfig(config) {
    const errors = [];

    if (config === null || typeof config !== "object" || Array.isArray(config)) {
        return { ok: false, errors: ["config must be a JSON object"] };
    }

    if (config.timezone !== undefined) {
        if (typeof config.timezone !== "string" || config.timezone.trim() === "") {
            errors.push("timezone must be a non-empty string");
        } else if (!isValidTimezone(config.timezone)) {
            errors.push(`Unknown timezone: "${config.timezone}". Use a valid IANA name like "Asia/Kolkata".`);
        }
    }

    if (config.mode !== undefined) {
        if (config.mode !== "scheduled" && config.mode !== "random") {
            errors.push(`mode must be "scheduled" or "random", got: "${config.mode}"`);
        }
    }

    const schedule = config.schedule;
    if (schedule === undefined) {
        errors.push("schedule is required and must be an array");
        return { ok: errors.length === 0, errors };
    }
    if (!Array.isArray(schedule)) {
        errors.push("schedule must be an array");
        return { ok: errors.length === 0, errors };
    }

    const seen = new Set();
    schedule.forEach((entry, i) => {
        const label = `schedule[${i}]`;
        if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
            errors.push(`${label} must be an object with "date" and "commits"`);
            return;
        }

        const date = entry.date;
        if (typeof date !== "string" || !DATE_RE.test(date)) {
            errors.push(`${label}.date must be a string in YYYY-MM-DD format, got: ${JSON.stringify(date)}`);
            return;
        }

        if (!isRealCalendarDate(date)) {
            errors.push(`${label}.date "${date}" is not a real calendar date`);
            return;
        }

        if (seen.has(date)) {
            errors.push(`duplicate date "${date}" in schedule (${label}); each date may appear only once`);
        }
        seen.add(date);

        const commits = entry.commits;
        if (typeof commits === "string") {
            errors.push(`${label}.commits must be a number, got a string: "${commits}"`);
            return;
        }
        if (!Number.isInteger(commits)) {
            errors.push(`${label}.commits must be a positive integer, got: ${JSON.stringify(commits)}`);
            return;
        }
        if (commits <= 0) {
            errors.push(`${label}.commits must be greater than 0, got: ${commits}`);
        }
    });

    return { ok: errors.length === 0, errors };
}

export function isRealCalendarDate(dateStr) {
    if (!DATE_RE.test(dateStr)) return false;
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return (
        dt.getUTCFullYear() === y &&
        dt.getUTCMonth() === m - 1 &&
        dt.getUTCDate() === d
    );
}
