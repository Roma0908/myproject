import { findPathAStar } from '../ai/AStar';
import { evaluateBayesianRisk } from '../ai/BayesianNetwork';
import { solveCSPTaskAllocation } from '../ai/CSPPlanner';
import { evaluateAgentDecision } from '../ai/IntelligentAgent';
import { DEFAULT_WORLD_CONFIG } from '../data/probabilities';
import { createInitialSimulationState, stepSimulation } from '../simulation/SimulationEngine';
import { TerrainType, TestCaseResult, Tile } from '../types/simulation';

function assert(cond: boolean, message: string): void {
  if (!cond) {
    throw new Error(message);
  }
}

function assertClose(actual: number, expected: number, eps: number, message: string): void {
  if (Math.abs(actual - expected) > eps) {
    throw new Error(`${message} (expected ${expected}, got ${actual})`);
  }
}

function makeTestGrid(layout: TerrainType[][]): Tile[][] {
  return layout.map((row, y) =>
    row.map((terrain, x) => ({
      x,
      y,
      terrain,
      resourceAmount:
        terrain === 'berry' ? 30 : terrain === 'water' ? 100 : terrain === 'forest' ? 30 : 0,
      maxResourceAmount: 40,
      resourceType:
        terrain === 'berry'
          ? 'food'
          : terrain === 'water'
          ? 'water'
          : terrain === 'forest'
          ? 'wood'
          : null,
      explored: true,
      elevation: 0.5,
    }))
  );
}

export interface TestDefinition {
  id: string;
  group: TestCaseResult['group'];
  name: string;
  run: () => void;
}

export const ALL_TEST_DEFINITIONS: TestDefinition[] = [
  // Test 1 — A* Pathfinding
  {
    id: 'astar_valid_route',
    group: 'A* Pathfinding',
    name: 'A* табысты бағытты табады және кедергілерді (rock/water) айналып өтеді',
    run: () => {
      const grid = makeTestGrid([
        ['grassland', 'rock', 'grassland', 'grassland'],
        ['grassland', 'rock', 'grassland', 'grassland'],
        ['grassland', 'grassland', 'grassland', 'grassland'],
        ['water', 'water', 'grassland', 'grassland'],
      ]);
      const res = findPathAStar(grid, { x: 0, y: 0 }, { x: 3, y: 0 });
      assert(res.found, 'Route should be found around the rock wall');
      assert(res.path.length >= 6, 'Path must detour around rock wall');
      for (const p of res.path) {
        assert(
          grid[p.y][p.x].terrain !== 'rock' && grid[p.y][p.x].terrain !== 'water',
          `Path stepped on obstacle at (${p.x},${p.y})`
        );
      }
    },
  },
  {
    id: 'astar_movement_cost',
    group: 'A* Pathfinding',
    name: 'A* жер бедері қозғалыс құнын (mud=3 vs path=0.8) дұрыс есептейді',
    run: () => {
      const grid = makeTestGrid([
        ['grassland', 'mud', 'mud', 'grassland'],
        ['path', 'path', 'path', 'path'],
      ]);
      const res = findPathAStar(grid, { x: 0, y: 0 }, { x: 3, y: 0 });
      assert(res.found, 'Route should be found');
      // Stepping down to y=1 (path: 0.8), right 3 times (3*0.8 = 2.4), up to (3,0) (grassland: 1.0) => total 4.2
      assertClose(res.totalCost, 4.2, 0.05, 'A* should prefer low-cost path tiles over mud');
    },
  },
  {
    id: 'astar_unreachable',
    group: 'A* Pathfinding',
    name: 'A* жол толық жабылған кезде сәтсіздікті (found=false) хабарлайды',
    run: () => {
      const grid = makeTestGrid([
        ['grassland', 'rock', 'grassland'],
        ['rock', 'rock', 'rock'],
        ['grassland', 'grassland', 'grassland'],
      ]);
      const res = findPathAStar(grid, { x: 0, y: 0 }, { x: 2, y: 0 });
      assert(!res.found, 'Route must be unreachable');
      assert(res.status === 'unreachable', 'Status must be unreachable');
    },
  },

  // Test 2 — Intelligent Agents
  {
    id: 'agent_thirsty',
    group: 'Intelligent Agents',
    name: 'Шөлдеген агент су жинауға (collect_water) басымдық береді және шешімді тіркейді',
    run: () => {
      const state = createInitialSimulationState(DEFAULT_WORLD_CONFIG);
      const res = { ...state.residents[0], thirst: 90, hunger: 20, energy: 80, assignedTask: 'collect_wood' as const };
      const out = evaluateAgentDecision({
        resident: res,
        grid: state.grid,
        campLocation: state.campLocation,
        resources: state.resources,
        bayesian: state.lastBayesian,
        tick: 5,
        day: 1,
      });
      assert(out.objective === 'collect_water', `Expected collect_water, got ${out.objective}`);
      assert(out.decision.observations.length >= 2, 'Decision observations must be recorded');
    },
  },
  {
    id: 'agent_hungry',
    group: 'Intelligent Agents',
    name: 'Ашыққан агент азық жинауға (gather_food) басымдық береді',
    run: () => {
      const state = createInitialSimulationState(DEFAULT_WORLD_CONFIG);
      const res = { ...state.residents[1], thirst: 20, hunger: 88, energy: 80, assignedTask: 'explore' as const };
      const out = evaluateAgentDecision({
        resident: res,
        grid: state.grid,
        campLocation: state.campLocation,
        resources: state.resources,
        bayesian: state.lastBayesian,
        tick: 6,
        day: 1,
      });
      assert(out.objective === 'gather_food', `Expected gather_food, got ${out.objective}`);
    },
  },
  {
    id: 'agent_exhausted',
    group: 'Intelligent Agents',
    name: 'Қатты шаршаған агент демалысқа (rest) ауысады',
    run: () => {
      const state = createInitialSimulationState(DEFAULT_WORLD_CONFIG);
      const res = { ...state.residents[2], thirst: 30, hunger: 30, energy: 14, assignedTask: 'collect_wood' as const };
      const out = evaluateAgentDecision({
        resident: res,
        grid: state.grid,
        campLocation: state.campLocation,
        resources: state.resources,
        bayesian: state.lastBayesian,
        tick: 7,
        day: 1,
      });
      assert(out.objective === 'rest', `Expected rest, got ${out.objective}`);
    },
  },

  // Test 3 — CSP
  {
    id: 'csp_valid_assignment',
    group: 'CSP',
    name: 'CSP барлық тұрғындарға шектеулерді бұзбай дұрыс тапсырма тағайындайды',
    run: () => {
      const state = createInitialSimulationState(DEFAULT_WORLD_CONFIG);
      state.residents[0].energy = 15; // Must rest
      state.residents[1].thirst = 85; // Must collect_water
      state.residents[1].energy = 80;
      const csp = solveCSPTaskAllocation({
        residents: state.residents,
        resources: state.resources,
        grid: state.grid,
        sheltersCount: state.sheltersCount,
        survivalRisk: state.lastBayesian.pSurvivalRisk,
        tick: 1,
      });
      assert(csp.success, 'CSP should succeed');
      assert(csp.assignments.length === state.residents.length, 'Every resident gets 1 task');
      const a0 = csp.assignments.find((a) => a.residentId === state.residents[0].id);
      const a1 = csp.assignments.find((a) => a.residentId === state.residents[1].id);
      assert(a0?.task === 'rest', 'Exhausted resident must receive rest');
      assert(a1?.task === 'collect_water', 'Critically thirsty resident must receive collect_water');
    },
  },
  {
    id: 'csp_impossible_detection',
    group: 'CSP',
    name: 'CSP орындалмайтын шектеулерді анықтайды, кері шегініс (backtracking) жасайды',
    run: () => {
      const state = createInitialSimulationState(DEFAULT_WORLD_CONFIG);
      // Force all 4 residents to need collect_water while setting capacity to 1
      for (const r of state.residents) {
        r.energy = 80;
        r.thirst = 85;
      }
      const csp = solveCSPTaskAllocation({
        residents: state.residents,
        resources: state.resources,
        grid: state.grid,
        sheltersCount: 1,
        survivalRisk: 0.5,
        tick: 2,
        taskCapacities: { collect_water: 1 },
      });
      assert(!csp.success && csp.usedFallback, 'Impossible assignment must fail and use safe fallback');
      assert(csp.searchNodes >= 1, 'CSP search nodes must be tracked');
    },
  },
  {
    id: 'csp_backtracking_works',
    group: 'CSP',
    name: 'CSP сыйымдылық шектеуі кезінде backtracking қолданып шешім табады',
    run: () => {
      const state = createInitialSimulationState(DEFAULT_WORLD_CONFIG);
      const csp = solveCSPTaskAllocation({
        residents: state.residents,
        resources: { ...state.resources, wood: 4 }, // blocks build_shelter
        grid: state.grid,
        sheltersCount: 1,
        survivalRisk: 0.2,
        tick: 3,
        taskCapacities: { gather_food: 1, collect_water: 1, collect_wood: 1, explore: 1, rest: 1 },
      });
      assert(csp.success, 'Should find valid permutation across capacities=1');
      const assignedTasks = new Set(csp.assignments.map((a) => a.task));
      assert(assignedTasks.size === state.residents.length, 'Each capacity=1 task assigned at most once');
    },
  },

  // Test 4 — Bayesian Network
  {
    id: 'bayesian_math_exact',
    group: 'Bayesian Network',
    name: 'Bayesian Network маргиналды ықтималдықты CPT кестесі бойынша дәл есептейді',
    run: () => {
      // HighTemp=true (>=30), LowRainfall=true (<25) => P(WS)=0.82
      // FoodShortage=true => P(SR|WS=T,FS=T)=0.90, P(SR|WS=F,FS=T)=0.55
      // Marginal P(SR) = 0.82*0.90 + 0.18*0.55 = 0.738 + 0.099 = 0.837
      const res = evaluateBayesianRisk({
        temperature: 34,
        rainfall: 15,
        foodReserve: 5,
        residentCount: 4,
      });
      assertClose(res.pWaterShortage, 0.82, 0.001, 'P(WaterShortage) mismatch');
      assertClose(res.pSurvivalRisk, 0.837, 0.002, 'P(SurvivalRisk) marginalization mismatch');
      assert(res.riskLevel === 'critical', 'Risk level should be critical');
    },
  },
  {
    id: 'bayesian_evidence_sensitivity',
    group: 'Bayesian Network',
    name: 'Bayesian Network дәлелдер (температура, жауын, азық) өзгергенде нәтижені жаңартады',
    run: () => {
      const calm = evaluateBayesianRisk({
        temperature: 22,
        rainfall: 60,
        foodReserve: 50,
        residentCount: 4,
      });
      const dryAndHungry = evaluateBayesianRisk({
        temperature: 35,
        rainfall: 10,
        foodReserve: 4,
        residentCount: 4,
      });
      assert(
        dryAndHungry.pWaterShortage > calm.pWaterShortage,
        'Hot & dry weather must increase water shortage probability'
      );
      assert(
        dryAndHungry.pSurvivalRisk > calm.pSurvivalRisk,
        'Food shortage & drought must increase survival risk'
      );
    },
  },

  // Test 5 — Simulation Engine
  {
    id: 'sim_progress_and_resources',
    group: 'Simulation',
    name: 'Симуляция уақыты жылжиды, тұрғындар қозғалады және ресурстар өзгереді',
    run: () => {
      let state = createInitialSimulationState(DEFAULT_WORLD_CONFIG);
      const startPositions = state.residents.map((r) => `${r.x},${r.y}`);
      for (let i = 0; i < 12; i++) {
        state = stepSimulation(state);
      }
      assert(state.tick === 12, 'Tick should advance to 12');
      const moved = state.residents.some(
        (r, idx) => `${r.x},${r.y}` !== startPositions[idx] || r.distanceTraveled > 0
      );
      assert(moved, 'At least one resident must move');
      const changedResources =
        state.totalFoodCollected > 0 ||
        state.totalWaterCollected > 0 ||
        state.totalWoodCollected > 0 ||
        state.totalFoodConsumed > 0 ||
        state.totalWaterConsumed > 0;
      assert(changedResources, 'Resources must be gathered or consumed during simulation');
    },
  },
  {
    id: 'sim_seed_reproducibility',
    group: 'Simulation',
    name: 'Бірдей Seed параметрлері дәл сондай бастапқы карта мен күйді қайта жасайды',
    run: () => {
      const s1 = createInitialSimulationState({ ...DEFAULT_WORLD_CONFIG, seed: 98765 });
      const s2 = createInitialSimulationState({ ...DEFAULT_WORLD_CONFIG, seed: 98765 });
      assert(s1.grid.length === s2.grid.length, 'Grid dimensions must match');
      for (let y = 0; y < s1.grid.length; y++) {
        for (let x = 0; x < s1.grid[y].length; x++) {
          assert(
            s1.grid[y][x].terrain === s2.grid[y][x].terrain,
            `Terrain mismatch at (${x},${y})`
          );
        }
      }
      const next1 = stepSimulation(s1);
      const next2 = stepSimulation(s2);
      assert(
        next1.resources.food === next2.resources.food &&
          next1.residents[0].x === next2.residents[0].x,
        'Stepping with same seed must be deterministic'
      );
    },
  },
];
