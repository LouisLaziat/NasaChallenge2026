# Conditions response fixtures

Retrieved 2026-11-14T17:21:04.910Z from public feeds with a browser User-Agent. Raw JSON responses are saved unchanged (not synthetic). Tests never fetch these URLs.

- [meda.json](https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json)
- [donki-sep.json](https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2024-05-01&endDate=2024-05-31)

MEDA currently returns seven archival sols ending at sol 1133, 2024-04-27. DONKI uses a historical month containing events so event-age boundaries can be tested with a fixed clock. The current 30-day query was also verified as HTTP 200 with an empty array.

DONKI migrated in September 2026; see [NASA CCMC migration notice](https://ccmc.gsfc.nasa.gov/news/major-updates/).
