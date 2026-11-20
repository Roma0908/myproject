import React from 'react';
import {
  AlertTriangle,
  Droplets,
  Flame,
  HeartPulse,
  ShieldAlert,
  Trees,
  Wheat,
} from 'lucide-react';
import { Coordinates, SimulationState } from '../types/simulation';
import {
  EVENT_CATEGORY_LABELS_KZ,
  RISK_LABELS_KZ,
  TASK_LABELS_KZ,
  WEATHER_LABELS_KZ,
} from '../utils/i18n';
import { MultiLineChart } from '../components/Charts';
import { IslandMap } from '../components/IslandMap';

interface OverviewPageProps {
  state: SimulationState;
  selectedTile: Coordinates | null;
  selectedResidentId: string | null;
  onSelectTile: (coords: Coordinates) => void;
  onSelectResident: (id: string) => void;
  onNavigate: (
    section: 'simulator' | 'population' | 'intelligence' | 'history'
  ) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  state,
  selectedTile,
  selectedResidentId,
  onSelectTile,
  onSelectResident,
  onNavigate,
}) => {
  const aliveResidents = state.residents.filter((r) => r.health > 0);
  const avgHealth =
    state.residents.reduce((sum, r) => sum + r.health, 0) /
    Math.max(1, state.residents.length);

  const prevPoint =
    state.history.length >= 2
      ? state.history[state.history.length - 2]
      : state.history[0];
  const foodDelta = Number((state.resources.food - (prevPoint?.food ?? state.resources.food)).toFixed(1));
  const waterDelta = Number((state.resources.water - (prevPoint?.water ?? state.resources.water)).toFixed(1));
  const woodDelta = Number((state.resources.wood - (prevPoint?.wood ?? state.resources.wood)).toFixed(1));

  const riskPct = Math.round(state.lastBayesian.pSurvivalRisk * 100);
  const riskColor =
    state.lastBayesian.riskLevel === 'critical'
      ? 'text-[#D76D61]'
      : state.lastBayesian.riskLevel === 'high' || state.lastBayesian.riskLevel === 'moderate'
      ? 'text-[#E7A34F]'
      : 'text-[#8AA78C]';

  const recentHistory = state.history.slice(-36);
  const xLabels = recentHistory.map((p) => `${p.day}к`);

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Context */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#E7E9D8]">
            Өркениеттің жалпы шолуы
          </h1>
          <p className="mt-1 text-sm text-[#8AA78C]">
            {state.day}-күн · {WEATHER_LABELS_KZ[state.environment.weather]} ({state.environment.temperature}°C, жауын {state.environment.rainfall}%) · Баспаналар: {state.sheltersCount}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('simulator')}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#D5AE64] text-[#101B17] hover:bg-[#E2BD76] transition-colors cursor-pointer whitespace-nowrap"
          >
            Арал картасын ашу
          </button>
          <button
            type="button"
            onClick={() => onNavigate('intelligence')}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-[#172720] border border-[#263B30] text-[#E7E9D8] hover:border-[#8AA78C]/60 transition-colors cursor-pointer whitespace-nowrap"
          >
            AI Зерде орталығы
          </button>
        </div>
      </div>

      {/* Primary KPI & Resource Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8AA78C]">
            <span>Азық-түлік қоры</span>
            <Wheat className="h-4 w-4 text-[#D5AE64]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold tabular-nums text-[#E7E9D8]">
              {Math.floor(state.resources.food)}
              <span className="text-xs text-[#8AA78C]"> / {state.resources.maxFood}</span>
            </span>
            <span
              className={`font-mono text-xs tabular-nums ${
                foodDelta >= 0 ? 'text-[#8AA78C]' : 'text-[#E7A34F]'
              }`}
            >
              {foodDelta >= 0 ? `+${foodDelta}` : foodDelta}
            </span>
          </div>
          <div className="text-xs text-[#C8B995]">
            {state.resources.food < 15 ? 'Ескерту: азық азаюда' : 'Қалыпты қамтамасыз етілген'}
          </div>
        </div>

        <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8AA78C]">
            <span>Таза су қоры</span>
            <Droplets className="h-4 w-4 text-[#6BB0C9]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold tabular-nums text-[#E7E9D8]">
              {Math.floor(state.resources.water)}
              <span className="text-xs text-[#8AA78C]"> / {state.resources.maxWater}</span>
            </span>
            <span
              className={`font-mono text-xs tabular-nums ${
                waterDelta >= 0 ? 'text-[#8AA78C]' : 'text-[#E7A34F]'
              }`}
            >
              {waterDelta >= 0 ? `+${waterDelta}` : waterDelta}
            </span>
          </div>
          <div className="text-xs text-[#C8B995]">
            Тапшылық ықтималдығы: {Math.round(state.lastBayesian.pWaterShortage * 100)}%
          </div>
        </div>

        <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8AA78C]">
            <span>Тұрғындар денсаулығы</span>
            <HeartPulse className="h-4 w-4 text-[#8AA78C]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-2xl font-semibold tabular-nums text-[#E7E9D8]">
              {avgHealth.toFixed(1)}%
            </span>
            <span className="font-mono text-xs tabular-nums text-[#C8B995]">
              {aliveResidents.length} / {state.residents.length} тірі
            </span>
          </div>
          <div className="text-xs text-[#C8B995]">
            Ағаш: {Math.floor(state.resources.wood)} ({woodDelta >= 0 ? `+${woodDelta}` : woodDelta}) · Тас: {Math.floor(state.resources.stone)}
          </div>
        </div>

        <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#8AA78C]">
            <span>Bayesian аман қалу қаупі</span>
            <ShieldAlert className="h-4 w-4 text-[#E7A34F]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className={`font-mono text-2xl font-semibold tabular-nums ${riskColor}`}>
              {riskPct}%
            </span>
            <span className={`text-xs font-medium ${riskColor}`}>
              {RISK_LABELS_KZ[state.lastBayesian.riskLevel]}
            </span>
          </div>
          <div className="text-xs text-[#C8B995] truncate">
            {state.lastBayesian.evidence.foodShortage
              ? 'Азық тапшылығы тіркелді'
              : 'Азық қоры жеткілікті'}
          </div>
        </div>
      </div>

      {/* Main Content Grid: Island Snapshot + Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-5 rounded-xl bg-[#172720] border border-[#263B30] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-[#E7E9D8]">
              Тірі Арал көрінісі
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('simulator')}
              className="text-xs font-medium text-[#D5AE64] hover:underline cursor-pointer"
            >
              Толық режим →
            </button>
          </div>
          <IslandMap
            grid={state.grid}
            residents={state.residents}
            selectedTile={selectedTile}
            selectedResidentId={selectedResidentId}
            onSelectTile={onSelectTile}
            onSelectResident={onSelectResident}
            showAStarOverlay={true}
            compact={true}
          />
        </div>

        <div className="xl:col-span-7 space-y-6">
          <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4">
            <MultiLineChart
              title="Ресурстар мен орташа денсаулық динамикасы"
              xLabels={xLabels}
              yMax={140}
              series={[
                {
                  id: 'health',
                  label: 'Денсаулық (%)',
                  color: '#8AA78C',
                  values: recentHistory.map((p) => p.avgHealth),
                },
                {
                  id: 'food',
                  label: 'Азық',
                  color: '#D5AE64',
                  values: recentHistory.map((p) => p.food),
                },
                {
                  id: 'water',
                  label: 'Су',
                  color: '#6BB0C9',
                  values: recentHistory.map((p) => p.water),
                },
                {
                  id: 'risk',
                  label: 'Қауіп (%)',
                  color: '#D76D61',
                  values: recentHistory.map((p) => p.survivalRisk),
                },
              ]}
            />
          </div>

          {/* Active Residents Compact Summary */}
          <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[#E7E9D8]">
                Белсенді AI тұрғындар
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('population')}
                className="text-xs font-medium text-[#D5AE64] hover:underline cursor-pointer"
              >
                Барлығын көру →
              </button>
            </div>
            <div className="divide-y divide-[#263B30]">
              {state.residents.map((res) => (
                <div
                  key={res.id}
                  className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: res.color }}
                    />
                    <span className="font-semibold text-[#E7E9D8]">{res.name}</span>
                    <span className="text-[#8AA78C]">·</span>
                    <span className="text-[#D5AE64]">
                      {TASK_LABELS_KZ[res.currentTask]}
                    </span>
                    <span className="text-[#8AA78C] hidden sm:inline">·</span>
                    <span className="text-[#C8B995] truncate hidden sm:inline max-w-[260px]">
                      {res.recentActivity}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 font-mono tabular-nums text-[#C8B995]">
                    <span>Денс: {Math.round(res.health)}%</span>
                    <span>Аш: {Math.round(res.hunger)}%</span>
                    <span>Шөл: {Math.round(res.thirst)}%</span>
                    <span>Эн: {Math.round(res.energy)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Live Event Feed */}
      <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[#E7E9D8]">
            Тікелей оқиғалар лентасы
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="text-xs font-medium text-[#D5AE64] hover:underline cursor-pointer"
          >
            Толық тарих →
          </button>
        </div>
        <div className="divide-y divide-[#263B30] max-h-60 overflow-y-auto">
          {state.events.slice(0, 12).map((evt) => (
            <div
              key={evt.id}
              className="py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {evt.category === 'warning' ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-[#D76D61] shrink-0" />
                ) : evt.category === 'construction' ? (
                  <Flame className="h-3.5 w-3.5 text-[#D5AE64] shrink-0" />
                ) : (
                  <Trees className="h-3.5 w-3.5 text-[#8AA78C] shrink-0" />
                )}
                <span className="text-[#E7E9D8]">{evt.description}</span>
              </div>
              <div className="text-[#8AA78C] font-mono tabular-nums shrink-0">
                {evt.day}-күн {String(evt.hour).padStart(2, '0')}:00 · {evt.algorithm} ·{' '}
                {EVENT_CATEGORY_LABELS_KZ[evt.category]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
