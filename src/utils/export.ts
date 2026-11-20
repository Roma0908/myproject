import { ExperimentResult, SimulationEvent, SimulationState } from '../types/simulation';

function triggerDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportSimulationJSON(state: SimulationState): void {
  const filename = `project-eden-day-${state.day}-seed-${state.seed}.json`;
  triggerDownload(filename, JSON.stringify(state, null, 2), 'application/json');
}

export function exportEventsCSV(events: SimulationEvent[]): void {
  const headers = ['ID', 'Tick', 'Day', 'Hour', 'Category', 'Algorithm', 'Resident', 'Description'];
  const rows = events.map((e) =>
    [
      escapeCsv(e.id),
      escapeCsv(e.tick),
      escapeCsv(e.day),
      escapeCsv(e.hour),
      escapeCsv(e.category),
      escapeCsv(e.algorithm),
      escapeCsv(e.residentName ?? '-'),
      escapeCsv(e.description),
    ].join(',')
  );
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  triggerDownload('project-eden-events.csv', csv, 'text/csv;charset=utf-8;');
}

export function exportExperimentsCSV(experiments: ExperimentResult[]): void {
  const headers = [
    'ExperimentID',
    'Date',
    'Seed',
    'DurationTicks',
    'Difficulty',
    'Strategy',
    'DaysSurvived',
    'AvgHealth',
    'FoodCollected',
    'WaterCollected',
    'WoodCollected',
    'TotalRouteCost',
    'UnmetNeeds',
    'ConstraintViolations',
  ];
  const rows: string[] = [];
  for (const exp of experiments) {
    for (const strat of [exp.baseline, exp.edenAI]) {
      rows.push(
        [
          escapeCsv(exp.id),
          escapeCsv(exp.createdAt),
          escapeCsv(exp.seed),
          escapeCsv(exp.durationTicks),
          escapeCsv(exp.difficulty),
          escapeCsv(strat.strategyName),
          escapeCsv(strat.daysSurvived),
          escapeCsv(strat.avgHealth),
          escapeCsv(strat.foodCollected),
          escapeCsv(strat.waterCollected),
          escapeCsv(strat.woodCollected),
          escapeCsv(strat.totalRouteCost),
          escapeCsv(strat.unmetNeeds),
          escapeCsv(strat.constraintViolations),
        ].join(',')
      );
    }
  }
  const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  triggerDownload('project-eden-experiments.csv', csv, 'text/csv;charset=utf-8;');
}
