import { findPathAStar, findPathToResourceTile } from '../ai/AStar';
import { evaluateBayesianRisk } from '../ai/BayesianNetwork';
import { solveCSPTaskAllocation } from '../ai/CSPPlanner';
import { evaluateAgentDecision } from '../ai/IntelligentAgent';
import { getTerrainMovementCost } from '../data/terrain';
import {
  DifficultyLevel,
  SimulationEvent,
  SimulationState,
  Tile,
  WeatherType,
  WorldConfig,
} from '../types/simulation';
import { TASK_LABELS_KZ, WEATHER_LABELS_KZ } from '../utils/i18n';
import { createSeededRng } from '../utils/randomSeed';
import { generateIslandWorld } from './WorldGenerator';

const DIFFICULTY_MULT: Record<DifficultyLevel, number> = {
  easy: 0.78,
  normal: 1.0,
  hard: 1.32,
};

function determineInitialWeather(temp: number, rainfall: number): WeatherType {
  if (temp >= 31 && rainfall < 25) return 'drought';
  if (rainfall >= 75) return 'rainy';
  if (rainfall >= 45 && temp < 26) return 'cloudy';
  return 'sunny';
}

export function createInitialSimulationState(
  config: WorldConfig
): SimulationState {
  const { grid, campLocation, residents } = generateIslandWorld(config);
  const weather = determineInitialWeather(config.temperature, config.rainfall);

  const resources = {
    food: config.initialFood,
    water: config.initialWater,
    wood: config.initialWood,
    stone: config.initialStone,
    maxFood: 160,
    maxWater: 160,
    maxWood: 140,
    maxStone: 100,
  };

  const bayesian = evaluateBayesianRisk({
    temperature: config.temperature,
    rainfall: config.rainfall,
    foodReserve: resources.food,
    residentCount: residents.length,
    tick: 0,
  });

  const csp = solveCSPTaskAllocation({
    residents,
    resources,
    grid,
    sheltersCount: 1,
    survivalRisk: bayesian.pSurvivalRisk,
    tick: 0,
  });

  // Apply initial CSP assignments & initial agent routes
  const assignedResidents = residents.map((res) => {
    const match = csp.assignments.find((a) => a.residentId === res.id);
    const task = match ? match.task : res.assignedTask;
    const updatedRes = {
      ...res,
      assignedTask: task,
      currentTask: task,
    };
    const evalRes = evaluateAgentDecision({
      resident: updatedRes,
      grid,
      campLocation,
      resources,
      bayesian,
      tick: 0,
      day: 1,
    });

    let route = updatedRes.lastAStar;
    let path = updatedRes.currentPath;
    if (evalRes.targetTile) {
      route = findPathToResourceTile(
        grid,
        { x: updatedRes.x, y: updatedRes.y },
        evalRes.targetTile,
        { recordSteps: true }
      );
      path = route.found ? route.path.slice(1) : [];
    }

    return {
      ...updatedRes,
      currentTask: evalRes.objective,
      currentTarget: evalRes.targetTile
        ? { x: evalRes.targetTile.x, y: evalRes.targetTile.y }
        : null,
      currentPath: path,
      lastAStar: route,
      decisionHistory: [evalRes.decision],
      recentActivity: evalRes.decision.finalAction,
    };
  });

  const initialEvents: SimulationEvent[] = [
    {
      id: 'evt_0_init',
      tick: 0,
      day: 1,
      hour: 0,
      category: 'simulation',
      description: `PROJECT EDEN басталды (Seed: ${config.seed}, ${config.mapSize}×${config.mapSize}, ${residents.length} тұрғын).`,
      algorithm: 'System',
    },
    {
      id: 'evt_0_csp',
      tick: 0,
      day: 1,
      hour: 0,
      category: 'ai_decision',
      description: csp.solverMessage,
      algorithm: 'CSP',
    },
    {
      id: 'evt_0_bayes',
      tick: 0,
      day: 1,
      hour: 0,
      category: 'ai_decision',
      description: `Bayesian Network: бастапқы аман қалу қаупі ${(bayesian.pSurvivalRisk * 100).toFixed(1)}%.`,
      algorithm: 'Bayesian Network',
    },
  ];

  const avgHealth =
    assignedResidents.reduce((acc, r) => acc + r.health, 0) /
    Math.max(1, assignedResidents.length);

  return {
    config: { ...config },
    seed: config.seed,
    tick: 0,
    day: 1,
    hour: 0,
    ticksPerDay: 24,
    grid,
    campLocation,
    sheltersCount: 1,
    resources,
    environment: {
      temperature: config.temperature,
      rainfall: config.rainfall,
      weather,
      baseTemperature: config.temperature,
      baseRainfall: config.rainfall,
    },
    residents: assignedResidents,
    lastCSP: csp,
    lastBayesian: bayesian,
    events: initialEvents,
    history: [
      {
        tick: 0,
        day: 1,
        avgHealth: Number(avgHealth.toFixed(1)),
        food: resources.food,
        water: resources.water,
        wood: resources.wood,
        stone: resources.stone,
        survivalRisk: Number((bayesian.pSurvivalRisk * 100).toFixed(1)),
        waterShortageProb: Number((bayesian.pWaterShortage * 100).toFixed(1)),
        tasksCompleted: 0,
        sheltersBuilt: 1,
      },
    ],
    totalFoodCollected: 0,
    totalWaterCollected: 0,
    totalWoodCollected: 0,
    totalStoneCollected: 0,
    totalFoodConsumed: 0,
    totalWaterConsumed: 0,
    totalRouteCost: 0,
    totalUnmetNeeds: 0,
    totalConstraintViolations: 0,
    civilizationCollapsed: false,
  };
}

function cloneGrid(grid: Tile[][]): Tile[][] {
  return grid.map((row) => row.map((tile) => ({ ...tile })));
}

function pushEvent(
  events: SimulationEvent[],
  tick: number,
  day: number,
  hour: number,
  category: SimulationEvent['category'],
  description: string,
  algorithm: SimulationEvent['algorithm'],
  residentName?: string
) {
  events.unshift({
    id: `evt_${tick}_${events.length}_${algorithm}`,
    tick,
    day,
    hour,
    category,
    description,
    residentName,
    algorithm,
  });
  if (events.length > 260) {
    events.length = 260;
  }
}

/**
 * Centralized 15-step discrete simulation tick engine.
 * Deterministic for identical seed and configuration.
 */
export function stepSimulation(prev: SimulationState): SimulationState {
  if (prev.civilizationCollapsed) return prev;

  const nextTick = prev.tick + 1;
  const nextDay = Math.floor(nextTick / prev.ticksPerDay) + 1;
  const nextHour = nextTick % prev.ticksPerDay;
  const rng = createSeededRng(prev.seed + nextTick * 7919);
  const diffMult = DIFFICULTY_MULT[prev.config.difficulty];

  // 1. Read current environment & clone mutable structures safely
  const grid = cloneGrid(prev.grid);
  const resources = { ...prev.resources };
  const environment = { ...prev.environment };
  const events = [...prev.events];

  let totalFoodCollected = prev.totalFoodCollected;
  let totalWaterCollected = prev.totalWaterCollected;
  let totalWoodCollected = prev.totalWoodCollected;
  let totalStoneCollected = prev.totalStoneCollected;
  let totalFoodConsumed = prev.totalFoodConsumed;
  let totalWaterConsumed = prev.totalWaterConsumed;
  let totalRouteCost = prev.totalRouteCost;
  let totalUnmetNeeds = prev.totalUnmetNeeds;
  let totalConstraintViolations = prev.totalConstraintViolations;
  let sheltersCount = prev.sheltersCount;

  // 4 (pre-check) & environmental progression every 6 ticks
  if (nextTick % 6 === 0) {
    const roll = rng.next();
    let newWeather: WeatherType = environment.weather;
    if (environment.baseRainfall < 25 && environment.baseTemperature >= 30) {
      newWeather = roll < 0.55 ? 'drought' : roll < 0.85 ? 'sunny' : 'cloudy';
    } else if (environment.baseRainfall > 70) {
      newWeather = roll < 0.48 ? 'rainy' : roll < 0.72 ? 'storm' : 'cloudy';
    } else {
      if (roll < 0.38) newWeather = 'sunny';
      else if (roll < 0.66) newWeather = 'cloudy';
      else if (roll < 0.86) newWeather = 'rainy';
      else if (roll < 0.94) newWeather = 'drought';
      else newWeather = 'storm';
    }

    const tempDelta =
      newWeather === 'drought'
        ? 4
        : newWeather === 'sunny'
        ? 1.5
        : newWeather === 'rainy'
        ? -2.5
        : newWeather === 'storm'
        ? -3.5
        : 0;
    const rainDelta =
      newWeather === 'rainy'
        ? 22
        : newWeather === 'storm'
        ? 30
        : newWeather === 'drought'
        ? -18
        : newWeather === 'sunny'
        ? -6
        : 4;

    environment.temperature = Math.max(
      10,
      Math.min(44, Number((environment.baseTemperature + tempDelta).toFixed(1)))
    );
    environment.rainfall = Math.max(
      5,
      Math.min(100, Math.round(environment.baseRainfall + rainDelta))
    );

    if (newWeather !== environment.weather) {
      environment.weather = newWeather;
      pushEvent(
        events,
        nextTick,
        nextDay,
        nextHour,
        'environment',
        `Ауа райы өзгерді: ${WEATHER_LABELS_KZ[newWeather]} (${environment.temperature}°C, жауын ${environment.rainfall}%).`,
        'System'
      );
    }

    // Rainy weather slightly replenishes water and berries; drought evaporates water
    if (newWeather === 'rainy' || newWeather === 'storm') {
      resources.water = Math.min(resources.maxWater, resources.water + 2.5);
    } else if (newWeather === 'drought') {
      resources.water = Math.max(0, resources.water - 1.5);
    }
  }

  // Resource regeneration on island tiles every 4 ticks
  if (nextTick % 4 === 0) {
    const regenBonus = environment.weather === 'rainy' ? 2 : environment.weather === 'drought' ? 0.4 : 1;
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const t = grid[y][x];
        if (t.resourceType && t.resourceAmount < t.maxResourceAmount) {
          if (t.terrain === 'water') {
            t.resourceAmount = Math.min(t.maxResourceAmount, t.resourceAmount + 4);
          } else if (t.terrain === 'berry' || t.terrain === 'fertile') {
            t.resourceAmount = Math.min(
              t.maxResourceAmount,
              Number((t.resourceAmount + 1.2 * regenBonus).toFixed(1))
            );
          } else if (t.terrain === 'forest') {
            t.resourceAmount = Math.min(
              t.maxResourceAmount,
              Number((t.resourceAmount + 0.8 * regenBonus).toFixed(1))
            );
          }
        }
      }
    }
  }

  // 2 & 3. Update resident needs & consume available resources
  const shelterProtection = Math.min(0.45, sheltersCount * 0.12);
  const weatherStress =
    environment.weather === 'storm'
      ? 1.25 - shelterProtection
      : environment.weather === 'drought'
      ? 1.25
      : 1.0;

  let residents = prev.residents.map((r) => ({ ...r, inventory: { ...r.inventory } }));

  for (const res of residents) {
    if (res.health <= 0) continue;

    const hungerRate = 2.6 * diffMult;
    const thirstRate =
      (environment.temperature >= 30 ? 3.8 : 2.9) * diffMult * weatherStress;
    const energyDrain = res.state === 'resting' ? 0 : 2.3 * diffMult;

    res.hunger = Math.min(100, Number((res.hunger + hungerRate).toFixed(1)));
    res.thirst = Math.min(100, Number((res.thirst + thirstRate).toFixed(1)));
    res.energy = Math.max(0, Number((res.energy - energyDrain).toFixed(1)));

    // Consume food when hungry
    if (res.hunger >= 55 && resources.food >= 2) {
      const eatAmt = Math.min(resources.food, 3.5);
      resources.food = Number((resources.food - eatAmt).toFixed(1));
      totalFoodConsumed = Number((totalFoodConsumed + eatAmt).toFixed(1));
      res.hunger = Math.max(0, Number((res.hunger - eatAmt * 11).toFixed(1)));
      res.state = 'eating';
      res.recentActivity = 'Қордан тамақтанды';
    }

    // Consume water when thirsty
    if (res.thirst >= 55 && resources.water >= 2) {
      const drinkAmt = Math.min(resources.water, 3.5);
      resources.water = Number((resources.water - drinkAmt).toFixed(1));
      totalWaterConsumed = Number((totalWaterConsumed + drinkAmt).toFixed(1));
      res.thirst = Math.max(0, Number((res.thirst - drinkAmt * 12).toFixed(1)));
      res.state = 'drinking';
      res.recentActivity = 'Қордан су ішті';
    }

    // Unmet critical needs impact health
    if (res.hunger >= 85 || res.thirst >= 85) {
      const dmg = (res.hunger >= 95 || res.thirst >= 95 ? 5.5 : 2.5) * diffMult;
      res.health = Math.max(0, Number((res.health - dmg).toFixed(1)));
      res.unmetNeedTicks++;
      totalUnmetNeeds++;
    } else if (res.energy <= 10) {
      res.health = Math.max(0, Number((res.health - 1.2 * diffMult).toFixed(1)));
      res.unmetNeedTicks++;
      totalUnmetNeeds++;
    } else if (res.hunger < 55 && res.thirst < 55 && res.energy > 35) {
      res.health = Math.min(100, Number((res.health + 0.9).toFixed(1)));
    }
  }

  // 5. Calculate Bayesian Risk
  const aliveResidents = residents.filter((r) => r.health > 0);
  const bayesian = evaluateBayesianRisk({
    temperature: environment.temperature,
    rainfall: environment.rainfall,
    foodReserve: resources.food,
    residentCount: Math.max(1, aliveResidents.length),
    tick: nextTick,
  });

  if (
    bayesian.riskLevel !== prev.lastBayesian.riskLevel &&
    (bayesian.riskLevel === 'high' || bayesian.riskLevel === 'critical')
  ) {
    pushEvent(
      events,
      nextTick,
      nextDay,
      nextHour,
      'warning',
      `Bayesian Network аман қалу қаупінің жоғарылағанын анықтады: ${(bayesian.pSurvivalRisk * 100).toFixed(1)}%.`,
      'Bayesian Network'
    );
  }

  // 6 & 7. Determine if CSP needs refreshing (every 4 ticks or critical need shift)
  const needsCSPRefresh =
    nextTick % 4 === 0 ||
    residents.some(
      (r) =>
        r.health > 0 &&
        ((r.energy < 22 && r.assignedTask !== 'rest') ||
          (r.thirst >= 75 && r.assignedTask !== 'collect_water') ||
          (r.hunger >= 75 && r.assignedTask !== 'gather_food'))
    );

  let csp = prev.lastCSP;
  if (needsCSPRefresh && aliveResidents.length > 0) {
    csp = solveCSPTaskAllocation({
      residents,
      resources,
      grid,
      sheltersCount,
      survivalRisk: bayesian.pSurvivalRisk,
      tick: nextTick,
    });

    if (!csp.success) {
      totalConstraintViolations++;
    }

    let reassignedCount = 0;
    for (const assignment of csp.assignments) {
      const r = residents.find((res) => res.id === assignment.residentId);
      if (r && r.assignedTask !== assignment.task) {
        r.assignedTask = assignment.task;
        reassignedCount++;
      }
    }

    if (reassignedCount > 0) {
      pushEvent(
        events,
        nextTick,
        nextDay,
        nextHour,
        'ai_decision',
        `CSP жоспарлаушысы ${reassignedCount} тұрғынның тапсырмасын қайта бөлді.`,
        'CSP'
      );
    }
  }

  // 8, 9, 10, 11. Intelligent Agent Decision -> A* Pathfinding -> Move -> Act
  for (const res of residents) {
    if (res.health <= 0) {
      res.state = 'idle';
      res.recentActivity = 'Денсаулығы сыни күйде тоқтады';
      continue;
    }

    const { objective, targetTile, decision } = evaluateAgentDecision({
      resident: res,
      grid,
      campLocation: prev.campLocation,
      resources,
      bayesian,
      tick: nextTick,
      day: nextDay,
    });

    const objectiveChanged = res.currentTask !== objective;
    res.currentTask = objective;
    res.decisionHistory = [decision, ...res.decisionHistory].slice(0, 18);

    const targetCoords = targetTile ? { x: targetTile.x, y: targetTile.y } : null;
    const needsNewPath =
      objectiveChanged ||
      res.currentPath.length === 0 ||
      !res.currentTarget ||
      (targetCoords &&
        (res.currentTarget.x !== targetCoords.x ||
          res.currentTarget.y !== targetCoords.y));

    if (needsNewPath && targetTile) {
      const astarResult = findPathToResourceTile(
        grid,
        { x: res.x, y: res.y },
        targetTile,
        { recordSteps: true }
      );
      res.lastAStar = astarResult;
      res.currentTarget = targetCoords;
      res.currentPath = astarResult.found ? astarResult.path.slice(1) : [];

      if (objectiveChanged) {
        pushEvent(
          events,
          nextTick,
          nextDay,
          nextHour,
          'ai_decision',
          `${res.name} жаңа мақсат таңдады: ${TASK_LABELS_KZ[objective]}.`,
          'Intelligent Agents',
          res.name
        );
      }
    }

    // Move 1 step along A* path if not yet at target/adjacent
    if (res.currentPath.length > 0) {
      const nextStep = res.currentPath[0];
      const stepCost = getTerrainMovementCost(grid[nextStep.y][nextStep.x].terrain);
      res.x = nextStep.x;
      res.y = nextStep.y;
      res.currentPath = res.currentPath.slice(1);
      res.distanceTraveled++;
      totalRouteCost = Number((totalRouteCost + (Number.isFinite(stepCost) ? stepCost : 1)).toFixed(2));
      res.state = 'moving';
      res.recentActivity = `(${res.x}, ${res.y}) нүктесіне жылжуда (${TASK_LABELS_KZ[objective]})`;

      // Reveal surrounding tiles as explored
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ex = res.x + dx;
          const ey = res.y + dy;
          if (ey >= 0 && ey < grid.length && ex >= 0 && ex < grid[0].length) {
            if (!grid[ey][ex].explored) {
              grid[ey][ex].explored = true;
              if (
                grid[ey][ex].resourceType &&
                grid[ey][ex].resourceAmount > 15 &&
                objective === 'explore'
              ) {
                pushEvent(
                  events,
                  nextTick,
                  nextDay,
                  nextHour,
                  'resident_action',
                  `${res.name} (${ex}, ${ey}) координаттарынан жаңа ресурс аймағын ашты.`,
                  'Intelligent Agents',
                  res.name
                );
              }
            }
          }
        }
      }
    } else {
      // Resident is at destination (or adjacent to water/rock) -> Execute action!
      if (objective === 'rest') {
        const restBonus =
          res.x === prev.campLocation.x && res.y === prev.campLocation.y ? 22 : 14;
        res.energy = Math.min(100, Number((res.energy + restBonus).toFixed(1)));
        res.state = 'resting';
        res.recentActivity = `Демалуда (+${restBonus} энергия)`;
        if (res.energy >= 85) {
          res.tasksCompleted++;
        }
      } else if (objective === 'build_shelter') {
        if (resources.wood >= 12) {
          resources.wood = Number((resources.wood - 12).toFixed(1));
          const stoneUsed = Math.min(resources.stone, 4);
          resources.stone = Number((resources.stone - stoneUsed).toFixed(1));
          sheltersCount++;
          grid[prev.campLocation.y][prev.campLocation.x].hasShelter = true;
          res.state = 'building';
          res.tasksCompleted++;
          res.recentActivity = `Жаңа баспана салды (барлығы: ${sheltersCount})`;
          pushEvent(
            events,
            nextTick,
            nextDay,
            nextHour,
            'construction',
            `${res.name} 12 ағаш жұмсап, жаңа баспана тұрғызды (барлығы ${sheltersCount}).`,
            'CSP',
            res.name
          );
        } else {
          res.state = 'idle';
          res.recentActivity = 'Құрылыс үшін ағаш жеткіліксіз';
        }
      } else if (objective === 'gather_food' && res.currentTarget) {
        const tile = grid[res.currentTarget.y][res.currentTarget.x];
        if (tile.resourceType === 'food' && tile.resourceAmount > 0) {
          const gatherAmt = Number(
            Math.min(tile.resourceAmount, 5.5 * res.skills.foraging).toFixed(1)
          );
          tile.resourceAmount = Number((tile.resourceAmount - gatherAmt).toFixed(1));
          resources.food = Math.min(
            resources.maxFood,
            Number((resources.food + gatherAmt).toFixed(1))
          );
          totalFoodCollected = Number((totalFoodCollected + gatherAmt).toFixed(1));
          res.totalCollected = Number((res.totalCollected + gatherAmt).toFixed(1));
          res.tasksCompleted++;
          res.state = 'gathering';
          res.recentActivity = `+${gatherAmt} азық жинады`;
          pushEvent(
            events,
            nextTick,
            nextDay,
            nextHour,
            'resident_action',
            `${res.name} (${tile.x}, ${tile.y}) нүктесінен +${gatherAmt} азық жинады.`,
            'A*',
            res.name
          );
        }
      } else if (objective === 'collect_water' && res.currentTarget) {
        const tile = grid[res.currentTarget.y][res.currentTarget.x];
        if (tile.resourceType === 'water' && tile.resourceAmount > 0) {
          const waterAmt = Number(
            Math.min(tile.resourceAmount, 6.0 * res.skills.waterFinding).toFixed(1)
          );
          resources.water = Math.min(
            resources.maxWater,
            Number((resources.water + waterAmt).toFixed(1))
          );
          totalWaterCollected = Number((totalWaterCollected + waterAmt).toFixed(1));
          res.totalCollected = Number((res.totalCollected + waterAmt).toFixed(1));
          // Also immediately hydrate if thirsty
          if (res.thirst > 25) {
            const directDrink = Math.min(res.thirst, 25);
            res.thirst = Number((res.thirst - directDrink).toFixed(1));
          }
          res.tasksCompleted++;
          res.state = 'gathering';
          res.recentActivity = `+${waterAmt} су әкелді`;
          pushEvent(
            events,
            nextTick,
            nextDay,
            nextHour,
            'resident_action',
            `${res.name} су көзінен +${waterAmt} су жинады.`,
            'A*',
            res.name
          );
        }
      } else if (objective === 'collect_wood' && res.currentTarget) {
        const tile = grid[res.currentTarget.y][res.currentTarget.x];
        if (tile.resourceType === 'wood' && tile.resourceAmount > 0) {
          const woodAmt = Number(
            Math.min(tile.resourceAmount, 4.5 * res.skills.woodcutting).toFixed(1)
          );
          tile.resourceAmount = Number((tile.resourceAmount - woodAmt).toFixed(1));
          resources.wood = Math.min(
            resources.maxWood,
            Number((resources.wood + woodAmt).toFixed(1))
          );
          totalWoodCollected = Number((totalWoodCollected + woodAmt).toFixed(1));
          res.totalCollected = Number((res.totalCollected + woodAmt).toFixed(1));
          // Bonus stone if adjacent to rock
          if (rng.next() < 0.3) {
            resources.stone = Math.min(resources.maxStone, resources.stone + 1);
            totalStoneCollected += 1;
          }
          res.tasksCompleted++;
          res.state = 'gathering';
          res.recentActivity = `+${woodAmt} ағаш жинады`;
          pushEvent(
            events,
            nextTick,
            nextDay,
            nextHour,
            'resident_action',
            `${res.name} орманнан +${woodAmt} ағаш дайындады.`,
            'A*',
            res.name
          );
        }
      } else if (objective === 'explore') {
        res.state = 'exploring';
        res.tasksCompleted++;
        res.recentActivity = `(${res.x}, ${res.y}) маңын барлады`;
        // Small foraging bonus when exploring
        if (rng.next() < 0.4) {
          resources.food = Math.min(resources.maxFood, Number((resources.food + 2).toFixed(1)));
          totalFoodCollected += 2;
        }
        res.currentTarget = null;
      }
    }
  }

  // Resource low warnings
  if (nextTick % 8 === 0) {
    if (resources.water < 12) {
      pushEvent(
        events,
        nextTick,
        nextDay,
        nextHour,
        'warning',
        `Ескерту: Су қоры сыни деңгейге дейін төмендеді (${resources.water}).`,
        'System'
      );
    }
    if (resources.food < 12) {
      pushEvent(
        events,
        nextTick,
        nextDay,
        nextHour,
        'warning',
        `Ескерту: Азық-түлік қоры азаюда (${resources.food}).`,
        'System'
      );
    }
  }

  // 13. Update statistics & history
  const avgHealth =
    residents.reduce((sum, r) => sum + r.health, 0) / Math.max(1, residents.length);
  const totalCompleted = residents.reduce((sum, r) => sum + r.tasksCompleted, 0);
  const collapsed = residents.every((r) => r.health <= 0);

  if (collapsed && !prev.civilizationCollapsed) {
    pushEvent(
      events,
      nextTick,
      nextDay,
      nextHour,
      'warning',
      `${nextDay}-күні барлық тұрғындардың денсаулығы таусылды. Өркениет тоқтады.`,
      'System'
    );
  }

  const history = [
    ...prev.history,
    {
      tick: nextTick,
      day: nextDay,
      avgHealth: Number(avgHealth.toFixed(1)),
      food: Number(resources.food.toFixed(1)),
      water: Number(resources.water.toFixed(1)),
      wood: Number(resources.wood.toFixed(1)),
      stone: Number(resources.stone.toFixed(1)),
      survivalRisk: Number((bayesian.pSurvivalRisk * 100).toFixed(1)),
      waterShortageProb: Number((bayesian.pWaterShortage * 100).toFixed(1)),
      tasksCompleted: totalCompleted,
      sheltersBuilt: sheltersCount,
    },
  ].slice(-160);

  // 15. Return next simulation state
  return {
    ...prev,
    tick: nextTick,
    day: nextDay,
    hour: nextHour,
    grid,
    sheltersCount,
    resources,
    environment,
    residents,
    lastCSP: csp,
    lastBayesian: bayesian,
    events,
    history,
    totalFoodCollected,
    totalWaterCollected,
    totalWoodCollected,
    totalStoneCollected,
    totalFoodConsumed,
    totalWaterConsumed,
    totalRouteCost,
    totalUnmetNeeds,
    totalConstraintViolations,
    civilizationCollapsed: collapsed,
  };
}

/**
 * Helper used in tests and UI to recalculate A* between two coordinates on the current grid.
 */
export function computeInspectorAStar(
  grid: Tile[][],
  start: { x: number; y: number },
  goal: { x: number; y: number }
) {
  return findPathAStar(grid, start, goal, { recordSteps: true });
}
