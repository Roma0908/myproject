import { TASK_LABELS_KZ } from '../utils/i18n';
import {
  CSPAssignment,
  CSPConstraintViolation,
  CSPResult,
  Resident,
  Resources,
  TaskType,
  Tile,
} from '../types/simulation';

export interface CSPContext {
  residents: Resident[];
  resources: Resources;
  grid: Tile[][];
  sheltersCount: number;
  survivalRisk: number;
  tick: number;
  taskCapacities?: Partial<Record<TaskType, number>>;
}

const ALL_TASKS: TaskType[] = [
  'collect_water',
  'gather_food',
  'collect_wood',
  'build_shelter',
  'explore',
  'rest',
];

const DEFAULT_CAPACITIES: Record<TaskType, number> = {
  gather_food: 2,
  collect_water: 2,
  collect_wood: 2,
  build_shelter: 1,
  explore: 1,
  rest: 6,
};

function hasResourceOnMap(
  grid: Tile[][],
  resourceType: 'food' | 'water' | 'wood'
): boolean {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const tile = grid[y][x];
      if (tile.resourceType === resourceType && tile.resourceAmount > 0) {
        return true;
      }
    }
  }
  return false;
}

function taskSkillAffinity(resident: Resident, task: TaskType): number {
  switch (task) {
    case 'gather_food':
      return resident.skills.foraging;
    case 'collect_water':
      return resident.skills.waterFinding;
    case 'collect_wood':
      return resident.skills.woodcutting;
    case 'build_shelter':
      return resident.skills.building;
    case 'explore':
      return resident.skills.exploration;
    case 'rest':
      return resident.energy < 40 ? 1.5 : 0.4;
  }
}

/**
 * Constraint Satisfaction Problem (CSP) Task Allocation Solver.
 * Implements explicit unary & global constraints, domain filtering,
 * Minimum Remaining Values (MRV) variable ordering, Forward Checking,
 * and Backtracking search with conflict detection.
 */
export function solveCSPTaskAllocation(ctx: CSPContext): CSPResult {
  const capacities: Record<TaskType, number> = {
    ...DEFAULT_CAPACITIES,
    ...ctx.taskCapacities,
  };

  const hasFoodTile = hasResourceOnMap(ctx.grid, 'food');
  const hasWaterTile = hasResourceOnMap(ctx.grid, 'water');
  const hasWoodTile = hasResourceOnMap(ctx.grid, 'wood');
  const woodAvailableForShelter = ctx.resources.wood >= 12;

  const constraintsChecked = [
    '1. Әр тұрғынға дәл бір тапсырма тағайындалуы тиіс',
    '2. Энергия < 22 болса -> тек Rest тағайындалады',
    '3. Сыни шөл (Thirst ≥ 75) -> Collect Water басымдығы',
    '4. Сыни аштық (Hunger ≥ 75) -> Gather Food басымдығы',
    '5. Әр тапсырмада жұмысшы саны сыйымдылықтан аспауы тиіс',
    '6. Баспана салу (Build Shelter) үшін кемінде 12 ағаш қажет',
    '7. Ресурс жинау үшін картада қолжетімді ресурс көзі болуы шарт',
    '8. Денсаулығы сыни (< 25) тұрғын ауыр құрылыс пен барлауға жіберілмейді',
  ];

  const rejectedAssignments: CSPConstraintViolation[] = [];
  const domains = new Map<string, TaskType[]>();

  // Step 1: Compute unary-consistent domains for each variable (resident)
  for (const res of ctx.residents) {
    if (res.health <= 0) continue;

    const validTasks: TaskType[] = [];

    for (const task of ALL_TASKS) {
      let rejectionReason: string | null = null;

      // Constraint 2: Critically low energy must rest
      if (res.energy < 22 && task !== 'rest') {
        rejectionReason = `Энергия өте төмен (${Math.round(res.energy)}%) — демалыс міндетті.`;
      }
      // Constraint 3: Critical thirst prioritizes water (unless exhausted)
      else if (res.energy >= 22 && res.thirst >= 75 && task !== 'collect_water') {
        rejectionReason = `Шөл деңгейі сыни (${Math.round(res.thirst)}%) — су әкелу басым.`;
      }
      // Constraint 4: Critical hunger prioritizes food (unless exhausted or critical thirst)
      else if (
        res.energy >= 22 &&
        res.thirst < 75 &&
        res.hunger >= 75 &&
        task !== 'gather_food'
      ) {
        rejectionReason = `Аштық деңгейі сыни (${Math.round(res.hunger)}%) — азық жинау басым.`;
      }
      // Constraint 6: Build shelter requires wood >= 12
      else if (task === 'build_shelter' && !woodAvailableForShelter) {
        rejectionReason = `Баспана салу үшін жеткілікті ағаш жоқ (${Math.floor(ctx.resources.wood)} < 12).`;
      }
      // Constraint 7: Resource availability on island
      else if (task === 'gather_food' && !hasFoodTile) {
        rejectionReason = 'Картада қолжетімді азық көзі табылмады.';
      } else if (task === 'collect_water' && !hasWaterTile) {
        rejectionReason = 'Картада қолжетімді су көзі табылмады.';
      } else if (task === 'collect_wood' && !hasWoodTile) {
        rejectionReason = 'Картада қолжетімді ағаш көзі табылмады.';
      }
      // Constraint 8: Critical health incompatibility
      else if (res.health < 25 && (task === 'build_shelter' || task === 'explore')) {
        rejectionReason = `Денсаулығы әлсіз (${Math.round(res.health)}%) — ауыр жұмысқа жарамсыз.`;
      }
      // Constraint 5: Capacity zero check
      else if (capacities[task] <= 0) {
        rejectionReason = `Тапсырма сыйымдылығы 0 (орын жоқ).`;
      }

      if (rejectionReason) {
        rejectedAssignments.push({
          residentId: res.id,
          residentName: res.name,
          task,
          reason: rejectionReason,
        });
      } else {
        validTasks.push(task);
      }
    }

    // Order domain values heuristically by urgency + resident skill + Bayesian risk
    validTasks.sort((a, b) => {
      const scoreTask = (t: TaskType) => {
        let s = taskSkillAffinity(res, t) * 10;
        if (t === 'collect_water') {
          s += (ctx.resources.water < 25 ? 18 : 6) + ctx.survivalRisk * 15;
        } else if (t === 'gather_food') {
          s += (ctx.resources.food < 25 ? 18 : 6) + ctx.survivalRisk * 15;
        } else if (t === 'build_shelter') {
          s += ctx.sheltersCount < 2 ? 12 : 4;
        } else if (t === 'collect_wood') {
          s += ctx.resources.wood < 18 ? 11 : 5;
        } else if (t === 'rest') {
          s += res.energy < 45 ? 14 : -8;
        }
        return s;
      };
      return scoreTask(b) - scoreTask(a);
    });

    domains.set(res.id, validTasks);
  }

  const activeResidents = ctx.residents.filter((r) => r.health > 0);
  const usageCounts: Record<TaskType, number> = {
    gather_food: 0,
    collect_water: 0,
    collect_wood: 0,
    build_shelter: 0,
    explore: 0,
    rest: 0,
  };

  let searchNodes = 0;
  let backtrackCount = 0;
  const currentAssignment = new Map<string, TaskType>();

  // MRV variable selection among unassigned residents
  const selectMRVVariable = (
    remainingDomains: Map<string, TaskType[]>
  ): Resident | null => {
    let best: Resident | null = null;
    let minSize = Infinity;

    for (const res of activeResidents) {
      if (currentAssignment.has(res.id)) continue;
      const dom = remainingDomains.get(res.id) ?? [];
      if (dom.length < minSize) {
        minSize = dom.length;
        best = res;
      }
    }
    return best;
  };

  // Forward checking: prune tasks that hit capacity from unassigned variables
  const forwardCheck = (
    remainingDomains: Map<string, TaskType[]>
  ): Map<string, TaskType[]> | null => {
    const nextDomains = new Map<string, TaskType[]>();
    for (const res of activeResidents) {
      if (currentAssignment.has(res.id)) continue;
      const curDom = remainingDomains.get(res.id) ?? [];
      const filtered = curDom.filter((t) => usageCounts[t] < capacities[t]);
      if (filtered.length === 0) {
        return null; // Domain wipeout -> trigger backtracking
      }
      nextDomains.set(res.id, filtered);
    }
    return nextDomains;
  };

  const backtrack = (remainingDomains: Map<string, TaskType[]>): boolean => {
    if (currentAssignment.size === activeResidents.length) {
      return true;
    }

    const variable = selectMRVVariable(remainingDomains);
    if (!variable) return false;

    const domainValues = remainingDomains.get(variable.id) ?? [];

    for (const task of domainValues) {
      searchNodes++;
      if (usageCounts[task] >= capacities[task]) {
        continue;
      }

      currentAssignment.set(variable.id, task);
      usageCounts[task]++;

      const nextDomains = forwardCheck(remainingDomains);
      if (nextDomains !== null) {
        if (backtrack(nextDomains)) {
          return true;
        }
      }

      // Backtrack
      backtrackCount++;
      usageCounts[task]--;
      currentAssignment.delete(variable.id);
    }

    return false;
  };

  // Check if any domain is already empty before starting
  let initialEmpty = false;
  for (const res of activeResidents) {
    if ((domains.get(res.id) ?? []).length === 0) {
      initialEmpty = true;
      break;
    }
  }

  const solved = !initialEmpty && backtrack(domains);

  if (solved) {
    const assignments: CSPAssignment[] = activeResidents.map((res) => {
      const task = currentAssignment.get(res.id) ?? 'rest';
      const rem = domains.get(res.id) ?? [];
      return {
        residentId: res.id,
        residentName: res.name,
        task,
        domainRemaining: rem,
        reason: buildAssignmentReason(res, task, ctx),
      };
    });

    return {
      success: true,
      usedFallback: false,
      assignments,
      rejectedAssignments,
      searchNodes,
      backtrackCount,
      constraintsChecked,
      solverMessage: `CSP шешімі табылды: ${assignments.length} тұрғынға шектеулерді бұзбай тапсырма бөлінді (түйіндер: ${searchNodes}, кері шегініс: ${backtrackCount}).`,
      tick: ctx.tick,
    };
  }

  // Safe fallback plan when strict constraints cannot all be satisfied simultaneously
  const fallbackAssignments: CSPAssignment[] = activeResidents.map((res) => {
    const task: TaskType =
      res.energy < 30
        ? 'rest'
        : res.thirst >= 70 && hasWaterTile
        ? 'collect_water'
        : res.hunger >= 70 && hasFoodTile
        ? 'gather_food'
        : 'rest';

    return {
      residentId: res.id,
      residentName: res.name,
      task,
      domainRemaining: domains.get(res.id) ?? [],
      reason: `Қауіпсіз резервтік жоспар: қатаң шектеулер қайшылығына байланысты ${TASK_LABELS_KZ[task]} таңдалды.`,
    };
  });

  return {
    success: false,
    usedFallback: true,
    assignments: fallbackAssignments,
    rejectedAssignments,
    searchNodes,
    backtrackCount,
    constraintsChecked,
    solverMessage:
      'Қайшылық анықталды: барлық шектеулерді бір уақытта қанағаттандыратын тағайындау табылмады. Қауіпсіз резервтік жоспар қолданылды.',
    tick: ctx.tick,
  };
}

function buildAssignmentReason(
  res: Resident,
  task: TaskType,
  ctx: CSPContext
): string {
  if (task === 'rest' && res.energy < 22) {
    return `Энергия сыни (${Math.round(res.energy)}%) — демалу міндетті.`;
  }
  if (task === 'collect_water' && res.thirst >= 75) {
    return `Шөл деңгейі жоғары (${Math.round(res.thirst)}%) — су жинау басым.`;
  }
  if (task === 'gather_food' && res.hunger >= 75) {
    return `Аштық деңгейі жоғары (${Math.round(res.hunger)}%) — азық жинау басым.`;
  }
  if (task === 'build_shelter') {
    return `Қорда ${Math.floor(ctx.resources.wood)} ағаш бар, құрылыс дағдысы x${res.skills.building}.`;
  }
  return `${res.role} мамандығы және сыйымдылық шектеуі бойынша «${TASK_LABELS_KZ[task]}» бекітілді.`;
}
