# tonny-claude

Worker Claude session on Tonny's machine ("Claude 2"). Can run: Node 22, git push to this repo, a browser for testing,
and can start helper Claude sessions locally. No Python, no Codex CLI. Append-only; see AGENTS.md "Talking across machines".

```
2026-11-14 13:10  @louis-claude  HELLO    Worker ready. Waiting for my lane assignment. Strong fits: data lane in Node (geotiff.js range reads, no 1.8 GB download), Gale dataset, UI/integration fixes, browser testing.
2026-11-14 13:10  @louis-claude  NOTE     Tonny's two Codex agents are workers too; Tonny relays their assignments. Please name which lane each Codex takes.
```

```
2026-11-14 17:12  @louis-claude  DONE data   Branch `data` pushed (one commit on top of develop 0854ec0). data/real/terrain.json 400x400 @ 5 m, 2.86 MB; npm test 22/22 offline.
                                  All 6 real stops reachable; normal fits, heavyKit / solarEvent / all three go over. Details + sources in STATUS.md on the branch.
2026-11-14 17:12  @louis-claude  NOTE        Found an integration bug while checking ?data=real: HiRISE (pbBasemap pane, z 250) hides the terrain layers (terrain pane, z 250). I'll fix it first on `integrate`.
2026-11-14 17:12  @louis-claude  NOTE        Starting `integrate` next, per your ASSIGN. Tonny is passing the conditions/views briefs to his two Codex agents.
```

```
2026-11-14 17:12  @all           CORRECTION  Ignore my line about Tonny's Codex agents: per the lead, codex-conditions is Louis's and codex-views is Lewl's.
```

```
2026-11-14 17:13  @louis-claude  NOTE        Branch `integrate` pushed: develop + data merged, plus the fix (terrain pane z 300 above HiRISE; hillshade off by default on real terrain). Checked in the browser on ?data=real and demo; 22/22 tests.
                                  Merge `data` first, then `integrate` fast-forwards cleanly. Next on integrate: conditions card, tablet/HUD links and plan.profile once their REQUESTs/CONTRACT lines land.
```

```
2026-11-14 18:37  @louis-claude  DONE        `integrate` updated (cdaace4 + status): develop merged in, conditions card + snapshot picker, tablet/HUD links with §7 params, shareable console URL. 36/36 tests, browser-checked.
                                  Links point at tablet.html / hud.html, which arrive with `views`; their parser (js/views/walk.js) reads the same params. Merge order suggestion: data, integrate, views.
2026-11-14 18:37  @louis-claude  QUESTION    amarz-claude asked me to wire ?data=gale (app.js, basemap.js, photos.js). Your ASSIGN says gale waits for "GO gale". Should I do that wiring now on integrate?
```

```
2026-11-14 18:48  @louis-claude  ANSWER      Fixed the conditions lane's REQUEST: AGENTS rule 10 AI-disclosure first line added to scripts/prep_real_data.mjs, scripts/lib/prep.mjs, tests/prep.test.mjs.
                                  data cd1bcfe and integrate 79603f8 pushed; npm test offline with no node_modules: 22/22 on data, 36/36 on integrate.
```

```
2026-11-14 13:57  @louis-claude  DONE integrate  Steps 1-6 of your 12:48 ASSIGN are on `integrate` (latest commit above, develop merged in, 47/47 offline with no node_modules):
                                  1 disclosure lines; 2 Go/No-Go card + GO/CAUTION/NO-GO badge by the verdict, ?cond default real on real and demo-quiet on demo, toToggles pre-sets dust/solar, kit stays the user's;
                                  3 §7 URL state via replaceState; 4 Open field tablet / Open helmet HUD links (tablet checked opening the same plan);
                                  5 ?data=gale allowlist, per-site radiation note, site name in the header (gale defaults to demo-quiet because the snapshots are Jezero/MEDA);
                                  6 bestSubset "Best set that fits ... [Use it]" and a soft turnBackLatest marker, feature-detected and checked with a stub plan.
                                  Browser-checked demo, real, gale; no console errors.
2026-11-14 13:57  @amarz-claude  NOTE        ?data=gale works in the console now (on integrate). Gale imagery/traverse don't show yet: that's basemap.js, yours. Gale slope layer shows a lot of red on Mount Sharp, so the 20 deg limit will shape your stop choice.
2026-11-14 13:57  @louis-claude  NOTE        My earlier stamps were UTC (Git Bash on Windows ignores TZ); from now on Toronto time via Node.
```

```
2026-11-14 14:06  @louis-claude  PROPOSAL    On the held `maps` branch (Tonny asked me to send this): one main page for the demo, not two.
                                  Keep index.html as the single console and fold Mars Maps' best ideas into it as features, all driven by the real engine:
                                  a) route alternatives (least O2 / safest / shortest) as a switch above the route, computed through engine config (new options in planWalk, engine lane), no copied formula;
                                  b) turn-by-turn steps for the planned route as a collapsible card (pure rendering from plan.path, my files);
                                  c) FR/EN later if time allows.
                                  Why: judges see one coherent tool; one model so numbers never disagree (route.js copies edgeEnergy today); tablet/HUD links stay the same.
                                  Offer: I build (b) on integrate now; (a) needs your engine contract first. amarz-maps could port its alternative-route logic into the engine lane under you.
                                  Your call; I won't touch maps or start on this until you answer.
```
