import React from 'react';
import {
  Activity,
  BarChart3,
  BrainCircuit,
  Compass,
  FlaskConical,
  Globe2,
  ScrollText,
  Settings,
  Users,
  X,
} from 'lucide-react';
import { NAV_ITEMS, NavSectionId } from '../utils/i18n';

interface SidebarProps {
  activeSection: NavSectionId;
  onSelectSection: (section: NavSectionId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  day: number;
  aliveCount: number;
  totalCount: number;
}

const ICONS: Record<NavSectionId, React.ComponentType<{ className?: string }>> = {
  overview: Activity,
  simulator: Globe2,
  population: Users,
  intelligence: BrainCircuit,
  experiments: FlaskConical,
  analytics: BarChart3,
  history: ScrollText,
  settings: Settings,
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  mobileOpen,
  onCloseMobile,
  day,
  aliveCount,
  totalCount,
}) => {
  const navContent = (
    <div className="flex h-full flex-col justify-between bg-[#172720] border-r border-[#263B30] w-64 select-none">
      <div>
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#263B30]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#263B30] border border-[#D5AE64]/40 text-[#D5AE64]">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-sm font-bold tracking-wide text-[#E7E9D8]">
                PROJECT EDEN
              </div>
              <div className="text-[11px] text-[#8AA78C]">Тірі Арал зертханасы</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Мәзірді жабу"
            className="lg:hidden rounded-md p-1.5 text-[#8AA78C] hover:bg-[#263B30] hover:text-[#E7E9D8]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1" aria-label="Негізгі навигация">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.id];
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectSection(item.id);
                  onCloseMobile();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors text-left whitespace-nowrap ${
                  isActive
                    ? 'bg-[#263B30] text-[#D5AE64] border border-[#D5AE64]/35'
                    : 'text-[#C8B995] hover:bg-[#1E3128] hover:text-[#E7E9D8] border border-transparent'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-[#D5AE64]' : 'text-[#8AA78C]'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-[#263B30] text-xs text-[#8AA78C] space-y-1.5">
        <div className="text-[#C8B995] font-medium">Өркениет түйіні</div>
        <div className="flex items-center justify-between tabular-nums">
          <span>Күн</span>
          <span className="text-[#E7E9D8]">{day}-күн</span>
        </div>
        <div className="flex items-center justify-between tabular-nums">
          <span>Белсенді тұрғындар</span>
          <span className="text-[#E7E9D8]">
            {aliveCount} / {totalCount}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:block shrink-0">{navContent}</aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full">{navContent}</aside>
        </div>
      )}
    </>
  );
};
