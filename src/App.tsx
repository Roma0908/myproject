import { useCallback, useEffect, useState } from 'react';
import { evaluateBayesianRisk } from './ai/BayesianNetwork';
import { solveCSPTaskAllocation } from './ai/CSPPlanner';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { EventHistoryPage } from './pages/EventHistoryPage';
import { ExperimentLabPage } from './pages/ExperimentLabPage';
import { IntelligenceCenterPage } from './pages/IntelligenceCenterPage';
import { OverviewPage } from './pages/OverviewPage';
import { PopulationPage } from './pages/PopulationPage';
import { SettingsPage } from './pages/SettingsPage';
import { WorldSimulatorPage } from './pages/WorldSimulatorPage';
import {
  createInitialSimulationState,
  stepSimulation,
} from './simulation/SimulationEngine';
import {
  Coordinates,
  ExperimentResult,
  SimulationState,
  WeatherType,
  WorldConfig,
} from './types/simulation';
import { NavSectionId } from './utils/i18n';
import {
  loadExperiments,
  loadSimulationState,
  loadWorldConfig,
  saveExperiments,
  saveSimulationState,
  saveWorldConfig,
} from './utils/storage';

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSectionId>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [worldConfig, setWorldConfig] = useState<WorldConfig>(() => loadWorldConfig());

  const [simState, setSimState] = useState<SimulationState>(() => {
    const loaded = loadSimulationState();
    if (loaded.state) return loaded.state;
    return createInitialSimulationState(loadWorldConfig());
  });

  const [lastSaved, setLastSaved] = useState<string | null>(
    () => loadSimulationState().lastSaved
  );
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);
  const [selectedTile, setSelectedTile] = useState<Coordinates | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(
    () => simState.residents[0]?.id ?? null
  );
  const [savedExperiments, setSavedExperiments] = useState<ExperimentResult[]>(() =>
    loadExperiments()
  );
  const [headerResetModal, setHeaderResetModal] = useState(false);

  // Single centralized simulation clock with cleanup (prevents duplicate intervals)
  useEffect(() => {
    if (!isRunning || simState.civilizationCollapsed) return;

    const intervalMs = speed === 4 ? 220 : speed === 2 ? 440 : 850;
    const timer = window.setInterval(() => {
      setSimState((prev) => {
        if (prev.civilizationCollapsed) return prev;
        return stepSimulation(prev);
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isRunning, speed, simState.civilizationCollapsed]);

  // Auto-save every 6 ticks
  useEffect(() => {
    if (simState.tick > 0 && simState.tick % 6 === 0) {
      const ts = saveSimulationState(simState);
      if (ts) setLastSaved(ts);
    }
  }, [simState]);

  const handleSaveNow = useCallback(() => {
    const ts = saveSimulationState(simState);
    if (ts) setLastSaved(ts);
  }, [simState]);

  const handleStepForward = useCallback(() => {
    setSimState((prev) => stepSimulation(prev));
  }, []);

  const handleApplyWorldConfig = useCallback((cfg: WorldConfig) => {
    setIsRunning(false);
    setWorldConfig(cfg);
    saveWorldConfig(cfg);
    const fresh = createInitialSimulationState(cfg);
    setSimState(fresh);
    setSelectedTile(fresh.campLocation);
    setSelectedResidentId(fresh.residents[0]?.id ?? null);
    const ts = saveSimulationState(fresh);
    if (ts) setLastSaved(ts);
  }, []);

  const handleLoadSaved = useCallback(() => {
    const loaded = loadSimulationState();
    if (!loaded.state) return false;
    setIsRunning(false);
    setSimState(loaded.state);
    setWorldConfig(loaded.state.config);
    setSelectedResidentId(loaded.state.residents[0]?.id ?? null);
    setLastSaved(loaded.lastSaved);
    return true;
  }, []);

  const handleImportSimulation = useCallback((imported: SimulationState) => {
    setIsRunning(false);
    setSimState(imported);
    setWorldConfig(imported.config);
    saveWorldConfig(imported.config);
    const ts = saveSimulationState(imported);
    if (ts) setLastSaved(ts);
    setSelectedResidentId(imported.residents[0]?.id ?? null);
  }, []);

  const handleUpdateEnvironment = useCallback(
    (patch: { temperature?: number; rainfall?: number; weather?: WeatherType }) => {
      setSimState((prev) => {
        const nextEnv = {
          ...prev.environment,
          temperature: patch.temperature ?? prev.environment.temperature,
          rainfall: patch.rainfall ?? prev.environment.rainfall,
          baseTemperature: patch.temperature ?? prev.environment.baseTemperature,
          baseRainfall: patch.rainfall ?? prev.environment.baseRainfall,
          weather: patch.weather ?? prev.environment.weather,
        };
        const bayesian = evaluateBayesianRisk({
          temperature: nextEnv.temperature,
          rainfall: nextEnv.rainfall,
          foodReserve: prev.resources.food,
          residentCount: Math.max(
            1,
            prev.residents.filter((r) => r.health > 0).length
          ),
          tick: prev.tick,
        });
        return {
          ...prev,
          environment: nextEnv,
          lastBayesian: bayesian,
        };
      });
    },
    []
  );

  const handleRunCSPSolver = useCallback(() => {
    const csp = solveCSPTaskAllocation({
      residents: simState.residents,
      resources: simState.resources,
      grid: simState.grid,
      sheltersCount: simState.sheltersCount,
      survivalRisk: simState.lastBayesian.pSurvivalRisk,
      tick: simState.tick,
    });

    setSimState((prev) => ({
      ...prev,
      lastCSP: csp,
      residents: prev.residents.map((res) => {
        const a = csp.assignments.find((item) => item.residentId === res.id);
        return a ? { ...res, assignedTask: a.task } : res;
      }),
    }));

    return csp;
  }, [simState]);

  const handleSaveExperiment = useCallback((result: ExperimentResult) => {
    setSavedExperiments((prev) => {
      const next = [result, ...prev.filter((e) => e.id !== result.id)].slice(0, 20);
      saveExperiments(next);
      return next;
    });
  }, []);

  const aliveCount = simState.residents.filter((r) => r.health > 0).length;

  return (
    <div className="min-h-screen flex bg-[#101B17] text-[#E7E9D8]">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        day={simState.day}
        aliveCount={aliveCount}
        totalCount={simState.residents.length}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          state={simState}
          isRunning={isRunning}
          speed={speed}
          lastSaved={lastSaved}
          onToggleRun={() => setIsRunning((r) => !r)}
          onStepForward={handleStepForward}
          onChangeSpeed={setSpeed}
          onSaveNow={handleSaveNow}
          onResetConfirm={() => setHeaderResetModal(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto">
          {activeSection === 'overview' && (
            <OverviewPage
              state={simState}
              selectedTile={selectedTile}
              selectedResidentId={selectedResidentId}
              onSelectTile={setSelectedTile}
              onSelectResident={setSelectedResidentId}
              onNavigate={(sec) => setActiveSection(sec)}
            />
          )}

          {activeSection === 'simulator' && (
            <WorldSimulatorPage
              state={simState}
              selectedTile={selectedTile}
              selectedResidentId={selectedResidentId}
              onSelectTile={setSelectedTile}
              onSelectResident={setSelectedResidentId}
              onUpdateEnvironment={handleUpdateEnvironment}
            />
          )}

          {activeSection === 'population' && (
            <PopulationPage
              state={simState}
              selectedResidentId={selectedResidentId}
              onSelectResident={setSelectedResidentId}
            />
          )}

          {activeSection === 'intelligence' && (
            <IntelligenceCenterPage
              state={simState}
              selectedResidentId={selectedResidentId}
              onSelectResident={setSelectedResidentId}
              onRunCSPSolver={handleRunCSPSolver}
            />
          )}

          {activeSection === 'experiments' && (
            <ExperimentLabPage
              currentConfig={worldConfig}
              savedExperiments={savedExperiments}
              onSaveExperiment={handleSaveExperiment}
            />
          )}

          {activeSection === 'analytics' && <AnalyticsPage state={simState} />}

          {activeSection === 'history' && (
            <EventHistoryPage events={simState.events} />
          )}

          {activeSection === 'settings' && (
            <SettingsPage
              currentConfig={worldConfig}
              state={simState}
              onApplyWorldConfig={handleApplyWorldConfig}
              onSaveSimulation={handleSaveNow}
              onLoadSavedSimulation={handleLoadSaved}
              onImportSimulation={handleImportSimulation}
            />
          )}
        </main>
      </div>

      {/* Header Reset Confirmation Dialog */}
      {headerResetModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="header-reset-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-md rounded-xl bg-[#172720] border border-[#263B30] p-5 space-y-4">
            <h3 id="header-reset-title" className="font-display text-lg font-bold text-[#E7E9D8]">
              Симуляцияны басынан бастау?
            </h3>
            <p className="text-xs text-[#C8B995] leading-relaxed">
              Ағымдағы прогресс тазаланып, арал дәл сол конфигурациямен 1-күннен қайта жасалады.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setHeaderResetModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-[#101B17] border border-[#263B30] text-[#C8B995] hover:text-[#E7E9D8] cursor-pointer"
              >
                Болдырмау
              </button>
              <button
                type="button"
                onClick={() => {
                  handleApplyWorldConfig(worldConfig);
                  setHeaderResetModal(false);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#D5AE64] text-[#101B17] hover:bg-[#E2BD76] cursor-pointer"
              >
                Қайта бастау
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
