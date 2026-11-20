import { findNearestResourceTile } from '../ai/IntelligentAgent';
import { getTerrainMovementCost, isWalkableTerrain } from '../data/terrain';
import { createInitialSimulationState, stepSimulation } from '../simulation/SimulationEngine';
import {
  ExperimentResult,
  SimulationState,
  StrategyMetrics,
  WorldConfig,
} from '../types/simulation';
import { createSeededRng } from '../utils/randomSeed';

/**
 * Strategy A: BASELINE
 * - Static initial task assignments (no CSP dynamic reallocation)
 * - No Bayesian risk adaptation
 * - Simple greedy 1-step Manhattan movement (no A* cost avoidance)
 * - Basic reactive hunger/thirst checks only when critical (>= 85)
 */
function stepBaselineSimulation(prev: SimulationState): SimulationState {
  if (prev.civilizationCollapsed) return prev;

  const nextTick = prev.tick + 1;
  const nextDay = Math.floor(nextTick / prev.ticksPerDay) + 1;
  const rng = createSeededRng(prev.seed + nextTick * 7919);
  const diffMult =
    prev.config.difficulty === 'easy'
      ? 0.78
      : prev.config.difficulty === 'hard'
      ? 1.32
      : 1.0;

  const grid = prev.grid.map((row) => row.map((t) => ({ ...t })));
  const resources = { ...prev.resources };
  const environment = { ...prev.environment };
  let totalFoodCollected = prev.totalFoodCollected;
  let totalWaterCollected = prev.totalWaterCollected;
  let totalWoodCollected = prev.totalWoodCollected;
  let totalFoodConsumed = prev.totalFoodConsumed;
  let totalWaterConsumed = prev.totalWaterConsumed;
  let totalRouteCost = prev.totalRouteCost;
  let totalUnmetNeeds = prev.totalUnmetNeeds;
  let totalConstraintViolations = prev.totalConstraintViolations;
  let sheltersCount = prev.sheltersCount;

  if (nextTick % 6 === 0) {
    const roll = rng.next();
    if (environment.baseRainfall < 25 && environment.baseTemperature >= 30) {
      environment.weather = roll < 0.55 ? 'drought' : 'sunny';
    } else if (environment.baseRainfall > 70) {
      environment.weather = roll < 0.48 ? 'rainy' : 'cloudy';
    }
    if (environment.weather === 'rainy') {
      resources.water = Math.min(resources.maxWater, resources.water + 2.5);
    } else if (environment.weather === 'drought') {
      resources.water = Math.max(0, resources.water - 1.5);
    }
  }

  if (nextTick % 4 === 0) {
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const t = grid[y][x];
        if (t.resourceType && t.resourceAmount < t.maxResourceAmount) {
          if (t.terrain === 'berry' || t.terrain === 'fertile') {
            t.resourceAmount = Math.min(t.maxResourceAmount, t.resourceAmount + 1.0);
          } else if (t.terrain === 'forest') {
            t.resourceAmount = Math.min(t.maxResourceAmount, t.resourceAmount + 0.7);
          }
        }
      }
    }
  }

  const residents = prev.residents.map((r) => ({ ...r }));

  for (const res of residents) {
    if (res.health <= 0) continue;

    res.hunger = Math.min(100, Number((res.hunger + 2.6 * diffMult).toFixed(1)));
    res.thirst = Math.min(
      100,
      Number(
        (res.thirst + (environment.temperature >= 30 ? 3.8 : 2.9) * diffMult).toFixed(1)
      )
    );
    res.energy = Math.max(0, Number((res.energy - 2.3 * diffMult).toFixed(1)));

    // Basic consumption
    if (res.hunger >= 60 && resources.food >= 2) {
      const amt = Math.min(resources.food, 3.5);
      resources.food -= amt;
      totalFoodConsumed += amt;
      res.hunger = Math.max(0, res.hunger - amt * 11);
    }
    if (res.thirst >= 60 && resources.water >= 2) {
      const amt = Math.min(resources.water, 3.5);
      resources.water -= amt;
      totalWaterConsumed += amt;
      res.thirst = Math.max(0, res.thirst - amt * 12);
    }

    if (res.hunger >= 85 || res.thirst >= 85) {
      res.health = Math.max(0, Number((res.health - 3.5 * diffMult).toFixed(1)));
      totalUnmetNeeds++;
    } else if (res.energy <= 10) {
      res.health = Math.max(0, Number((res.health - 1.2 * diffMult).toFixed(1)));
      totalUnmetNeeds++;
    } else if (res.hunger < 55 && res.thirst < 55 && res.energy > 35) {
      res.health = Math.min(100, Number((res.health + 0.7).toFixed(1)));
    }

    // Check static task violations (e.g. working while exhausted or building without wood)
    if (res.energy < 22 && res.assignedTask !== 'rest') {
      totalConstraintViolations++;
    }

    // Basic greedy target selection without CSP or A*
    let task = res.assignedTask;
    if (res.energy <= 15) task = 'rest';
    else if (res.thirst >= 85) task = 'collect_water';
    else if (res.hunger >= 85) task = 'gather_food';

    let target = prev.campLocation;
    if (task === 'gather_food') {
      const t = findNearestResourceTile(grid, { x: res.x, y: res.y }, 'food');
      if (t) target = { x: t.x, y: t.y };
    } else if (task === 'collect_water') {
      const t = findNearestResourceTile(grid, { x: res.x, y: res.y }, 'water');
      if (t) target = { x: t.x, y: t.y };
    } else if (task === 'collect_wood') {
      const t = findNearestResourceTile(grid, { x: res.x, y: res.y }, 'wood');
      if (t) target = { x: t.x, y: t.y };
    }

    // Naive 1-step greedy movement (no A* obstacle/cost planning)
    const dist = Math.abs(res.x - target.x) + Math.abs(res.y - target.y);
    if (dist > (task === 'collect_water' ? 1 : 0)) {
      const candidates = [
        { x: res.x + Math.sign(target.x - res.x), y: res.y },
        { x: res.x, y: res.y + Math.sign(target.y - res.y) },
        { x: res.x + 1, y: res.y },
        { x: res.x - 1, y: res.y },
        { x: res.x, y: res.y + 1 },
        { x: res.x, y: res.y - 1 },
      ];
      let moved = false;
      for (const c of candidates) {
        if (
          c.y >= 0 &&
          c.y < grid.length &&
          c.x >= 0 &&
          c.x < grid[0].length &&
          (c.x !== res.x || c.y !== res.y) &&
          isWalkableTerrain(grid[c.y][c.x].terrain)
        ) {
          const cost = getTerrainMovementCost(grid[c.y][c.x].terrain);
          res.x = c.x;
          res.y = c.y;
          totalRouteCost += Number.isFinite(cost) ? cost : 1;
          moved = true;
          break;
        }
      }
      if (!moved) {
        res.energy = Math.min(100, res.energy + 4);
      }
    } else {
      if (task === 'rest') {
        res.energy = Math.min(100, res.energy + 16);
      } else if (task === 'gather_food') {
        const tile = grid[target.y][target.x];
        if (tile.resourceType === 'food' && tile.resourceAmount > 0) {
          const amt = Math.min(tile.resourceAmount, 4.5);
          tile.resourceAmount -= amt;
          resources.food = Math.min(resources.maxFood, resources.food + amt);
          totalFoodCollected += amt;
        }
      } else if (task === 'collect_water') {
        const amt = 5.0;
        resources.water = Math.min(resources.maxWater, resources.water + amt);
        totalWaterCollected += amt;
      } else if (task === 'collect_wood') {
        const tile = grid[target.y][target.x];
        if (tile.resourceType === 'wood' && tile.resourceAmount > 0) {
          const amt = Math.min(tile.resourceAmount, 4.0);
          tile.resourceAmount -= amt;
          resources.wood = Math.min(resources.maxWood, resources.wood + amt);
          totalWoodCollected += amt;
        }
      } else if (task === 'build_shelter') {
        if (resources.wood >= 12) {
          resources.wood -= 12;
          sheltersCount++;
        } else {
          totalConstraintViolations++;
        }
      }
    }
  }

  const avgHealth =
    residents.reduce((sum, r) => sum + r.health, 0) / Math.max(1, residents.length);
  const collapsed = residents.every((r) => r.health <= 0);

  return {
    ...prev,
    tick: nextTick,
    day: nextDay,
    hour: nextTick % prev.ticksPerDay,
    grid,
    sheltersCount,
    resources,
    environment,
    residents,
    totalFoodCollected,
    totalWaterCollected,
    totalWoodCollected,
    totalFoodConsumed,
    totalWaterConsumed,
    totalRouteCost,
    totalUnmetNeeds,
    totalConstraintViolations,
    civilizationCollapsed: collapsed,
  };
}

function summarizeStrategy(
  name: string,
  state: SimulationState,
  timeline: { tick: number; avgHealth: number; food: number; water: number }[]
): StrategyMetrics {
  const avgHealth =
    state.residents.reduce((sum, r) => sum + r.health, 0) /
    Math.max(1, state.residents.length);
  const aliveResidents = state.residents.filter((r) => r.health > 0).length;

  return {
    strategyName: name,
    daysSurvived: Number((state.tick / state.ticksPerDay).toFixed(2)),
    ticksCompleted: state.tick,
    avgHealth: Number(avgHealth.toFixed(1)),
    aliveResidents,
    foodCollected: Number(state.totalFoodCollected.toFixed(1)),
    waterCollected: Number(state.totalWaterCollected.toFixed(1)),
    woodCollected: Number(state.totalWoodCollected.toFixed(1)),
    foodConsumed: Number(state.totalFoodConsumed.toFixed(1)),
    waterConsumed: Number(state.totalWaterConsumed.toFixed(1)),
    totalRouteCost: Number(state.totalRouteCost.toFixed(1)),
    unmetNeeds: state.totalUnmetNeeds,
    constraintViolations: state.totalConstraintViolations,
    sheltersBuilt: state.sheltersCount,
    finalFood: Number(state.resources.food.toFixed(1)),
    finalWater: Number(state.resources.water.toFixed(1)),
    healthTimeline: timeline,
  };
}

/**
 * Runs Strategy A (Baseline) and Strategy B (PROJECT EDEN AI) completely independently
 * from identical deep-cloned seeded starting conditions.
 */
export function runComparativeExperiment(
  baseConfig: WorldConfig,
  durationTicks: number
): ExperimentResult {
  let baselineState = createInitialSimulationState(baseConfig);
  let aiState = createInitialSimulationState(baseConfig);

  const baselineTimeline: {
    tick: number;
    avgHealth: number;
    food: number;
    water: number;
  }[] = [];
  const aiTimeline: {
    tick: number;
    avgHealth: number;
    food: number;
    water: number;
  }[] = [];

  for (let t = 0; t < durationTicks; t++) {
    if (!baselineState.civilizationCollapsed) {
      baselineState = stepBaselineSimulation(baselineState);
    }
    if (!aiState.civilizationCollapsed) {
      aiState = stepSimulation(aiState);
    }

    if (t % 2 === 0 || t === durationTicks - 1) {
      const bHealth =
        baselineState.residents.reduce((s, r) => s + r.health, 0) /
        Math.max(1, baselineState.residents.length);
      const aHealth =
        aiState.residents.reduce((s, r) => s + r.health, 0) /
        Math.max(1, aiState.residents.length);

      baselineTimeline.push({
        tick: t + 1,
        avgHealth: Number(bHealth.toFixed(1)),
        food: Number(baselineState.resources.food.toFixed(1)),
        water: Number(baselineState.resources.water.toFixed(1)),
      });
      aiTimeline.push({
        tick: t + 1,
        avgHealth: Number(aHealth.toFixed(1)),
        food: Number(aiState.resources.food.toFixed(1)),
        water: Number(aiState.resources.water.toFixed(1)),
      });
    }
  }

  return {
    id: `exp_${Date.now()}_${baseConfig.seed}`,
    createdAt: new Date().toISOString(),
    seed: baseConfig.seed,
    durationTicks,
    difficulty: baseConfig.difficulty,
    mapSize: baseConfig.mapSize,
    baseline: summarizeStrategy('BASELINE (Статикалық)', baselineState, baselineTimeline),
    edenAI: summarizeStrategy('PROJECT EDEN AI', aiState, aiTimeline),
  };
}
