import { TerrainType } from '../types/simulation';

export interface TerrainMeta {
  type: TerrainType;
  labelKz: string;
  movementCost: number; // Infinity means blocked
  walkable: boolean;
  fill: string;
  stroke: string;
  accent: string;
  descriptionKz: string;
}

export const TERRAIN_META: Record<TerrainType, TerrainMeta> = {
  grassland: {
    type: 'grassland',
    labelKz: 'Шалғынды дала',
    movementCost: 1,
    walkable: true,
    fill: '#22382B',
    stroke: '#2C4637',
    accent: '#4F775A',
    descriptionKz: 'Қалыпты қозғалыс құны (1.0). Тұрғындар еркін жүреді.',
  },
  forest: {
    type: 'forest',
    labelKz: 'Орман',
    movementCost: 2,
    walkable: true,
    fill: '#182C21',
    stroke: '#213B2D',
    accent: '#3F6A4C',
    descriptionKz: 'Қозғалыс құны жоғары (2.0). Ағаш қорының негізгі көзі.',
  },
  water: {
    type: 'water',
    labelKz: 'Су айдыны',
    movementCost: Infinity,
    walkable: false,
    fill: '#163B4D',
    stroke: '#1F4E65',
    accent: '#579BB8',
    descriptionKz: 'Жаяу өтуге болмайды, бірақ жағалауынан таза су жинауға болады.',
  },
  rock: {
    type: 'rock',
    labelKz: 'Тасты жер',
    movementCost: Infinity,
    walkable: false,
    fill: '#2E3436',
    stroke: '#3F4749',
    accent: '#7D878A',
    descriptionKz: 'Бөгелген жартасты аймақ. Жанындағы аймақтардан тас өндіріледі.',
  },
  berry: {
    type: 'berry',
    labelKz: 'Жидек бұталары',
    movementCost: 1.2,
    walkable: true,
    fill: '#273D2B',
    stroke: '#334E38',
    accent: '#D76D61',
    descriptionKz: 'Азық-түлік (жидек) көзі. Жоғары тағамдық қор.',
  },
  fertile: {
    type: 'fertile',
    labelKz: 'Құнарлы топырақ',
    movementCost: 1,
    walkable: true,
    fill: '#2E3B25',
    stroke: '#3B4C2F',
    accent: '#97B36E',
    descriptionKz: 'Ресурстар тез қалпына келетін құнарлы жер.',
  },
  mud: {
    type: 'mud',
    labelKz: 'Батпақты жер',
    movementCost: 3,
    walkable: true,
    fill: '#332C22',
    stroke: '#443A2D',
    accent: '#8B7456',
    descriptionKz: 'Өту қиын батпақ (құны 3.0). A* бұл аймақты айналып өтуге тырысады.',
  },
  path: {
    type: 'path',
    labelKz: 'Соқпақ жол',
    movementCost: 0.8,
    walkable: true,
    fill: '#3A3A2B',
    stroke: '#4A4937',
    accent: '#C8B995',
    descriptionKz: 'Төмен қозғалыс құны (0.8). Қоныс маңындағы жылдам жол.',
  },
};

export function getTerrainMovementCost(terrain: TerrainType): number {
  return TERRAIN_META[terrain].movementCost;
}

export function isWalkableTerrain(terrain: TerrainType): boolean {
  return TERRAIN_META[terrain].walkable;
}
