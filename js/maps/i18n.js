// Generated with AI assistance for NASA Space Apps 2026; reviewed by the team
//
// Mars Maps UI strings, English + French. t('key', {n: 3}) fills {n}.

const STR = {
  en: {
    appTagline: 'Walking directions on Mars',
    search: 'Search places on Mars…',
    searchEmpty: 'No place matches',
    directions: 'Directions',
    from: 'Start',
    habitat: 'Habitat',
    addStop: 'Add a stop',
    addStopHint: 'Tap a place on the map or search to add it',
    optimizedOrder: 'Visiting order is optimised for you',
    leaveAt: 'Leave at',
    lmst: 'LMST',
    conditions: 'Conditions',
    dustStorm: 'Dust storm', dustStormD: 'slower, max slope 20°',
    solarEvent: 'Solar event', solarEventD: 'dose ×10',
    heavyKit: 'Heavy kit', heavyKitD: 'sample bag, slower',
    routes: 'Routes',
    mode_eco: 'Least oxygen', mode_eco_d: 'Least metabolic effort, the default',
    mode_safe: 'Safest', mode_safe_d: 'Avoids steep ground, sand and blind spots',
    mode_short: 'Shortest', mode_short_d: 'Fewest metres, steeper and sandier',
    best: 'Best', planning: 'Planning…',
    km: 'km', m: 'm', min: 'min', h: 'h',
    o2: 'Oxygen', dose: 'Radiation', time: 'Time', distance: 'Distance', safety: 'Safety',
    o2Used: '{used} of {usable} kg usable',
    doseOf: '{v} of {lim} mSv',
    safetyScore: 'Safety score',
    climb: 'Climb', maxSlope: 'Max slope', sand: 'Loose sand', los: 'In sight of habitat', range: 'Max distance from habitat',
    walkback: 'Longest walk back', margin: 'Lowest O₂ margin',
    returnAt: 'Back at {t}',
    steps: 'Step by step',
    depart: 'Leave {from} heading {dir}',
    turn_left: 'Turn left, head {dir}', turn_right: 'Turn right, head {dir}',
    'turn_slight-left': 'Bear left, head {dir}', 'turn_slight-right': 'Bear right, head {dir}',
    turn_straight: 'Continue {dir}', turn_uturn: 'Turn around, head {dir}',
    arrive: 'Arrive at {to}', arriveHome: 'Back at the habitat',
    work: 'Work {n} min',
    up: 'up', down: 'down',
    go: 'GO', caution: 'CAUTION', nogo: 'NO-GO',
    r_o2: 'Oxygen over the usable budget', r_dose: 'Radiation over the EVA limit',
    r_solar: 'Solar particle event: stay sheltered', r_dust: 'Dust storm: reduced visibility',
    r_margin: 'Less than 10 % oxygen margin', r_score: 'Low safety score',
    r_window: 'Return after the assumed EVA window ({end})',
    r_ok: 'Fits oxygen, dose and the EVA window',
    turnBack: 'Point of no return', turnBackAt: 'Turn back by {t} at the latest ({d} km)',
    turnBackNone: 'No point of no return: you can always reach home with reserve',
    dropHint: 'Drop {name} to save {o2} kg O₂',
    dropBtn: 'Drop it',
    profile: 'Elevation & oxygen',
    pElev: 'Elevation', pO2: 'O₂ left', pHome: 'O₂ needed to get home', pReserve: 'Reserve',
    layers: 'Map layers',
    base: 'Base map', hirise: 'HiRISE 25 cm imagery', ctx: 'CTX 6 m imagery', none: 'Plain',
    overlays: 'Overlays',
    l_hillshade: 'Shaded relief', l_slope: 'Slope classes', l_hazard: 'Hazards', l_sand: 'Loose sand',
    l_viewshed: 'Habitat line of sight', l_traverse: 'Perseverance traverse',
    lg_slope: ['0–10°', '10–15°', '15–20°', '> 20° no-go'],
    lg_hazard: ['impassable', 'steep 15–20°', 'loose sand'],
    lg_view: ['visible from habitat (radio)', 'blind spot'],
    value: 'Science value', dwell: 'Work time', sol: 'Sol', photos: 'Rover photos',
    inRoute: 'In your route', add: 'Add to route', remove: 'Remove from route',
    customStop: 'Custom stop {n}', customNote: 'A point you added on the map.',
    sources: 'Data & assumptions',
    syntheticBanner: 'Synthetic demo terrain, not real Mars data.',
    realData: 'Real data · Jezero delta front',
    realGale: 'Real data · Gale, Mount Sharp boxwork',
    placeholder: 'placeholder: team to define',
    doseGale: 'Dose rate measured by Curiosity RAD here in Gale Crater (0.64 mSv/day).',
    doseNote: 'Dose rate from Curiosity RAD at Gale Crater (0.64 mSv/day), used as a proxy for Jezero.',
    windowNote: 'EVA window 08:00–16:00 LMST is a team assumption.',
    scoreNote: 'Safety score is a ranking heuristic (slope, sand, line of sight, O₂ margin), not a certification.',
    recenter: 'Fit area', zoomIn: 'Zoom in', zoomOut: 'Zoom out',
    error: 'Could not load data: {msg}',
    unreachable: 'Unreachable: {ids}',
    lang: 'FR',
    noStops: 'Add at least one stop to get directions',
    legend: 'Legend',
    hover: 'Move over the profile to follow the walk on the map',
    elapsed: 'Elapsed', left: 'left', home: 'home',
  },
  fr: {
    appTagline: 'Itinéraires à pied sur Mars',
    search: 'Rechercher un lieu sur Mars…',
    searchEmpty: 'Aucun lieu trouvé',
    directions: 'Itinéraire',
    from: 'Départ',
    habitat: 'Habitat',
    addStop: 'Ajouter un arrêt',
    addStopHint: 'Touchez la carte ou cherchez un lieu pour l’ajouter',
    optimizedOrder: 'L’ordre de visite est optimisé pour vous',
    leaveAt: 'Départ à',
    lmst: 'HLMS',
    conditions: 'Conditions',
    dustStorm: 'Tempête de poussière', dustStormD: 'plus lent, pente max 20°',
    solarEvent: 'Éruption solaire', solarEventD: 'dose ×10',
    heavyKit: 'Kit lourd', heavyKitD: 'sac d’échantillons, plus lent',
    routes: 'Itinéraires',
    mode_eco: 'Moins d’oxygène', mode_eco_d: 'Effort métabolique minimal, par défaut',
    mode_safe: 'Plus sûr', mode_safe_d: 'Évite les pentes, le sable et les angles morts',
    mode_short: 'Plus court', mode_short_d: 'Moins de mètres, plus raide et sableux',
    best: 'Meilleur', planning: 'Calcul…',
    km: 'km', m: 'm', min: 'min', h: 'h',
    o2: 'Oxygène', dose: 'Radiation', time: 'Durée', distance: 'Distance', safety: 'Sécurité',
    o2Used: '{used} sur {usable} kg utilisables',
    doseOf: '{v} sur {lim} mSv',
    safetyScore: 'Indice de sécurité',
    climb: 'Dénivelé +', maxSlope: 'Pente max', sand: 'Sable meuble', los: 'En vue de l’habitat', range: 'Distance max de l’habitat',
    walkback: 'Plus long retour', margin: 'Marge O₂ minimale',
    returnAt: 'Retour à {t}',
    steps: 'Étape par étape',
    depart: 'Quittez {from} vers {dir}',
    turn_left: 'Tournez à gauche, vers {dir}', turn_right: 'Tournez à droite, vers {dir}',
    'turn_slight-left': 'Serrez à gauche, vers {dir}', 'turn_slight-right': 'Serrez à droite, vers {dir}',
    turn_straight: 'Continuez vers {dir}', turn_uturn: 'Faites demi-tour, vers {dir}',
    arrive: 'Arrivée à {to}', arriveHome: 'Retour à l’habitat',
    work: 'Travail {n} min',
    up: 'montée', down: 'descente',
    go: 'GO', caution: 'PRUDENCE', nogo: 'NO-GO',
    r_o2: 'Oxygène au-delà du budget utilisable', r_dose: 'Radiation au-delà de la limite EVA',
    r_solar: 'Événement à particules solaires : restez à l’abri', r_dust: 'Tempête de poussière : visibilité réduite',
    r_margin: 'Moins de 10 % de marge d’oxygène', r_score: 'Indice de sécurité faible',
    r_window: 'Retour après la fenêtre EVA supposée ({end})',
    r_ok: 'Oxygène, dose et fenêtre EVA respectés',
    turnBack: 'Point de non-retour', turnBackAt: 'Faites demi-tour au plus tard à {t} ({d} km)',
    turnBackNone: 'Pas de point de non-retour : le retour reste toujours possible avec réserve',
    dropHint: 'Retirez {name} pour économiser {o2} kg d’O₂',
    dropBtn: 'Retirer',
    profile: 'Altitude et oxygène',
    pElev: 'Altitude', pO2: 'O₂ restant', pHome: 'O₂ pour rentrer', pReserve: 'Réserve',
    layers: 'Calques',
    base: 'Fond de carte', hirise: 'Imagerie HiRISE 25 cm', ctx: 'Imagerie CTX 6 m', none: 'Uni',
    overlays: 'Superpositions',
    l_hillshade: 'Relief ombré', l_slope: 'Classes de pente', l_hazard: 'Dangers', l_sand: 'Sable meuble',
    l_viewshed: 'Visibilité depuis l’habitat', l_traverse: 'Trajet de Perseverance',
    lg_slope: ['0–10°', '10–15°', '15–20°', '> 20° interdit'],
    lg_hazard: ['infranchissable', 'raide 15–20°', 'sable meuble'],
    lg_view: ['visible depuis l’habitat (radio)', 'angle mort'],
    value: 'Valeur scientifique', dwell: 'Temps de travail', sol: 'Sol', photos: 'Photos du rover',
    inRoute: 'Dans votre itinéraire', add: 'Ajouter à l’itinéraire', remove: 'Retirer de l’itinéraire',
    customStop: 'Arrêt perso {n}', customNote: 'Un point ajouté sur la carte.',
    sources: 'Données et hypothèses',
    syntheticBanner: 'Terrain de démo synthétique, pas des données martiennes.',
    realData: 'Données réelles · front du delta de Jezero',
    realGale: 'Données réelles · Gale, boxwork du mont Sharp',
    placeholder: 'valeur provisoire : à définir par l’équipe',
    doseGale: 'Débit de dose mesuré par RAD (Curiosity) ici même, au cratère Gale (0,64 mSv/jour).',
    doseNote: 'Débit de dose mesuré par RAD (Curiosity) au cratère Gale (0,64 mSv/jour), utilisé comme approximation pour Jezero.',
    windowNote: 'La fenêtre EVA 08:00–16:00 HLMS est une hypothèse de l’équipe.',
    scoreNote: 'L’indice de sécurité est une heuristique de classement (pente, sable, ligne de vue, marge O₂), pas une certification.',
    recenter: 'Recentrer', zoomIn: 'Zoom avant', zoomOut: 'Zoom arrière',
    error: 'Impossible de charger les données : {msg}',
    unreachable: 'Inaccessible : {ids}',
    lang: 'EN',
    noStops: 'Ajoutez au moins un arrêt pour obtenir un itinéraire',
    legend: 'Légende',
    hover: 'Survolez le profil pour suivre la marche sur la carte',
    elapsed: 'Écoulé', left: 'restant', home: 'retour',
  },
};

const DIRS = {
  en: ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'],
  fr: ['le nord', 'le nord-est', 'l’est', 'le sud-est', 'le sud', 'le sud-ouest', 'l’ouest', 'le nord-ouest'],
};

let lang = 'en';
try {
  const q = new URLSearchParams(location.search).get('lang');
  lang = q || localStorage.getItem('mm-lang') || (navigator.language || 'en').slice(0, 2);
} catch { /* storage blocked */ }
if (!STR[lang]) lang = 'en';

export const getLang = () => lang;
export function setLang(l) {
  lang = STR[l] ? l : 'en';
  try { localStorage.setItem('mm-lang', lang); } catch { /* ignore */ }
  document.documentElement.lang = lang;
}

export function t(key, vars) {
  let s = STR[lang][key] ?? STR.en[key] ?? key;
  if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}

export function dirName(heading) {
  return DIRS[lang][Math.round(((heading % 360) + 360) % 360 / 45) % 8];
}

export function num(v, digits = 0) {
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString(lang === 'fr' ? 'fr-CA' : 'en-CA', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
