import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const STATE_FILE = path.join(__dirname, "..", "state.json");

export function readState() {
    try {
        const raw = fs.readFileSync(STATE_FILE, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.executed === "object" && !Array.isArray(parsed.executed)) {
            return parsed.executed;
        }
        return {};
    } catch {
        return {};
    }
}

export function writeState(executed) {
    const payload = { executed };
    fs.writeFileSync(STATE_FILE, JSON.stringify(payload, null, 2) + "\n");
}
