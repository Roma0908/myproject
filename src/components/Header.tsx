import React from 'react';
import {
  Cloud,
  CloudLightning,
  CloudRain,
  Menu,
  Pause,
  Play,
  RotateCcw,
  Save,
  SkipForward,
  Sun,
  ThermometerSun,
} from 'lucide-react';
import { SimulationState, WeatherType } from '../types/simulation';
import { RISK_LABELS_KZ, WEATHER_LABELS_KZ } from '../utils/i18n';

interface HeaderProps {
  state: SimulationState;
  isRunning: boolean;
  speed: 1 | 2 | 4;
  lastSaved: string | null;
  onToggleRun: () => void;
  onStepForward: () => void;
  onChangeSpeed: (speed: 1 | 2 | 4) => void;
  onSaveNow: () => void;
  onResetConfirm: () => void;
  onOpenMobileMenu: () => void;
}

const WEATHER_ICON: Record<WeatherType, React.ComponentType<{ className?: string }>> = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  drought: ThermometerSun,
  storm: CloudLightning,
};

export const Header: React.FC<HeaderProps> = ({
  state,
  isRunning,
  speed,
  lastSaved,
  onToggleRun,
  onStepForward,
  onChangeSpeed,
  onSaveNow,
  onResetConfirm,
  onOpenMobileMenu,
}) => {
  const WeatherIcon = WEATHER_ICON[state.environment.weather];
  const aliveCount = state.residents.filter((r) => r.health > 0).length;
  const risk = state.lastBayesian.riskLevel;

  const civStatusText = state.civilizationCollapsed
    ? 'Өркениет тоқтады'
    : risk === 'critical'
    ? 'Дағдарысты күй'
    : risk === 'high'
    ? 'Қауіп жоғары'
    : 'Тұрақты даму';

  const civStatusColor =
    state.civilizationCollapsed || risk === 'critical'
      ? 'text-[#D76D61]'
      : risk === 'high' || risk === 'moderate'
      ? 'text-[#E7A34F]'
      : 'text-[#8AA78C]';

  const formattedHour = `${String(state.hour).padStart(2, '0')}:00`;
  const savedLabel = lastSaved
    ? new Date(lastSaved).toLocaleTimeString('kk-KZ', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Сақталмаған';

  return (
    <header className="sticky top-0 z-30 bg-[#172720]/95 backdrop-blur-sm border-b border-[#263B30] px-4 lg:px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Brand mobile toggle & live simulation telemetry */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Навигация мәзірін ашу"
            className="lg:hidden rounded-lg p-2 bg-[#263B30] text-[#E7E9D8] hover:bg-[#314B3D]"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm">
            <span className="font-display font-semibold text-[#E7E9D8] whitespace-nowrap">
              PROJECT EDEN
            </span>
            <span className="text-[#263B30]" aria-hidden="true">
              /
            </span>
            <span className="tabular-nums text-[#D5AE64] font-medium whitespace-nowrap">
              {state.day}-күн · {formattedHour}
            </span>
            <span className="text-[#263B30] hidden sm:inline" aria-hidden="true">
              ·
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[#C8B995] whitespace-nowrap">
              <WeatherIcon className="h-4 w-4 text-[#D5AE64]" />
              {WEATHER_LABELS_KZ[state.environment.weather]} ({state.environment.temperature}°C)
            </span>
            <span className="text-[#263B30] hidden md:inline" aria-hidden="true">
              ·
            </span>
            <span className={`hidden md:inline font-medium whitespace-nowrap ${civStatusColor}`}>
              {civStatusText} ({RISK_LABELS_KZ[risk]})
            </span>
            <span className="text-[#263B30] hidden xl:inline" aria-hidden="true">
              ·
            </span>
            <span className="hidden xl:inline text-xs text-[#8AA78C] tabular-nums whitespace-nowrap">
              Тұрғындар: {aliveCount}/{state.residents.length}
            </span>
          </div>
        </div>

        {/* Right: Simulation Controls & Save Indicator */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleRun}
            disabled={state.civilizationCollapsed}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 ${
              isRunning
                ? 'bg-[#E7A34F] text-[#101B17] hover:bg-[#D89440]'
                : 'bg-[#D5AE64] text-[#101B17] hover:bg-[#E2BD76]'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="h-3.5 w-3.5" />
                Кідірту
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Бастау
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onStepForward}
            disabled={state.civilizationCollapsed}
            title="Бір қадам алға (1 сағат)"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#263B30] text-[#E7E9D8] hover:bg-[#314C3E] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
          >
            <SkipForward className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Қадам</span>
          </button>

          <div
            className="inline-flex items-center bg-[#101B17] border border-[#263B30] rounded-lg p-0.5"
            role="group"
            aria-label="Симуляция жылдамдығы"
          >
            {([1, 2, 4] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChangeSpeed(s)}
                className={`px-2 py-1 rounded-md text-xs font-mono tabular-nums transition-colors cursor-pointer ${
                  speed === s
                    ? 'bg-[#263B30] text-[#D5AE64] font-semibold'
                    : 'text-[#8AA78C] hover:text-[#E7E9D8]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onSaveNow}
            title={`Сақтау (${savedLabel})`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#101B17] border border-[#263B30] text-[#C8B995] hover:text-[#E7E9D8] hover:border-[#8AA78C]/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5 text-[#8AA78C]" />
            <span className="hidden md:inline tabular-nums">{savedLabel}</span>
          </button>

          <button
            type="button"
            onClick={onResetConfirm}
            aria-label="Қалпына келтіру"
            title="Әлемді қайта бастау"
            className="inline-flex items-center justify-center p-1.5 rounded-lg bg-[#101B17] border border-[#263B30] text-[#8AA78C] hover:text-[#D76D61] hover:border-[#D76D61]/50 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
