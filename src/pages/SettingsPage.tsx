import React, { useState } from 'react';
import {
  Download,
  RefreshCw,
  Save,
  Shuffle,
  Upload,
} from 'lucide-react';
import { WORLD_PRESETS } from '../data/probabilities';
import {
  DifficultyLevel,
  MapSizeOption,
  SimulationState,
  WorldConfig,
} from '../types/simulation';
import { exportSimulationJSON } from '../utils/export';
import { DIFFICULTY_LABELS_KZ } from '../utils/i18n';
import { validateSimulationState } from '../utils/storage';

interface SettingsPageProps {
  currentConfig: WorldConfig;
  state: SimulationState;
  onApplyWorldConfig: (config: WorldConfig) => void;
  onSaveSimulation: () => void;
  onLoadSavedSimulation: () => boolean;
  onImportSimulation: (imported: SimulationState) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentConfig,
  state,
  onApplyWorldConfig,
  onSaveSimulation,
  onLoadSavedSimulation,
  onImportSimulation,
}) => {
  const [draft, setDraft] = useState<WorldConfig>({ ...currentConfig });
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const applyPreset = (presetConfig: Partial<WorldConfig>) => {
    setDraft((prev) => ({ ...prev, ...presetConfig }));
    setFeedback('Алдын ала баптау таңдалды — қолдану үшін «Жаңа әлем құру» басыңыз.');
    setErrorMsg(null);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!validateSimulationState(parsed)) {
        setErrorMsg('Қате: JSON файлы PROJECT EDEN форматына сәйкес емес.');
        return;
      }
      onImportSimulation(parsed);
      setDraft({ ...parsed.config });
      setFeedback('Симуляция JSON файлынан сәтті жүктелді.');
      setErrorMsg(null);
    } catch {
      setErrorMsg('Файлды оқу мүмкін болмады.');
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#E7E9D8]">
          Баптаулар және әлем генераторы
        </h1>
        <p className="mt-1 text-sm text-[#8AA78C]">
          Карта өлшемін, тұрғындар санын, климатты, seed параметрін және сақтау/экспорт әрекеттерін басқарыңыз.
        </p>
      </div>

      {feedback && (
        <div className="rounded-lg bg-[#263B30] border border-[#8AA78C]/40 px-4 py-2.5 text-xs text-[#E7E9D8]">
          {feedback}
        </div>
      )}
      {errorMsg && (
        <div className="rounded-lg bg-[#D76D61]/15 border border-[#D76D61]/50 px-4 py-2.5 text-xs text-[#D76D61]">
          {errorMsg}
        </div>
      )}

      {/* Environmental Presets */}
      <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-3">
        <h2 className="font-display text-base font-semibold text-[#E7E9D8]">
          Орта үлгілері (Presets)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {WORLD_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.config)}
              className="text-left rounded-xl bg-[#101B17] border border-[#263B30] hover:border-[#D5AE64]/60 p-3.5 space-y-1.5 transition-colors cursor-pointer"
            >
              <div className="font-semibold text-xs text-[#D5AE64]">
                {preset.nameKz}
              </div>
              <div className="text-[11px] text-[#C8B995] leading-relaxed">
                {preset.descriptionKz}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* World Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-4 text-xs">
          <h2 className="font-display text-base font-semibold text-[#E7E9D8]">
            Жаңа әлем параметрлері
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="cfg-size" className="block text-[#8AA78C] mb-1">
                Карта өлшемі
              </label>
              <select
                id="cfg-size"
                value={draft.mapSize}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    mapSize: Number(e.target.value) as MapSizeOption,
                  }))
                }
                className="w-full bg-[#101B17] border border-[#263B30] rounded-lg px-3 py-2 text-[#E7E9D8]"
              >
                <option value={16}>16 × 16 ұяшық</option>
                <option value={20}>20 × 20 ұяшық</option>
                <option value={24}>24 × 24 ұяшық</option>
              </select>
            </div>

            <div>
              <label htmlFor="cfg-residents" className="block text-[#8AA78C] mb-1">
                Тұрғындар саны (3–6)
              </label>
              <select
                id="cfg-residents"
                value={draft.residentCount}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, residentCount: Number(e.target.value) }))
                }
                className="w-full bg-[#101B17] border border-[#263B30] rounded-lg px-3 py-2 text-[#E7E9D8]"
              >
                {[3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} тұрғын
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="cfg-diff" className="block text-[#8AA78C] mb-1">
                Қиындық деңгейі
              </label>
              <select
                id="cfg-diff"
                value={draft.difficulty}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    difficulty: e.target.value as DifficultyLevel,
                  }))
                }
                className="w-full bg-[#101B17] border border-[#263B30] rounded-lg px-3 py-2 text-[#E7E9D8]"
              >
                {(['easy', 'normal', 'hard'] as DifficultyLevel[]).map((d) => (
                  <option key={d} value={d}>
                    {DIFFICULTY_LABELS_KZ[d]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="cfg-food" className="block text-[#8AA78C] mb-1">
                Бастапқы азық
              </label>
              <input
                id="cfg-food"
                type="number"
                min={5}
                max={150}
                value={draft.initialFood}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    initialFood: Math.max(5, Math.min(150, Number(e.target.value) || 10)),
                  }))
                }
                className="w-full bg-[#101B17] border border-[#263B30] rounded-lg px-3 py-2 font-mono tabular-nums text-[#E7E9D8]"
              />
            </div>

            <div>
              <label htmlFor="cfg-water" className="block text-[#8AA78C] mb-1">
                Бастапқы су
              </label>
              <input
                id="cfg-water"
                type="number"
                min={5}
                max={150}
                value={draft.initialWater}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    initialWater: Math.max(5, Math.min(150, Number(e.target.value) || 10)),
                  }))
                }
                className="w-full bg-[#101B17] border border-[#263B30] rounded-lg px-3 py-2 font-mono tabular-nums text-[#E7E9D8]"
              />
            </div>

            <div>
              <label htmlFor="cfg-wood" className="block text-[#8AA78C] mb-1">
                Бастапқы ағаш
              </label>
              <input
                id="cfg-wood"
                type="number"
                min={0}
                max={140}
                value={draft.initialWood}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    initialWood: Math.max(0, Math.min(140, Number(e.target.value) || 0)),
                  }))
                }
                className="w-full bg-[#101B17] border border-[#263B30] rounded-lg px-3 py-2 font-mono tabular-nums text-[#E7E9D8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between mb-1">
                <label htmlFor="cfg-temp" className="text-[#8AA78C]">
                  Температура
                </label>
                <span className="font-mono text-[#E7E9D8]">{draft.temperature}°C</span>
              </div>
              <input
                id="cfg-temp"
                type="range"
                min={10}
                max={42}
                value={draft.temperature}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, temperature: Number(e.target.value) }))
                }
                className="w-full accent-[#D5AE64]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label htmlFor="cfg-rain" className="text-[#8AA78C]">
                  Жауын-шашын
                </label>
                <span className="font-mono text-[#E7E9D8]">{draft.rainfall}%</span>
              </div>
              <input
                id="cfg-rain"
                type="range"
                min={5}
                max={100}
                value={draft.rainfall}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, rainfall: Number(e.target.value) }))
                }
                className="w-full accent-[#6BB0C9]"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label htmlFor="cfg-forest" className="text-[#8AA78C]">
                  Орман тығыздығы
                </label>
                <span className="font-mono text-[#E7E9D8]">
                  {Math.round(draft.forestDensity * 100)}%
                </span>
              </div>
              <input
                id="cfg-forest"
                type="range"
                min={10}
                max={45}
                value={Math.round(draft.forestDensity * 100)}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    forestDensity: Number(e.target.value) / 100,
                  }))
                }
                className="w-full accent-[#8AA78C]"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-[#263B30]">
            <div>
              <label htmlFor="cfg-seed" className="block text-[#8AA78C] mb-1">
                Генерация Seed
              </label>
              <input
                id="cfg-seed"
                type="number"
                value={draft.seed}
                onChange={(e) =>
                  setDraft((p) => ({ ...p, seed: Number(e.target.value) || 1 }))
                }
                className="w-36 bg-[#101B17] border border-[#263B30] rounded-lg px-3 py-2 font-mono tabular-nums text-[#E7E9D8]"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setDraft((p) => ({
                  ...p,
                  seed: Math.floor(100000 + Math.random() * 899999),
                }))
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#101B17] border border-[#263B30] text-[#C8B995] hover:text-[#E7E9D8] cursor-pointer"
            >
              <Shuffle className="h-3.5 w-3.5" />
              Кездейсоқ Seed
            </button>

            <button
              type="button"
              onClick={() => setConfirmResetOpen(true)}
              className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-[#D5AE64] text-[#101B17] hover:bg-[#E2BD76] cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Жаңа әлем құру
            </button>
          </div>
        </div>

        {/* Persistence & Export Panel */}
        <div className="lg:col-span-5 rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-4 text-xs">
          <h2 className="font-display text-base font-semibold text-[#E7E9D8]">
            Сақтау және экспорт (Persistence)
          </h2>
          <p className="text-[#8AA78C] leading-relaxed">
            Симуляция күйі браузердің localStorage жадында сақталады және JSON форматында жүктеп алуға болады.
          </p>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                onSaveSimulation();
                setFeedback('Симуляция күйі localStorage жадына сақталды.');
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-[#263B30] text-[#E7E9D8] hover:bg-[#324D3F] cursor-pointer"
            >
              <Save className="h-4 w-4 text-[#D5AE64]" />
              Симуляцияны сақтау (Save World)
            </button>

            <button
              type="button"
              onClick={() => {
                const ok = onLoadSavedSimulation();
                if (ok) {
                  setFeedback('Сақталған симуляция қалпына келтірілді.');
                  setErrorMsg(null);
                } else {
                  setErrorMsg('Сақталған күй табылмады.');
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-[#101B17] border border-[#263B30] text-[#C8B995] hover:text-[#E7E9D8] cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Сақталған әлемді жүктеу (Load World)
            </button>

            <button
              type="button"
              onClick={() => exportSimulationJSON(state)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-[#101B17] border border-[#263B30] text-[#C8B995] hover:text-[#E7E9D8] cursor-pointer"
            >
              <Download className="h-4 w-4" />
              JSON экспорттау
            </button>

            <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-[#101B17] border border-[#263B30] text-[#C8B995] hover:text-[#E7E9D8] cursor-pointer">
              <Upload className="h-4 w-4" />
              JSON импорттау
              <input
                type="file"
                accept="application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmResetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-md rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-4">
            <h3 id="reset-modal-title" className="font-display text-lg font-bold text-[#E7E9D8]">
              Ағымдағы симуляцияны қайта бастау?
            </h3>
            <p className="text-xs text-[#C8B995] leading-relaxed">
              Жаңа әлем құрылғанда ағымдағы күндер, оқиғалар тарихы және тұрғындар прогресі жаңа конфигурациямен алмастырылады.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-[#101B17] border border-[#263B30] text-[#C8B995] hover:text-[#E7E9D8] cursor-pointer"
              >
                Болдырмау
              </button>
              <button
                type="button"
                onClick={() => {
                  onApplyWorldConfig(draft);
                  setConfirmResetOpen(false);
                  setFeedback(`Жаңа әлем құрылды (Seed: ${draft.seed}).`);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#D5AE64] text-[#101B17] hover:bg-[#E2BD76] cursor-pointer"
              >
                Растау және құру
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
