# Vibecamp Survey Stats · stats.vibe.camp

The public exit-survey results page: ratings, demographics, and distilled
free-text themes for every Vibecamp event since 2022.

**Live at:** https://stats.vibe.camp (once DNS is set up — see below)

## What's in here

```
index.html            the page
styles.css            vibe.camp-matched styling
app.js                all charts & interactions (vanilla JS, no build step)
data/aggregates.json  pre-aggregated counts — NO individual responses
data/insights.json    distilled themes with paraphrased voices, per event
data/threads.json     recurring themes connected across events
fonts/                drop Bugaki / Recoleta / Metropolis here (see fonts/README.txt)
CNAME                 tells GitHub Pages this serves stats.vibe.camp
```

## Privacy design (please keep it this way)

This repo intentionally contains **no raw survey data**:

- Only pre-aggregated counts are published. Charts never show rating
  breakdowns for groups smaller than 5 people, and that suppression happens
  **before** the JSON is generated — small-group numbers aren't in this repo
  at all.
- Comparisons are one dimension at a time (gender OR age, never both), so
  slices can't be combined to identify anyone.
- All quotes are paraphrased, never verbatim.

When updating, never commit raw response exports (CSV/XLSX) to this repo.
The previous stats repo published row-level responses (gender + sexuality +
age + attendance per person); those remain in its git history, so the old
repo should be made private or have its history rewritten.

## Deploying to stats.vibe.camp

1. Push this folder to a **fresh public repo** in the vibecamp org
   (e.g. `vibecamp/survey-stats`) — fresh so no raw data rides along in history.
2. Repo → Settings → Pages → Deploy from branch → `main`, root folder.
3. In Pages settings, set custom domain to `stats.vibe.camp`
   (the CNAME file in this repo keeps that setting pinned).
4. Wherever vibe.camp's DNS lives, add:
   `CNAME  stats  →  vibecamp.github.io`
5. Back in Pages settings, tick **Enforce HTTPS** once the cert is issued
   (takes a few minutes after DNS propagates).
6. Update the link on vibe.camp to point at https://stats.vibe.camp.

## Updating after the next event

1. Export the new exit survey responses (keep the export private!).
2. Re-run the aggregation script (kept outside this repo, next to the raw
   data) to regenerate `data/aggregates.json` — it validates against prior
   years and applies the under-5 suppression automatically.
3. Distill the free text into ~10 themes in the same format as
   `data/insights.json` (`{theme, summary, positive, notes[3]}` — paraphrase,
   never quote) and extend `data/threads.json` where a theme continues a thread.
4. Add the event's metadata (name, year, venue, accent color) in the
   aggregation script's META block.
