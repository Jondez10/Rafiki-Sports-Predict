/**
 * Diagnostic Verification Script for Math Calculations & Edge-Case Safety
 * Validates Poisson Engine & Ensemble Engine under extreme data conditions:
 * - null/undefined data points
 * - division-by-zero scenarios
 * - negative numbers, NaNs, and Infinities
 * - extreme outlier values
 *
 * Can be executed via: `npx tsx src/scripts/validateMath.ts`
 */

import { runMathDiagnostics } from '../server/mathDiagnostics.js';

console.log('================================================================');
console.log('🔬 RAFIKI PREDICT: MATHEMATICAL ENGINE SAFETY DIAGNOSTIC SUITE');
console.log('================================================================\n');

const report = runMathDiagnostics();

console.log(`Diagnostic Execution Timestamp: ${report.timestamp}`);
console.log(`Total Test Assertions Executed: ${report.totalTests}`);
console.log(`Passed: ${report.passedTests}`);
console.log(`Failed: ${report.failedTests}\n`);

console.log('----------------------------------------------------------------');
console.log('INDIVIDUAL TEST RESULTS & DEFENSIVE BOUNDARY VERIFICATIONS:');
console.log('----------------------------------------------------------------');

report.testCases.forEach((tc) => {
  const statusIcon = tc.passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n[${statusIcon}] Test #${tc.id} [${tc.category}]: ${tc.name} (${tc.durationMs}ms)`);
  console.log(`  └─ Details: ${tc.details}`);
});

console.log('\n================================================================');
if (report.allPassed) {
  console.log('🎉 ALL MATH DEFENSIVE CHECKS PASSED PERFECTLY (100% SUCCESS)');
  console.log('   All null/undefined and division-by-zero scenarios are safely trapped.');
  console.log('================================================================\n');
  process.exit(0);
} else {
  console.error('⚠️ ONE OR MORE MATHEMATICAL DEFENSIVE CHECKS FAILED!');
  console.log('================================================================\n');
  process.exit(1);
}
