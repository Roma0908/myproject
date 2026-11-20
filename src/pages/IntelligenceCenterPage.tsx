import React, { useMemo, useState } from 'react';
import {
  Brain,
  CheckCircle2,
  Cpu,
  FlaskConical,
  GitBranch,
  Network,
  Play,
  Route,
  RotateCcw,
  StepForward,
  XCircle,
} from 'lucide-react';
import { findPathAStar } from '../ai/AStar';
import { evaluateBayesianRisk } from '../ai/BayesianNetwork';
import {
  Q_ACTIONS,
  Q_ACTION_LABELS_KZ,
  Q_STATES,
  Q_STATE_LABELS_KZ,
  runQLearningTraining,
} from '../ai/QLearning';
import { MultiLineChart } from '../components/Charts';
import { IslandMap } from '../components/IslandMap';
import { SURVIVAL_RISK_CPT, WATER_SHORTAGE_CPT } from '../data/probabilities';
import { runAllTestsInBrowser } from '../tests/inBrowserRunner';
import {
  CSPResult,
  QLearningResult,
  SimulationState,
  TestSuiteReport,
} from '../types/simulation';
import { RISK_LABELS_KZ, TASK_LABELS_KZ } from '../utils/i18n';

type LabTabId = 'agents' | 'astar' | 'csp' | 'bayesian' | 'qlearning' | 'tests';

interface IntelligenceCenterPageProps {
  state: SimulationState;
  selectedResidentId: string | null;
  onSelectResident: (id: string) => void;
  onRunCSPSolver: () => CSPResult;
}

export const IntelligenceCenterPage: React.FC<IntelligenceCenterPageProps> = ({
  state,
  selectedResidentId,
  onSelectResident,
  onRunCSPSolver,
}) => {
  const [activeTab, setActiveTab] = useState<LabTabId>('agents');

  // A* Lab state
  const activeResident =
    state.residents.find((r) => r.id === selectedResidentId) ?? state.residents[0];
  const [astarStepIdx, setAstarStepIdx] = useState<number | null>(null);
  const [customGoal, setCustomGoal] = useState<{ x: number; y: number } | null>(null);

  const astarInspection = useMemo(() => {
    if (!activeResident) return null;
    if (customGoal) {
      return findPathAStar(
        state.grid,
        { x: activeResident.x, y: activeResident.y },
        customGoal,
        { recordSteps: true }
      );
    }
    return activeResident.lastAStar;
  }, [activeResident, customGoal, state.grid]);

  const currentAStarStep =
    astarInspection && astarStepIdx !== null
      ? astarInspection.steps[
          Math.min(astarStepIdx, Math.max(0, astarInspection.steps.length - 1))
        ] ?? null
      : null;

  // CSP Lab state
  const [cspOutput, setCspOutput] = useState<CSPResult | null>(null);
  const displayedCSP = cspOutput ?? state.lastCSP;

  // Bayesian Lab hypothetical interactive evidence state
  const [bayesOverride, setBayesOverride] = useState<{
    enabled: boolean;
    temperature: number;
    rainfall: number;
    foodReserve: number;
  }>({
    enabled: false,
    temperature: state.environment.temperature,
    rainfall: state.environment.rainfall,
    foodReserve: state.resources.food,
  });

  const bayesianComputed = useMemo(() => {
    if (!bayesOverride.enabled) return state.lastBayesian;
    return evaluateBayesianRisk({
      temperature: bayesOverride.temperature,
      rainfall: bayesOverride.rainfall,
      foodReserve: bayesOverride.foodReserve,
      residentCount: Math.max(1, state.residents.filter((r) => r.health > 0).length),
      tick: state.tick,
    });
  }, [bayesOverride, state.lastBayesian, state.residents, state.tick]);

  // Q-learning state
  const [qResult, setQResult] = useState<QLearningResult | null>(null);
  const [qEpisodes, setQEpisodes] = useState(120);

  // Test Center state
  const [testReport, setTestReport] = useState<TestSuiteReport | null>(null);

  const tabs: { id: LabTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'agents', label: 'A. Intelligent Agents', icon: Brain },
    { id: 'astar', label: 'B. A* Pathfinding Lab', icon: Route },
    { id: 'csp', label: 'C. CSP Planning Lab', icon: GitBranch },
    { id: 'bayesian', label: 'D. Bayesian Risk Lab', icon: Network },
    { id: 'qlearning', label: 'E. Q-learning Lab', icon: Cpu },
    { id: 'tests', label: 'Тест орталығы', icon: FlaskConical },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[#E7E9D8]">
          AI Зерде орталығы
        </h1>
        <p className="mt-1 text-sm text-[#8AA78C]">
          Барлық алгоритмдердің нақты кіріс деректерін, орындалу күйін және есептелген нәтижелерін зерттеу зертханасы.
        </p>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#263B30] pb-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#D5AE64] text-[#101B17] font-semibold'
                  : 'bg-[#172720] border border-[#263B30] text-[#C8B995] hover:text-[#E7E9D8]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* A. INTELLIGENT AGENTS */}
      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-4">
            <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-[#E7E9D8]">
                  Intelligent Agents — Шешімдер мониторы
                </h2>
                <span className="text-xs font-mono text-[#8AA78C]">
                  PERCEPTION → STATE → DECISION → ACTION → RESULT
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.residents.map((res) => {
                  const dec = res.decisionHistory[0];
                  return (
                    <div
                      key={res.id}
                      className="rounded-xl bg-[#101B17] border border-[#263B30] p-4 space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm font-semibold text-[#E7E9D8]">
                          {res.name} ({res.role})
                        </span>
                        <span className="text-[#D5AE64] font-medium">
                          {TASK_LABELS_KZ[res.currentTask]}
                        </span>
                      </div>

                      {dec ? (
                        <>
                          <div className="space-y-1 text-[#8AA78C]">
                            {dec.observations.map((obs, idx) => (
                              <div key={idx}>{obs}</div>
                            ))}
                          </div>
                          <div className="pt-2 border-t border-[#263B30] space-y-1">
                            <div className="text-[#C8B995] font-medium">
                              Пайдалылық басымдықтары:
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono tabular-nums text-[#E7E9D8]">
                              {dec.priorities.map((p) => (
                                <span key={p.need}>
                                  {p.need}: {p.score}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="pt-2 border-t border-[#263B30] text-[#E7E9D8]">
                            <span className="text-[#D5AE64]">Себеп: </span>
                            {dec.reason}
                          </div>
                          <div className="text-[#8AA78C]">
                            <span className="text-[#C8B995]">Нәтиже: </span>
                            {dec.finalAction}
                          </div>
                        </>
                      ) : (
                        <div className="text-[#8AA78C]">Шешім күтілуде...</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="xl:col-span-4 rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-3 text-xs leading-relaxed">
            <h3 className="font-display text-base font-semibold text-[#D5AE64]">
              Теория: Intelligent Agents
            </h3>
            <p className="text-[#E7E9D8]">
              Пайдалылыққа негізделген (Utility-based) автономды агенттер қоршаған ортаны және ішкі күйін бақылап, әр әрекеттің шұғылдығын сандық түрде бағалайды.
            </p>
            <p className="text-[#C8B995]">
              Шөл мен аштық шекті деңгейге жеткенде, олардың пайдалылық ұпайы CSP берген тапсырмадан жоғары болады — осылайша агент аман қалуға бірден бейімделеді.
            </p>
          </div>
        </div>
      )}

      {/* B. A* PATHFINDING LAB */}
      {activeTab === 'astar' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-7 rounded-xl bg-[#172720] border border-[#263B30] p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="astar-resident" className="text-xs text-[#C8B995]">
                  Тұрғын:
                </label>
                <select
                  id="astar-resident"
                  value={activeResident?.id ?? ''}
                  onChange={(e) => {
                    onSelectResident(e.target.value);
                    setCustomGoal(null);
                    setAstarStepIdx(null);
                  }}
                  className="bg-[#101B17] border border-[#263B30] rounded-lg px-2.5 py-1.5 text-xs text-[#E7E9D8]"
                >
                  {state.residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — ({r.x}, {r.y})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!astarInspection || astarInspection.steps.length === 0) return;
                    setAstarStepIdx((prev) =>
                      prev === null
                        ? 0
                        : Math.min(astarInspection.steps.length - 1, prev + 1)
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#D5AE64] text-[#101B17] hover:bg-[#E2BD76] cursor-pointer"
                >
                  <StepForward className="h-3.5 w-3.5" />
                  Қадамдап көру
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAstarStepIdx(null);
                    setCustomGoal(null);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#101B17] border border-[#263B30] text-[#C8B995] hover:text-[#E7E9D8] cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Толық бағыт
                </button>
              </div>
            </div>

            <IslandMap
              grid={state.grid}
              residents={state.residents}
              selectedTile={customGoal}
              selectedResidentId={activeResident?.id ?? null}
              onSelectTile={(coords) => {
                setCustomGoal(coords);
                setAstarStepIdx(null);
              }}
              onSelectResident={(id) => {
                onSelectResident(id);
                setCustomGoal(null);
                setAstarStepIdx(null);
              }}
              showAStarOverlay={true}
              customAStar={astarInspection}
              customAStarStep={currentAStarStep}
            />
          </div>

          <div className="xl:col-span-5 space-y-4">
            <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-3 text-xs">
              <h2 className="font-display text-base font-semibold text-[#E7E9D8]">
                A* Іздеу метрикалары
              </h2>
              <p className="text-[#8AA78C]">
                Кез келген карта ұяшығын басып, таңдалған тұрғыннан сол нүктеге дейінгі A* маршрутын есептей аласыз.
              </p>

              {astarInspection ? (
                <div className="space-y-2 pt-2 border-t border-[#263B30] font-mono tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-[#8AA78C]">Іздеу күйі:</span>
                    <span
                      className={
                        astarInspection.found ? 'text-[#8AA78C]' : 'text-[#D76D61]'
                      }
                    >
                      {astarInspection.found ? 'Табылды (found)' : 'Қолжетімсіз (unreachable)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8AA78C]">Бастау нүктесі:</span>
                    <span className="text-[#E7E9D8]">
                      ({astarInspection.start.x}, {astarInspection.start.y})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8AA78C]">Мақсат нүктесі:</span>
                    <span className="text-[#D5AE64]">
                      ({astarInspection.goal.x}, {astarInspection.goal.y})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8AA78C]">Жолдың жалпы құны (g):</span>
                    <span className="text-[#E7E9D8]">
                      {astarInspection.found ? astarInspection.totalCost : '∞'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8AA78C]">Маршрут ұзындығы:</span>
                    <span className="text-[#E7E9D8]">
                      {astarInspection.path.length} ұяшық
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8AA78C]">Зерттелген түйіндер (Closed):</span>
                    <span className="text-[#E7E9D8]">
                      {currentAStarStep
                        ? currentAStarStep.closedSet.length
                        : astarInspection.exploredNodes.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8AA78C]">Шекара түйіндері (Open):</span>
                    <span className="text-[#E7A34F]">
                      {currentAStarStep
                        ? currentAStarStep.frontier.length
                        : astarInspection.frontierNodes.length}
                    </span>
                  </div>
                  {currentAStarStep && (
                    <div className="mt-2 p-2.5 rounded-lg bg-[#101B17] border border-[#263B30] space-y-1">
                      <div className="text-[#D5AE64]">
                        Қадам #{currentAStarStep.stepIndex + 1} / {astarInspection.steps.length}
                      </div>
                      <div>
                        Ағымдағы түйін: ({currentAStarStep.current.x}, {currentAStarStep.current.y})
                      </div>
                      <div>
                        g={currentAStarStep.currentG} · h={currentAStarStep.currentH} · f=
                        {currentAStarStep.currentF}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-[#8AA78C]">Белсенді маршрут жоқ.</div>
              )}
            </div>

            <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-2 text-xs leading-relaxed">
              <h3 className="font-display text-base font-semibold text-[#D5AE64]">
                Теория: A* Pathfinding
              </h3>
              <p className="text-[#E7E9D8]">
                A* алгоритмі <span className="font-mono">f(n) = g(n) + h(n)</span> формуласын қолданады: мұндағы{' '}
                <span className="font-mono">g(n)</span> — бастаудан жету құны (шалғын 1, орман 2, батпақ 3, соқпақ 0.8), ал{' '}
                <span className="font-mono">h(n)</span> — мақсатқа дейінгі Манхэттен эвристикасы.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* C. CSP PLANNING LAB */}
      {activeTab === 'csp' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 space-y-4">
            <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#E7E9D8]">
                    CSP Task Allocation Dashboard
                  </h2>
                  <p className="text-xs text-[#8AA78C]">
                    {displayedCSP.solverMessage}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCspOutput(onRunCSPSolver())}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#D5AE64] text-[#101B17] hover:bg-[#E2BD76] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Play className="h-3.5 w-3.5" />
                  RUN CSP SOLVER
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs font-mono tabular-nums">
                <div className="rounded-lg bg-[#101B17] border border-[#263B30] p-3">
                  <div className="text-[#8AA78C]">Күйі</div>
                  <div
                    className={`mt-1 font-semibold ${
                      displayedCSP.success ? 'text-[#8AA78C]' : 'text-[#D76D61]'
                    }`}
                  >
                    {displayedCSP.success ? 'Шешілді (Valid)' : 'Резервтік жоспар'}
                  </div>
                </div>
                <div className="rounded-lg bg-[#101B17] border border-[#263B30] p-3">
                  <div className="text-[#8AA78C]">Іздеу түйіндері</div>
                  <div className="mt-1 text-base font-semibold text-[#E7E9D8]">
                    {displayedCSP.searchNodes}
                  </div>
                </div>
                <div className="rounded-lg bg-[#101B17] border border-[#263B30] p-3">
                  <div className="text-[#8AA78C]">Backtracking саны</div>
                  <div className="mt-1 text-base font-semibold text-[#D5AE64]">
                    {displayedCSP.backtrackCount}
                  </div>
                </div>
              </div>

              {/* Valid Assignments Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#263B30] text-[#8AA78C]">
                      <th className="py-2 pr-3">Айнымалы (Тұрғын)</th>
                      <th className="py-2 pr-3">Тағайындалған мән</th>
                      <th className="py-2 pr-3">Жарамды домен</th>
                      <th className="py-2">Негіздеме</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#263B30]">
                    {displayedCSP.assignments.map((a) => (
                      <tr key={a.residentId}>
                        <td className="py-2.5 pr-3 font-semibold text-[#E7E9D8]">
                          {a.residentName}
                        </td>
                        <td className="py-2.5 pr-3 text-[#D5AE64] font-medium">
                          {TASK_LABELS_KZ[a.task]}
                        </td>
                        <td className="py-2.5 pr-3 text-[#C8B995]">
                          {a.domainRemaining.map((t) => TASK_LABELS_KZ[t]).join(', ')}
                        </td>
                        <td className="py-2.5 text-[#8AA78C]">{a.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Rejected Assignments */}
              {displayedCSP.rejectedAssignments.length > 0 && (
                <div className="pt-3 border-t border-[#263B30] space-y-2">
                  <h3 className="text-xs font-semibold text-[#E7A34F]">
                    Қабылданбаған тағайындаулар (Constraint Violations)
                  </h3>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 text-xs">
                    {displayedCSP.rejectedAssignments.slice(0, 12).map((rej, i) => (
                      <div
                        key={`${rej.residentId}-${rej.task}-${i}`}
                        className="flex items-start justify-between gap-3 rounded bg-[#101B17] px-3 py-1.5 border border-[#263B30]"
                      >
                        <span className="text-[#E7E9D8] shrink-0">
                          {rej.residentName} ↛ {TASK_LABELS_KZ[rej.task]}
                        </span>
                        <span className="text-[#8AA78C] text-right">{rej.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-4 space-y-4">
            <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-2.5 text-xs">
              <h3 className="font-display text-base font-semibold text-[#E7E9D8]">
                Белсенді шектеулер
              </h3>
              <ul className="space-y-1.5 text-[#C8B995]">
                {displayedCSP.constraintsChecked.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-2 text-xs leading-relaxed">
              <h3 className="font-display text-base font-semibold text-[#D5AE64]">
                Теория: CSP (Constraint Satisfaction Problem)
              </h3>
              <p className="text-[#E7E9D8]">
                CSP есебі <span className="font-mono">(X, D, C)</span> үштігінен тұрады: айнымалылар (тұрғындар), домендер (тапсырмалар) және шектеулер.
              </p>
              <p className="text-[#C8B995]">
                Жүйе MRV (Minimum Remaining Values) эвристикасымен ең шектеулі тұрғынды бірінші таңдап, Forward Checking арқылы бос домендерді алдын ала қияды және Backtracking жасайды.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* D. BAYESIAN RISK LAB */}
      {activeTab === 'bayesian' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-7 space-y-4">
            <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-lg font-semibold text-[#E7E9D8]">
                  Bayesian Network — Бағытталған граф және инференция
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setBayesOverride((prev) => ({
                      ...prev,
                      enabled: !prev.enabled,
                      temperature: state.environment.temperature,
                      rainfall: state.environment.rainfall,
                      foodReserve: state.resources.food,
                    }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                    bayesOverride.enabled
                      ? 'bg-[#D5AE64] text-[#101B17] border-[#D5AE64]'
                      : 'bg-[#101B17] text-[#C8B995] border-[#263B30]'
                  }`}
                >
                  {bayesOverride.enabled
                    ? 'Сценарий сынағы белсенді (Нақты күйге оралу)'
                    : 'Гипотезалық сценарийді сынау'}
                </button>
              </div>

              {bayesOverride.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-[#101B17] border border-[#263B30] text-xs">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[#C8B995]">Температура</span>
                      <span className="font-mono text-[#E7E9D8]">
                        {bayesOverride.temperature}°C
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={42}
                      value={bayesOverride.temperature}
                      onChange={(e) =>
                        setBayesOverride((p) => ({
                          ...p,
                          temperature: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-[#D5AE64]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[#C8B995]">Жауын</span>
                      <span className="font-mono text-[#E7E9D8]">
                        {bayesOverride.rainfall}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      value={bayesOverride.rainfall}
                      onChange={(e) =>
                        setBayesOverride((p) => ({
                          ...p,
                          rainfall: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-[#6BB0C9]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[#C8B995]">Азық қоры</span>
                      <span className="font-mono text-[#E7E9D8]">
                        {bayesOverride.foodReserve}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={80}
                      value={bayesOverride.foodReserve}
                      onChange={(e) =>
                        setBayesOverride((p) => ({
                          ...p,
                          foodReserve: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-[#8AA78C]"
                    />
                  </div>
                </div>
              )}

              {/* Interactive SVG DAG */}
              <svg viewBox="0 0 600 260" className="w-full bg-[#101B17] rounded-xl border border-[#263B30]">
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill="#8AA78C" />
                  </marker>
                </defs>

                {/* Directed Edges */}
                <line x1="175" y1="60" x2="255" y2="115" stroke="#8AA78C" strokeWidth="2" markerEnd="url(#arrow)" />
                <line x1="175" y1="190" x2="255" y2="140" stroke="#8AA78C" strokeWidth="2" markerEnd="url(#arrow)" />
                <line x1="395" y1="125" x2="435" y2="125" stroke="#D5AE64" strokeWidth="2.2" markerEnd="url(#arrow)" />
                <line x1="340" y1="215" x2="455" y2="160" stroke="#D5AE64" strokeWidth="2.2" markerEnd="url(#arrow)" />

                {/* Node 1: High Temperature */}
                <g transform="translate(20, 28)">
                  <rect
                    width="155"
                    height="60"
                    rx="8"
                    fill="#172720"
                    stroke={bayesianComputed.evidence.highTemperature ? '#E7A34F' : '#263B30'}
                    strokeWidth="2"
                  />
                  <text x="77" y="24" textAnchor="middle" className="fill-[#E7E9D8] text-[12px] font-semibold">
                    High Temperature
                  </text>
                  <text x="77" y="44" textAnchor="middle" className="fill-[#C8B995] text-[11px] font-mono">
                    {bayesianComputed.evidence.temperatureValue}°C ({bayesianComputed.evidence.highTemperature ? 'TRUE' : 'FALSE'})
                  </text>
                </g>

                {/* Node 2: Low Rainfall */}
                <g transform="translate(20, 162)">
                  <rect
                    width="155"
                    height="60"
                    rx="8"
                    fill="#172720"
                    stroke={bayesianComputed.evidence.lowRainfall ? '#E7A34F' : '#263B30'}
                    strokeWidth="2"
                  />
                  <text x="77" y="24" textAnchor="middle" className="fill-[#E7E9D8] text-[12px] font-semibold">
                    Low Rainfall
                  </text>
                  <text x="77" y="44" textAnchor="middle" className="fill-[#C8B995] text-[11px] font-mono">
                    {bayesianComputed.evidence.rainfallValue}% ({bayesianComputed.evidence.lowRainfall ? 'TRUE' : 'FALSE'})
                  </text>
                </g>

                {/* Node 3: Water Shortage */}
                <g transform="translate(255, 95)">
                  <rect
                    width="140"
                    height="62"
                    rx="8"
                    fill="#172720"
                    stroke="#6BB0C9"
                    strokeWidth="2"
                  />
                  <text x="70" y="24" textAnchor="middle" className="fill-[#E7E9D8] text-[12px] font-semibold">
                    Water Shortage
                  </text>
                  <text x="70" y="45" textAnchor="middle" className="fill-[#6BB0C9] text-[13px] font-mono font-bold">
                    P = {(bayesianComputed.pWaterShortage * 100).toFixed(1)}%
                  </text>
                </g>

                {/* Node 4: Food Shortage */}
                <g transform="translate(215, 195)">
                  <rect
                    width="165"
                    height="50"
                    rx="8"
                    fill="#172720"
                    stroke={bayesianComputed.evidence.foodShortage ? '#D76D61' : '#263B30'}
                    strokeWidth="2"
                  />
                  <text x="82" y="21" textAnchor="middle" className="fill-[#E7E9D8] text-[12px] font-semibold">
                    Food Shortage
                  </text>
                  <text x="82" y="39" textAnchor="middle" className="fill-[#C8B995] text-[11px] font-mono">
                    {bayesianComputed.evidence.foodReserve} &lt; {bayesianComputed.evidence.foodDemandThreshold} ({bayesianComputed.evidence.foodShortage ? 'TRUE' : 'FALSE'})
                  </text>
                </g>

                {/* Node 5: Survival Risk */}
                <g transform="translate(438, 92)">
                  <rect
                    width="145"
                    height="70"
                    rx="8"
                    fill="#172720"
                    stroke={
                      bayesianComputed.riskLevel === 'critical'
                        ? '#D76D61'
                        : bayesianComputed.riskLevel === 'high'
                        ? '#E7A34F'
                        : '#8AA78C'
                    }
                    strokeWidth="2.4"
                  />
                  <text x="72" y="24" textAnchor="middle" className="fill-[#E7E9D8] text-[12px] font-semibold">
                    Survival Risk
                  </text>
                  <text x="72" y="44" textAnchor="middle" className="fill-[#D5AE64] text-[15px] font-mono font-bold">
                    {(bayesianComputed.pSurvivalRisk * 100).toFixed(1)}%
                  </text>
                  <text x="72" y="60" textAnchor="middle" className="fill-[#C8B995] text-[10px]">
                    {RISK_LABELS_KZ[bayesianComputed.riskLevel]}
                  </text>
                </g>
              </svg>

              <p className="text-xs text-[#E7E9D8] leading-relaxed">
                {bayesianComputed.explanation}
              </p>
            </div>

            <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4">
              <MultiLineChart
                title="Аман қалу қаупінің тарихы (%)"
                xLabels={state.history.slice(-30).map((h) => `${h.day}к`)}
                yMax={100}
                unit="%"
                series={[
                  {
                    id: 'sr',
                    label: 'P(Survival Risk)',
                    color: '#D76D61',
                    values: state.history.slice(-30).map((h) => h.survivalRisk),
                  },
                  {
                    id: 'ws',
                    label: 'P(Water Shortage)',
                    color: '#6BB0C9',
                    values: state.history.slice(-30).map((h) => h.waterShortageProb),
                  },
                ]}
              />
            </div>
          </div>

          <div className="xl:col-span-5 space-y-4">
            <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-4 text-xs">
              <div>
                <h3 className="font-display text-base font-semibold text-[#E7E9D8]">
                  Шартты ықтималдық кестелері (CPT)
                </h3>
                <p className="mt-1 text-[#8AA78C]">
                  Ескерту: Бұл CPT мәндері нақты өлшенген метео-деректер емес, симуляция моделінің иллюстрациялық параметрлері болып табылады.
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-[#D5AE64]">
                  P(Water Shortage | HighTemp, LowRainfall)
                </div>
                <table className="w-full font-mono tabular-nums border-collapse">
                  <thead>
                    <tr className="border-b border-[#263B30] text-[#8AA78C] text-left">
                      <th className="py-1.5">HighTemp</th>
                      <th className="py-1.5">LowRainfall</th>
                      <th className="py-1.5 text-right">P(True)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#263B30]">
                    {Object.entries(WATER_SHORTAGE_CPT).map(([k, val]) => {
                      const [ht, lr] = k.split(',');
                      const active =
                        String(bayesianComputed.evidence.highTemperature) === ht &&
                        String(bayesianComputed.evidence.lowRainfall) === lr;
                      return (
                        <tr
                          key={k}
                          className={active ? 'bg-[#263B30] text-[#D5AE64]' : 'text-[#C8B995]'}
                        >
                          <td className="py-1.5">{ht}</td>
                          <td className="py-1.5">{lr}</td>
                          <td className="py-1.5 text-right">{val.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2">
                <div className="font-semibold text-[#D5AE64]">
                  P(Survival Risk | WaterShortage, FoodShortage)
                </div>
                <table className="w-full font-mono tabular-nums border-collapse">
                  <thead>
                    <tr className="border-b border-[#263B30] text-[#8AA78C] text-left">
                      <th className="py-1.5">WaterShortage</th>
                      <th className="py-1.5">FoodShortage</th>
                      <th className="py-1.5 text-right">P(True)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#263B30]">
                    {Object.entries(SURVIVAL_RISK_CPT).map(([k, val]) => {
                      const [ws, fs] = k.split(',');
                      const active = String(bayesianComputed.evidence.foodShortage) === fs;
                      return (
                        <tr
                          key={k}
                          className={active ? 'bg-[#263B30]/70 text-[#E7E9D8]' : 'text-[#C8B995]'}
                        >
                          <td className="py-1.5">{ws}</td>
                          <td className="py-1.5">{fs}</td>
                          <td className="py-1.5 text-right">{val.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-2 text-xs leading-relaxed">
              <h3 className="font-display text-base font-semibold text-[#D5AE64]">
                Теория: Bayesian Network
              </h3>
              <p className="text-[#E7E9D8]">
                Белгісіз аралық түйін (<span className="font-mono">Water Shortage</span>) күйлері бойынша маргиналдау арқылы қорытынды апостериорлық ықтималдық есептеледі:
              </p>
              <p className="font-mono text-[11px] text-[#C8B995] bg-[#101B17] p-2.5 rounded border border-[#263B30]">
                P(SR|e) = Σ_w P(WS=w|HT,LR) · P(SR|WS=w,FS)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* E. Q-LEARNING LAB */}
      {activeTab === 'qlearning' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          <div className="xl:col-span-8 space-y-4">
            <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-[#E7E9D8]">
                    Q-learning Lab — Аман қалу саясатын оқыту
                  </h2>
                  <p className="text-xs text-[#8AA78C]">
                    Белгілі бір күйлерде қай әрекет ең жоғары жиынтық сыйақы беретінін тәжірибе арқылы үйрену.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    aria-label="Эпизод саны"
                    value={qEpisodes}
                    onChange={(e) => setQEpisodes(Number(e.target.value))}
                    className="bg-[#101B17] border border-[#263B30] rounded-lg px-3 py-2 text-xs text-[#E7E9D8]"
                  >
                    <option value={60}>60 эпизод</option>
                    <option value={120}>120 эпизод</option>
                    <option value={240}>240 эпизод</option>
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setQResult(
                        runQLearningTraining({
                          episodes: qEpisodes,
                          seed: state.seed + state.tick,
                        })
                      )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#D5AE64] text-[#101B17] hover:bg-[#E2BD76] cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Оқытуды бастау
                  </button>
                </div>
              </div>

              {qResult ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
                    <div className="rounded-lg bg-[#101B17] border border-[#263B30] p-3">
                      <div className="text-[#8AA78C]">Эпизод</div>
                      <div className="mt-1 text-base font-semibold text-[#E7E9D8]">
                        {qResult.episodes}
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#101B17] border border-[#263B30] p-3">
                      <div className="text-[#8AA78C]">Соңғы орташа сыйақы</div>
                      <div className="mt-1 text-base font-semibold text-[#D5AE64]">
                        {qResult.episodeHistory[qResult.episodeHistory.length - 1]?.averageReward}
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#101B17] border border-[#263B30] p-3">
                      <div className="text-[#8AA78C]">Exploration (ε)</div>
                      <div className="mt-1 text-base font-semibold text-[#E7E9D8]">
                        {qResult.epsilon}
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#101B17] border border-[#263B30] p-3">
                      <div className="text-[#8AA78C]">Q-кесте өзгерісі (ΣΔQ)</div>
                      <div className="mt-1 text-base font-semibold text-[#8AA78C]">
                        {qResult.qDeltaTotal}
                      </div>
                    </div>
                  </div>

                  <MultiLineChart
                    title="Оқыту барысындағы орташа сыйақы"
                    xLabels={qResult.episodeHistory
                      .filter((_, idx) => idx % Math.max(1, Math.floor(qResult.episodes / 24)) === 0)
                      .map((e) => `E${e.episode}`)}
                    series={[
                      {
                        id: 'avgR',
                        label: 'Орташа сыйақы',
                        color: '#D5AE64',
                        values: qResult.episodeHistory
                          .filter((_, idx) => idx % Math.max(1, Math.floor(qResult.episodes / 24)) === 0)
                          .map((e) => e.averageReward),
                      },
                      {
                        id: 'epR',
                        label: 'Эпизод сыйақысы',
                        color: '#8AA78C',
                        values: qResult.episodeHistory
                          .filter((_, idx) => idx % Math.max(1, Math.floor(qResult.episodes / 24)) === 0)
                          .map((e) => e.totalReward),
                      },
                    ]}
                  />

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#263B30] text-[#8AA78C]">
                          <th className="py-2 pr-3">Күй (State)</th>
                          <th className="py-2 pr-3">Оқытуға дейін</th>
                          <th className="py-2 pr-3">Үйренген саясат</th>
                          {Q_ACTIONS.map((a) => (
                            <th key={a} className="py-2 px-2 text-right font-mono">
                              {Q_ACTION_LABELS_KZ[a]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#263B30]">
                        {Q_STATES.map((s) => (
                          <tr key={s}>
                            <td className="py-2 pr-3 font-medium text-[#E7E9D8]">
                              {Q_STATE_LABELS_KZ[s]}
                            </td>
                            <td className="py-2 pr-3 text-[#8AA78C]">
                              {Q_ACTION_LABELS_KZ[qResult.beforePolicy[s]]}
                            </td>
                            <td className="py-2 pr-3 font-semibold text-[#D5AE64]">
                              {Q_ACTION_LABELS_KZ[qResult.afterPolicy[s]]}
                            </td>
                            {Q_ACTIONS.map((a) => (
                              <td
                                key={a}
                                className="py-2 px-2 text-right font-mono tabular-nums text-[#C8B995]"
                              >
                                {qResult.qTable[s][a].toFixed(1)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-[#101B17] border border-[#263B30] p-8 text-center text-xs text-[#8AA78C]">
                  Нақты Q-learning жаттығуын іске қосу үшін «Оқытуды бастау» түймесін басыңыз.
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-4 rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-2 text-xs leading-relaxed">
            <h3 className="font-display text-base font-semibold text-[#D5AE64]">
              Теория: Q-learning
            </h3>
            <p className="text-[#E7E9D8]">
              Q-learning — модельсіз күшейтілген оқыту (Reinforcement Learning) алгоритмі. Агент Белман теңдеуі арқылы әр күй-әрекет жұбының құндылығын жаңартады:
            </p>
            <p className="font-mono text-[11px] text-[#C8B995] bg-[#101B17] p-2.5 rounded border border-[#263B30]">
              Q(s,a) ← Q(s,a) + α[r + γ·max Q(s&apos;,a&apos;) − Q(s,a)]
            </p>
          </div>
        </div>
      )}

      {/* TEST CENTER */}
      {activeTab === 'tests' && (
        <div className="rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#E7E9D8]">
                Автоматты тестілеу орталығы (Test Center)
              </h2>
              <p className="text-xs text-[#8AA78C]">
                A*, Intelligent Agents, CSP, Bayesian Network және Simulation Engine модульдерінің нақты тексерістері.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTestReport(runAllTestsInBrowser())}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#D5AE64] text-[#101B17] hover:bg-[#E2BD76] cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" />
              Барлық тесттерді іске қосу
            </button>
          </div>

          {testReport ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-xs font-mono tabular-nums">
                <div className="rounded-lg bg-[#101B17] border border-[#263B30] p-3">
                  <div className="text-[#8AA78C]">Барлық тест</div>
                  <div className="mt-1 text-lg font-semibold text-[#E7E9D8]">
                    {testReport.total}
                  </div>
                </div>
                <div className="rounded-lg bg-[#101B17] border border-[#263B30] p-3">
                  <div className="text-[#8AA78C]">Сәтті өтті</div>
                  <div className="mt-1 text-lg font-semibold text-[#8AA78C]">
                    {testReport.passed}
                  </div>
                </div>
                <div className="rounded-lg bg-[#101B17] border border-[#263B30] p-3">
                  <div className="text-[#8AA78C]">Сәтсіз</div>
                  <div
                    className={`mt-1 text-lg font-semibold ${
                      testReport.failed > 0 ? 'text-[#D76D61]' : 'text-[#E7E9D8]'
                    }`}
                  >
                    {testReport.failed}
                  </div>
                </div>
              </div>

              <div className="divide-y divide-[#263B30] border border-[#263B30] rounded-xl bg-[#101B17]">
                {testReport.results.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {r.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-[#8AA78C] shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-[#D76D61] shrink-0" />
                      )}
                      <span className="font-mono text-[#D5AE64] shrink-0">[{r.group}]</span>
                      <span className="text-[#E7E9D8]">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono tabular-nums text-[#8AA78C]">
                      <span>{r.durationMs} ms</span>
                      <span className={r.passed ? 'text-[#8AA78C]' : 'text-[#D76D61]'}>
                        {r.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                    {r.error && (
                      <div className="w-full mt-1 text-[#D76D61] font-mono text-[11px]">
                        Қате: {r.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-[#101B17] border border-[#263B30] p-8 text-center text-xs text-[#8AA78C]">
              Нақты алгоритмдік тексерістерді орындау үшін «Барлық тесттерді іске қосу» түймесін басыңыз.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
