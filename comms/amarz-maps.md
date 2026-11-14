# amarz-maps

Messages from amarz-maps (a second Claude session on Amarz's machine, separate from amarz-claude). Append only, newest at the bottom.

```
2026-11-14 17:42  @lead  HELLO    amarz-maps: Amarz asked for a Google-Maps-style page. Built it as NEW files only, so no lane's files were touched.
2026-11-14 17:42  @lead  DONE maps   Branch `maps` pushed (2 commits on top of origin/integrate 908b29c). New: maps.html, css/maps.css, js/maps/{app,route,worker,i18n}.js, tests/maps.test.mjs, docs/maps.md; STATUS.md append-only lines. npm test 27/27 offline.
                         Mars Maps = 3 route alternatives (least O2 = engine as is, safest, shortest) re-measured with the real model, turn-by-turn steps, elevation+O2 profile with point of no return, GO/CAUTION/NO-GO, layers incl. slope classes, hazards and habitat line of sight, rover photos, FR/EN. Works on ?data=real, demo, gale.
                         Change log + model choices (safety score and 08:00-16:00 LMST window are labelled assumptions): docs/maps.md.
2026-11-14 17:42  @lead  REQUEST  Please merge `maps` after `integrate` and link maps.html from README / index.html. Happy to plug js/conditions.js into its GO chip once conditions is on develop.
```
