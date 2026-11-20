import { RESIDENT_TEMPLATES } from '../data/probabilities';
import { isWalkableTerrain } from '../data/terrain';
import { Coordinates, Resident, TerrainType, Tile, WorldConfig } from '../types/simulation';
import { createSeededRng } from '../utils/randomSeed';

function createTile(
  x: number,
  y: number,
  terrain: TerrainType,
  elevation: number
): Tile {
  let resourceAmount = 0;
  let maxResourceAmount = 0;
  let resourceType: Tile['resourceType'] = null;

  if (terrain === 'berry') {
    resourceAmount = 35;
    maxResourceAmount = 40;
    resourceType = 'food';
  } else if (terrain === 'water') {
    resourceAmount = 100;
    maxResourceAmount = 100;
    resourceType = 'water';
  } else if (terrain === 'forest') {
    resourceAmount = 40;
    maxResourceAmount = 45;
    resourceType = 'wood';
  } else if (terrain === 'rock') {
    resourceAmount = 30;
    maxResourceAmount = 30;
    resourceType = 'stone';
  } else if (terrain === 'fertile') {
    resourceAmount = 18;
    maxResourceAmount = 25;
    resourceType = 'food';
  }

  return {
    x,
    y,
    terrain,
    resourceAmount,
    maxResourceAmount,
    resourceType,
    explored: false,
    elevation,
  };
}

/**
 * Generates a deterministic seeded island grid and ensures reachability
 * from the central camp to at least one water shoreline, food source, and forest.
 */
export function generateIslandWorld(config: WorldConfig): {
  grid: Tile[][];
  campLocation: Coordinates;
  residents: Resident[];
} {
  const size = config.mapSize;
  const rng = createSeededRng(config.seed);
  const center = Math.floor(size / 2);
  const campLocation: Coordinates = { x: center, y: center };

  const grid: Tile[][] = [];

  for (let y = 0; y < size; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < size; x++) {
      const dx = (x - center) / (size / 2);
      const dy = (y - center) / (size / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      const noise = (rng.next() - 0.5) * 0.28;
      const elevation = Number(Math.max(0, 1 - dist + noise).toFixed(2));

      let terrain: TerrainType = 'grassland';

      if (
        x === 0 ||
        y === 0 ||
        x === size - 1 ||
        y === size - 1 ||
        dist + noise * 0.5 > 0.94
      ) {
        terrain = 'water';
      } else {
        const roll = rng.next();
        if (roll < config.forestDensity) {
          terrain = 'forest';
        } else if (roll < config.forestDensity + 0.09) {
          terrain = 'berry';
        } else if (roll < config.forestDensity + 0.16) {
          terrain = 'fertile';
        } else if (roll < config.forestDensity + 0.23) {
          terrain = 'rock';
        } else if (roll < config.forestDensity + 0.30) {
          terrain = 'mud';
        } else {
          terrain = 'grassland';
        }
      }

      row.push(createTile(x, y, terrain, elevation));
    }
    grid.push(row);
  }

  // Carve a freshwater pond near the camp (guaranteed water access)
  const pondOffsetX = rng.next() > 0.5 ? 3 : -3;
  const pondOffsetY = rng.next() > 0.5 ? 2 : -2;
  const pondX = Math.max(2, Math.min(size - 3, center + pondOffsetX));
  const pondY = Math.max(2, Math.min(size - 3, center + pondOffsetY));
  grid[pondY][pondX] = createTile(pondX, pondY, 'water', 0.2);
  grid[pondY][pondX + 1] = createTile(pondX + 1, pondY, 'water', 0.2);

  // Clear camp settlement area & paths around camp
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = center + dx;
      const cy = center + dy;
      const isCenter = dx === 0 && dy === 0;
      const tile = createTile(cx, cy, isCenter ? 'path' : 'grassland', 0.85);
      tile.explored = true;
      if (isCenter) {
        tile.isCamp = true;
        tile.hasShelter = true;
      }
      grid[cy][cx] = tile;
    }
  }
  grid[center][center + 1] = createTile(center + 1, center, 'path', 0.85);
  grid[center][center + 1].explored = true;
  grid[center + 1][center] = createTile(center, center + 1, 'path', 0.85);
  grid[center + 1][center].explored = true;

  // Ensure guaranteed berry & forest clusters close enough to camp
  const guaranteeTile = (
    tx: number,
    ty: number,
    terrain: TerrainType
  ) => {
    const gx = Math.max(2, Math.min(size - 3, tx));
    const gy = Math.max(2, Math.min(size - 3, ty));
    grid[gy][gx] = createTile(gx, gy, terrain, 0.7);
  };

  guaranteeTile(center - 2, center - 2, 'berry');
  guaranteeTile(center - 3, center - 1, 'berry');
  guaranteeTile(center + 2, center - 3, 'forest');
  guaranteeTile(center + 3, center - 2, 'forest');
  guaranteeTile(center - 2, center + 3, 'rock');

  // BFS reachability verification & path carving if needed
  const getReachable = (): Set<string> => {
    const visited = new Set<string>();
    const queue: Coordinates[] = [campLocation];
    visited.add(`${campLocation.x},${campLocation.y}`);

    while (queue.length > 0) {
      const curr = queue.shift()!;
      const dirs = [
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
      ];
      for (const d of dirs) {
        const nx = curr.x + d.x;
        const ny = curr.y + d.y;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        if (isWalkableTerrain(grid[ny][nx].terrain)) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return visited;
  };

  const carveCorridor = (to: Coordinates) => {
    let cx = campLocation.x;
    let cy = campLocation.y;
    while (cx !== to.x) {
      cx += cx < to.x ? 1 : -1;
      if (!isWalkableTerrain(grid[cy][cx].terrain)) {
        grid[cy][cx] = createTile(cx, cy, 'grassland', 0.65);
      }
    }
    while (cy !== to.y) {
      cy += cy < to.y ? 1 : -1;
      if (!isWalkableTerrain(grid[cy][cx].terrain) && !(cx === to.x && cy === to.y)) {
        grid[cy][cx] = createTile(cx, cy, 'grassland', 0.65);
      }
    }
  };

  let reachable = getReachable();
  // Ensure pond shoreline is reachable
  const pondShore = { x: pondX - 1, y: pondY };
  if (!reachable.has(`${pondShore.x},${pondShore.y}`)) {
    grid[pondShore.y][pondShore.x] = createTile(pondShore.x, pondShore.y, 'grassland', 0.6);
    carveCorridor(pondShore);
    reachable = getReachable();
  }

  // Ensure guaranteed berry & forest tiles are reachable
  if (!reachable.has(`${center - 2},${center - 2}`)) {
    carveCorridor({ x: center - 2, y: center - 2 });
  }
  if (!reachable.has(`${center + 2},${center - 3}`)) {
    carveCorridor({ x: center + 2, y: center - 3 });
  }

  // Spawn residents on walkable tiles around camp
  const spawnOffsets: Coordinates[] = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
  ];

  const count = Math.max(3, Math.min(6, config.residentCount));
  const residents: Resident[] = [];

  for (let i = 0; i < count; i++) {
    const tpl = RESIDENT_TEMPLATES[i];
    const offset = spawnOffsets[i % spawnOffsets.length];
    const rx = center + offset.x;
    const ry = center + offset.y;
    grid[ry][rx].explored = true;

    residents.push({
      id: tpl.id,
      name: tpl.name,
      role: tpl.role,
      color: tpl.color,
      x: rx,
      y: ry,
      hunger: 18 + rng.nextInt(0, 12),
      thirst: 20 + rng.nextInt(0, 12),
      energy: 82 + rng.nextInt(0, 14),
      health: 96,
      skills: { ...tpl.skills },
      currentTask: i === 0 ? 'gather_food' : i === 1 ? 'collect_wood' : i === 2 ? 'collect_water' : 'explore',
      assignedTask: i === 0 ? 'gather_food' : i === 1 ? 'collect_wood' : i === 2 ? 'collect_water' : 'explore',
      currentTarget: null,
      currentPath: [],
      lastAStar: null,
      state: 'idle',
      inventory: { food: 0, water: 0, wood: 0, stone: 0 },
      recentActivity: 'Қонысқа орналасты',
      decisionHistory: [],
      tasksCompleted: 0,
      distanceTraveled: 0,
      totalCollected: 0,
      unmetNeedTicks: 0,
    });
  }

  return { grid, campLocation, residents };
}
