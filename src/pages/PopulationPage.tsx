import React from 'react';
import { SimulationState } from '../types/simulation';
import { ROLE_LABELS_KZ, STATE_LABELS_KZ, TASK_LABELS_KZ } from '../utils/i18n';
import { ResidentAvatar } from '../components/ResidentAvatar';
import { ResidentCard } from '../components/ResidentCard';

interface PopulationPageProps {
  state: SimulationState;
  selectedResidentId: string | null;
  onSelectResident: (id: string) => void;
}

export const PopulationPage: React.FC<PopulationPageProps> = ({
  state,
  selectedResidentId,
  onSelectResident,
}) => {
  const selected =
    state.residents.find((r) => r.id === selectedResidentId) ?? state.residents[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#E7E9D8]">
          Тұрғындар және автономды агенттер
        </h1>
        <p className="mt-1 text-sm text-[#8AA78C]">
          Әр тұрғынның қажеттіліктері, дағдылары, мақсаты және соңғы шешімдері.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {state.residents.map((res) => (
          <ResidentCard
            key={res.id}
            resident={res}
            selected={selected?.id === res.id}
            onSelect={() => onSelectResident(res.id)}
          />
        ))}
      </div>

      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Detailed Profile */}
          <div className="lg:col-span-5 rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-4">
            <div className="flex items-center gap-3.5">
              <ResidentAvatar
                name={selected.name}
                role={selected.role}
                color={selected.color}
                size={54}
              />
              <div>
                <h2 className="font-display text-lg font-bold text-[#E7E9D8]">
                  {selected.name}
                </h2>
                <div className="text-xs text-[#C8B995]">
                  {ROLE_LABELS_KZ[selected.role]} · {STATE_LABELS_KZ[selected.state]} · ({selected.x}, {selected.y})
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-[#101B17] border border-[#263B30] p-3">
                <div className="text-[#8AA78C]">Тағайындалған CSP рөлі</div>
                <div className="mt-1 font-semibold text-[#D5AE64]">
                  {TASK_LABELS_KZ[selected.assignedTask]}
                </div>
              </div>
              <div className="rounded-lg bg-[#101B17] border border-[#263B30] p-3">
                <div className="text-[#8AA78C]">Ағымдағы AI мақсаты</div>
                <div className="mt-1 font-semibold text-[#E7E9D8]">
                  {TASK_LABELS_KZ[selected.currentTask]}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h3 className="font-semibold text-[#E7E9D8]">Дағды коэффициенттері</h3>
              <div className="grid grid-cols-2 gap-2 text-[#C8B995] font-mono tabular-nums">
                <div className="flex justify-between">
                  <span>Азық іздеу:</span>
                  <span className="text-[#E7E9D8]">x{selected.skills.foraging}</span>
                </div>
                <div className="flex justify-between">
                  <span>Су табу:</span>
                  <span className="text-[#E7E9D8]">x{selected.skills.waterFinding}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ағаш кесу:</span>
                  <span className="text-[#E7E9D8]">x{selected.skills.woodcutting}</span>
                </div>
                <div className="flex justify-between">
                  <span>Құрылыс:</span>
                  <span className="text-[#E7E9D8]">x{selected.skills.building}</span>
                </div>
                <div className="flex justify-between">
                  <span>Барлау:</span>
                  <span className="text-[#E7E9D8]">x{selected.skills.exploration}</span>
                </div>
                <div className="flex justify-between">
                  <span>Орындалған іс:</span>
                  <span className="text-[#E7E9D8]">{selected.tasksCompleted}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#263B30] flex items-center justify-between text-xs font-mono tabular-nums text-[#C8B995]">
              <span>Жүрген жол: {selected.distanceTraveled} ұяшық</span>
              <span>Жиналған ресурс: {selected.totalCollected}</span>
            </div>
          </div>

          {/* Decision History Log */}
          <div className="lg:col-span-7 rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-3">
            <h2 className="font-display text-base font-semibold text-[#E7E9D8]">
              {selected.name} — Шешім қабылдау тарихы (Intelligent Agent Log)
            </h2>
            <div className="divide-y divide-[#263B30] max-h-[380px] overflow-y-auto">
              {selected.decisionHistory.length === 0 ? (
                <div className="py-6 text-xs text-[#8AA78C]">
                  Әзірге шешімдер тіркелмеген.
                </div>
              ) : (
                selected.decisionHistory.map((d, idx) => (
                  <div key={`${d.tick}-${idx}`} className="py-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#D5AE64]">
                        {TASK_LABELS_KZ[d.selectedObjective]}
                      </span>
                      <span className="font-mono tabular-nums text-[#8AA78C]">
                        {d.day}-күн · Tick #{d.tick}
                      </span>
                    </div>
                    <div className="text-[#E7E9D8]">{d.reason}</div>
                    <div className="text-[#C8B995]">Әрекет: {d.finalAction}</div>
                    <div className="text-[#8AA78C]">
                      Басымдықтар:{' '}
                      {d.priorities
                        .slice(0, 3)
                        .map((p) => `${p.need}: ${p.score}`)
                        .join(' · ')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
