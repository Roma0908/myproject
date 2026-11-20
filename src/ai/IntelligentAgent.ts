import { TASK_LABELS_KZ } from '../utils/i18n';
import {
  AgentDecision,
  BayesianResult,
  Coordinates,
  NeedPriority,
  Resident,
  Resources,
  TaskType,
  Tile,
} from '../types/simulation';
import { findPathToResourceTile, findPathAStar, manhattanDistance } from './AStar';

export interface AgentPerceptionContext {
  resident: Resident;
  grid: Tile[][];
  campLocation: Coordinates;
  resources: Resources;
  bayesian: BayesianResult;
  tick: number;
  day: number;
}

export function findNearestResourceTile(
  grid: Tile[][],
  origin: Coordinates,
  resourceType: 'food' | 'water' | 'wood' | 'stone'
): Tile | null {
  let bestTile: Tile | null = null;
  let bestDist = Infinity;

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const tile = grid[y][x];
      if (tile.resourceType === resourceType && tile.resourceAmount > 0) {
        const d = manhattanDistance(origin, { x, y });
        if (d < bestDist) {
          bestDist = d;
          bestTile = tile;
        }
      }
    }
  }
  return bestTile;
}

export function findExplorationTarget(
  grid: Tile[][],
  origin: Coordinates
): Tile | null {
  let bestTile: Tile | null = null;
  let bestScore = Infinity;

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const tile = grid[y][x];
      if (!tile.explored && tile.terrain !== 'water' && tile.terrain !== 'rock') {
        const d = manhattanDistance(origin, { x, y });
        if (d > 1 && d < bestScore) {
          bestScore = d;
          bestTile = tile;
        }
      }
    }
  }
  return bestTile;
}

/**
 * Intelligent Agent Decision Cycle:
 * PERCEPTION -> STATE -> DECISION -> ACTION -> RESULT
 * Computes transparent utility scores for needs and assigned CSP tasks.
 */
export function evaluateAgentDecision(ctx: AgentPerceptionContext): {
  objective: TaskType;
  targetTile: Tile | null;
  decision: AgentDecision;
} {
  const { resident, grid, campLocation, resources, bayesian, tick, day } = ctx;

  const observations: string[] = [];
  observations.push(
    `Ішкі күй: Аштық ${Math.round(resident.hunger)}%, Шөл ${Math.round(resident.thirst)}%, Энергия ${Math.round(resident.energy)}%, Денсаулық ${Math.round(resident.health)}%.`
  );
  observations.push(
    `Қорлар: Азық ${Math.floor(resources.food)}, Су ${Math.floor(resources.water)}, Ағаш ${Math.floor(resources.wood)}.`
  );
  observations.push(
    `Bayesian қаупі: ${(bayesian.pSurvivalRisk * 100).toFixed(0)}%, су тапшылығы ${(bayesian.pWaterShortage * 100).toFixed(0)}%.`
  );

  // Utility calculation for each need & assigned work
  const thirstUrgency =
    resident.thirst >= 75
      ? 100 + (resident.thirst - 75) * 2
      : resident.thirst * 0.85 + (resources.water < 15 ? 18 : 0);

  const hungerUrgency =
    resident.hunger >= 75
      ? 95 + (resident.hunger - 75) * 2
      : resident.hunger * 0.8 + (resources.food < 15 ? 18 : 0);

  const energyUrgency =
    resident.energy <= 22
      ? 105 + (22 - resident.energy) * 2
      : resident.energy < 40
      ? (100 - resident.energy) * 0.9
      : (100 - resident.energy) * 0.35;

  const taskUtility =
    50 +
    (bayesian.pSurvivalRisk > 0.5 &&
    (resident.assignedTask === 'gather_food' ||
      resident.assignedTask === 'collect_water')
      ? 22
      : 0);

  const rawPriorities: NeedPriority[] = [
    {
      need: 'thirst',
      score: Number(thirstUrgency.toFixed(1)),
      reason:
        resident.thirst >= 75
          ? 'Шөл сыни деңгейде'
          : 'Қалыпты ылғалдану қажеттілігі',
    },
    {
      need: 'hunger',
      score: Number(hungerUrgency.toFixed(1)),
      reason:
        resident.hunger >= 75
          ? 'Аштық сыни деңгейде'
          : 'Қоректену қажеттілігі',
    },
    {
      need: 'energy',
      score: Number(energyUrgency.toFixed(1)),
      reason:
        resident.energy <= 22
          ? 'Энергия таусылуға жақын'
          : 'Күш қалпына келтіру',
    },
    {
      need: 'task',
      score: Number(taskUtility.toFixed(1)),
      reason: `CSP тапсырмасы: ${TASK_LABELS_KZ[resident.assignedTask]}`,
    },
  ];
  const priorities: NeedPriority[] = [...rawPriorities].sort((a, b) => b.score - a.score);

  const topPriority = priorities[0];
  let selectedObjective: TaskType = resident.assignedTask;

  if (topPriority.need === 'energy' && resident.energy <= 25) {
    selectedObjective = 'rest';
  } else if (topPriority.need === 'thirst' && resident.thirst >= 68) {
    selectedObjective = 'collect_water';
  } else if (topPriority.need === 'hunger' && resident.hunger >= 68) {
    selectedObjective = 'gather_food';
  } else {
    selectedObjective = resident.assignedTask;
  }

  // Determine target coordinates & verify A* reachability
  const origin: Coordinates = { x: resident.x, y: resident.y };
  let targetTile: Tile | null = null;
  let pathFound = true;
  let reason = '';
  let finalAction = '';

  if (selectedObjective === 'rest' || selectedObjective === 'build_shelter') {
    targetTile = grid[campLocation.y][campLocation.x];
    const route = findPathAStar(grid, origin, campLocation, { recordSteps: false });
    pathFound = route.found;
    reason =
      selectedObjective === 'rest'
        ? `${resident.name} энергиясы төмен (${Math.round(resident.energy)}%) болғандықтан демалуды таңдады.`
        : `${resident.name} қоныс аймағында баспана салу/жөндеу міндетін алды.`;
    finalAction =
      origin.x === campLocation.x && origin.y === campLocation.y
        ? `${TASK_LABELS_KZ[selectedObjective]} орындалуда`
        : `Қонысқа (${campLocation.x}, ${campLocation.y}) A* бағыты есептелді`;
  } else if (selectedObjective === 'explore') {
    targetTile = findExplorationTarget(grid, origin);
    if (!targetTile) {
      // Fallback to gathering wood or food if island is fully explored
      selectedObjective = resources.food < resources.water ? 'gather_food' : 'collect_wood';
    }
  }

  if (
    selectedObjective === 'gather_food' ||
    selectedObjective === 'collect_water' ||
    selectedObjective === 'collect_wood'
  ) {
    const resType =
      selectedObjective === 'gather_food'
        ? 'food'
        : selectedObjective === 'collect_water'
        ? 'water'
        : 'wood';

    targetTile = findNearestResourceTile(grid, origin, resType);
    if (targetTile) {
      const route = findPathToResourceTile(grid, origin, targetTile, {
        recordSteps: false,
      });
      pathFound = route.found;
      if (pathFound) {
        reason = `${resident.name} «${TASK_LABELS_KZ[selectedObjective]}» басымдығын ең жоғары (${topPriority.score} ұпай) деп есептеді.`;
        finalAction = `(${targetTile.x}, ${targetTile.y}) нүктесіне A* маршруты құрылды (құны: ${route.totalCost})`;
      } else {
        // Fallback when resource is unreachable
        selectedObjective = 'rest';
        targetTile = grid[campLocation.y][campLocation.x];
        reason = `Мақсатты ресурсқа жол жабық — қауіпсіз демалысқа көшті.`;
        finalAction = 'Баламалы шешім: лагерьге оралу';
      }
    } else {
      selectedObjective = 'explore';
      targetTile = findExplorationTarget(grid, origin) ?? grid[campLocation.y][campLocation.x];
      reason = `Қажетті ресурс көзі уақытша таусылған — жаңа аймақты барлауға ауысты.`;
      finalAction = 'Аралды барлау басталды';
    }
  } else if (selectedObjective === 'explore' && targetTile) {
    const route = findPathAStar(grid, origin, { x: targetTile.x, y: targetTile.y }, {
      recordSteps: false,
    });
    pathFound = route.found;
    reason = `${resident.name} зерттелмеген аумақтарды ашуды жөн көрді.`;
    finalAction = pathFound
      ? `(${targetTile.x}, ${targetTile.y}) барлау бағытына шықты`
      : 'Жақын маңда барлау жалғасуда';
  }

  const decision: AgentDecision = {
    tick,
    day,
    residentId: resident.id,
    residentName: resident.name,
    stateBefore: resident.state,
    observations,
    priorities,
    selectedObjective,
    reason,
    finalAction,
    targetCoords: targetTile ? { x: targetTile.x, y: targetTile.y } : null,
    pathFound,
  };

  return {
    objective: selectedObjective,
    targetTile,
    decision,
  };
}
