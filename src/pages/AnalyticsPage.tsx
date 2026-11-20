import React, { useMemo, useState } from 'react';
import { MultiLineChart } from '../components/Charts';
import { SimulationState, TaskType } from '../types/simulation';
import { TASK_LABELS_KZ } from '../utils/i18n';

interface AnalyticsPageProps {
  state: SimulationState;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ state }) => {
  const [dayFilter, setDayFilter] = useState<'all' | number>('all');
  const [metricFilter, setMetricFilter] = useState<
    'all' | 'resources' | 'health_risk'
  >('all');
  const [residentFilter, setResidentFilter] = useState<string>('all');

  const uniqueDays = useMemo(() => {
    const set = new Set(state.history.map((h) => h.day));
    return Array.from(set).sort((a, b) => a - b);
  }, [state.history]);

  const filteredHistory = useMemo(() => {
    if (dayFilter === 'all') return state.history;
    return state.history.filter((h) => h.day === dayFilter);
  }, [dayFilter, state.history]);

  const summary = useMemo(() => {
    let bestDay = 1;
    let bestHealth = -1;
    let highestRisk = 0;
    for (const h of state.history) {
      if (h.avgHealth > bestHealth) {
        bestHealth = h.avgHealth;
        bestDay = h.day;
      }
      if (h.survivalRisk > highestRisk) {
        highestRisk = h.survivalRisk;
      }
    }

    const productive = [...state.residents].sort(
      (a, b) => b.totalCollected - a.totalCollected
    )[0];

    const taskCounts: Partial<Record<TaskType, number>> = {};
    for (const r of state.residents) {
      for (const d of r.decisionHistory) {
        taskCounts[d.selectedObjective] = (taskCounts[d.selectedObjective] ?? 0) + 1;
      }
    }
    let topTask: TaskType = 'gather_food';
    let topCount = -1;
    for (const [k, v] of Object.entries(taskCounts)) {
      if ((v ?? 0) > topCount) {
        topCount = v ?? 0;
        topTask = k as TaskType;
      }
    }

    const totalGathered = Number(
      (
        state.totalFoodCollected +
        state.totalWaterCollected +
        state.totalWoodCollected +
        state.totalStoneCollected
      ).toFixed(1)
    );

    return {
      bestDay,
      bestHealth: bestHealth < 0 ? 0 : bestHealth,
      highestRisk,
      productive,
      topTask,
      totalGathered,
    };
  }, [state]);

  const displayedResidents =
    residentFilter === 'all'
      ? state.residents
      : state.residents.filter((r) => r.id === residentFilter);

  const xLabels = filteredHistory.map((h) => `T${h.tick}`);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#E7E9D8]">
            Аналитика және статистика
          </h1>
          <p className="mt-1 text-sm text-[#8AA78C]">
            Нақты симуляция барысында жиналған тарихи деректер мен тиімділік көрсеткіштері.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            aria-label="Күн бойынша сүзгі"
            value={dayFilter}
            onChange={(e) =>
              setDayFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="bg-[#172720] border border-[#263B30] rounded-lg px-3 py-2 text-[#E7E9D8]"
          >
            <option value="all">Барлық күндер</option>
            {uniqueDays.map((d) => (
              <option key={d} value={d}>
                {d}-күн
              </option>
            ))}
          </select>

          <select
            aria-label="Метрика бойынша сүзгі"
            value={metricFilter}
            onChange={(e) =>
              setMetricFilter(e.target.value as 'all' | 'resources' | 'health_risk')
            }
            className="bg-[#172720] border border-[#263B30] rounded-lg px-3 py-2 text-[#E7E9D8]"
          >
            <option value="all">Барлық графиктер</option>
            <option value="resources">Тек ресурстар</option>
            <option value="health_risk">Денсаулық және қауіп</option>
          </select>

          <select
            aria-label="Тұрғын бойынша сүзгі"
            value={residentFilter}
            onChange={(e) => setResidentFilter(e.target.value)}
            className="bg-[#172720] border border-[#263B30] rounded-lg px-3 py-2 text-[#E7E9D8]"
          >
            <option value="all">Барлық тұрғындар</option>
            {state.residents.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 text-xs">
        <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4">
          <div className="text-[#8AA78C]">Ең үздік күн</div>
          <div className="mt-1 font-mono text-lg font-semibold text-[#D5AE64] tabular-nums">
            {summary.bestDay}-күн ({summary.bestHealth}%)
          </div>
        </div>
        <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4">
          <div className="text-[#8AA78C]">Ең өнімді тұрғын</div>
          <div className="mt-1 font-display text-lg font-semibold text-[#E7E9D8]">
            {summary.productive?.name ?? '-'}
          </div>
        </div>
        <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4">
          <div className="text-[#8AA78C]">Жиі тапсырма</div>
          <div className="mt-1 text-sm font-semibold text-[#E7E9D8]">
            {TASK_LABELS_KZ[summary.topTask]}
          </div>
        </div>
        <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4">
          <div className="text-[#8AA78C]">Ең жоғары қауіп</div>
          <div className="mt-1 font-mono text-lg font-semibold text-[#D76D61] tabular-nums">
            {summary.highestRisk}%
          </div>
        </div>
        <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4">
          <div className="text-[#8AA78C]">Барлық жиналған ресурс</div>
          <div className="mt-1 font-mono text-lg font-semibold text-[#8AA78C] tabular-nums">
            {summary.totalGathered}
          </div>
        </div>
        <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4">
          <div className="text-[#8AA78C]">Симуляция қадамдары</div>
          <div className="mt-1 font-mono text-lg font-semibold text-[#E7E9D8] tabular-nums">
            {state.tick} tick
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(metricFilter === 'all' || metricFilter === 'health_risk') && (
          <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5">
            <MultiLineChart
              title="Популяция денсаулығы және аман қалу қаупі"
              xLabels={xLabels}
              yMax={100}
              unit="%"
              series={[
                {
                  id: 'avgHealth',
                  label: 'Орташа денсаулық',
                  color: '#8AA78C',
                  values: filteredHistory.map((h) => h.avgHealth),
                },
                {
                  id: 'risk',
                  label: 'Bayesian қаупі',
                  color: '#D76D61',
                  values: filteredHistory.map((h) => h.survivalRisk),
                },
              ]}
            />
          </div>
        )}

        {(metricFilter === 'all' || metricFilter === 'resources') && (
          <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5">
            <MultiLineChart
              title="Азық, су және ағаш қорларының өзгеруі"
              xLabels={xLabels}
              yMax={160}
              series={[
                {
                  id: 'food',
                  label: 'Азық',
                  color: '#D5AE64',
                  values: filteredHistory.map((h) => h.food),
                },
                {
                  id: 'water',
                  label: 'Су',
                  color: '#6BB0C9',
                  values: filteredHistory.map((h) => h.water),
                },
                {
                  id: 'wood',
                  label: 'Ағаш',
                  color: '#8AA78C',
                  values: filteredHistory.map((h) => h.wood),
                },
              ]}
            />
          </div>
        )}
      </div>

      {/* Resident Productivity Breakdown */}
      <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5 overflow-x-auto">
        <h2 className="font-display text-base font-semibold text-[#E7E9D8] mb-3">
          Тұрғындардың жеке тиімділік кестесі
        </h2>
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#263B30] text-[#8AA78C]">
              <th className="py-2 pr-4">Тұрғын</th>
              <th className="py-2 pr-4 text-right">Орындалған тапсырма</th>
              <th className="py-2 pr-4 text-right">Жүрген қашықтық</th>
              <th className="py-2 pr-4 text-right">Жиналған ресурс</th>
              <th className="py-2 text-right">Қозғалыс тиімділігі</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#263B30] font-mono tabular-nums">
            {displayedResidents.map((r) => {
              const eff =
                r.distanceTraveled > 0
                  ? (r.totalCollected / r.distanceTraveled).toFixed(2)
                  : '0.00';
              return (
                <tr key={r.id}>
                  <td className="py-2.5 pr-4 font-sans font-semibold text-[#E7E9D8]">
                    {r.name} ({r.role})
                  </td>
                  <td className="py-2.5 pr-4 text-right text-[#E7E9D8]">
                    {r.tasksCompleted}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-[#C8B995]">
                    {r.distanceTraveled}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-[#D5AE64]">
                    {r.totalCollected}
                  </td>
                  <td className="py-2.5 text-right text-[#8AA78C]">{eff} ед/қадам</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
