import { DEFAULT_WORLD_CONFIG } from '../data/probabilities';
import {
  ExperimentResult,
  SimulationState,
  WorldConfig,
} from '../types/simulation';

const STORAGE_KEYS = {
  SIMULATION_STATE: 'project_eden_sim_state_v1',
  WORLD_CONFIG: 'project_eden_world_config_v1',
  EXPERIMENTS: 'project_eden_experiments_v1',
  LAST_SAVED: 'project_eden_last_saved_v1',
};

export function validateSimulationState(data: unknown): data is SimulationState {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Partial<SimulationState>;
  return (
    typeof obj.tick === 'number' &&
    typeof obj.day === 'number' &&
    typeof obj.seed === 'number' &&
    Array.isArray(obj.grid) &&
    obj.grid.length >= 16 &&
    Array.isArray(obj.residents) &&
    obj.residents.length >= 1 &&
    !!obj.resources &&
    typeof obj.resources.food === 'number' &&
    !!obj.lastCSP &&
    !!obj.lastBayesian
  );
}

export function validateWorldConfig(data: unknown): data is WorldConfig {
  if (!data || typeof data !== 'object') return false;
  const cfg = data as Partial<WorldConfig>;
  return (
    (cfg.mapSize === 16 || cfg.mapSize === 20 || cfg.mapSize === 24) &&
    typeof cfg.residentCount === 'number' &&
    cfg.residentCount >= 3 &&
    cfg.residentCount <= 6 &&
    typeof cfg.seed === 'number'
  );
}

export function saveSimulationState(state: SimulationState): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const timestamp = new Date().toISOString();
    window.localStorage.setItem(STORAGE_KEYS.SIMULATION_STATE, JSON.stringify(state));
    window.localStorage.setItem(STORAGE_KEYS.LAST_SAVED, timestamp);
    return timestamp;
  } catch {
    return null;
  }
}

export function loadSimulationState(): {
  state: SimulationState | null;
  lastSaved: string | null;
} {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { state: null, lastSaved: null };
    }
    const raw = window.localStorage.getItem(STORAGE_KEYS.SIMULATION_STATE);
    const lastSaved = window.localStorage.getItem(STORAGE_KEYS.LAST_SAVED);
    if (!raw) return { state: null, lastSaved: null };
    const parsed = JSON.parse(raw);
    if (validateSimulationState(parsed)) {
      return { state: parsed, lastSaved };
    }
    return { state: null, lastSaved: null };
  } catch {
    return { state: null, lastSaved: null };
  }
}

export function saveWorldConfig(config: WorldConfig): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEYS.WORLD_CONFIG, JSON.stringify(config));
  } catch {
    // ignore storage quota errors
  }
}

export function loadWorldConfig(): WorldConfig {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_WORLD_CONFIG };
    }
    const raw = window.localStorage.getItem(STORAGE_KEYS.WORLD_CONFIG);
    if (!raw) return { ...DEFAULT_WORLD_CONFIG };
    const parsed = JSON.parse(raw);
    if (validateWorldConfig(parsed)) {
      return parsed;
    }
    return { ...DEFAULT_WORLD_CONFIG };
  } catch {
    return { ...DEFAULT_WORLD_CONFIG };
  }
}

export function saveExperiments(experiments: ExperimentResult[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(
      STORAGE_KEYS.EXPERIMENTS,
      JSON.stringify(experiments.slice(0, 20))
    );
  } catch {
    // ignore
  }
}

export function loadExperiments(): ExperimentResult[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(STORAGE_KEYS.EXPERIMENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
