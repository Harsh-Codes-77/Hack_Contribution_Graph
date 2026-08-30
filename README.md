# Hack Contribution Graph

A small Node.js tool that creates Git commits **only on the exact dates you choose**, so you have full control over your GitHub contribution graph.

> **Core rule: You decide the dates. The program executes ONLY those dates.**
> It never runs on its own every day, and it never picks random dates.

---

## Why this exists

The original version of this project generated commits **randomly** across the last year:

- Pick a random week (`random.int(0, 54)`) and a random day (`random.int(0, 6)`).
- Turn that into a random date within the past year.
- Repeat a hard-coded 50 times.

That produced a "noisy", uncontrolled contribution graph. This new version lets you point at a schedule and create exactly the commits you want — nothing more.

---

## Requirements

- **Node.js** v18 or newer (tested on v22)
- **Git** (with push access to your remote)
- **npm**

Check your versions:

```bash
node -v
npm -v
```

---

## Installation

```bash
git clone https://github.com/Harsh-Codes-77/Hack_Contribution_Graph.git
cd Hack_Contribution_Graph
npm install
```

---

## Running it on THIS live repo (as the repo owner)

Your cloned repo already points at the live GitHub repo via its `origin` remote. To run the tool on it:

```bash
cd Hack_Contribution_Graph

# 1. Make sure it is the latest, and confirm your remote
git pull origin main
git remote -v        # should show https://github.com/Harsh-Codes-77/Hack_Contribution_Graph

# 2. Install dependencies the first time
npm install

# 3. Edit config.json with your schedule (dates + commit counts)

# 4. Preview what will happen (no changes made)
npm run validate
npm run dry-run

# 5. Actually create the commits and push them to GitHub
npm run run

# 6. Check progress at any time
npm run status
```

Because this repo is its own Git repository, `npm run run` literally rewrites this repo's history on the dates in `config.json`, then pushes those commits to your `origin/main`.

> The commits created by `npm run run` all touch the `data.json` file, so the tool itself lives in history alongside the scheduled commits.

---

## Using it on YOUR OWN repository

You don't have to use this repo as the target. Anyone can reuse the tool on their own GitHub repository. There are two ways:

### Option A — Run inside your own repo (recommended)

Copy the tool's scripts into your own repository, so the scheduled commits modify **your** files and get pushed to **your** repo.

```bash
cd path/to/your-own-repo

# Copy the tool files in
cp /path/to/cloned/Hack_Contribution_Graph/index.js \
   /path/to/cloned/Hack_Contribution_Graph/config.json \
   /path/to/cloned/Hack_Contribution_Graph/package.json \
   /path/to/cloned/Hack_Contribution_Graph/.gitignore \
   .
cp -r /path/to/cloned/Hack_Contribution_Graph/lib .

# (Also copy index.test.js if you want the tests.)

# Install the tool's dependencies
npm install

# Edit config.json
#   - set timezone to YOUR timezone
#   - set the schedule (date + commits per date)

# Verify your remote points at YOUR repo
git remote -v

# Preview, then run
npm run validate
npm run dry-run
npm run run
```

`npm run run` now writes commits into **your** repository and pushes them to **your** remote. The `config.json`/`index.js`/`lib/` files become part of your repo (and, if you commit them first, will already appear on your graph). Keep `state.json` out of git: it is already covered by the `.gitignore` in this repo and is local-only.

### Option B — Do it without copying

If you only want the *mechanism* but prefer not to copy files, you can point the existing clone at a different remote:

```bash
# Inside your Hack_Contribution_Graph clone
git remote set-url origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
```

then edit `config.json` and run `npm run run`. The tool will push scheduled commits to whichever repo `origin` points at. (This replaces the repo's history with your scheduled commits, so only use it on a repo you want to fill with scheduled commits.)

---

## First-time setup checklist for a new/own repo

1. **Choose a target repo** — an empty or scratch repo works best.
2. **Install Node + Git** — see Requirements.
3. **Clone or copy** the tool into that repo (Option A).
4. **Set your timezone** in `config.json`.
5. **Write your schedule** (dates + commit counts).
6. **Confirm the remote** — `git remote -v` must point at the repo you want to fill.
7. **Run `npm run validate` and `npm run dry-run`** first.
8. **Run `npm run run`** to create and push the commits.

---

## How it works

```
config.json        ->  your schedule (the source of truth)
        |
        v
validation          ->  checks dates, counts, duplicates, timezone
        |
        v
schedule parser     ->  turns config into a plan
        |
        v
timestamp generator ->  builds timezone-aware timestamps across the day
        |
        v
execution/state check -> compares the plan with what is already done
        |
        v
commit creation        ->  creates the remaining commits only
        |
        v
verification           ->  confirms every commit belongs to its configured date
        |
        v
push                   ->  pushes to your remote, then records state
```

---

## Configuration

Everything lives in a single file: **`config.json`**.

```json
{
  "timezone": "Asia/Kolkata",
  "mode": "scheduled",

  "schedule": [
    { "date": "2026-08-30", "commits": 3 },
    { "date": "2026-09-02", "commits": 1 },
    { "date": "2026-09-07", "commits": 5 },
    { "date": "2026-09-15", "commits": 2 }
  ]
}
```

### Fields

| Field | Meaning |
|-------|---------|
| `timezone` | IANA timezone (e.g. `"Asia/Kolkata"`). Defaults to `"Asia/Kolkata"`. |
| `mode` | `"scheduled"` (default) or `"random"` (optional). See below. |
| `schedule` | An array of `{ date, commits }` entries. This is the only thing that decides which dates get commits. |

### `schedule` entries

- **`date`** — the calendar day, in `YYYY-MM-DD` format. Only this day gets commits.
- **`commits`** — how many commits to create on that day (a positive integer).

Every date **not** listed in `schedule` gets **zero** commits.

---

## How to specify dates and commit counts

You control dates by editing `config.json`. Some examples:

**One date:**

```json
{
  "timezone": "Asia/Kolkata",
  "mode": "scheduled",
  "schedule": [
    { "date": "2026-08-30", "commits": 3 }
  ]
}
```

**My example schedule (3, 1, 7, 2):**

```json
{
  "timezone": "Asia/Kolkata",
  "mode": "scheduled",

  "schedule": [
    { "date": "2026-08-30", "commits": 3 },
    { "date": "2026-09-02", "commits": 1 },
    { "date": "2026-09-07", "commits": 7 },
    { "date": "2026-09-15", "commits": 2 }
  ]
}
```

Resulting graph:

```
2026-08-30  ->  ███
2026-08-31  ->
2026-09-01  ->
2026-09-02  ->  █
2026-09-03  ->
...
2026-09-07  ->  ███████
...
2026-09-15  ->  ██
```

Every other date gets nothing.

---

## How timezone works

The tool is **timezone-aware**. The `date` you write represents the intended calendar day **in the configured timezone**.

- The default (and recommended value for you) is `"Asia/Kolkata"` (`UTC+05:30`).
- Timestamps are generated with the correct offset baked in (e.g. `2026-08-30T14:30:00+05:30`), so a commit cannot "slip" onto the previous or next day.
- Neither the machine's local timezone nor GitHub's view of the timestamp will change which day a commit lands on.

If you are outside India, change `timezone` to your own IANA zone, e.g. `"America/New_York"` or `"UTC"`.

> Rule: a configured date must never produce a commit on any other calendar day. The tool validates this before it pushes anything.

---

## Commands

### 1. Validate (check your config without doing anything)

```bash
npm run validate
```

Reports whether `config.json` is valid, and lists any problems.

### 2. Dry-run (preview, no Git changes)

```bash
npm run dry-run
```

Shows exactly what would happen:

```
  Hack Contribution Graph — dry run
  ─────────────────────────────────

  2026-08-30 → 3 commits
    09:00
    14:30
    20:00
  2026-09-02 → 1 commit
    09:30
  ...

  Total dates: 4
  Total commits: 11

  No commits were created.
  No changes were pushed.
```

Nothing is created or pushed.

### 3. Execute (create and push the scheduled commits)

```bash
npm run run
```

Creates the remaining commits for each configured date and pushes them to your remote.

### 4. Status (see progress)

```bash
npm run status
```

Shows configured dates, executed dates, remaining commits, totals.

---

## State tracking (prevents duplicates)

A local file **`state.json`** (created automatically) records how many commits have already been executed per date:

```json
{
  "executed": {
    "2026-08-30": 3
  }
}
```

`state.json` is **git-ignored** — it never goes into your commit history, and it is local to your machine.

Running `npm run run` compares your schedule against this state:

```
2026-08-30
  Requested: 3
  Already executed: 3
  Remaining: 0
  Skipping.
```

If you change the commit count:

```
Requested: 5
Already executed: 3
Remaining: 2
```

…only the remaining **2** are created. Previously generated commits are never duplicated.

---

## Changing an existing schedule

Just edit `config.json` and run the commands again:

1. Edit the schedule (add/remove dates, change counts).
2. `npm run dry-run` to preview.
3. `npm run run` to apply.

The tool only creates commits that your schedule asks for and that you haven't already executed.

> Note: if you already pushed a schedule and then **decrease** a count, the tool will never delete commits — it only makes sure it never creates more than the count. State counts are monotonically kept; lowering a number just means fewer remaining commits.

---

## Optional random mode (opt-in)

Randomness is **off by default** and never chooses dates. It is only used if you explicitly set `"mode": "random"` and it only randomizes the **time of day** for commits on your configured dates — it never adds dates.

```json
{
  "timezone": "Asia/Kolkata",
  "mode": "random",
  "schedule": [
    { "date": "2026-09-07", "commits": 5 }
  ]
}
```

In this mode, the 5 commits on `2026-09-07` get random (distinct) times within that day. The date is still exactly what you chose.

---

## Validation rules

The tool enforces these before doing anything:

- **Date format** must be `YYYY-MM-DD`. Rejects `30-08-2026`, `08/30/2026`, `2026/08/30`.
- **Commit count** must be a positive integer. Rejects `0`, `-1`, `1.5`, `"5"`, `null`.
- **Duplicate dates** are rejected (a date may only appear once).
- **Invalid real dates** are rejected (`2026-02-30`, `2026-13-01`, `2026-00-10`).
- **Timezone** must be a valid IANA name.
- **Mode** must be `"scheduled"` or `"random"`.

---

## Running the tests

```bash
npm test
```

Covers single/multiple dates, invalid dates, duplicate dates, zero commits, timezone correctness, scheduled (non-random) behavior, and the state/remaining logic.

---

## Safety warnings

- This tool rewrites Git commit dates. **Use it on a repo you own and don't mind rewriting.**
- Running `npm run run` creates real commits and **pushes** them. Always run `npm run validate` and `npm run dry-run` first to be sure.
- If you rewrite history or force-push, collaborators and any CI may be affected. Don't force-push shared branches.
- `state.json` is local; if you switch machines or clear it, the tool will not know what was already executed and may create commits again. Keep it if you want accurate progress.

---

## Files

| File | Purpose |
|------|---------|
| `config.json` | Your schedule — edit this. |
| `index.js` | The CLI entry point. |
| `lib/validate.js` | Configuration validation. |
| `lib/schedule.js` | Builds the plan from config. |
| `lib/timestamps.js` | Timezone-aware timestamp generation. |
| `lib/state.js` | State read/write. |
| `data.json` | The file that gets committed per scheduled commit. |
| `state.json` | Progress tracking (git-ignored, auto-generated). |
| `.gitignore` | Keeps `node_modules/` and `state.json` out of git. |
| `index.test.js` | Automated tests. |
