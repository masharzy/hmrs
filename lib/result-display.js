/**
 * Number of failed compulsory subjects. Missing or partially entered marks
 * count as failed until the required subject is completely passed.
 * The optional fourth subject is excluded for classes 9 and 10.
 */
export function failedSubjectCount(report) {
  if (!report) return 0;
  if (Number.isInteger(report.failedSubjectCount)) return report.failedSubjectCount;
  return (report.rows || []).filter(row =>
    row.subjectId !== report.optionalId && row.passed !== true
  ).length;
}

/** Show F1/F2/... rather than 0.00 for a failed overall GPA. */
export function formatResultGpa(report, key = "gpa") {
  if (!report) return "—";
  const value = Number(report[key] ?? 0);
  if (!Number.isFinite(value)) return "—";
  const failed = failedSubjectCount(report);
  return value === 0 && failed > 0 ? "F" + failed : value.toFixed(2);
}
