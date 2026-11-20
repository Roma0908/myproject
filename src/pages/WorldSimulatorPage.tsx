import React, { useState } from 'react';
import { Eye, EyeOff, MapPin, SlidersHorizontal, UserCheck } from 'lucide-react';
import { TERRAIN_META } from '../data/terrain';
import { Coordinates, SimulationState, WeatherType } from '../types/simulation';
import { STATE_LABELS_KZ, TASK_LABELS_KZ, WEATHER_LABELS_KZ } from '../utils/i18n';
import { IslandMap } from '../components/IslandMap';

interface WorldSimulatorPageProps {
  state: SimulationState;
  selectedTile: Coordinates | null;
  selectedResidentId: string | null;
  onSelectTile: (coords: Coordinates) => void;
  onSelectResident: (id: string) => void;
  onUpdateEnvironment: (patch: {
    temperature?: number;
    rainfall?: number;
    weather?: WeatherType;
  }) => void;
}

export const WorldSimulatorPage: React.FC<WorldSimulatorPageProps> = ({
  state,
  selectedTile,
  selectedResidentId,
  onSelectTile,
  onSelectResident,
  onUpdateEnvironment,
}) => {
  const [showAStar, setShowAStar] = useState(true);

  const activeCoords = selectedTile ?? state.campLocation;
  const inspectedTile =
    state.grid[activeCoords.y]?.[activeCoords.x] ??
    state.grid[state.campLocation.y][state.campLocation.x];
  const terrainMeta = TERRAIN_META[inspectedTile.terrain];

  const residentsOnTile = state.residents.filter(
    (r) => r.x === inspectedTile.x && r.y === inspectedTile.y
  );

  const selectedResident =
    state.residents.find((r) => r.id === selectedResidentId) ?? state.residents[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#E7E9D8]">
            Әлем симуляторы — Тірі Арал
          </h1>
          <p className="mt-1 text-sm text-[#8AA78C]">
            Карта ұяшықтарын басып ресурстарды тексеріңіз, тұрғындардың A* маршруттарын бақылаңыз және климатты басқарыңыз.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAStar((v) => !v)}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
            showAStar
              ? 'bg-[#263B30] border-[#D5AE64]/50 text-[#D5AE64]'
              : 'bg-[#172720] border-[#263B30] text-[#C8B995]'
          }`}
        >
          {showAStar ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          A* бағыт визуализациясы: {showAStar ? 'Қосулы' : 'Өшірулі'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Map Stage */}
        <div className="xl:col-span-8 rounded-xl bg-[#172720] border border-[#263B30] p-4">
          <IslandMap
            grid={state.grid}
            residents={state.residents}
            selectedTile={activeCoords}
            selectedResidentId={selectedResident?.id ?? null}
            onSelectTile={onSelectTile}
            onSelectResident={onSelectResident}
            showAStarOverlay={showAStar}
          />
        </div>

        {/* Right: Tile Inspector, Resident Selector, Environment Controls */}
        <div className="xl:col-span-4 space-y-4">
          {/* Tile Inspector */}
          <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-[#E7E9D8] flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#D5AE64]" />
                Ұяшық инспекторы
              </h2>
              <span className="font-mono text-xs tabular-nums text-[#D5AE64]">
                ({inspectedTile.x}, {inspectedTile.y})
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#263B30]">
                <span className="text-[#8AA78C]">Жер бедері</span>
                <span className="text-[#E7E9D8] font-medium">{terrainMeta.labelKz}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#263B30]">
                <span className="text-[#8AA78C]">Қозғалыс құны</span>
                <span className="font-mono tabular-nums text-[#E7E9D8]">
                  {Number.isFinite(terrainMeta.movementCost)
                    ? terrainMeta.movementCost
                    : 'Өту мүмкін емес'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#263B30]">
                <span className="text-[#8AA78C]">Қолжетімді ресурс</span>
                <span className="font-mono tabular-nums text-[#E7E9D8]">
                  {inspectedTile.resourceType
                    ? `${inspectedTile.resourceType.toUpperCase()} · ${inspectedTile.resourceAmount} / ${inspectedTile.maxResourceAmount}`
                    : 'Жоқ'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#263B30]">
                <span className="text-[#8AA78C]">Зерттелген күй</span>
                <span className="text-[#E7E9D8]">
                  {inspectedTile.explored ? 'Ашылған' : 'Барланбаған'}
                </span>
              </div>
              <p className="text-[#C8B995] pt-1 leading-relaxed">
                {terrainMeta.descriptionKz}
              </p>

              {residentsOnTile.length > 0 && (
                <div className="pt-2 border-t border-[#263B30]">
                  <div className="text-[#8AA78C] mb-1">Осы ұяшықтағы тұрғындар:</div>
                  <div className="flex flex-wrap gap-2">
                    {residentsOnTile.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => onSelectResident(r.id)}
                        className="px-2.5 py-1 rounded bg-[#263B30] text-[#E7E9D8] hover:text-[#D5AE64] cursor-pointer"
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Selected Resident & Route Telemetry */}
          {selectedResident && (
            <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-semibold text-[#E7E9D8] flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-[#8AA78C]" />
                  Тұрғын бағыты
                </h2>
                <select
                  aria-label="Тұрғынды таңдау"
                  value={selectedResident.id}
                  onChange={(e) => onSelectResident(e.target.value)}
                  className="bg-[#101B17] border border-[#263B30] rounded-md px-2.5 py-1 text-xs text-[#E7E9D8]"
                >
                  {state.residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#8AA78C]">Ағымдағы тапсырма</span>
                  <span className="text-[#D5AE64] font-medium">
                    {TASK_LABELS_KZ[selectedResident.currentTask]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8AA78C]">Күйі</span>
                  <span className="text-[#E7E9D8]">
                    {STATE_LABELS_KZ[selectedResident.state]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8AA78C]">Мақсат координаттары</span>
                  <span className="font-mono tabular-nums text-[#E7E9D8]">
                    {selectedResident.currentTarget
                      ? `(${selectedResident.currentTarget.x}, ${selectedResident.currentTarget.y})`
                      : 'Жоқ'}
                  </span>
                </div>
                {selectedResident.lastAStar && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-[#8AA78C]">A* маршрут құны</span>
                      <span className="font-mono tabular-nums text-[#E7E9D8]">
                        {selectedResident.lastAStar.found
                          ? selectedResident.lastAStar.totalCost
                          : 'Қолжетімсіз'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8AA78C]">Қалған қадам / Зерттелген</span>
                      <span className="font-mono tabular-nums text-[#E7E9D8]">
                        {selectedResident.currentPath.length} /{' '}
                        {selectedResident.lastAStar.exploredNodes.length} түйін
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Live Environment Controls */}
          <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4 space-y-3">
            <h2 className="font-display text-sm font-semibold text-[#E7E9D8] flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#D5AE64]" />
              Табиғи орта параметрлері
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <label htmlFor="env-temp" className="text-[#C8B995]">
                    Температура
                  </label>
                  <span className="font-mono tabular-nums text-[#E7E9D8]">
                    {state.environment.temperature}°C
                  </span>
                </div>
                <input
                  id="env-temp"
                  type="range"
                  min={10}
                  max={42}
                  step={1}
                  value={Math.round(state.environment.temperature)}
                  onChange={(e) =>
                    onUpdateEnvironment({ temperature: Number(e.target.value) })
                  }
                  className="w-full accent-[#D5AE64]"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label htmlFor="env-rain" className="text-[#C8B995]">
                    Жауын-шашын
                  </label>
                  <span className="font-mono tabular-nums text-[#E7E9D8]">
                    {state.environment.rainfall}%
                  </span>
                </div>
                <input
                  id="env-rain"
                  type="range"
                  min={5}
                  max={100}
                  step={1}
                  value={Math.round(state.environment.rainfall)}
                  onChange={(e) =>
                    onUpdateEnvironment({ rainfall: Number(e.target.value) })
                  }
                  className="w-full accent-[#6BB0C9]"
                />
              </div>

              <div>
                <label htmlFor="env-weather" className="block text-[#C8B995] mb-1">
                  Ауа райы күйі
                </label>
                <select
                  id="env-weather"
                  value={state.environment.weather}
                  onChange={(e) =>
                    onUpdateEnvironment({ weather: e.target.value as WeatherType })
                  }
                  className="w-full bg-[#101B17] border border-[#263B30] rounded-lg px-3 py-2 text-xs text-[#E7E9D8]"
                >
                  {(Object.keys(WEATHER_LABELS_KZ) as WeatherType[]).map((w) => (
                    <option key={w} value={w}>
                      {WEATHER_LABELS_KZ[w]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
