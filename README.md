# AmILost

## Events calendar

The Events screens read the UTCS iCal feed (the "iCal" button on https://apps.cs.utexas.edu/calendar).
We only use that feed, never the calendar's web pages (their robots.txt disallows scraping). When the
feed can't be reached (no internet, or on the web, where the browser blocks it) the app uses the last
copy it saved, and finally a snapshot that ships with the app.

To refresh the snapshot: download the feed to `data/cs-calendar.ics`, then run

```bash
node scripts/snapshot-calendar.mjs
```

which rewrites `src/data/calendarSnapshot.ts` (the app's bundler can't import `.ics` files).
