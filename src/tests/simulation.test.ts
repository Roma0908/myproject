import test from 'node:test';
import { ALL_TEST_DEFINITIONS } from './testSuites';

for (const def of ALL_TEST_DEFINITIONS) {
  test(`[${def.group}] ${def.name}`, () => {
    def.run();
  });
}
