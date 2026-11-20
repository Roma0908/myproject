import { getTerrainMovementCost, isWalkableTerrain } from '../data/terrain';
import { AStarResult, AStarStep, Coordinates, Tile } from '../types/simulation';

interface InternalNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parentKey: string | null;
}

function keyOf(x: number, y: number): string {
  return `${x},${y}`;
}

export function manhattanDistance(a: Coordinates, b: Coordinates): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

const DIRECTIONS: Coordinates[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export interface AStarOptions {
  recordSteps?: boolean;
  maxIterations?: number;
}

/**
 * Pure A* pathfinding implementation from scratch on the 2D island grid.
 * Uses Manhattan heuristic, g-score (cumulative terrain cost), h-score, f = g + h,
 * openSet, closedSet, and parent tracking.
 */
export function findPathAStar(
  grid: Tile[][],
  start: Coordinates,
  goal: Coordinates,
  options: AStarOptions = {}
): AStarResult {
  const height = grid.length;
  const width = height > 0 ? grid[0].length : 0;
  const recordSteps = options.recordSteps ?? true;
  const maxIterations = options.maxIterations ?? width * height * 4;

  const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;

  if (!inBounds(start.x, start.y) || !inBounds(goal.x, goal.y)) {
    return {
      found: false,
      start,
      goal,
      path: [],
      totalCost: Infinity,
      exploredNodes: [],
      frontierNodes: [],
      steps: [],
      status: 'unreachable',
    };
  }

  if (start.x === goal.x && start.y === goal.y) {
    return {
      found: true,
      start,
      goal,
      path: [{ ...start }],
      totalCost: 0,
      exploredNodes: [{ ...start }],
      frontierNodes: [],
      steps: [
        {
          stepIndex: 0,
          current: { ...start },
          openSet: [],
          closedSet: [{ ...start }],
          frontier: [],
          currentG: 0,
          currentH: 0,
          currentF: 0,
        },
      ],
      status: 'same_tile',
    };
  }

  if (!isWalkableTerrain(grid[goal.y][goal.x].terrain)) {
    return {
      found: false,
      start,
      goal,
      path: [],
      totalCost: Infinity,
      exploredNodes: [],
      frontierNodes: [],
      steps: [],
      status: 'unreachable',
    };
  }

  const openMap = new Map<string, InternalNode>();
  const closedSet = new Set<string>();
  const allNodes = new Map<string, InternalNode>();
  const exploredOrder: Coordinates[] = [];
  const steps: AStarStep[] = [];

  const hStart = manhattanDistance(start, goal);
  const startNode: InternalNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: hStart,
    f: hStart,
    parentKey: null,
  };

  const startKey = keyOf(start.x, start.y);
  openMap.set(startKey, startNode);
  allNodes.set(startKey, startNode);

  let iterations = 0;

  while (openMap.size > 0 && iterations < maxIterations) {
    iterations++;

    // Select node in openMap with lowest f-score (tie-break by lowest h-score)
    let currentKey = '';
    let current: InternalNode | null = null;

    for (const [k, node] of openMap.entries()) {
      if (
        !current ||
        node.f < current.f ||
        (node.f === current.f && node.h < current.h)
      ) {
        current = node;
        currentKey = k;
      }
    }

    if (!current) break;

    openMap.delete(currentKey);
    closedSet.add(currentKey);
    exploredOrder.push({ x: current.x, y: current.y });

    if (current.x === goal.x && current.y === goal.y) {
      if (recordSteps && steps.length < 180) {
        steps.push({
          stepIndex: steps.length,
          current: { x: current.x, y: current.y },
          openSet: Array.from(openMap.values()).map((n) => ({ x: n.x, y: n.y })),
          closedSet: [...exploredOrder],
          frontier: Array.from(openMap.values()).map((n) => ({ x: n.x, y: n.y })),
          currentG: Number(current.g.toFixed(2)),
          currentH: current.h,
          currentF: Number(current.f.toFixed(2)),
        });
      }

      // Reconstruct optimal route via parent pointers
      const path: Coordinates[] = [];
      let traceKey: string | null = currentKey;
      while (traceKey) {
        const node = allNodes.get(traceKey);
        if (!node) break;
        path.push({ x: node.x, y: node.y });
        traceKey = node.parentKey;
      }
      path.reverse();

      return {
        found: true,
        start,
        goal,
        path,
        totalCost: Number(current.g.toFixed(2)),
        exploredNodes: exploredOrder,
        frontierNodes: Array.from(openMap.values()).map((n) => ({ x: n.x, y: n.y })),
        steps,
        status: 'found',
      };
    }

    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      if (!inBounds(nx, ny)) continue;

      const nKey = keyOf(nx, ny);
      if (closedSet.has(nKey)) continue;

      const tile = grid[ny][nx];
      if (!isWalkableTerrain(tile.terrain)) continue;

      const stepCost = getTerrainMovementCost(tile.terrain);
      const tentativeG = current.g + stepCost;

      const existing = openMap.get(nKey);
      if (!existing || tentativeG < existing.g) {
        const h = manhattanDistance({ x: nx, y: ny }, goal);
        const updatedNode: InternalNode = {
          x: nx,
          y: ny,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parentKey: currentKey,
        };
        openMap.set(nKey, updatedNode);
        allNodes.set(nKey, updatedNode);
      }
    }

    if (recordSteps && steps.length < 180) {
      steps.push({
        stepIndex: steps.length,
        current: { x: current.x, y: current.y },
        openSet: Array.from(openMap.values()).map((n) => ({ x: n.x, y: n.y })),
        closedSet: [...exploredOrder],
        frontier: Array.from(openMap.values()).map((n) => ({ x: n.x, y: n.y })),
        currentG: Number(current.g.toFixed(2)),
        currentH: current.h,
        currentF: Number(current.f.toFixed(2)),
      });
    }
  }

  return {
    found: false,
    start,
    goal,
    path: [],
    totalCost: Infinity,
    exploredNodes: exploredOrder,
    frontierNodes: Array.from(openMap.values()).map((n) => ({ x: n.x, y: n.y })),
    steps,
    status: 'unreachable',
  };
}

/**
 * Finds the shortest A* path to a resource tile or an adjacent walkable tile
 * (essential for water shorelines or rocky cliff mining).
 */
export function findPathToResourceTile(
  grid: Tile[][],
  start: Coordinates,
  targetTile: Tile,
  options: AStarOptions = {}
): AStarResult {
  if (isWalkableTerrain(targetTile.terrain)) {
    return findPathAStar(grid, start, { x: targetTile.x, y: targetTile.y }, options);
  }

  const height = grid.length;
  const width = height > 0 ? grid[0].length : 0;
  let bestResult: AStarResult | null = null;

  for (const dir of DIRECTIONS) {
    const ax = targetTile.x + dir.x;
    const ay = targetTile.y + dir.y;
    if (ax < 0 || ay < 0 || ax >= width || ay >= height) continue;
    if (!isWalkableTerrain(grid[ay][ax].terrain)) continue;

    const candidate = findPathAStar(grid, start, { x: ax, y: ay }, options);
    if (candidate.found && (!bestResult || candidate.totalCost < bestResult.totalCost)) {
      bestResult = candidate;
    }
  }

  if (bestResult) {
    return bestResult;
  }

  return {
    found: false,
    start,
    goal: { x: targetTile.x, y: targetTile.y },
    path: [],
    totalCost: Infinity,
    exploredNodes: [],
    frontierNodes: [],
    steps: [],
    status: 'unreachable',
  };
}
