// ── World dimensions ───────────────────────────────────────────────────────
export const WORLD_W = 5000;
export const WORLD_H = 3000;
export const LAND_Y  = 2200; // y >= LAND_Y is land; y < LAND_Y is navigable water

// ── Biome zones (order matters: later zones take precedence at boundaries) ─
export const ZONES = [
  {
    id: 'arctic',      label: 'Arctic Sea',
    x: 0,    y: 0,    w: 5000, h: 600,
    water: '#5AAEC8', wave: 'rgba(200,230,255,0.12)', fog: 'rgba(180,210,240,0.14)',
  },
  {
    id: 'deep_ocean',  label: 'Deep Ocean',
    x: 3600, y: 600,  w: 1400, h: 1600,
    water: '#06192E', wave: 'rgba(0,40,100,0.20)',    fog: 'rgba(0,10,40,0.18)',
  },
  {
    id: 'open_ocean',  label: 'Open Ocean',
    x: 2400, y: 600,  w: 1200, h: 1600,
    water: '#163E78', wave: 'rgba(100,160,255,0.10)', fog: null,
  },
  {
    id: 'coastal',     label: 'Coastal Waters',
    x: 1700, y: 600,  w: 700,  h: 1600,
    water: '#12826A', wave: 'rgba(100,220,200,0.12)', fog: null,
  },
  {
    id: 'lake',        label: 'Open Lake',
    x: 700,  y: 600,  w: 1000, h: 900,
    water: '#165880', wave: 'rgba(80,150,220,0.10)',  fog: null,
  },
  {
    id: 'swamp',       label: 'Mangrove Swamp',
    x: 700,  y: 1500, w: 1000, h: 700,
    water: '#374E1E', wave: 'rgba(60,80,30,0.15)',    fog: 'rgba(30,50,10,0.22)',
  },
  {
    id: 'river',       label: 'River',
    x: 250,  y: 600,  w: 450,  h: 1100,
    water: '#22685A', wave: 'rgba(80,180,150,0.10)',  fog: null,
  },
  {
    id: 'pond',        label: 'Lily Pond',
    x: 0,    y: 1700, w: 700,  h: 500,
    water: '#306840', wave: 'rgba(80,160,100,0.10)',  fog: null,
  },
];

// ── Fishing spots (wx/wy = world coords, zone = biome id) ─────────────────
export const FISHING_SPOTS = [
  { id: 'pond_1',     wx: 260,  wy: 1820, zone: 'pond',       label: 'Lily Pond'    },
  { id: 'pond_2',     wx: 540,  wy: 1960, zone: 'pond',       label: 'Shallow End'  },
  { id: 'river_1',   wx: 430,  wy: 780,  zone: 'river',      label: 'River North'  },
  { id: 'river_2',   wx: 400,  wy: 1200, zone: 'river',      label: 'River Bend'   },
  { id: 'river_3',   wx: 380,  wy: 1560, zone: 'river',      label: 'River South'  },
  { id: 'lake_1',    wx: 950,  wy: 850,  zone: 'lake',       label: 'Lake Shore'   },
  { id: 'lake_2',    wx: 1380, wy: 1100, zone: 'lake',       label: 'Deep Lake'    },
  { id: 'swamp_1',   wx: 880,  wy: 1670, zone: 'swamp',      label: 'Swamp Hollow' },
  { id: 'swamp_2',   wx: 1280, wy: 1870, zone: 'swamp',      label: 'Root Maze'    },
  { id: 'coastal_1', wx: 1920, wy: 940,  zone: 'coastal',    label: 'Tide Pool'    },
  { id: 'coastal_2', wx: 2150, wy: 1550, zone: 'coastal',    label: 'Sea Grass'    },
  { id: 'ocean_1',   wx: 2750, wy: 880,  zone: 'open_ocean', label: 'Open Ocean'   },
  { id: 'ocean_2',   wx: 3100, wy: 1450, zone: 'open_ocean', label: 'Blue Water'   },
  { id: 'arctic_1',  wx: 1500, wy: 200,  zone: 'arctic',     label: 'Ice Shelf'    },
  { id: 'arctic_2',  wx: 3500, wy: 360,  zone: 'arctic',     label: 'Polar Deep'   },
  { id: 'deep_1',    wx: 3950, wy: 920,  zone: 'deep_ocean', label: 'The Abyss'    },
  { id: 'deep_2',    wx: 4500, wy: 1600, zone: 'deep_ocean', label: 'Hadal Zone'   },
];

// ── Docks (walkable over water for boarding) ──────────────────────────────
export const DOCKS = [
  { id: 'main',   x: 880,  y: 2050, w: 960, h: 150 },  // town dock
  { id: 'arctic', x: 1100, y: 570,  w: 420, h: 50  },  // arctic pier
  { id: 'ocean',  x: 2600, y: 2120, w: 420, h: 50  },  // south ocean pier (on land edge)
];

// ── Town buildings ─────────────────────────────────────────────────────────
export const BUILDINGS = {
  home: { x: 820,  y: 2320 },
  shop: { x: 1380, y: 2320 },
};

// ── Starting positions ─────────────────────────────────────────────────────
export const PLAYER_START = { x: 1150, y: 2300 };
export const BOAT_START   = { x: 940,  y: 2020 };

// ── Helpers ────────────────────────────────────────────────────────────────
export function getZoneAt(wx, wy) {
  for (let i = ZONES.length - 1; i >= 0; i--) {
    const z = ZONES[i];
    if (wx >= z.x && wx < z.x + z.w && wy >= z.y && wy < z.y + z.h) return z;
  }
  return null;
}

export function isWaterAt(wx, wy) {
  return getZoneAt(wx, wy) !== null;
}

export function isDockAt(wx, wy) {
  for (const d of DOCKS) {
    if (wx >= d.x && wx < d.x + d.w && wy >= d.y && wy < d.y + d.h) return true;
  }
  return false;
}
