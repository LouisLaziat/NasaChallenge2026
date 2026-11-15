DRAFT for the team to rewrite in their own words

# Link audit

Checked from branch `readme`, develop baseline `06e9857`. HTTP run completed **2026-11-14T21:11:22.607Z** (UTC, recorded from the clock).

## Scope and method

- Scanned README.md, every top-level docs/*.md, all other docs/submission/*.md, data/*/README.md, every source/sources subtree in data/**/*.json, and href values in the About dialog in index.html. Markdown links, screenshot paths and literal HTTP URLs were included. JSON notes were searched for embedded URLs as well as url/file fields.
- 100 unique targets: 43 local page/file targets and 57 external/template targets. HTTP outcomes: 87 × 200; 1 × 202; 1 × 203; 1 × 206; 8 × 403; 1 × 404; 1 × N/A.
- Followed redirects with HEAD; non-200/206 responses received a GET retry. GET uses a byte range and cancels the body after headers, so large rasters/papers are not downloaded. 206 is a successful partial response. HTTP reachability does not verify scientific content, UI state or API schema.
- Local examples on ports 8080/8092 were mapped to a temporary server for this branch at 127.0.0.1:8084. The documented /NasaChallenge2026/ prefix was stripped for file reachability. These checks neither require another agent’s server nor assert a published site or complete subpath/browser QA.
- The generated report reuses the audited inventory and is excluded from recursive re-inventory. Where-used locations are repository-relative line numbers or JSON pointers at this run. Source fields without a URL have no HTTP request. Individual photos[].url values are outside the requested source/sources-field scope unless linked by one of the audited documents.

## Findings and handoffs

- All local documentation, images and example-page HTTP requests returned 200. No missing local target was found.
- Eight research links returned 403 after the GET retry. They are retained as canonical citations; this audit cannot call them dead. A reachable RAD paper copy was added alongside the DOI in owned submission drafts. Other owners are asked to review accessible alternatives in STATUS.md.
- The planned GitHub Pages address returns 404. docs/deploy.md already describes publishing as a human handoff; README does not advertise this address as live. REQUEST @lead records the release-time check.
- The owner-placeholder Pages URL is a template, not an endpoint; no HTTP request was made.
- eScholarship returned 202 and PubMed returned 203 after GET; manual access remains unverified. The NIST PDF returned 206 on GET despite HEAD 404, so it is reachable by the tested method.

## Local files and example pages

| URL / path | HTTP | Where used | Note |
|---|---|---|---|
| [/AGENTS.md](../../AGENTS.md) | 200 HEAD | `README.md:50`<br>`docs/submission/ai-disclosure.md:15` |  |
| [/comms/louis-claude.md](../../comms/louis-claude.md) | 200 HEAD | `docs/submission/ai-disclosure.md:15`<br>`docs/submission/video-30s.md:41` |  |
| [/CONTRACTS.md#4-plan-result--what-planwalkterrain-targets-options-returns](../../CONTRACTS.md#4-plan-result--what-planwalkterrain-targets-options-returns) | 200 HEAD | `docs/model-sources.md:41`<br>`docs/model-sources.md:42` |  |
| [/CONTRACTS.md#8-route-options--jsroutesjs-engine-lane](../../CONTRACTS.md#8-route-options--jsroutesjs-engine-lane) | 200 HEAD | `docs/submission/details.md:13` |  |
| [/data/conditions/real-gale.json](../../data/conditions/real-gale.json) | 200 HEAD | `docs/submission/data.md:5` |  |
| [/data/conditions/real.json](../../data/conditions/real.json) | 200 HEAD | `docs/submission/data.md:5` |  |
| [/data/gale/README.md](../../data/gale/README.md) | 200 HEAD | `docs/submission/data.md:5`<br>`docs/submission/readme-draft.md:53`<br>`docs/submission/slides-7.md:63`<br>`docs/submission/summary.md:7` |  |
| [/data/gale/targets.json](../../data/gale/targets.json) | 200 HEAD | `docs/submission/data.md:5` |  |
| [/data/gale/terrain.json](../../data/gale/terrain.json) | 200 HEAD | `docs/submission/data.md:5` |  |
| [/data/real/targets.json](../../data/real/targets.json) | 200 HEAD | `docs/submission/data.md:5` |  |
| [/data/real/terrain.json](../../data/real/terrain.json) | 200 HEAD | `docs/submission/data.md:5` |  |
| [/docs/deploy.md](../deploy.md) | 200 HEAD | `docs/submission/readme-draft.md:74` |  |
| [/docs/model-sources.md](../model-sources.md) | 200 HEAD | `README.md:42`<br>`docs/model.md:12`<br>`docs/submission/data.md:52`<br>`docs/submission/details.md:19`<br>`docs/submission/readme-draft.md:38`<br>`index.html:About panel` |  |
| [/docs/model.md](../model.md) | 200 HEAD | `README.md:42`<br>`docs/submission/data.md:52`<br>`docs/submission/details.md:19`<br>`docs/submission/readme-draft.md:38`<br>`docs/submission/slides-7.md:61`<br>`docs/submission/slides-7.md:63`<br>`docs/submission/summary.md:7`<br>`index.html:About panel` |  |
| [/docs/screenshots/data-real.png](../screenshots/data-real.png) | 200 HEAD | `README.md:7`<br>`docs/submission/readme-draft.md:59`<br>`docs/submission/slides-7.md:13`<br>`docs/submission/slides-7.md:29` |  |
| [/docs/screenshots/views-hud-gale.png](../screenshots/views-hud-gale.png) | 200 HEAD | `docs/submission/readme-draft.md:63`<br>`docs/submission/slides-7.md:53` |  |
| [/docs/screenshots/views-hud-real.png](../screenshots/views-hud-real.png) | 200 HEAD | `docs/submission/readme-draft.md:62` |  |
| [/docs/screenshots/views-tablet-gale.png](../screenshots/views-tablet-gale.png) | 200 HEAD | `docs/submission/readme-draft.md:61`<br>`docs/submission/slides-7.md:21` |  |
| [/docs/screenshots/views-tablet-real.png](../screenshots/views-tablet-real.png) | 200 HEAD | `docs/submission/readme-draft.md:60`<br>`docs/submission/slides-7.md:61` |  |
| [/docs/screenshots/views-vr.png](../screenshots/views-vr.png) | 200 HEAD | `docs/submission/readme-draft.md:64`<br>`docs/submission/slides-7.md:53`<br>`docs/submission/video-30s.md:39` |  |
| [/docs/submission/ai-disclosure.md](ai-disclosure.md) | 200 HEAD | `README.md:48`<br>`docs/submission/details.md:34`<br>`docs/submission/readme-draft.md:70`<br>`docs/submission/slides-7.md:61` |  |
| [/docs/submission/data.md](data.md) | 200 HEAD | `README.md:46`<br>`docs/submission/details.md:26`<br>`docs/submission/readme-draft.md:53`<br>`docs/submission/slides-7.md:61`<br>`docs/submission/video-30s.md:41` |  |
| [/docs/submission/readme-draft.md#screenshots-already-in-the-repo](readme-draft.md#screenshots-already-in-the-repo) | 200 HEAD | `docs/submission/video-30s.md:41` |  |
| [/docs/submission/summary.md](summary.md) | 200 HEAD | `README.md:50` |  |
| [/README.md](../../README.md) | 200 HEAD | `docs/submission/slides-7.md:63` |  |
| [/STATUS.md](../../STATUS.md) | 200 HEAD | `README.md:50`<br>`docs/submission/ai-disclosure.md:15`<br>`docs/submission/details.md:13`<br>`docs/submission/slides-7.md:63`<br>`docs/submission/summary.md:7`<br>`docs/submission/video-30s.md:22`<br>`docs/submission/video-30s.md:41` |  |
| [http://localhost:8080/](http://localhost:8080/) | 200 HEAD | `README.md:17`<br>`README.md:24`<br>`docs/submission/readme-draft.md:18`<br>`docs/submission/readme-draft.md:24` |  |
| [http://localhost:8080/?data=gale](http://localhost:8080/?data=gale) | 200 HEAD | `README.md:25` |  |
| [http://localhost:8080/?data=real](http://localhost:8080/?data=real) | 200 HEAD | `README.md:25` |  |
| [http://localhost:8080/?data=real&route=eco](http://localhost:8080/?data=real&route=eco) | 200 HEAD | `README.md:26` |  |
| [http://localhost:8080/?data=real&route=safe](http://localhost:8080/?data=real&route=safe) | 200 HEAD | `README.md:26` |  |
| [http://localhost:8080/?data=real&route=short](http://localhost:8080/?data=real&route=short) | 200 HEAD | `README.md:26` |  |
| [http://localhost:8080/?data=real&tour=1](http://localhost:8080/?data=real&tour=1) | 200 HEAD | `README.md:27`<br>`docs/submission/slides-7.md:37`<br>`docs/submission/slides-7.md:45` |  |
| [http://localhost:8080/docs/conditions-demo.html](http://localhost:8080/docs/conditions-demo.html) | 200 HEAD | `docs/submission/readme-draft.md:31` |  |
| [http://localhost:8080/docs/photos-demo.html?data=gale](http://localhost:8080/docs/photos-demo.html?data=gale) | 200 HEAD | `docs/submission/readme-draft.md:32` |  |
| [http://localhost:8080/hud.html?data=gale&cond=real-gale](http://localhost:8080/hud.html?data=gale&cond=real-gale) | 200 HEAD | `README.md:29` |  |
| [http://localhost:8080/hud.html?data=gale&cond=real-gale&play=30](http://localhost:8080/hud.html?data=gale&cond=real-gale&play=30) | 200 HEAD | `README.md:29`<br>`docs/submission/readme-draft.md:29`<br>`docs/submission/video-30s.md:26` |  |
| [http://localhost:8080/hud.html?data=real&vr=1](http://localhost:8080/hud.html?data=real&vr=1) | 200 HEAD | `README.md:30`<br>`docs/submission/readme-draft.md:30` |  |
| [http://localhost:8080/index.html?data=gale](http://localhost:8080/index.html?data=gale) | 200 HEAD | `docs/submission/readme-draft.md:26` |  |
| [http://localhost:8080/index.html?data=real](http://localhost:8080/index.html?data=real) | 200 HEAD | `docs/submission/readme-draft.md:25` |  |
| [http://localhost:8080/index.html?data=real&tour=1](http://localhost:8080/index.html?data=real&tour=1) | 200 HEAD | `docs/submission/readme-draft.md:27`<br>`docs/submission/video-30s.md:9` |  |
| [http://localhost:8080/tablet.html?data=real](http://localhost:8080/tablet.html?data=real) | 200 HEAD | `README.md:28`<br>`docs/submission/readme-draft.md:28` |  |
| [http://localhost:8092/NasaChallenge2026/](http://localhost:8092/NasaChallenge2026/) | 200 HEAD | `docs/deploy.md:14`<br>`docs/deploy.md:35` | Documented project-subpath example mapped to isolated branch root; not a browser subpath QA check. |

## External and template URLs

| URL | HTTP | Where used | Note |
|---|---|---|---|
| `https://<owner>.github.io/NasaChallenge2026/` | N/A | `docs/deploy.md:12` | Template URL; substitute owner, not a published endpoint. |
| [https://app.netlify.com/drop](https://app.netlify.com/drop) | 200 HEAD | `docs/deploy.md:56` |  |
| [https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_DEM_Mosaic_1m_v3.tif) | 200 HEAD | `data/gale/terrain.json:/sources/0/file` |  |
| [https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif) | 200 HEAD | `docs/submission/data.md:15`<br>`data/gale/terrain.json:/sources/3/url` |  |
| [https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif) | 200 HEAD | `data/real/terrain.json:/sources/0/file` |  |
| [https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_hirise_dtm_mosaic](https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_hirise_dtm_mosaic) | 200 HEAD | `docs/submission/data.md:11`<br>`data/real/terrain.json:/sources/0/url`<br>`index.html:About panel` |  |
| [https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m](https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m) | 200 HEAD | `docs/submission/data.md:14`<br>`data/gale/terrain.json:/sources/0/url`<br>`index.html:About panel` |  |
| [https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2026-10-15&endDate=2026-11-14](https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2026-10-15&endDate=2026-11-14) | 200 HEAD | `docs/submission/data.md:27`<br>`data/conditions/real-gale.json:/sources/1/url`<br>`data/conditions/real.json:/sources/1/url` |  |
| [https://ccmc.gsfc.nasa.gov/news/major-updates/](https://ccmc.gsfc.nasa.gov/news/major-updates/) | 200 HEAD | `docs/model-sources.md:79` |  |
| [https://ccmc.gsfc.nasa.gov/tools/DONKI/](https://ccmc.gsfc.nasa.gov/tools/DONKI/) | 200 HEAD | `docs/model-sources.md:47`<br>`docs/model-sources.md:48`<br>`docs/model-sources.md:57`<br>`docs/model-sources.md:79`<br>`docs/model.md:49`<br>`docs/model.md:50`<br>`docs/submission/data.md:27`<br>`data/conditions/demo-dusty.json:/sources/1/url`<br>`data/conditions/demo-quiet.json:/sources/1/url`<br>`data/conditions/demo-solar.json:/sources/1/url`<br>`index.html:About panel` |  |
| [https://doi.org/10.1029/2005JE002586](https://doi.org/10.1029/2005JE002586) | 403 GET (HEAD 403) | `docs/model-sources.md:22`<br>`docs/model-sources.md:23`<br>`docs/model-sources.md:70`<br>`docs/model.md:24`<br>`docs/model.md:25` | Access blocked after redirect/GET retry; not proof of a missing publication. |
| [https://doi.org/10.1029/2018SW001959](https://doi.org/10.1029/2018SW001959) | 403 GET (HEAD 403) | `docs/model-sources.md:37`<br>`docs/model-sources.md:74`<br>`docs/model.md:39` | Access blocked after redirect/GET retry; not proof of a missing publication. |
| [https://doi.org/10.1113/jphysiol.1949.sp004363](https://doi.org/10.1113/jphysiol.1949.sp004363) | 403 GET (HEAD 403) | `docs/model-sources.md:30`<br>`docs/model-sources.md:71`<br>`docs/model.md:32` | Access blocked after redirect/GET retry; not proof of a missing publication. |
| [https://doi.org/10.1126/science.1244797](https://doi.org/10.1126/science.1244797) | 403 GET (HEAD 403) | `docs/model-sources.md:32`<br>`docs/model-sources.md:56`<br>`docs/model-sources.md:73`<br>`docs/model.md:34`<br>`docs/submission/data.md:28`<br>`docs/submission/readme-draft.md:50`<br>`data/conditions/demo-dusty.json:/sources/2/url`<br>`data/conditions/demo-quiet.json:/sources/2/url`<br>`data/conditions/demo-solar.json:/sources/2/url`<br>`data/conditions/real-gale.json:/sources/2/url`<br>`data/conditions/real.json:/sources/2/url`<br>`index.html:About panel` | Access blocked after redirect/GET retry; not proof of a missing publication. |
| [https://doi.org/10.1152/jappl.1977.43.4.577](https://doi.org/10.1152/jappl.1977.43.4.577) | 403 GET (HEAD 403) | `docs/model-sources.md:38`<br>`docs/model-sources.md:39`<br>`docs/model-sources.md:77`<br>`docs/model.md:40`<br>`docs/model.md:41` | Access blocked after redirect/GET retry; not proof of a missing publication. |
| [https://doi.org/10.1152/japplphysiol.01177.2001](https://doi.org/10.1152/japplphysiol.01177.2001) | 403 GET (HEAD 403) | `docs/model-sources.md:19`<br>`docs/model-sources.md:20`<br>`docs/model-sources.md:68`<br>`docs/model.md:21`<br>`docs/model.md:22` | Access blocked after redirect/GET retry; not proof of a missing publication. |
| [https://doi.org/10.1242/jeb.201.13.2071](https://doi.org/10.1242/jeb.201.13.2071) | 403 GET (HEAD 403) | `docs/model-sources.md:24`<br>`docs/model-sources.md:25`<br>`docs/model-sources.md:55`<br>`docs/model-sources.md:69`<br>`docs/model.md:26`<br>`docs/model.md:27` | Access blocked after redirect/GET retry; not proof of a missing publication. |
| [https://doi.org/10.5281/zenodo.4931348](https://doi.org/10.5281/zenodo.4931348) | 200 HEAD | `docs/submission/data.md:12`<br>`docs/submission/readme-draft.md:45`<br>`data/real/terrain.json:/sources/2/url`<br>`index.html:About panel` |  |
| [https://escholarship.org/uc/item/05r820mz](https://escholarship.org/uc/item/05r820mz) | 202 GET (HEAD 202) | `docs/model-sources.md:15`<br>`docs/model-sources.md:16`<br>`docs/model-sources.md:66`<br>`docs/model.md:17`<br>`docs/model.md:18` | Nonstandard success response; reading/access still needs manual confirmation. |
| [https://journals.biologists.com/jeb/article-abstract/201/13/2071/7687/Mechanics-and-Energetics-of-Human-Locomotion-on](https://journals.biologists.com/jeb/article-abstract/201/13/2071/7687/Mechanics-and-Energetics-of-Human-Locomotion-on) | 403 GET (HEAD 403) | `docs/model-sources.md:69` | Access blocked after redirect/GET retry; not proof of a missing publication. |
| [https://louislaziat.github.io/NasaChallenge2026/](https://louislaziat.github.io/NasaChallenge2026/) | 404 GET (HEAD 404) | `docs/deploy.md:46` | Planned Pages address in deployment instructions; not a working deployment. |
| [https://mars.nasa.gov/api/v1/raw_image_items/](https://mars.nasa.gov/api/v1/raw_image_items/) | 200 GET (HEAD 204) | `docs/submission/data.md:19`<br>`data/gale/targets.json:/sources/1/url` |  |
| [https://mars.nasa.gov/mars2020/multimedia/raw-images/](https://mars.nasa.gov/mars2020/multimedia/raw-images/) | 200 HEAD | `docs/submission/data.md:18`<br>`data/real/targets.json:/sources/1/url`<br>`index.html:About panel` |  |
| [https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json) | 200 HEAD | `docs/submission/data.md:16` |  |
| [https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json) | 200 HEAD | `docs/submission/data.md:16`<br>`data/real/area.json:/source`<br>`data/real/targets.json:/sources/0/url` |  |
| [https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json](https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json) | 200 HEAD | `docs/submission/data.md:17`<br>`data/gale/terrain.json:/sources/4/url`<br>`data/gale/traverse.json:/source/url` |  |
| [https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json](https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json) | 200 HEAD | `docs/submission/data.md:17`<br>`data/gale/area.json:/source`<br>`data/gale/targets.json:/sources/0/url` |  |
| [https://mars.nasa.gov/msl/multimedia/raw-images/](https://mars.nasa.gov/msl/multimedia/raw-images/) | 200 HEAD | `docs/submission/data.md:19`<br>`index.html:About panel` |  |
| [https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json](https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json) | 200 HEAD | `docs/submission/data.md:25`<br>`data/conditions/demo-dusty.json:/sources/0/url`<br>`data/conditions/demo-quiet.json:/sources/0/url`<br>`data/conditions/demo-solar.json:/sources/0/url`<br>`data/conditions/real.json:/sources/0/url`<br>`index.html:About panel` |  |
| [https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json](https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json) | 200 HEAD | `docs/submission/data.md:26`<br>`data/conditions/real-gale.json:/sources/0/url` |  |
| [https://ntrs.nasa.gov/api/citations/19930074290/downloads/19930074290.pdf](https://ntrs.nasa.gov/api/citations/19930074290/downloads/19930074290.pdf) | 200 HEAD | `docs/model-sources.md:18`<br>`docs/model-sources.md:21`<br>`docs/model-sources.md:54`<br>`docs/model-sources.md:65`<br>`docs/model.md:20`<br>`docs/model.md:23`<br>`docs/submission/data.md:55` |  |
| [https://ntrs.nasa.gov/api/citations/20010046858/downloads/20010046858.pdf](https://ntrs.nasa.gov/api/citations/20010046858/downloads/20010046858.pdf) | 200 HEAD | `docs/model-sources.md:78` |  |
| [https://ntrs.nasa.gov/api/citations/20090013081/downloads/20090013081.pdf](https://ntrs.nasa.gov/api/citations/20090013081/downloads/20090013081.pdf) | 200 HEAD | `docs/model-sources.md:64` |  |
| [https://ntrs.nasa.gov/api/citations/20170002574/downloads/20170002574.pdf](https://ntrs.nasa.gov/api/citations/20170002574/downloads/20170002574.pdf) | 200 HEAD | `docs/model-sources.md:76` |  |
| [https://ntrs.nasa.gov/api/citations/20210000827/downloads/Exporation%20EVA%20Testing%20and%20Analogs%2020210000827.pdf](https://ntrs.nasa.gov/api/citations/20210000827/downloads/Exporation%20EVA%20Testing%20and%20Analogs%2020210000827.pdf) | 200 HEAD | `docs/model-sources.md:63` |  |
| [https://ntrs.nasa.gov/api/citations/20250006519/downloads/ICES_final.pdf](https://ntrs.nasa.gov/api/citations/20250006519/downloads/ICES_final.pdf) | 200 HEAD | `docs/model-sources.md:67` |  |
| [https://ntrs.nasa.gov/citations/20010046858](https://ntrs.nasa.gov/citations/20010046858) | 200 HEAD | `docs/model-sources.md:34`<br>`docs/model-sources.md:43`<br>`docs/model-sources.md:44`<br>`docs/model-sources.md:78`<br>`docs/model.md:36`<br>`docs/model.md:45`<br>`docs/model.md:46`<br>`docs/submission/data.md:58` |  |
| [https://ntrs.nasa.gov/citations/20090013081](https://ntrs.nasa.gov/citations/20090013081) | 200 HEAD | `docs/model-sources.md:28`<br>`docs/model-sources.md:29`<br>`docs/model-sources.md:45`<br>`docs/model-sources.md:53`<br>`docs/model-sources.md:64`<br>`docs/model.md:30`<br>`docs/model.md:31`<br>`docs/model.md:47`<br>`docs/submission/data.md:56` |  |
| [https://ntrs.nasa.gov/citations/20170002574](https://ntrs.nasa.gov/citations/20170002574) | 200 HEAD | `docs/model-sources.md:26`<br>`docs/model-sources.md:27`<br>`docs/model-sources.md:35`<br>`docs/model-sources.md:76`<br>`docs/model.md:28`<br>`docs/model.md:29`<br>`docs/model.md:37`<br>`docs/submission/data.md:57` |  |
| [https://ntrs.nasa.gov/citations/20210000827](https://ntrs.nasa.gov/citations/20210000827) | 200 HEAD | `docs/model-sources.md:14`<br>`docs/model-sources.md:17`<br>`docs/model-sources.md:36`<br>`docs/model-sources.md:40`<br>`docs/model-sources.md:52`<br>`docs/model-sources.md:63`<br>`docs/model.md:16`<br>`docs/model.md:19`<br>`docs/model.md:38`<br>`docs/model.md:42`<br>`docs/submission/data.md:54` |  |
| [https://nvlpubs.nist.gov/nistpubs/Legacy/circ/nbscircular279.pdf](https://nvlpubs.nist.gov/nistpubs/Legacy/circ/nbscircular279.pdf) | 206 GET (HEAD 404) | `docs/model-sources.md:31`<br>`docs/model-sources.md:72`<br>`docs/model.md:33` | Byte-range GET succeeds; HEAD alone misleadingly returned 404. |
| [https://pmc.ncbi.nlm.nih.gov/articles/PMC1392602/](https://pmc.ncbi.nlm.nih.gov/articles/PMC1392602/) | 200 HEAD | `docs/model-sources.md:71` |  |
| [https://pubmed.ncbi.nlm.nih.gov/908672/](https://pubmed.ncbi.nlm.nih.gov/908672/) | 203 GET (HEAD 203) | `docs/model-sources.md:77` | Nonstandard success response; reading/access still needs manual confirmation. |
| [https://science.nasa.gov/blog/curiosity-blog-sols-4577-4579-watch-the-skies](https://science.nasa.gov/blog/curiosity-blog-sols-4577-4579-watch-the-skies) | 200 HEAD | `docs/submission/data.md:45`<br>`data/gale/targets.json:/targets/0/source` |  |
| [https://science.nasa.gov/blog/curiosity-blog-sols-4636-4637-up-against-a-wall/](https://science.nasa.gov/blog/curiosity-blog-sols-4636-4637-up-against-a-wall/) | 200 HEAD | `docs/submission/data.md:46`<br>`data/gale/targets.json:/targets/1/source` |  |
| [https://science.nasa.gov/blog/curiosity-blog-sols-4709-4715-drilling-high-and-low-in-the-boxwork-unit](https://science.nasa.gov/blog/curiosity-blog-sols-4709-4715-drilling-high-and-low-in-the-boxwork-unit) | 200 HEAD | `docs/submission/data.md:47`<br>`data/gale/targets.json:/targets/2/source` |  |
| [https://science.nasa.gov/blog/curiosity-blog-sols-4845-4851-bye-bye-boxwork-bye-bye/](https://science.nasa.gov/blog/curiosity-blog-sols-4845-4851-bye-bye-boxwork-bye-bye/) | 200 HEAD | `docs/submission/data.md:48`<br>`data/gale/targets.json:/targets/3/source` |  |
| [https://science.nasa.gov/blog/next-stop-hawksbill-gap](https://science.nasa.gov/blog/next-stop-hawksbill-gap) | 200 HEAD | `docs/submission/data.md:41`<br>`data/real/targets.json:/targets/2/source` |  |
| [https://science.nasa.gov/blog/to-sample-or-not-to-sample](https://science.nasa.gov/blog/to-sample-or-not-to-sample) | 200 HEAD | `docs/submission/data.md:39`<br>`data/real/targets.json:/targets/0/source` |  |
| [https://science.nasa.gov/photojournal/map-of-perseverances-delta-top-campaign](https://science.nasa.gov/photojournal/map-of-perseverances-delta-top-campaign) | 200 HEAD | `docs/submission/data.md:44`<br>`data/real/targets.json:/targets/5/source` |  |
| [https://science.nasa.gov/photojournal/perseverance-rock-cores-from-wildcat-ridge](https://science.nasa.gov/photojournal/perseverance-rock-cores-from-wildcat-ridge) | 200 HEAD | `docs/submission/data.md:42`<br>`data/real/targets.json:/targets/3/source` |  |
| [https://science.nasa.gov/resource/meet-the-mars-samples-shuyak-and-mageik-samples-14-and-15](https://science.nasa.gov/resource/meet-the-mars-samples-shuyak-and-mageik-samples-14-and-15) | 200 HEAD | `docs/submission/data.md:40`<br>`data/real/targets.json:/targets/1/source` |  |
| [https://trek.nasa.gov/mars/](https://trek.nasa.gov/mars/) | 200 HEAD | `docs/submission/data.md:13`<br>`index.html:About panel` |  |
| [https://www-mars.lmd.jussieu.fr/](https://www-mars.lmd.jussieu.fr/) | 200 HEAD | `docs/submission/data.md:29`<br>`data/conditions/demo-dusty.json:/sources/3/url`<br>`data/conditions/demo-quiet.json:/sources/3/url`<br>`data/conditions/demo-solar.json:/sources/3/url`<br>`data/conditions/real-gale.json:/sources/3/url`<br>`data/conditions/real.json:/sources/3/url` |  |
| [https://www.jpl.nasa.gov/images/pia25682-perseverances-three-forks-sample-depot-map/](https://www.jpl.nasa.gov/images/pia25682-perseverances-three-forks-sample-depot-map/) | 200 HEAD | `docs/submission/data.md:43`<br>`data/real/targets.json:/targets/4/source` |  |
| [https://www.nasa.gov/reference/4-0-human-performance/](https://www.nasa.gov/reference/4-0-human-performance/) | 200 HEAD | `docs/model-sources.md:33`<br>`docs/model-sources.md:46`<br>`docs/model-sources.md:56`<br>`docs/model-sources.md:75`<br>`docs/model.md:35`<br>`docs/model.md:48`<br>`docs/submission/data.md:59` |  |
| [https://www.scienceintheclassroom.org/sites/default/files/research-papers/1244797.full_.pdf](https://www.scienceintheclassroom.org/sites/default/files/research-papers/1244797.full_.pdf) | 200 HEAD | `docs/model-sources.md:73`<br>`docs/submission/data.md:28`<br>`docs/submission/readme-draft.md:50` |  |

## Scanned Markdown files

- `README.md`
- `docs/deploy.md`
- `docs/model-sources.md`
- `docs/model.md`
- `docs/submission/ai-disclosure.md`
- `docs/submission/data.md`
- `docs/submission/details.md`
- `docs/submission/readme-draft.md`
- `docs/submission/slides-7.md`
- `docs/submission/summary.md`
- `docs/submission/video-30s.md`
- `data/gale/README.md`
