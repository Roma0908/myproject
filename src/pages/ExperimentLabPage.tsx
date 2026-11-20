import React, { useState } from 'react';
import { Download, FlaskConical, Play, Save } from 'lucide-react';
import { ComparisonBarChart, MultiLineChart } from '../components/Charts';
import { runComparativeExperiment } from '../experiments/ExperimentRunner';
import { ExperimentResult, WorldConfig } from '../types/simulation';
import { exportExperimentsCSV } from '../utils/export';
import { DIFFICULTY_LABELS_KZ } from '../utils/i18n';

interface ExperimentLabPageProps {
  currentConfig: WorldConfig;
  savedExperiments: ExperimentResult[];
  onSaveExperiment: (result: ExperimentResult) => void;
}

export const ExperimentLabPage: React.FC<ExperimentLabPageProps> = ({
  currentConfig,
  savedExperiments,
  onSaveExperiment,
}) => {
  const [durationTicks, setDurationTicks] = useState<number>(48);
  const [seedOverride, setSeedOverride] = useState<number>(currentConfig.seed);
  const [activeResult, setActiveResult] = useState<ExperimentResult | null>(
    savedExperiments[0] ?? null
  );
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleRun = () => {
    const result = runComparativeExperiment(
      { ...currentConfig, seed: seedOverride },
      durationTicks
    );
    setActiveResult(result);
    setSavedNotice(null);
  };

  const handleSave = () => {
    if (!activeResult) return;
    onSaveExperiment(activeResult);
    setSavedNotice('Тәжірибе нәтижесі сақталды.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#E7E9D8]">
            Тәжірибе зертханасы (Experiment Lab)
          </h1>
          <p className="mt-1 text-sm text-[#8AA78C]">
            Бірдей бастапқы карта, seed және ресурстар жағдайында Strategy A (BASELINE) мен Strategy B (PROJECT EDEN AI) тәуелсіз салыстырылады.
          </p>
        </div>

        {savedExperiments.length > 0 && (
          <button
            type="button"
            onClick={() => exportExperimentsCSV(savedExperiments)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-[#172720] border border-[#263B30] text-[#C8B995] hover:text-[#E7E9D8] cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Экспорт CSV
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4 flex flex-wrap items-end gap-4 text-xs">
        <div>
          <label htmlFor="exp-duration" className="block text-[#8AA78C] mb-1">
            Симуляция ұзақтығы
          </label>
          <select
            id="exp-duration"
            value={durationTicks}
            onChange={(e) => setDurationTicks(Number(e.target.value))}
            className="bg-[#101B17] border border-[#263B30] rounded-lg px-3 py-2 text-[#E7E9D8]"
          >
            <option value={24}>24 қадам (1 күн)</option>
            <option value={48}>48 қадам (2 күн)</option>
            <option value={72}>72 қадам (3 күн)</option>
            <option value={96}>96 қадам (4 күн)</option>
          </select>
        </div>

        <div>
          <label htmlFor="exp-seed" className="block text-[#8AA78C] mb-1">
            Ортақ Seed
          </label>
          <input
            id="exp-seed"
            type="number"
            value={seedOverride}
            onChange={(e) => setSeedOverride(Number(e.target.value) || 1)}
            className="w-32 bg-[#101B17] border border-[#263B30] rounded-lg px-3 py-2 font-mono tabular-nums text-[#E7E9D8]"
          />
        </div>

        <div className="text-[#C8B995] py-2">
          Карта: {currentConfig.mapSize}×{currentConfig.mapSize} · Қиындық:{' '}
          {DIFFICULTY_LABELS_KZ[currentConfig.difficulty]} · Тұрғындар: {currentConfig.residentCount}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={handleRun}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-[#D5AE64] text-[#101B17] hover:bg-[#E2BD76] cursor-pointer whitespace-nowrap"
          >
            <Play className="h-3.5 w-3.5" />
            RUN EXPERIMENT
          </button>

          {activeResult && (
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium bg-[#263B30] text-[#E7E9D8] hover:bg-[#314D3E] cursor-pointer whitespace-nowrap"
            >
              <Save className="h-3.5 w-3.5" />
              Нәтижені сақтау
            </button>
          )}
        </div>
      </div>

      {savedNotice && (
        <div className="text-xs text-[#8AA78C]">{savedNotice}</div>
      )}

      {activeResult ? (
        <div className="space-y-6">
          {/* Strategy Comparison Table */}
          <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5 overflow-x-auto">
            <h2 className="font-display text-base font-semibold text-[#E7E9D8] mb-3">
              Есептелген нақты көрсеткіштер салыстырмасы (Seed: {activeResult.seed}, {activeResult.durationTicks} қадам)
            </h2>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#263B30] text-[#8AA78C]">
                  <th className="py-2 pr-4">Метрика</th>
                  <th className="py-2 pr-4 text-right">Strategy A: BASELINE</th>
                  <th className="py-2 text-right text-[#D5AE64]">Strategy B: PROJECT EDEN AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263B30] font-mono tabular-nums">
                <tr>
                  <td className="py-2.5 pr-4 font-sans text-[#E7E9D8]">Аман қалған күндер</td>
                  <td className="py-2.5 pr-4 text-right text-[#C8B995]">
                    {activeResult.baseline.daysSurvived}
                  </td>
                  <td className="py-2.5 text-right text-[#E7E9D8] font-semibold">
                    {activeResult.edenAI.daysSurvived}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-sans text-[#E7E9D8]">Орташа денсаулық (%)</td>
                  <td className="py-2.5 pr-4 text-right text-[#C8B995]">
                    {activeResult.baseline.avgHealth}%
                  </td>
                  <td className="py-2.5 text-right text-[#E7E9D8] font-semibold">
                    {activeResult.edenAI.avgHealth}%
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-sans text-[#E7E9D8]">Жиналған азық</td>
                  <td className="py-2.5 pr-4 text-right text-[#C8B995]">
                    {activeResult.baseline.foodCollected}
                  </td>
                  <td className="py-2.5 text-right text-[#E7E9D8]">
                    {activeResult.edenAI.foodCollected}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-sans text-[#E7E9D8]">Жиналған су</td>
                  <td className="py-2.5 pr-4 text-right text-[#C8B995]">
                    {activeResult.baseline.waterCollected}
                  </td>
                  <td className="py-2.5 text-right text-[#E7E9D8]">
                    {activeResult.edenAI.waterCollected}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-sans text-[#E7E9D8]">Жиналған ағаш</td>
                  <td className="py-2.5 pr-4 text-right text-[#C8B995]">
                    {activeResult.baseline.woodCollected}
                  </td>
                  <td className="py-2.5 text-right text-[#E7E9D8]">
                    {activeResult.edenAI.woodCollected}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-sans text-[#E7E9D8]">
                    Ресурс тұтыну (Азық / Су)
                  </td>
                  <td className="py-2.5 pr-4 text-right text-[#C8B995]">
                    {activeResult.baseline.foodConsumed} / {activeResult.baseline.waterConsumed}
                  </td>
                  <td className="py-2.5 text-right text-[#E7E9D8]">
                    {activeResult.edenAI.foodConsumed} / {activeResult.edenAI.waterConsumed}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-sans text-[#E7E9D8]">Маршрут қозғалыс құны</td>
                  <td className="py-2.5 pr-4 text-right text-[#C8B995]">
                    {activeResult.baseline.totalRouteCost}
                  </td>
                  <td className="py-2.5 text-right text-[#E7E9D8]">
                    {activeResult.edenAI.totalRouteCost}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-sans text-[#E7E9D8]">Өтелмеген қажеттіліктер</td>
                  <td className="py-2.5 pr-4 text-right text-[#E7A34F]">
                    {activeResult.baseline.unmetNeeds}
                  </td>
                  <td className="py-2.5 text-right text-[#E7E9D8]">
                    {activeResult.edenAI.unmetNeeds}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 font-sans text-[#E7E9D8]">Шектеу бұзушылықтары</td>
                  <td className="py-2.5 pr-4 text-right text-[#D76D61]">
                    {activeResult.baseline.constraintViolations}
                  </td>
                  <td className="py-2.5 text-right text-[#E7E9D8]">
                    {activeResult.edenAI.constraintViolations}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5">
              <MultiLineChart
                title="Орташа денсаулық салыстырмасы (%)"
                xLabels={activeResult.edenAI.healthTimeline.map((h) => `T${h.tick}`)}
                yMax={100}
                unit="%"
                series={[
                  {
                    id: 'ai',
                    label: 'PROJECT EDEN AI',
                    color: '#D5AE64',
                    values: activeResult.edenAI.healthTimeline.map((h) => h.avgHealth),
                  },
                  {
                    id: 'base',
                    label: 'BASELINE',
                    color: '#8AA78C',
                    values: activeResult.baseline.healthTimeline.map((h) => h.avgHealth),
                  },
                ]}
              />
            </div>

            <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5">
              <h3 className="text-sm font-semibold text-[#E7E9D8] mb-4">
                Өнімділік пен тиімділік диаграммасы
              </h3>
              <ComparisonBarChart
                labelA="BASELINE"
                labelB="PROJECT EDEN AI"
                items={[
                  {
                    label: 'Орташа денсаулық (%)',
                    valueA: activeResult.baseline.avgHealth,
                    valueB: activeResult.edenAI.avgHealth,
                  },
                  {
                    label: 'Азық жинау',
                    valueA: activeResult.baseline.foodCollected,
                    valueB: activeResult.edenAI.foodCollected,
                  },
                  {
                    label: 'Су жинау',
                    valueA: activeResult.baseline.waterCollected,
                    valueB: activeResult.edenAI.waterCollected,
                  },
                  {
                    label: 'Өтелмеген қажеттіліктер',
                    valueA: activeResult.baseline.unmetNeeds,
                    valueB: activeResult.edenAI.unmetNeeds,
                  },
                ]}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-[#172720] border border-[#263B30] p-10 text-center space-y-2">
          <FlaskConical className="h-8 w-8 text-[#D5AE64] mx-auto" />
          <div className="text-sm font-medium text-[#E7E9D8]">
            Тәжірибе әлі орындалмады
          </div>
          <p className="text-xs text-[#8AA78C] max-w-md mx-auto">
            «RUN EXPERIMENT» түймесін бассаңыз, екі стратегия да бірдей бастапқы аралда дербес іске қосылып, нақты нәтижелер есептеледі.
          </p>
        </div>
      )}

      {/* Saved Experiments Archive */}
      {savedExperiments.length > 0 && (
        <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-3">
          <h3 className="font-display text-sm font-semibold text-[#E7E9D8]">
            Сақталған тәжірибелер ({savedExperiments.length})
          </h3>
          <div className="divide-y divide-[#263B30] text-xs">
            {savedExperiments.map((exp) => (
              <div
                key={exp.id}
                className="py-2.5 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="text-[#E7E9D8]">
                  Seed #{exp.seed} · {exp.durationTicks} қадам ·{' '}
                  {DIFFICULTY_LABELS_KZ[exp.difficulty]}
                </div>
                <div className="flex items-center gap-4 font-mono tabular-nums text-[#C8B995]">
                  <span>Base: {exp.baseline.avgHealth}%</span>
                  <span className="text-[#D5AE64]">AI: {exp.edenAI.avgHealth}%</span>
                  <button
                    type="button"
                    onClick={() => setActiveResult(exp)}
                    className="text-[#E7E9D8] hover:underline font-sans cursor-pointer"
                  >
                    Қарау
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
