import { ResidentRole, WorldConfig } from '../types/simulation';

/**
 * Bayesian Network Conditional Probability Tables (CPTs).
 * NOTE: These CPT values are illustrative simulation model parameters,
 * not measured real-world epidemiological or meteorological probabilities.
 */
export const WATER_SHORTAGE_CPT: Record<string, number> = {
  'false,false': 0.08, // HighTemp=F, LowRainfall=F
  'true,false': 0.32,  // HighTemp=T, LowRainfall=F
  'false,true': 0.45,  // HighTemp=F, LowRainfall=T
  'true,true': 0.82,   // HighTemp=T, LowRainfall=T
};

export const SURVIVAL_RISK_CPT: Record<string, number> = {
  'false,false': 0.03, // WaterShortage=F, FoodShortage=F
  'true,false': 0.42,  // WaterShortage=T, FoodShortage=F
  'false,true': 0.55,  // WaterShortage=F, FoodShortage=T
  'true,true': 0.90,   // WaterShortage=T, FoodShortage=T
};

export interface ResidentTemplate {
  id: string;
  name: string;
  role: ResidentRole;
  color: string;
  skills: {
    foraging: number;
    waterFinding: number;
    woodcutting: number;
    building: number;
    exploration: number;
  };
}

export const RESIDENT_TEMPLATES: ResidentTemplate[] = [
  {
    id: 'res_adam',
    name: 'Adam',
    role: 'Forager',
    color: '#D5AE64',
    skills: {
      foraging: 1.4,
      waterFinding: 1.0,
      woodcutting: 0.9,
      building: 0.9,
      exploration: 1.1,
    },
  },
  {
    id: 'res_alex',
    name: 'Alex',
    role: 'Builder',
    color: '#E7A34F',
    skills: {
      foraging: 0.9,
      waterFinding: 1.0,
      woodcutting: 1.3,
      building: 1.45,
      exploration: 0.9,
    },
  },
  {
    id: 'res_maya',
    name: 'Maya',
    role: 'Gatherer',
    color: '#8AA78C',
    skills: {
      foraging: 1.2,
      waterFinding: 1.4,
      woodcutting: 1.1,
      building: 0.9,
      exploration: 1.0,
    },
  },
  {
    id: 'res_sam',
    name: 'Sam',
    role: 'Explorer',
    color: '#6BB0C9',
    skills: {
      foraging: 1.05,
      waterFinding: 1.15,
      woodcutting: 1.0,
      building: 0.95,
      exploration: 1.45,
    },
  },
  {
    id: 'res_leila',
    name: 'Leila',
    role: 'Medic',
    color: '#D76D61',
    skills: {
      foraging: 1.15,
      waterFinding: 1.25,
      woodcutting: 0.85,
      building: 1.05,
      exploration: 1.1,
    },
  },
  {
    id: 'res_timur',
    name: 'Timur',
    role: 'Scout',
    color: '#C8B995',
    skills: {
      foraging: 1.1,
      waterFinding: 1.1,
      woodcutting: 1.2,
      building: 1.0,
      exploration: 1.35,
    },
  },
];

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  mapSize: 20,
  residentCount: 4,
  difficulty: 'normal',
  initialFood: 48,
  initialWater: 48,
  initialWood: 28,
  initialStone: 14,
  temperature: 24,
  rainfall: 55,
  forestDensity: 0.24,
  seed: 202601,
};

export interface WorldPreset {
  id: string;
  nameKz: string;
  descriptionKz: string;
  config: Partial<WorldConfig>;
}

export const WORLD_PRESETS: WorldPreset[] = [
  {
    id: 'balanced',
    nameKz: 'Теңдестірілген арал',
    descriptionKz: 'Қоңыржай климат, ресурстар жеткілікті, қалыпты қиындық.',
    config: {
      difficulty: 'normal',
      initialFood: 48,
      initialWater: 48,
      initialWood: 28,
      initialStone: 14,
      temperature: 24,
      rainfall: 55,
      forestDensity: 0.24,
    },
  },
  {
    id: 'dry',
    nameKz: 'Құрғақ арал',
    descriptionKz: 'Жоғары температура (33°C) және төмен жауын-шашын (18%). Су тапшылығы қаупі жоғары.',
    config: {
      difficulty: 'normal',
      initialFood: 42,
      initialWater: 28,
      initialWood: 22,
      initialStone: 14,
      temperature: 33,
      rainfall: 18,
      forestDensity: 0.16,
    },
  },
  {
    id: 'scarcity',
    nameKz: 'Ресурс тапшылығы',
    descriptionKz: 'Бастапқы азық-түлік пен су қоры өте шектеулі. Тиімді CSP және A* шешуші рөл атқарады.',
    config: {
      difficulty: 'hard',
      initialFood: 20,
      initialWater: 20,
      initialWood: 12,
      initialStone: 6,
      temperature: 28,
      rainfall: 32,
      forestDensity: 0.15,
    },
  },
  {
    id: 'heavy_rain',
    nameKz: 'Нөсерлі аймақ',
    descriptionKz: 'Мол жауын-шашын (85%), қалың орман және батпақты жерлер көп.',
    config: {
      difficulty: 'normal',
      initialFood: 44,
      initialWater: 60,
      initialWood: 36,
      initialStone: 12,
      temperature: 19,
      rainfall: 85,
      forestDensity: 0.34,
    },
  },
  {
    id: 'extreme',
    nameKz: 'Экстремалды аман қалу',
    descriptionKz: 'Қатал климат, өте төмен қор және қиын деңгей. Өркениеттің төзімділігін сынау.',
    config: {
      difficulty: 'hard',
      initialFood: 16,
      initialWater: 16,
      initialWood: 10,
      initialStone: 4,
      temperature: 36,
      rainfall: 14,
      forestDensity: 0.14,
    },
  },
];
