import React, { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import {
  AIAlgorithmTag,
  EventCategory,
  SimulationEvent,
} from '../types/simulation';
import { exportEventsCSV } from '../utils/export';
import { EVENT_CATEGORY_LABELS_KZ } from '../utils/i18n';

interface EventHistoryPageProps {
  events: SimulationEvent[];
}

export const EventHistoryPage: React.FC<EventHistoryPageProps> = ({ events }) => {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | EventCategory>('all');
  const [algoFilter, setAlgoFilter] = useState<'all' | AIAlgorithmTag>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (algoFilter !== 'all' && e.algorithm !== algoFilter) return false;
      if (
        q &&
        !e.description.toLowerCase().includes(q) &&
        !(e.residentName ?? '').toLowerCase().includes(q) &&
        !e.algorithm.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [algoFilter, categoryFilter, events, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#E7E9D8]">
            Оқиғалар тарихы (Event History)
          </h1>
          <p className="mt-1 text-sm text-[#8AA78C]">
            Тұрғындар әрекеттері, AI шешімдері, ресурс өзгерістері және ауа райы оқиғаларының ізделетін журналы.
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportEventsCSV(filtered)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium bg-[#172720] border border-[#263B30] text-[#C8B995] hover:text-[#E7E9D8] cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          CSV экспорт ({filtered.length})
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl bg-[#172720] border border-[#263B30] p-4 flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-3.5 w-3.5 text-[#8AA78C] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Оқиғаларды іздеу"
            placeholder="Тұрғын, алгоритм немесе сипаттама бойынша іздеу..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#101B17] border border-[#263B30] rounded-lg pl-8 pr-3 py-2 text-[#E7E9D8] placeholder:text-[#8AA78C]/60"
          />
        </div>

        <select
          aria-label="Санат бойынша сүзу"
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as 'all' | EventCategory)
          }
          className="bg-[#101B17] border border-[#263B30] rounded-lg px-3 py-2 text-[#E7E9D8]"
        >
          <option value="all">Барлық санаттар</option>
          {(Object.keys(EVENT_CATEGORY_LABELS_KZ) as EventCategory[]).map((cat) => (
            <option key={cat} value={cat}>
              {EVENT_CATEGORY_LABELS_KZ[cat]}
            </option>
          ))}
        </select>

        <select
          aria-label="AI алгоритмі бойынша сүзу"
          value={algoFilter}
          onChange={(e) => setAlgoFilter(e.target.value as 'all' | AIAlgorithmTag)}
          className="bg-[#101B17] border border-[#263B30] rounded-lg px-3 py-2 text-[#E7E9D8]"
        >
          <option value="all">Барлық алгоритмдер</option>
          <option value="Intelligent Agents">Intelligent Agents</option>
          <option value="A*">A*</option>
          <option value="CSP">CSP</option>
          <option value="Bayesian Network">Bayesian Network</option>
          <option value="System">System</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-[#172720] border border-[#263B30] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#263B30] text-[#8AA78C]">
              <th className="py-3 px-4">Уақыт</th>
              <th className="py-3 px-4">Санат</th>
              <th className="py-3 px-4">AI жүйесі</th>
              <th className="py-3 px-4">Тұрғын</th>
              <th className="py-3 px-4">Сипаттама</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#263B30]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-[#8AA78C]">
                  Сүзгіге сәйкес оқиғалар табылмады.
                </td>
              </tr>
            ) : (
              filtered.map((evt) => (
                <tr key={evt.id} className="hover:bg-[#1E3229]/60">
                  <td className="py-2.5 px-4 font-mono tabular-nums text-[#C8B995] whitespace-nowrap">
                    {evt.day}-күн · {String(evt.hour).padStart(2, '0')}:00
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap text-[#E7E9D8]">
                    {EVENT_CATEGORY_LABELS_KZ[evt.category]}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[#D5AE64]">
                    {evt.algorithm}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap text-[#8AA78C]">
                    {evt.residentName ?? '—'}
                  </td>
                  <td className="py-2.5 px-4 text-[#E7E9D8]">{evt.description}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
