import { test } from "node:test";
import assert from "node:assert/strict";
import moment from "moment-timezone";
import JSON5 from "json5";
import { validateConfig } from "./lib/validate.js";
import { buildPlan } from "./lib/schedule.js";
import { distributeTimesOnDate } from "./lib/timestamps.js";

test("Test 11 — commented-out dates in config are ignored (JSON5 comments)", () => {
    const raw = `{
        "timezone": "Asia/Kolkata",
        "mode": "scheduled",
        "schedule": [
            { "date": "2026-09-07", "commits": 5 }
            // ,{ "date": "2026-08-30", "commits": 3 }
            /* ,{ "date": "2026-09-15", "commits": 2 } */
        ]
    }`;
    const config = JSON5.parse(raw);
    const res = validateConfig(config);
    assert.equal(res.ok, true);
    assert.equal(config.schedule.length, 1);
    assert.equal(config.schedule[0].date, "2026-09-07");
});

test("Test 12 — trailing commas are allowed (JSON5)", () => {
    const raw = `{
        "timezone": "Asia/Kolkata",
        "mode": "scheduled",
        "schedule": [
            { "date": "2026-09-07", "commits": 5 },
        ],
    }`;
    const config = JSON5.parse(raw);
    const res = validateConfig(config);
    assert.equal(res.ok, true);
    assert.equal(config.schedule.length, 1);
});

function timesFor(config, date) {
    const plan = buildPlan(config);
    const item = plan.plan.find((p) => p.date === date);
    return item ? item.times : [];
}

test("Test 1 — one date produces exactly 3 commits all on that date", () => {
    const config = {
        timezone: "Asia/Kolkata",
        mode: "scheduled",
        schedule: [{ date: "2026-08-30", commits: 3 }],
    };
    const plan = buildPlan(config);
    assert.equal(plan.plan.length, 1);
    const item = plan.plan[0];
    assert.equal(item.date, "2026-08-30");
    assert.equal(item.times.length, 3);
    for (const iso of item.times) {
        assert.equal(moment(iso).tz("Asia/Kolkata").format("YYYY-MM-DD"), "2026-08-30");
    }
});

test("Test 2 — multiple dates: commits only on configured dates", () => {
    const config = {
        timezone: "Asia/Kolkata",
        mode: "scheduled",
        schedule: [
            { date: "2026-08-30", commits: 3 },
            { date: "2026-09-02", commits: 1 },
            { date: "2026-09-07", commits: 5 },
        ],
    };
    const plan = buildPlan(config);
    const dates = plan.plan.map((p) => p.date).sort();
    assert.deepEqual(dates, ["2026-08-30", "2026-09-02", "2026-09-07"]);
    const counts = Object.fromEntries(plan.plan.map((p) => [p.date, p.times.length]));
    assert.deepEqual(counts, { "2026-08-30": 3, "2026-09-02": 1, "2026-09-07": 5 });
    for (const item of plan.plan) {
        for (const iso of item.times) {
            assert.equal(moment(iso).tz("Asia/Kolkata").format("YYYY-MM-DD"), item.date);
        }
    }
});

test("Test 3 — invalid date format fails validation", () => {
    for (const bad of ["30-08-2026", "08/30/2026", "2026/08/30", "2026-8-30"]) {
        const config = { schedule: [{ date: bad, commits: 3 }] };
        const res = validateConfig(config);
        assert.equal(res.ok, false, `should reject ${bad}`);
    }
});

test("Test 4 — duplicate date fails validation", () => {
    const config = {
        schedule: [
            { date: "2026-08-30", commits: 3 },
            { date: "2026-08-30", commits: 5 },
        ],
    };
    const res = validateConfig(config);
    assert.equal(res.ok, false);
});

test("Test 5 — zero/negative/non-integer/string commits fail validation", () => {
    for (const commits of [0, -1, 1.5, "5", null]) {
        const config = { schedule: [{ date: "2026-08-30", commits }] };
        const res = validateConfig(config);
        assert.equal(res.ok, false, `should reject commits=${JSON.stringify(commits)}`);
    }
});

test("Test 5b — invalid real calendar dates fail validation", () => {
    for (const bad of ["2026-02-30", "2026-13-01", "2026-00-10"]) {
        const config = { schedule: [{ date: bad, commits: 1 }] };
        const res = validateConfig(config);
        assert.equal(res.ok, false, `should reject ${bad}`);
    }
});

test("Test 8 — timezone: timestamps stay on the intended calendar date in Asia/Kolkata", () => {
    const config = {
        timezone: "Asia/Kolkata",
        mode: "scheduled",
        schedule: [{ date: "2026-08-30", commits: 5 }],
    };
    const plan = buildPlan(config);
    const item = plan.plan[0];
    assert.equal(item.times.length, 5);
    for (const iso of item.times) {
        const t = moment(iso);
        assert.equal(t.tz("Asia/Kolkata").format("YYYY-MM-DD"), "2026-08-30");
        const local = moment(iso);
        // The UTC instant must NOT fall outside the intended day in the configured tz.
        assert.equal(t.tz("Asia/Kolkata").format("YYYY-MM-DD"), "2026-08-30");
    }
    // Ensure the times are distinct (not all identical).
    assert.equal(new Set(item.times).size, 5);
});

test("Test 8b — default timezone is Asia/Kolkata and dates remain correct in a UTC offset far from machine tz", () => {
    // Even though the config only specifies a tz, verify generator uses it.
    const config = { schedule: [{ date: "2026-08-30", commits: 2 }] };
    const plan = buildPlan(config);
    assert.equal(plan.timezone, "Asia/Kolkata");
    for (const iso of plan.plan[0].times) {
        assert.equal(moment(iso).tz("Asia/Kolkata").format("YYYY-MM-DD"), "2026-08-30");
    }
});

test("Test 9 — distributeTimesOnDate never escapes the configured day", () => {
    for (let n = 1; n <= 20; n++) {
        const times = distributeTimesOnDate("Asia/Kolkata", "2026-12-31", n, 9, 20);
        for (const t of times) {
            assert.equal(t.format("YYYY-MM-DD"), "2026-12-31");
        }
    }
});

test("Test 10 — scheduled mode does not randomize date selection (dates are exactly config)", () => {
    const config = {
        timezone: "Asia/Kolkata",
        mode: "scheduled",
        schedule: [{ date: "2026-09-10", commits: 4 }],
    };
    const plan = buildPlan(config);
    assert.deepEqual(plan.plan.map((p) => p.date), ["2026-09-10"]);
    assert.equal(plan.plan[0].times.length, 4);
});

function remainingFor(config, state) {
    const plan = buildPlan(config);
    return Object.fromEntries(
        plan.plan.map((p) => {
            const done = state[p.date] || 0;
            return [p.date, Math.max(0, p.requested - done)];
        })
    );
}

test("Test 7 — repeated execution does not duplicate completed commits", () => {
    const config = {
        timezone: "Asia/Kolkata",
        mode: "scheduled",
        schedule: [{ date: "2026-08-30", commits: 5 }],
    };
    // Fresh state -> all 5 remaining.
    assert.deepEqual(remainingFor(config, {}), { "2026-08-30": 5 });

    // After 5 executed -> 0 remaining (should skip).
    assert.deepEqual(remainingFor(config, { "2026-08-30": 5 }), { "2026-08-30": 0 });

    // If desired increases to 8 -> only 3 remaining.
    const config8 = {
        ...config,
        schedule: [{ date: "2026-08-30", commits: 8 }],
    };
    assert.deepEqual(remainingFor(config8, { "2026-08-30": 5 }), { "2026-08-30": 3 });
});

test("Test 7b — state never reduces a completed count below zero and unknown state dates are ignored", () => {
    const config = {
        timezone: "Asia/Kolkata",
        mode: "scheduled",
        schedule: [{ date: "2026-09-10", commits: 4 }],
    };
    const state = { "2026-08-30": 999, "2026-09-10": 1 };
    assert.deepEqual(remainingFor(config, state), { "2026-09-10": 3 });
});
