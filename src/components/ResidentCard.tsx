import React from 'react';
import { Resident } from '../types/simulation';
import { ROLE_LABELS_KZ, STATE_LABELS_KZ, TASK_LABELS_KZ } from '../utils/i18n';
import { ResidentAvatar } from './ResidentAvatar';

interface ResidentCardProps {
  resident: Resident;
  selected?: boolean;
  onSelect?: () => void;
}

const VitalBar: React.FC<{
  label: string;
  value: number;
  invertDanger?: boolean; // true for hunger & thirst (high = bad)
}> = ({ label, value, invertDanger = false }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const isCritical = invertDanger ? clamped >= 75 : clamped <= 25;
  const isWarn = invertDanger ? clamped >= 50 && clamped < 75 : clamped > 25 && clamped <= 50;

  const barColor = isCritical
    ? 'bg-[#D76D61]'
    : isWarn
    ? 'bg-[#E7A34F]'
    : 'bg-[#8AA78C]';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#C8B995]">{label}</span>
        <span
          className={`font-mono tabular-nums ${
            isCritical ? 'text-[#D76D61] font-semibold' : 'text-[#E7E9D8]'
          }`}
        >
          {clamped}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded bg-[#101B17] overflow-hidden">
        <div
          className={`h-full rounded transition-all duration-200 ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

export const ResidentCard: React.FC<ResidentCardProps> = ({
  resident,
  selected = false,
  onSelect,
}) => {
  const lastDecision = resident.decisionHistory[0];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl p-4 bg-[#172720] border transition-colors cursor-pointer ${
        selected
          ? 'border-[#D5AE64] bg-[#1E3229]'
          : 'border-[#263B30] hover:border-[#8AA78C]/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ResidentAvatar
            name={resident.name}
            role={resident.role}
            color={resident.color}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-semibold text-[#E7E9D8]">
                {resident.name}
              </span>
              <span className="text-xs text-[#8AA78C]">·</span>
              <span className="text-xs text-[#C8B995]">
                {ROLE_LABELS_KZ[resident.role]}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-[#8AA78C] truncate">
              {STATE_LABELS_KZ[resident.state]} · ({resident.x}, {resident.y})
            </div>
          </div>
        </div>
        <span className="text-xs font-medium text-[#D5AE64] shrink-0">
          {TASK_LABELS_KZ[resident.currentTask]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
        <VitalBar label="Аштық" value={resident.hunger} invertDanger />
        <VitalBar label="Шөл" value={resident.thirst} invertDanger />
        <VitalBar label="Энергия" value={resident.energy} />
        <VitalBar label="Денсаулық" value={resident.health} />
      </div>

      <div className="mt-3.5 pt-3 border-t border-[#263B30] space-y-1 text-xs">
        <div className="text-[#E7E9D8] truncate">
          <span className="text-[#8AA78C]">Әрекет: </span>
          {resident.recentActivity}
        </div>
        {lastDecision && (
          <div className="text-[#C8B995] line-clamp-2">
            <span className="text-[#D5AE64]">AI шешімі: </span>
            {lastDecision.reason}
          </div>
        )}
      </div>
    </button>
  );
};
