DRAFT for the team to rewrite in their own words

# Data, credits and limits

This register follows the committed source records in [Jezero terrain](../../data/real/terrain.json), [Jezero stops](../../data/real/targets.json), [Gale terrain](../../data/gale/terrain.json), [Gale stops](../../data/gale/targets.json), [Gale notes](../../data/gale/README.md), and the two [Jezero](../../data/conditions/real.json) / [Gale](../../data/conditions/real-gale.json) conditions snapshots. It records project use, without asserting that a link was rechecked while drafting. Retrieval timestamps and weather observation dates are different.

## Terrain, imagery and rover positions

| Source and link | Use and credit | Limits / processing |
|---|---|---|
| [USGS Mars 2020 TRN HiRISE DTM mosaic](https://astrogeology.usgs.gov/search/map/mars_2020_terrain_relative_navigation_hirise_dtm_mosaic) | Jezero elevation; USGS Astrogeology / NASA. Source metadata identifies public domain. | 1 m pixels averaged into 5 m cells; heights include the product's MOLA areoid / delta-geoid reference. Roughness is derived from the same DTM, not a separate boulder survey. |
| [THEMIS-derived Thermal Inertia of Jezero Crater](https://doi.org/10.5281/zenodo.4931348) | Jezero ground-condition proxy; Zenodo dataset, CC BY 4.0. | 100 m source resampled to cell centres. A finer output grid does not add thermal detail. Inertia breakpoints are team assumptions, not proof of mechanical footing. |
| [NASA Mars Trek](https://trek.nasa.gov/mars/) | Jezero MRO HiRISE 25 cm and CTX 6 m imagery; NASA/JPL-Caltech/UArizona/MSSS. | Display background; the imagery does not itself supply the engine's elevation or oxygen costs. |
| [USGS MSL Gale merged DEM](https://astrogeology.usgs.gov/search/map/mars_msl_gale_merged_dem_1m) | Gale elevation from the v3 1 m mosaic; USGS Astrogeology / NASA. Source metadata identifies public domain. | Resampled to 5 m cells, with roughness derived from the same DEM. No Gale thermal-inertia layer was prepared; no sand penalty is applied. |
| [USGS MSL Gale HiRISE LRGB colour mosaic](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars/MSL/MSL_Gale_HiRISE-LRGB_78quads_sharp_cog.tif) | Gale image background; NASA/JPL-Caltech/UArizona, mosaic by USGS Astrogeology. | Committed north-up crop is approximately 2 m/pixel, covering the bounds in the Gale area file; the source mosaic is 25 cm/pixel. |
| NASA/JPL MMGIS Perseverance [waypoints](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json) and [traverse](https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json) | Jezero stop positions, area selection and displayed rover drive path. | The rover's historical drive is context; the planned astronaut route is computed separately. |
| NASA/JPL MMGIS Curiosity [waypoints](https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_waypoints.json) and [traverse](https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json) | Gale stop positions and displayed rover drive path. | Traverse is clipped into the committed Gale file. One astronaut stop is shifted 5 m from the rover spot to stay within the model's slope limit; see the Gale notes. |
| [Perseverance raw images](https://mars.nasa.gov/mars2020/multimedia/raw-images/) | Nearby Jezero Mastcam-Z and Navcam photos. Mastcam-Z: NASA/JPL-Caltech/ASU; Navcam: NASA/JPL-Caltech. | Each photo's manifest records its sol, camera, URL and credit; nearby does not mean the exact astronaut viewpoint. |
| [Curiosity raw images](https://mars.nasa.gov/msl/multimedia/raw-images/) and [raw-image API](https://mars.nasa.gov/api/v1/raw_image_items/) | Nearby Gale photos. Mastcam/MAHLI: NASA/JPL-Caltech/MSSS; Navcam: NASA/JPL-Caltech. | Individual credits and source-image links are retained in the stop manifest. |

## Conditions and partner sources

| Source and link | Project use | Proxy / freshness / unknowns |
|---|---|---|
| [Perseverance MEDA weather feed](https://mars.nasa.gov/rss/api/?feed=weather&category=mars2020&feedtype=json) | Jezero weather snapshot; NASA/JPL and Spain's Centro de Astrobiología (CAB). | **Archival:** the committed observation is sol 1133, 2024-04-27. Download time does not make it current weather; the conditions card flags stale data. |
| [Curiosity REMS weather feed](https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json) | Gale weather snapshot; NASA/JPL and CAB, Spain. | **Archival:** the committed observation is sol 4995, 2026-08-25. This is the outreach feed, not the PDS science product. Location and sampling affect readings. |
| [NASA CCMC DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) and [committed SEP query](https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?startDate=2026-10-15&endDate=2026-11-14) | Solar-particle-event catalogue used by the snapshot fetcher. | **Near-Earth proxy for Mars.** The two-day alert and seven-day watch are team recency policies. A quiet catalogue is not a Mars all-clear; no particle-transport prediction is made. |
| [Curiosity RAD / Hassler et al. (2014)](https://doi.org/10.1126/science.1244797) | Published historical surface dose-equivalent baseline, about 0.64 mSv/day. | **Measured at Gale, geographic proxy at Jezero.** It is not a live dosimeter on either site. The 1 mSv walk allocation and solar-event multiplier are team scenario choices. |
| [Mars Climate Database](https://www-mars.lmd.jussieu.fr/) — LMD / ESA / CNES | Referenced source for optional manual dust optical depth and Mars-local EVA-window entry. | **No MCD values were retrieved.** Both fields are null in the real snapshots. Synthetic demo entries are invented and labelled. The window is displayed, not enforced. |

CAB's MEDA and REMS observations are the partner contributions actually used in the weather snapshots. MCD's LMD / ESA / CNES role is credited as a referenced manual-input resource, not as downloaded project data. The repo mentions ESA HRSC, CSA APXS and UAE Emirates Mars Mission as possible partner resources; no such dataset is present in these committed planning inputs, so this draft does not claim their use.

## Science-stop context from NASA

The stop manifests preserve these citations. Habitat placement, science scores and work times are the team's planning choices, not NASA EVA instructions.

| Site / stop | NASA context linked by the manifest |
|---|---|
| Jezero R1, Enchanted Lake | [To Sample or Not to Sample](https://science.nasa.gov/blog/to-sample-or-not-to-sample) |
| Jezero R2, Amalik / Shuyak and Mageik | [Meet the Mars Samples: Shuyak and Mageik](https://science.nasa.gov/resource/meet-the-mars-samples-shuyak-and-mageik-samples-14-and-15) |
| Jezero R3, Hawksbill Gap | [Next Stop: Hawksbill Gap](https://science.nasa.gov/blog/next-stop-hawksbill-gap) |
| Jezero R4, Skinner Ridge / Wildcat Ridge | [Perseverance Rock Cores From Wildcat Ridge](https://science.nasa.gov/photojournal/perseverance-rock-cores-from-wildcat-ridge) |
| Jezero R5, Three Forks | [Perseverance's Three Forks Sample Depot Map](https://www.jpl.nasa.gov/images/pia25682-perseverances-three-forks-sample-depot-map/) |
| Jezero R6, delta top | [Map of Perseverance's Delta-Top Campaign](https://science.nasa.gov/photojournal/map-of-perseverances-delta-top-campaign) |
| Gale G1, boxwork trough | [Curiosity sols 4577–4579](https://science.nasa.gov/blog/curiosity-blog-sols-4577-4579-watch-the-skies) |
| Gale G2, Río Frío ridge wall | [Curiosity sols 4636–4637](https://science.nasa.gov/blog/curiosity-blog-sols-4636-4637-up-against-a-wall/) |
| Gale G3, paired drill sites | [Curiosity sols 4709–4715](https://science.nasa.gov/blog/curiosity-blog-sols-4709-4715-drilling-high-and-low-in-the-boxwork-unit) |
| Gale G4, sulfate contact | [Curiosity sols 4845–4851](https://science.nasa.gov/blog/curiosity-blog-sols-4845-4851-bye-bye-boxwork-bye-bye/) |

## Model evidence is separate from terrain observations

The [model](../model.md) and [source audit](../model-sources.md) give the complete parameter register, including terrestrial research and these NASA references:

- [Exploration EVA testing and analogs, Coan 2021](https://ntrs.nasa.gov/citations/20210000827): the 20° limit is a **lunar proxy**, not a Mars flight rule.
- [Apollo metabolism report, 1986](https://ntrs.nasa.gov/api/citations/19930074290/downloads/19930074290.pdf): Apollo averages inform the 272 W walking and 284 W working comparisons; they do not validate Mars-suit performance.
- [Providing Oxygen for the Crew of a Lunar Outpost, Jeng et al. 2009](https://ntrs.nasa.gov/citations/20090013081): historical suit-oxygen context; the 20% reserve remains a team choice.
- [NASA EVA performance risk report, 2017](https://ntrs.nasa.gov/citations/20170002574): context for terrain risk; the custom roughness thresholds are uncalibrated assumptions.
- [NASA Mars environment handbook](https://ntrs.nasa.gov/citations/20010046858): dust context; the walking and metabolic multipliers are assumed scenarios.
- [NASA-STD-3001 human-performance requirements](https://www.nasa.gov/reference/4-0-human-performance/): radiation context; it does not establish this prototype's per-walk allocation.

The synthetic demo terrain and conditions are invented, labelled examples. Real terrain does not make the assumed physiological model, safety thresholds or science scores measured facts.
