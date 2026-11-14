// Every model number lives here. Nothing else in the app should hard-code physics.
//
// Each entry is tagged:
//   SOURCE      — a published value, with the citation next to it
//   ASSUMPTION  — a placeholder we chose; must be cited or defended before the pitch
//
// Owner: engine lane (Codex 2). Other lanes read this file but do not edit it.

export const CONFIG = {
  // ---------- Walking speed ----------
  // Tobler-style hiking function: v = vFlat * exp(-k * |grade + g0|) / exp(-k * g0)
  // grade = rise / run (dimensionless). Fastest at a gentle downhill of -g0.
  walk: {
    vFlatMps: 1.0, // ASSUMPTION: Apollo EVA traverses averaged roughly 0.7–1.1 m/s on foot.
    toblerK: 3.5, // SOURCE: Tobler (1993) hiking function exponent (Earth).
    toblerG0: 0.05, // SOURCE: Tobler (1993) optimum grade offset (Earth).
    maxSlopeDeg: 25, // ASSUMPTION: steeper cells are impassable on foot in a suit.
  },

  // ---------- Metabolic cost ----------
  metabolic: {
    baseW: 300, // ASSUMPTION: Apollo lunar EVA averaged ~234 kcal/h (~272 W); rounded up for Mars gravity.
    uphillPerGrade: 3.0, // ASSUMPTION: +300% metabolic rate per unit grade uphill (i.e. +30% at 10%).
    downhillPerGrade: 0.5, // ASSUMPTION: downhill still costs extra for braking.
    dwellW: 200, // ASSUMPTION: metabolic rate while working at a stop (sampling, imaging).
  },

  // ---------- Terrain firmness (from thermal inertia) ----------
  // Thermal inertia in J m^-2 K^-1 s^-1/2 ("tiu").
  terrain: {
    looseSandTI: 200, // ASSUMPTION: below this, treat as loose fines/sand.
    bedrockTI: 400, // ASSUMPTION: above this, treat as firm rock.
    sandSpeedFactor: 0.6, // ASSUMPTION: walking speed multiplier on loose sand.
    sandMetabolicFactor: 1.4, // ASSUMPTION: metabolic multiplier on loose sand.
    // Roughness is 0..1 (0 = smooth, 1 = boulder field / cliff).
    roughnessBlock: 0.8, // ASSUMPTION: cells rougher than this are impassable.
    roughnessSpeedPenalty: 0.5, // ASSUMPTION: speed *= 1 - penalty * roughness.
  },

  // ---------- Suit consumables ----------
  suit: {
    o2CapacityKg: 0.5, // ASSUMPTION: usable primary O2 in a Mars EVA suit.
    reserveFraction: 0.2, // ASSUMPTION: keep 20% of O2 untouched for emergencies.
    o2JoulesPerLitre: 20100, // SOURCE: ~20.1 kJ released per litre of O2 consumed (respiratory physiology, RQ≈0.85).
    o2KgPerLitre: 0.001429, // SOURCE: O2 density at STP, 1.429 g/L.
  },

  // ---------- Radiation ----------
  radiation: {
    // SOURCE: Hassler et al. (2014), Science 343, Curiosity RAD at Gale Crater:
    // dose equivalent ~0.64 mSv/day on the surface. Used as a Mars-surface proxy for Jezero.
    surfaceMSvPerDay: 0.64,
    walkLimitMSv: 1.0, // ASSUMPTION: per-EVA dose budget for this tool.
  },

  // ---------- Conditions the astronaut can toggle ----------
  conditions: {
    dustStorm: {
      speedFactor: 0.7, // ASSUMPTION: reduced visibility slows walking.
      metabolicFactor: 1.1, // ASSUMPTION
      maxSlopeDeg: 20, // ASSUMPTION: avoid steeper ground when you can't see footing.
    },
    solarEvent: {
      doseFactor: 10, // ASSUMPTION: a moderate solar particle event raises surface dose ~10x.
    },
    heavyKit: {
      speedFactor: 0.85, // ASSUMPTION: carrying a sample kit.
      metabolicFactor: 1.25, // ASSUMPTION
      maxSlopeDeg: 20, // ASSUMPTION
    },
  },

  // ---------- Planner ----------
  planner: {
    bruteForceMaxStops: 7, // Exact best order up to this many stops; heuristic above.
  },
};
