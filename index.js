import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import simpleGit from "simple-git";
import moment from "moment-timezone";
import JSON5 from "json5";
import { validateConfig } from "./lib/validate.js";
import { buildPlan } from "./lib/schedule.js";
import { readState, writeState, STATE_FILE } from "./lib/state.js";
import { defaultTimezone } from "./lib/timestamps.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(__dirname, "config.json");
const DATA_FILE = path.join(__dirname, "data.json");

const git = simpleGit();

function loadConfig() {
    let raw;
    try {
        raw = fs.readFileSync(CONFIG_FILE, "utf8");
    } catch {
        console.error(`Missing configuration file: ${CONFIG_FILE}`);
        process.exit(1);
    }
    let config;
    try {
        config = JSON5.parse(raw);
    } catch (e) {
        console.error(`config.json is not valid: ${e.message}`);
        console.error("Note: comments like // and /* */ and trailing commas ARE allowed in config.json.");
        process.exit(1);
    }
    return config;
}

function loadOrCreateState() {
    if (!fs.existsSync(STATE_FILE)) {
        writeState({});
        return {};
    }
    return readState();
}

async function getGitIdentity() {
    try {
        const name = (await git.raw(["config", "user.name"])).trim();
        const email = (await git.raw(["config", "user.email"])).trim();
        if (name && email) return { name, email };
    } catch {
        // fall through to defaults
    }
    return { name: process.env.GIT_AUTHOR_NAME || "Hack Contribution Graph", email: process.env.GIT_AUTHOR_EMAIL || "contributions@local" };
}

function box(title) {
    const line = "─".repeat(Math.max(10, title.length));
    console.log("");
    console.log(`  ${title}`);
    console.log(`  ${line}`);
    console.log("");
}

function fmtTime(iso, tz) {
    return moment.tz(iso, tz).format("HH:mm");
}

function summarizeState(plan, executed) {
    const tz = plan.timezone;
    console.log(`  Timezone: ${tz}`);
    console.log(`  Mode: ${plan.mode}`);
    console.log("");

    const dateKeys = new Set(plan.plan.map((p) => p.date));
    const executedKeys = Object.keys(executed).sort();

    console.log("  Configured dates:");
    for (const item of plan.plan) {
        const done = executed[item.date] || 0;
        console.log(`    ${item.date} → requested ${item.requested}, executed ${done}, remaining ${Math.max(0, item.requested - done)}`);
    }

    console.log("");
    console.log("  Executed dates (from state):");
    const onlyExecuted = executedKeys.filter((d) => !dateKeys.has(d));
    if (onlyExecuted.length === 0 && executedKeys.length === 0) {
        console.log("    (none yet)");
    } else {
        for (const d of executedKeys) {
            const tag = dateKeys.has(d) ? "" : "  (no longer in config)";
            console.log(`    ${d} → ${executed[d]}${tag}`);
        }
    }

    const totalPlanned = plan.plan.reduce((a, p) => a + p.requested, 0);
    const totalDone = executedKeys.reduce((a, d) => a + (executed[d] || 0), 0);
    const totalRemaining = plan.plan.reduce((a, p) => a + Math.max(0, p.requested - (executed[p.date] || 0)), 0);
    console.log("");
    console.log(`  Total planned commits: ${totalPlanned}`);
    console.log(`  Total completed commits: ${totalDone}`);
    console.log(`  Total commits remaining: ${totalRemaining}`);
}

function displayDryRun(plan, executed) {
    const tz = plan.timezone;
    const doneMap = executed;

    let total = 0;
    for (const item of plan.plan) {
        const req = item.requested;
        total += req;
        const done = doneMap[item.date] || 0;
        const remaining = Math.max(0, req - done);
        console.log(`  ${item.date} → ${item.requested} commit${item.requested === 1 ? "" : "s"}`);
        item.times.slice(0, remaining).forEach((t) => {
            console.log(`    ${fmtTime(t, tz)}`);
        });
        if (remaining < req) {
            console.log(`    (already executed ${done} — ${remaining} remaining)`);
        }
    }

    console.log("");
    console.log(`  Total dates: ${plan.plan.length}`);
    console.log(`  Total commits: ${total}`);
    console.log("");
    console.log("  No commits were created.");
    console.log("  No changes were pushed.");
}

function cmdValidate() {
    const config = loadConfig();
    const result = validateConfig(config);
    console.log("Validate config.json");
    console.log("──────────────────");
    console.log("");
    if (result.ok) {
        console.log("  Valid ✔");
        const tz = config.timezone || defaultTimezone();
        console.log(`  timezone : ${tz}`);
        console.log(`  mode     : ${config.mode || "scheduled"}`);
        console.log(`  schedule : ${config.schedule.length} date(s)`);
        return 0;
    }
    console.log("  INVALID");
    for (const err of result.errors) {
        console.log(`    ✖ ${err}`);
    }
    return 1;
}

function cmdStatus() {
    const config = loadConfig();
    const result = validateConfig(config);
    if (!result.ok) {
        console.log("Configuration is invalid — fix config.json first:");
        for (const err of result.errors) console.log(`  ✖ ${err}`);
        return 1;
    }
    const plan = buildPlan(config);
    const executed = loadOrCreateState();
    console.log("Status");
    console.log("──────");
    console.log("");
    summarizeState(plan, executed);
    return 0;
}

async function cmdDryRun() {
    const config = loadConfig();
    const result = validateConfig(config);
    if (!result.ok) {
        console.log("Configuration is invalid — fix config.json first:");
        for (const err of result.errors) console.log(`  ✖ ${err}`);
        return 1;
    }
    const plan = buildPlan(config);
    const executed = loadOrCreateState();
    box("Hack Contribution Graph — dry run");
    displayDryRun(plan, executed);
    return 0;
}

async function cmdRun() {
    const config = loadConfig();
    const result = validateConfig(config);
    if (!result.ok) {
        console.log("Configuration is invalid — aborting (nothing pushed).");
        for (const err of result.errors) console.log(`  ✖ ${err}`);
        return 1;
    }
    const plan = buildPlan(config);
    const executed = loadOrCreateState();

    box("Hack Contribution Graph — execute");
    console.log(`  Timezone : ${plan.timezone}`);
    console.log(`  Mode     : ${plan.mode}`);
    console.log("");

    const pending = [];
    for (const item of plan.plan) {
        const done = executed[item.date] || 0;
        const remaining = Math.max(0, item.requested - done);
        console.log(`  ${item.date}`);
        console.log(`    Requested: ${item.requested}`);
        console.log(`    Already executed: ${done}`);
        console.log(`    Remaining: ${remaining}`);
        if (remaining === 0) {
            console.log("    Skipping.");
            console.log("");
            continue;
        }

        const timesToUse = item.times.slice(0, remaining);
        for (const iso of timesToUse) {
            const t = moment(iso);
            if (t.format("YYYY-MM-DD") !== item.date || t.tz(plan.timezone).format("YYYY-MM-DD") !== item.date) {
                console.error(`  ✖ Validation failed: timestamp ${iso} does not match configured date ${item.date}.`);
                console.error("  STOP. NOT pushing.");
                return 1;
            }
        }
        pending.push({ date: item.date, times: timesToUse });
    }

    if (pending.length === 0) {
        console.log("  No pending commits to create.");
        console.log("  Nothing pushed.");
        return 0;
    }

    const identity = await getGitIdentity();
    const author = `${identity.name} <${identity.email}>`;
    console.log(`  Author identity: ${author} (must match a verified email on your GitHub account for the graph to count it)`);

    console.log(`  Creating ${pending.reduce((a, p) => a + p.times.length, 0)} commit(s)...`);
    const update = { ...executed };

    for (const p of pending) {
        for (const iso of p.times) {
            const t = moment(iso);
            const name = `scheduled commit ${t.format("YYYY-MM-DD HH:mm")}`;
            fs.writeFileSync(DATA_FILE, JSON.stringify({ date: iso }) + "\n");
            await git.add([DATA_FILE]);
            await git
                .env({ ...process.env, GIT_COMMITTER_DATE: iso })
                .commit(name, [], {
                    "--date": iso,
                    "--author": author,
                });
        }
        update[p.date] = (update[p.date] || 0) + p.times.length;
        console.log(`    ${p.date}: +${p.times.length} (total ${update[p.date]})`);
    }

    console.log("");
    console.log("  Pushing to remote...");
    try {
        await git.push();
    } catch (e) {
        console.error("  Push failed. State was NOT updated, so re-running may re-create the commits. Fix the push error and verify before rerunning.");
        throw e;
    }
    writeState(update);
    console.log("  Done.");
    return 0;
}

const mode = process.argv[2] || "run";
let exitCode = 0;

switch (mode) {
    case "validate":
        exitCode = cmdValidate();
        break;
    case "status":
        exitCode = cmdStatus();
        break;
    case "dry-run":
        exitCode = await cmdDryRun();
        break;
    case "run":
        exitCode = await cmdRun();
        break;
    default:
        console.log(`Unknown mode: "${mode}"`);
        console.log("Usage: node index.js <run|dry-run|validate|status>");
        exitCode = 1;
}

process.exit(exitCode);
