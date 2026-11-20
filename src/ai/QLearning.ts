import { createSeededRng } from '../utils/randomSeed';
import {
  QActionKey,
  QLearningEpisodeSummary,
  QLearningResult,
  QStateKey,
} from '../types/simulation';

export const Q_STATES: QStateKey[] = [
  'critical_thirst',
  'critical_hunger',
  'low_energy',
  'low_resources_danger',
  'low_resources_safe',
  'normal_danger',
  'normal_safe',
];

export const Q_ACTIONS: QActionKey[] = [
  'gather_food',
  'collect_water',
  'rest',
  'collect_wood',
  'explore',
];

export const Q_STATE_LABELS_KZ: Record<QStateKey, string> = {
  critical_thirst: 'Сыни шөл',
  critical_hunger: 'Сыни аштық',
  low_energy: 'Төмен энергия',
  low_resources_danger: 'Ресурс аз + Қауіпті ауа райы',
  low_resources_safe: 'Ресурс аз + Қалыпты орта',
  normal_danger: 'Қалыпты күй + Қауіпті орта',
  normal_safe: 'Қалыпты күй + Қауіпсіз орта',
};

export const Q_ACTION_LABELS_KZ: Record<QActionKey, string> = {
  gather_food: 'Азық жинау',
  collect_water: 'Су әкелу',
  rest: 'Демалу',
  collect_wood: 'Ағаш жинау',
  explore: 'Барлау',
};

function createEmptyQTable(): Record<QStateKey, Record<QActionKey, number>> {
  const table = {} as Record<QStateKey, Record<QActionKey, number>>;
  for (const s of Q_STATES) {
    table[s] = {
      gather_food: 0,
      collect_water: 0,
      rest: 0,
      collect_wood: 0,
      explore: 0,
    };
  }
  return table;
}

function extractPolicy(
  table: Record<QStateKey, Record<QActionKey, number>>
): Record<QStateKey, QActionKey> {
  const policy = {} as Record<QStateKey, QActionKey>;
  for (const s of Q_STATES) {
    let bestAction: QActionKey = Q_ACTIONS[0];
    let bestVal = -Infinity;
    for (const a of Q_ACTIONS) {
      if (table[s][a] > bestVal) {
        bestVal = table[s][a];
        bestAction = a;
      }
    }
    policy[s] = bestAction;
  }
  return policy;
}

interface SimEpisodeState {
  hunger: number;
  thirst: number;
  energy: number;
  health: number;
  foodReserve: number;
  waterReserve: number;
  dangerWeather: boolean;
}

function discretizeState(st: SimEpisodeState): QStateKey {
  if (st.thirst >= 70) return 'critical_thirst';
  if (st.hunger >= 70) return 'critical_hunger';
  if (st.energy <= 28) return 'low_energy';
  const lowRes = st.foodReserve < 15 || st.waterReserve < 15;
  if (lowRes && st.dangerWeather) return 'low_resources_danger';
  if (lowRes) return 'low_resources_safe';
  if (st.dangerWeather) return 'normal_danger';
  return 'normal_safe';
}

/**
 * Genuine Tabular Q-Learning trainer for island survival policy optimization.
 * Updates Q(s, a) <- Q(s, a) + alpha * (r + gamma * max_a' Q(s', a') - Q(s, a))
 */
export function runQLearningTraining(options?: {
  episodes?: number;
  alpha?: number;
  gamma?: number;
  initialEpsilon?: number;
  seed?: number;
}): QLearningResult {
  const episodes = options?.episodes ?? 120;
  const alpha = options?.alpha ?? 0.25;
  const gamma = options?.gamma ?? 0.9;
  let epsilon = options?.initialEpsilon ?? 0.55;
  const rng = createSeededRng(options?.seed ?? 4242);

  const qTable = createEmptyQTable();
  const beforePolicy = extractPolicy(qTable);
  const episodeHistory: QLearningEpisodeSummary[] = [];

  let cumulativeReward = 0;
  let qDeltaTotal = 0;

  for (let ep = 1; ep <= episodes; ep++) {
    const sim: SimEpisodeState = {
      hunger: 30 + rng.nextInt(0, 25),
      thirst: 30 + rng.nextInt(0, 25),
      energy: 65 + rng.nextInt(0, 25),
      health: 95,
      foodReserve: 18,
      waterReserve: 18,
      dangerWeather: rng.next() < 0.3,
    };

    let epReward = 0;
    let survivedTicks = 0;

    for (let step = 0; step < 30; step++) {
      const state = discretizeState(sim);

      // Epsilon-greedy action selection
      let action: QActionKey;
      if (rng.next() < epsilon) {
        action = rng.pick(Q_ACTIONS);
      } else {
        let bestA = Q_ACTIONS[0];
        let bestQ = -Infinity;
        for (const a of Q_ACTIONS) {
          if (qTable[state][a] > bestQ) {
            bestQ = qTable[state][a];
            bestA = a;
          }
        }
        action = bestA;
      }

      // Environment step transition & reward computation
      let reward = 1.0; // Survival tick reward
      sim.hunger = Math.min(100, sim.hunger + 6);
      sim.thirst = Math.min(100, sim.thirst + (sim.dangerWeather ? 10 : 7));
      sim.energy = Math.max(0, sim.energy - 5);

      if (action === 'collect_water') {
        sim.waterReserve += 6;
        const drank = Math.min(sim.thirst, 35);
        sim.thirst -= drank;
        reward += state === 'critical_thirst' ? 12 : sim.waterReserve < 16 ? 5 : 1;
      } else if (action === 'gather_food') {
        sim.foodReserve += 6;
        const ate = Math.min(sim.hunger, 35);
        sim.hunger -= ate;
        reward += state === 'critical_hunger' ? 12 : sim.foodReserve < 16 ? 5 : 1;
      } else if (action === 'rest') {
        sim.energy = Math.min(100, sim.energy + 30);
        reward += state === 'low_energy' ? 11 : -1;
      } else if (action === 'collect_wood') {
        sim.energy = Math.max(0, sim.energy - 4);
        reward += sim.dangerWeather ? 3 : 2;
      } else if (action === 'explore') {
        sim.energy = Math.max(0, sim.energy - 5);
        if (rng.next() < 0.35) {
          sim.foodReserve += 3;
          reward += 3;
        } else {
          reward += 0.5;
        }
      }

      if (sim.hunger >= 85 || sim.thirst >= 85) {
        sim.health -= 18;
        reward -= 14;
      } else if (sim.energy <= 10) {
        sim.health -= 6;
        reward -= 6;
      } else {
        sim.health = Math.min(100, sim.health + 2);
      }

      if (rng.next() < 0.15) {
        sim.dangerWeather = !sim.dangerWeather;
      }

      const nextState = discretizeState(sim);
      const maxNextQ = Math.max(...Q_ACTIONS.map((a) => qTable[nextState][a]));

      const oldQ = qTable[state][action];
      const newQ = oldQ + alpha * (reward + gamma * maxNextQ - oldQ);
      qTable[state][action] = Number(newQ.toFixed(3));
      qDeltaTotal += Math.abs(newQ - oldQ);

      epReward += reward;
      survivedTicks++;

      if (sim.health <= 0) {
        break;
      }
    }

    cumulativeReward += epReward;
    epsilon = Math.max(0.08, epsilon * 0.975);

    episodeHistory.push({
      episode: ep,
      totalReward: Number(epReward.toFixed(2)),
      averageReward: Number((cumulativeReward / ep).toFixed(2)),
      epsilon: Number(epsilon.toFixed(3)),
      survivedTicks,
    });
  }

  return {
    episodes,
    alpha,
    gamma,
    epsilon: Number(epsilon.toFixed(3)),
    qTable,
    beforePolicy,
    afterPolicy: extractPolicy(qTable),
    episodeHistory,
    qDeltaTotal: Number(qDeltaTotal.toFixed(2)),
  };
}
