import { TestCaseResult, TestSuiteReport } from '../types/simulation';
import { ALL_TEST_DEFINITIONS } from './testSuites';

export function runAllTestsInBrowser(): TestSuiteReport {
  const results: TestCaseResult[] = ALL_TEST_DEFINITIONS.map((def) => {
    const start = performance.now();
    try {
      def.run();
      return {
        id: def.id,
        group: def.group,
        name: def.name,
        passed: true,
        durationMs: Number((performance.now() - start).toFixed(2)),
      };
    } catch (err) {
      return {
        id: def.id,
        group: def.group,
        name: def.name,
        passed: false,
        durationMs: Number((performance.now() - start).toFixed(2)),
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    ranAt: new Date().toISOString(),
    results,
  };
}
