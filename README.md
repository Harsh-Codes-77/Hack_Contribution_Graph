# Hack Contribution Graph

A Node.js tool that creates Git commits **only on the exact dates you choose**, so you have full control over your GitHub contribution graph.

> **Core rule: You decide the dates. The program executes ONLY those dates.**
> It never runs on its own every day, and it never picks random dates.

---

## Quick Start (use it in 5 minutes)

### 1. Clone this repo

```bash
git clone https://github.com/Harsh-Codes-77/Hack_Contribution_Graph.git
cd Hack_Contribution_Graph
```

### 2. Install dependencies

```bash
npm install
```

### 3. Edit `config.json` with your schedule

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

### 4. Preview what will happen

```bash
npm run dry-run
```

### 5. Run it

```bash
npm run run
```

Done. The commits are created and pushed to your GitHub.

---

## How to Use on YOUR OWN Repository

You don't have to use this repo as the target. Anyone can reuse it on their own GitHub repo. Here's exactly how.

### Step 1: Create your own repo on GitHub

Go to [github.com/new](https://github.com/new) and create a new repository (empty or with a README).

### Step 2: Clone this tool

```bash
git clone https://github.com/Harsh-Codes-77/Hack_Contribution_Graph.git
cd Hack_Contribution_Graph
npm install
```

### Step 3: Point it at your repo

```bash
git remote set-url origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
```

Replace `YOUR-USERNAME` and `YOUR-REPO` with your actual GitHub username and repository name.

Verify:

```bash
git remote -v
# Should show: https://github.com/YOUR-USERNAME/YOUR-REPO.git
```

### Step 4: Make sure your Git identity is set

The tool uses your Git author name and email for the scheduled commits. GitHub only counts commits on your contribution graph if the author email matches a verified email on your account.

```bash
git config user.name "Your Name"
git config user.email "your-email@gmail.com"
```

Verify:

```bash
git config user.name
git config user.email
```

### Step 5: Edit `config.json`

Set your timezone and the dates you want commits on:

```json
{
  "timezone": "Asia/Kolkata",
  "mode": "scheduled",

  "schedule": [
    { "date": "2026-09-01", "commits": 2 },
    { "date": "2026-09-05", "commits": 4 },
    { "date": "2026-09-10", "commits": 1 }
  ]
}
```

### Step 6: Preview and run

```bash
npm run validate    # check config for errors
npm run dry-run     # preview what will happen
npm run run         # create commits and push
```

That's it. The commits will appear on your GitHub contribution graph on the dates you specified.

---

## Using on a Fresh/Empty Repo (Recommended)

For best results, use an empty or scratch repo. The tool creates commits by modifying `data.json`, so an empty repo avoids conflicts with existing files.

```bash
# Create an empty repo on GitHub, then:
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO

# Copy the tool files from this repo
cp /path/to/Hack_Contribution_Graph/index.js .
cp /path/to/Hack_Contribution_Graph/config.json .
cp /path/to/Hack_Contribution_Graph/package.json .
cp /path/to/Hack_Contribution_Graph/.gitignore .
cp -r /path/to/Hack_Contribution_Graph/lib .

# Install dependencies
npm install

# Configure your schedule
# Edit config.json with your dates

# Run
npm run validate
npm run dry-run
npm run run
```

---

## Configuration Reference

Everything lives in one file: **`config.json`**.

```json
{
  "timezone": "Asia/Kolkata",
  "mode": "scheduled",

  "schedule": [
    { "date": "2026-08-30", "commits": 3 },
    { "date": "2026-09-02", "commits": 1 }
  ]
}
```

### Fields

| Field | What it does |
|-------|-------------|
| `timezone` | Your IANA timezone (e.g. `"Asia/Kolkata"`, `"America/New_York"`, `"UTC"`). Defaults to `"Asia/Kolkata"`. |
| `mode` | `"scheduled"` (default) or `"random"` (opt-in). See below. |
| `schedule` | Array of `{ date, commits }` entries. Only these dates get commits. |

### `schedule` entries

- **`date`** — the calendar day in `YYYY-MM-DD` format. Only this day gets commits.
- **`commits`** — how many commits to create on that day (positive integer).

Every date **not** listed gets **zero** commits.

### Comments are allowed

`config.json` supports `//` and `/* */` comments (JSON5 format). Use this to temporarily turn dates on/off:

```json
{
  "timezone": "Asia/Kolkata",
  "mode": "scheduled",

  "schedule": [
    { "date": "2026-09-07", "commits": 5 }
    // ,{ "date": "2026-08-30", "commits": 3 }
    // ,{ "date": "2026-09-15", "commits": 2 }
  ]
}
```

Only `2026-09-07` gets commits. The commented entries are ignored.

---

## Timezone

The tool is **timezone-aware**. The `date` you write represents the intended calendar day **in the configured timezone**.

- Timestamps are generated with the correct offset (e.g. `2026-08-30T14:30:00+05:30`).
- A commit cannot "slip" onto the previous or next day.
- If you are outside India, change `timezone` to your own IANA zone.

---

## Commands

| Command | What it does |
|---------|-------------|
| `npm run validate` | Check `config.json` for errors (no changes made) |
| `npm run dry-run` | Preview exactly what will happen (no changes made) |
| `npm run run` | Create the scheduled commits and push them to GitHub |
| `npm run status` | Show configured dates, executed dates, and remaining commits |
| `npm test` | Run the automated tests |

Always run `validate` and `dry-run` before `run`.

---

## State Tracking (Prevents Duplicates)

A local file **`state.json`** (created automatically) records how many commits have been executed per date:

```json
{
  "executed": {
    "2026-08-30": 3,
    "2026-09-02": 1
  }
}
```

`state.json` is **git-ignored** — it never goes into your commit history.

Running `npm run run` compares your schedule against this state:

```
2026-08-30
  Requested: 3
  Already executed: 3
  Remaining: 0
  Skipping.
```

If you increase a count:

```
Requested: 5
Already executed: 3
Remaining: 2
```

Only the remaining **2** are created. Previously generated commits are never duplicated.

---

## Changing an Existing Schedule

1. Edit `config.json` (add/remove dates, change counts).
2. `npm run dry-run` to preview.
3. `npm run run` to apply.

The tool only creates commits that your schedule asks for and that you haven't already executed.

> If you decrease a count, the tool will never delete commits — it only ensures it never creates more than the count.

---

## Optional Random Mode (Opt-in)

Randomness is **off by default**. When you set `"mode": "random"`, it only randomizes the **time of day** for commits on your configured dates — it never adds or removes dates.

```json
{
  "timezone": "Asia/Kolkata",
  "mode": "random",
  "schedule": [
    { "date": "2026-09-07", "commits": 5 }
  ]
}
```

The 5 commits on `2026-09-07` get random (distinct) times within that day.

---

## Validation Rules

- **Date format**: must be `YYYY-MM-DD` (rejects `30-08-2026`, `08/30/2026`).
- **Commit count**: must be a positive integer (rejects `0`, `-1`, `1.5`, `"5"`, `null`).
- **Duplicate dates**: rejected (each date may appear only once).
- **Invalid dates**: rejected (`2026-02-30`, `2026-13-01`, `2026-00-10`).
- **Timezone**: must be a valid IANA name.
- **Mode**: must be `"scheduled"` or `"random"`.

---

## Safety Warnings

- This tool rewrites Git commit dates. **Use it on a repo you own.**
- `npm run run` creates real commits and **pushes** them. Always preview with `dry-run` first.
- `state.json` is local. If you switch machines or delete it, the tool won't know what was already executed and may create commits again.
- The tool uses your `git config user.name` and `user.email` for commits. Make sure these match your GitHub account.

---

## Files

| File | Purpose |
|------|---------|
| `config.json` | Your schedule — edit this |
| `index.js` | CLI entry point |
| `lib/validate.js` | Config validation |
| `lib/schedule.js` | Builds the plan from config |
| `lib/timestamps.js` | Timezone-aware timestamp generation |
| `lib/state.js` | State read/write |
| `data.json` | File that gets committed per scheduled commit |
| `state.json` | Progress tracking (git-ignored, auto-generated) |
| `package.json` | Dependencies |
| `.gitignore` | Keeps `node_modules/` and `state.json` out of git |
| `index.test.js` | Automated tests |
