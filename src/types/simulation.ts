export type TerrainType =
  | 'grassland'
  | 'forest'
  | 'water'
  | 'rock'
  | 'berry'
  | 'fertile'
  | 'mud'
  | 'path';

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'drought' | 'storm';

export type DifficultyLevel = 'easy' | 'normal' | 'hard';

export type MapSizeOption = 16 | 20 | 24;

export type TaskType =
  | 'gather_food'
  | 'collect_water'
  | 'collect_wood'
  | 'build_shelter'
  | 'explore'
  | 'rest';

export type ResidentRole = 'Forager' | 'Builder' | 'Gatherer' | 'Explorer' | 'Scout' | 'Medic';

export type ResidentStateType =
  | 'idle'
  | 'moving'
  | 'gathering'
  | 'eating'
  | 'drinking'
  | 'resting'
  | 'building'
  | 'exploring';

export interface Coordinates {
  x: number;
  y: number;
}

export interface Tile {
  x: number;
  y: number;
  terrain: TerrainType;
  resourceAmount: number;
  maxResourceAmount: number;
  resourceType: 'food' | 'water' | 'wood' | 'stone' | null;
  explored: boolean;
  hasShelter?: boolean;
  isCamp?: boolean;
  elevation: number;
}

export interface Resources {
  food: number;
  water: number;
  wood: number;
  stone: number;
  maxFood: number;
  maxWater: number;
  maxWood: number;
  maxStone: number;
}

export interface ResidentSkills {
  foraging: number; // 1.0 - 1.5 multiplier
  waterFinding: number;
  woodcutting: number;
  building: number;
  exploration: number;
}

export interface NeedPriority {
  need: 'thirst' | 'hunger' | 'energy' | 'health' | 'task';
  score: number;
  reason: string;
}

export interface AgentDecision {
  tick: number;
  day: number;
  residentId: string;
  residentName: string;
  stateBefore: ResidentStateType;
  observations: string[];
  priorities: NeedPriority[];
  selectedObjective: TaskType;
  reason: string;
  finalAction: string;
  targetCoords: Coordinates | null;
  pathFound: boolean;
}

export interface AStarNodeSnapshot {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Coordinates | null;
}

export interface AStarStep {
  stepIndex: number;
  current: Coordinates;
  openSet: Coordinates[];
  closedSet: Coordinates[];
  frontier: Coordinates[];
  currentG: number;
  currentH: number;
  currentF: number;
}

export interface AStarResult {
  found: boolean;
  start: Coordinates;
  goal: Coordinates;
  path: Coordinates[];
  totalCost: number;
  exploredNodes: Coordinates[];
  frontierNodes: Coordinates[];
  steps: AStarStep[];
  status: 'found' | 'unreachable' | 'same_tile';
}

export interface Resident {
  id: string;
  name: string;
  role: ResidentRole;
  color: string;
  x: number;
  y: number;
  hunger: number; // 0 = satisfied, 100 = starving
  thirst: number; // 0 = hydrated, 100 = extremely thirsty
  energy: number; // 0 = exhausted, 100 = fully energetic
  health: number; // 0 = critical, 100 = healthy
  skills: ResidentSkills;
  currentTask: TaskType;
  assignedTask: TaskType;
  currentTarget: Coordinates | null;
  currentPath: Coordinates[];
  lastAStar: AStarResult | null;
  state: ResidentStateType;
  inventory: {
    food: number;
    water: number;
    wood: number;
    stone: number;
  };
  recentActivity: string;
  decisionHistory: AgentDecision[];
  tasksCompleted: number;
  distanceTraveled: number;
  totalCollected: number;
  unmetNeedTicks: number;
}

export interface CSPConstraintViolation {
  residentId: string;
  residentName: string;
  task: TaskType;
  reason: string;
}

export interface CSPAssignment {
  residentId: string;
  residentName: string;
  task: TaskType;
  reason: string;
  domainRemaining: TaskType[];
}

export interface CSPResult {
  success: boolean;
  usedFallback: boolean;
  assignments: CSPAssignment[];
  rejectedAssignments: CSPConstraintViolation[];
  searchNodes: number;
  backtrackCount: number;
  constraintsChecked: string[];
  solverMessage: string;
  tick: number;
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface BayesianEvidence {
  highTemperature: boolean; // temperature >= 30°C
  lowRainfall: boolean; // rainfall < 25%
  foodShortage: boolean; // food < resident demand threshold
  temperatureValue: number;
  rainfallValue: number;
  foodReserve: number;
  foodDemandThreshold: number;
}

export interface BayesianResult {
  evidence: BayesianEvidence;
  pWaterShortage: number;
  pWaterNotShortage: number;
  pSurvivalRiskGivenWaterShortage: number;
  pSurvivalRiskGivenNoWaterShortage: number;
  pSurvivalRisk: number;
  riskLevel: RiskLevel;
  explanation: string;
  tick: number;
}

export type EventCategory =
  | 'resident_action'
  | 'resource_change'
  | 'ai_decision'
  | 'environment'
  | 'construction'
  | 'warning'
  | 'simulation';

export type AIAlgorithmTag =
  | 'Intelligent Agents'
  | 'A*'
  | 'CSP'
  | 'Bayesian Network'
  | 'Q-learning'
  | 'System';

export interface SimulationEvent {
  id: string;
  tick: number;
  day: number;
  hour: number;
  category: EventCategory;
  description: string;
  residentName?: string;
  algorithm: AIAlgorithmTag;
}

export interface EnvironmentState {
  temperature: number; // °C
  rainfall: number; // % (0-100)
  weather: WeatherType;
  baseTemperature: number;
  baseRainfall: number;
}

export interface HistoryPoint {
  tick: number;
  day: number;
  avgHealth: number;
  food: number;
  water: number;
  wood: number;
  stone: number;
  survivalRisk: number;
  waterShortageProb: number;
  tasksCompleted: number;
  sheltersBuilt: number;
}

export interface WorldConfig {
  mapSize: MapSizeOption;
  residentCount: number; // 3 - 6
  difficulty: DifficultyLevel;
  initialFood: number;
  initialWater: number;
  initialWood: number;
  initialStone: number;
  temperature: number;
  rainfall: number;
  forestDensity: number; // 0.1 - 0.5
  seed: number;
}

export interface SimulationState {
  config: WorldConfig;
  seed: number;
  tick: number;
  day: number;
  hour: number; // 0 - 23 (24 ticks = 1 day)
  ticksPerDay: number;
  grid: Tile[][];
  campLocation: Coordinates;
  sheltersCount: number;
  resources: Resources;
  environment: EnvironmentState;
  residents: Resident[];
  lastCSP: CSPResult;
  lastBayesian: BayesianResult;
  events: SimulationEvent[];
  history: HistoryPoint[];
  totalFoodCollected: number;
  totalWaterCollected: number;
  totalWoodCollected: number;
  totalStoneCollected: number;
  totalFoodConsumed: number;
  totalWaterConsumed: number;
  totalRouteCost: number;
  totalUnmetNeeds: number;
  totalConstraintViolations: number;
  civilizationCollapsed: boolean;
}

export interface StrategyMetrics {
  strategyName: string;
  daysSurvived: number;
  ticksCompleted: number;
  avgHealth: number;
  aliveResidents: number;
  foodCollected: number;
  waterCollected: number;
  woodCollected: number;
  foodConsumed: number;
  waterConsumed: number;
  totalRouteCost: number;
  unmetNeeds: number;
  constraintViolations: number;
  sheltersBuilt: number;
  finalFood: number;
  finalWater: number;
  healthTimeline: { tick: number; avgHealth: number; food: number; water: number }[];
}

export interface ExperimentResult {
  id: string;
  createdAt: string;
  seed: number;
  durationTicks: number;
  difficulty: DifficultyLevel;
  mapSize: MapSizeOption;
  baseline: StrategyMetrics;
  edenAI: StrategyMetrics;
}

export type QStateKey =
  | 'critical_thirst'
  | 'critical_hunger'
  | 'low_energy'
  | 'low_resources_danger'
  | 'low_resources_safe'
  | 'normal_danger'
  | 'normal_safe';

export type QActionKey =
  | 'gather_food'
  | 'collect_water'
  | 'rest'
  | 'collect_wood'
  | 'explore';

export interface QLearningEpisodeSummary {
  episode: number;
  totalReward: number;
  averageReward: number;
  epsilon: number;
  survivedTicks: number;
}

export interface QLearningResult {
  episodes: number;
  alpha: number;
  gamma: number;
  epsilon: number;
  qTable: Record<QStateKey, Record<QActionKey, number>>;
  beforePolicy: Record<QStateKey, QActionKey>;
  afterPolicy: Record<QStateKey, QActionKey>;
  episodeHistory: QLearningEpisodeSummary[];
  qDeltaTotal: number;
}

export interface TestCaseResult {
  id: string;
  group: 'A* Pathfinding' | 'Intelligent Agents' | 'CSP' | 'Bayesian Network' | 'Simulation';
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

export interface TestSuiteReport {
  total: number;
  passed: number;
  failed: number;
  ranAt: string;
  results: TestCaseResult[];
}
