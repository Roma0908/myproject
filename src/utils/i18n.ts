import {
  DifficultyLevel,
  EventCategory,
  ResidentRole,
  ResidentStateType,
  RiskLevel,
  TaskType,
  WeatherType,
} from '../types/simulation';

export const NAV_ITEMS = [
  { id: 'overview', label: 'Шолу' },
  { id: 'simulator', label: 'Әлем симуляторы' },
  { id: 'population', label: 'Тұрғындар' },
  { id: 'intelligence', label: 'AI Зерде орталығы' },
  { id: 'experiments', label: 'Тәжірибе зертханасы' },
  { id: 'analytics', label: 'Аналитика' },
  { id: 'history', label: 'Оқиғалар тарихы' },
  { id: 'settings', label: 'Баптаулар' },
] as const;

export type NavSectionId = (typeof NAV_ITEMS)[number]['id'];

export const WEATHER_LABELS_KZ: Record<WeatherType, string> = {
  sunny: 'Ашық күн',
  cloudy: 'Бұлтты',
  rainy: 'Жаңбырлы',
  drought: 'Қуаңшылық',
  storm: 'Дауыл',
};

export const TASK_LABELS_KZ: Record<TaskType, string> = {
  gather_food: 'Азық жинау',
  collect_water: 'Су әкелу',
  collect_wood: 'Ағаш дайындау',
  build_shelter: 'Баспана салу',
  explore: 'Аралды барлау',
  rest: 'Демалу',
};

export const ROLE_LABELS_KZ: Record<ResidentRole, string> = {
  Forager: 'Азық іздеуші',
  Builder: 'Құрылысшы',
  Gatherer: 'Жинаушы',
  Explorer: 'Барлаушы',
  Scout: 'Із кесуші',
  Medic: 'Дәрігер',
};

export const STATE_LABELS_KZ: Record<ResidentStateType, string> = {
  idle: 'Күтуде',
  moving: 'Жолда',
  gathering: 'Ресурс жинауда',
  eating: 'Тамақтануда',
  drinking: 'Су ішуде',
  resting: 'Демалуда',
  building: 'Құрылыс салуда',
  exploring: 'Барлауда',
};

export const RISK_LABELS_KZ: Record<RiskLevel, string> = {
  low: 'Төмен қауіп',
  moderate: 'Орташа қауіп',
  high: 'Жоғары қауіп',
  critical: 'Сыни қауіп',
};

export const DIFFICULTY_LABELS_KZ: Record<DifficultyLevel, string> = {
  easy: 'Жеңіл',
  normal: 'Қалыпты',
  hard: 'Қиын',
};

export const EVENT_CATEGORY_LABELS_KZ: Record<EventCategory, string> = {
  resident_action: 'Тұрғын әрекеті',
  resource_change: 'Ресурс өзгерісі',
  ai_decision: 'AI шешімі',
  environment: 'Табиғат өзгерісі',
  construction: 'Құрылыс',
  warning: 'Ескерту',
  simulation: 'Симуляция',
};
