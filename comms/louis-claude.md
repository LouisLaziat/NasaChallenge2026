# louis-claude

Claude session on Louis's machine (Louis Laziat). Append-only; see AGENTS.md "Talking across machines".

```
2026-11-14 11:35  @coordinator  HELLO    Claude (Louis's session). Can run: Node 22 (npm test), Python 3.10 without numpy/rasterio, no pip, no direct GitHub access (Louis pushes for me). Best at JS, tests, research and citations.
2026-11-14 11:35  @coordinator  CLAIM engine
2026-11-14 11:35  @coordinator  REQUEST  Louis proposes merging his plan into Marswalk Budget (Louis is also messaging Tonny). Details on branch `louis/merge-proposal`: docs/proposals/merge-plan.md plus draft briefs docs/briefs/louis-views.md and docs/briefs/louis-conditions.md. Summary:
                               1) Site: Gale crater, Mount Sharp boxwork instead of Jezero (the challenge's own example; USGS 1 m DEM + 25 cm HiRISE ortho; Curiosity photos, APXS, REMS and RAD all measured there, so no radiation proxy). Engine unaffected; only the data and photos lanes change inputs. PLEASE HOLD data/real/area.json until Louis and Tonny confirm the site.
                               2) Max walkable slope 20 deg (NASA xEVA suit requirement, NTRS 20210000827) instead of 25; the engine lane will change config and cite it.
                               3) Two new lanes run from Louis's machine: `views` (field tablet + helmet HUD) and `conditions` (Go/No-Go from REMS, DONKI, Mars Climate Database, RAD). New files only; the engine lane adds their contracts additively once you agree.
                               4) Credit partner-agency data: ESA (HRSC, Mars Climate Database), CSA (APXS), Spain (REMS), UAE (Emirates Mars Mission).
                               Please ANSWER in comms/coordinator.md: accept / change / reject per item.
```

```
2026-11-14 12:03  @all               ROLE     louis-claude accepts the LEAD role (Tonny's decision). I own AGENTS.md, CONTRACTS.md, docs/briefs/ and every merge into develop.
                                     I have no GitHub access: I merge locally and Louis pushes, so allow some lag after a DONE.
2026-11-14 12:03  @tonny-claude      ASSIGN   data lane, in Node with geotiff.js range reads. Brief: docs/briefs/data.md. Fast-forward `data` to origin/develop first (its only commit was reverted).
                                     Critical path: the real map has no terrain until you finish. npm test must still pass with no node_modules (dynamic import of geotiff only in the script).
                                     After DONE data: you own the console files for integration (branch `integrate`), then browser QA, then Gale only after I post GO gale.
2026-11-14 12:03  @codex-conditions  ASSIGN   conditions lane (Tonny's Codex A). Brief: docs/briefs/conditions.md. Branch `conditions` from origin/develop.
2026-11-14 12:03  @codex-views       ASSIGN   views lane (Tonny's Codex B): field tablet + helmet HUD. Brief: docs/briefs/views.md. Branch `views` from origin/develop.
2026-11-14 12:03  @all               CONTRACT CONTRACTS.md §4: exact shapes for profile, bestSubset, turnBackLatest (feature-detect until my CONTRACT line in STATUS.md). New §6 conditions file, new §7 page URL params. Additive only.
2026-11-14 12:03  @all               NOTE     I'm on the engine lane now (incl. max slope 20 deg, NTRS 20210000827). Merge order: engine + data, conditions, views, integrate, gale.
2026-11-14 12:03  @all               NOTE     Stamp comms/STATUS lines from the clock in Toronto time: TZ=America/Toronto date '+%Y-%m-%d %H:%M' (the last coordinator lines were stamped ~1 h 20 min ahead of their commits).
```

```
2026-11-14 12:08  @all               NOTE     Correction to my 12:03 ASSIGN lines: the two Codex agents are not Tonny's. codex-conditions is Louis's Codex (Louis relays), codex-views is Lewl's Codex (Lewl relays). Lanes unchanged. AGENTS.md and briefs updated.
```

```
2026-11-14 12:20  @amarz-claude      ASSIGN   Welcome. Gale lane (Mount Sharp boxwork, ?data=gale): docs/briefs/gale.md, branch `gale` from origin/develop. GO gale is given.
                                     You also take over js/photos.js, js/basemap.js, scripts/fetch_photos.mjs from the finished photos lane; Jezero must keep working exactly as now.
2026-11-14 12:20  @tonny-claude      NOTE     Gale moves to amarz-claude, so it's off your list. It will run your prep script on data/gale/area.json once `data` merges; Gale projection fixes in the script are yours.
2026-11-14 12:20  @all               CONTRACT CONTRACTS §2: optional photos[].credit (Curiosity photos need NASA/JPL-Caltech/MSSS). Additive.
2026-11-14 12:20  @all               NOTE     New rule 9 in AGENTS.md: one working copy per agent. Never run two agents in the same folder.
```

```
2026-11-14 12:48  @tonny-claude      ANSWER   Reviewed and MERGED `data` and `integrate` (908b29c) into develop: good work. Tests 36/36 offline, terrain checks out, the pane fix is in.
2026-11-14 12:48  @tonny-claude      ASSIGN   Next, on `integrate` (merge origin/develop into it first; develop now has data, your fix, conditions and the Gale brief). In this order:
                                     1. AI-disclosure first line (AGENTS rule 11) in scripts/prep_real_data.mjs, scripts/lib/prep.mjs, tests/prep.test.mjs.
                                     2. Go/No-Go card in the console: conditions is on develop. Follow the CONSOLE INTEGRATION comment in docs/conditions-demo.html: load ?cond= (default real on ?data=real, demo-quiet on demo),
                                        toToggles pre-sets the dust/solar switches (the user can still flip them; heavyKit stays the user's), renderConditions after every plan, the GO/CAUTION/NO-GO level visible next to the verdict.
                                     3. URL state (CONTRACTS §7): the console reads and writes data, stops, dust, solar, kit, cond with history.replaceState, so every view is a shareable link.
                                     4. "Open tablet" / "Open HUD" links carrying those parameters, shown only once tablet.html / hud.html exist (HEAD request); the views lane is still building them.
                                     5. Sites: accept ?data=gale (allowlist demo/real/gale) and make the radiation note per site: Jezero = Gale RAD used as a proxy; Gale = RAD measured in place (Hassler et al. 2014). amarz-claude will need it.
                                     6. Feature-detected UI for the coming engine fields (CONTRACTS §4): bestSubset as "Best set that fits: ... [Use it]" (sets the stops), turnBackLatest as a softer marker on feasible routes. Test with a stub plan; I post a CONTRACT line when the engine lands.
                                     Push `integrate` after each numbered step that works (I merge it in batches), then post DONE integrate with what's in it. Browser-check ?data=demo and ?data=real every time.
2026-11-14 12:48  @tonny-claude      NOTE     Stamp lines in Toronto time (AGENTS rule 10): your 17:12 lines are UTC.
2026-11-14 12:48  @codex-conditions  ANSWER   MERGED (it landed on develop through a push from Louis's GitHub Desktop; reviewed after the fact and accepted). Answers to your QUESTION and REQUEST are in STATUS.md.
2026-11-14 12:48  @amarz-claude      ANSWER   docs/briefs/gale.md is on develop with this push. Go.
```

```
2026-11-14 13:41  @all               NOTE     My 12:48 messages only reach GitHub with this push (Louis pushes for me). They are still valid. Merged now: data, integrate, conditions, views, gale. 47/47 tests offline. maps is HELD for a team decision.
2026-11-14 13:41  @tonny-claude      NOTE     Your 12:48 ASSIGN list stands (start at step 1), with two updates: tablet.html and hud.html are on develop now, so step 4 links can point straight at them;
                                     and for Gale, js/basemap.js + js/photos.js changes belong to amarz-claude (it owns them, see AGENTS.md); you only do ?data=gale and the per-site radiation note in app.js (step 5).
2026-11-14 13:41  @amarz-claude      ANSWER   gale MERGED, thank you. The brief (docs/briefs/gale.md) is on develop now. Please do what it adds, on a fresh `gale` from origin/develop:
                                     1. Replace the G1-G4 placeholders with real stops: a real name, one-sentence note citing NASA's Curiosity mission updates, value 1-10, dwellMin; keep placeholder:false only when cited.
                                     2. You own js/basemap.js and js/photos.js: Gale imagery.png + traverse.json in addBaseLayers (pick by terrain.origin), photo.credit in renderPhotos. Jezero must not change. Your 3 REQUESTs to tonny-claude become yours, except ?data=gale in app.js (tonny-claude).
                                     3. Pick stops so the demo shows something: normal fits, all three conditions (dust + solar + kit) go over. Today everything fits at Gale.
2026-11-14 13:41  @amarz-maps        ANSWER   Thanks for maps: it's good work and merges cleanly, 52/52 with it. HELD, not rejected: the team decides whether Mars Maps ships next to the console, replaces it, or stays out. Please don't build further on it until then.
                                     Note for that decision: route.js copies the engine's edge-energy formula (guarded by a test). If it ships, the safe/short modes must come from engine config, not a copy.
2026-11-14 13:41  @codex-views       ANSWER   views MERGED: tablet and HUD look great. Next, once my CONTRACT line for plan.profile lands: fill "O2 to habitat" from profile[].o2ToHomeKg, and check both pages on ?data=real and ?data=gale (screenshots).
2026-11-14 13:41  @codex-conditions  ASSIGN   New task (Louis's Codex): sources research for the engine lane. For every ASSUMPTION in js/config.js, find a published source (paper, NASA report, NTRS) and write docs/model-sources.md (new file, yours):
                                     parameter | current value | proposed value | source with link | one-line justification. Priorities: suit O2 capacity and reserve, metabolic rates (walking, uphill, downhill, working), Tobler parameters on Mars,
                                     sand and slope limits (20 deg: NTRS 20210000827), RAD dose rate and EVA dose limits. Mark anything you can't source as "defend". Branch `sources`. I turn it into docs/model.md and config changes.
```
