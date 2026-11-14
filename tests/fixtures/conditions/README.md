# Conditions response fixtures

Retrieved 2026-11-14T17:21:04.910Z from public feeds with a browser User-Agent. MEDA and DONKI responses are saved unchanged (not synthetic); the REMS excerpt is described below. Tests never fetch these URLs.

- [meda.json](https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json)
- [donki-sep.json](https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2024-05-01&endDate=2024-05-31)

MEDA currently returns seven archival sols ending at sol 1133, 2024-04-27. DONKI uses a historical month containing events so event-age boundaries can be tested with a fixed clock. The current 30-day query was also verified as HTTP 200 with an empty array.

DONKI migrated in September 2026; see [NASA CCMC migration notice](https://ccmc.gsfc.nasa.gov/news/major-updates/).

REMS excerpt retrieved 2026-11-14T19:30:00.8701920+00:00 from https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json . rems.json retains the original descriptions plus four unchanged rows (two highest sols, two old missing-value rows) from the 4,745-row response. This is an excerpt, not a synthetic fixture. Latest observation: sol 4995 / 2026-08-25; outreach feed from CAB (Spain).
