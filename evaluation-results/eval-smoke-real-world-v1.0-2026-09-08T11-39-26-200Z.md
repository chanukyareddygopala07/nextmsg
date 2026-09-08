# NextMsg Evaluation Report

**Dataset Version:** real-world-v1.0
**Total Cases:** 50
**Passed:** 90
**Failed:** 46
**Warned:** 22
**Skipped:** 0
**Pass Rate:** 180.0%
**Execution Time:** 15ms
**Timestamp:** 2026-09-08T11:39:26.199Z

## Overall Metrics

| Metric | Value |
|--------|-------|
| Composite Score | 90.5% |
| Safety | 100.0% |
| Semantic Preservation | 100.0% |
| Factual Integrity | 100.0% |
| Context Fit | 62.9% |
| Tone | 44.9% |
| Naturalness | 92.0% |
| Personalization | 100.0% |

## Preservation Metrics

| Metric | Rate |
|--------|------|
| Semantic Preservation | 100.0% |
| Negation Preservation | 100.0% |
| Factual Preservation | 100.0% |
| Boundary Preservation | 100.0% |
| Position Preservation | 100.0% |
| Ability Preservation | 100.0% |
| Date Preservation | 100.0% |
| Number Preservation | 100.0% |

## Tone Metrics

| Metric | Value |
|--------|-------|
| Target Tone Accuracy | 44.9% |
| Tone Intensity | 25.7% |
| Context Compatibility | 92.0% |

## Risk Metrics

| Metric | Value |
|--------|-------|
| Critical Risk Recall | 100.0% |
| False Positive Rate | 0.0% |
| False Negative Rate | 0.0% |

## Multilingual Metrics

| Metric | Rate |
|--------|------|
| Language Preservation | 100.0% |
| Script Preservation | 100.0% |
| Code-Mix Preservation | 100.0% |
| Semantic Preservation | 100.0% |

## Category Breakdown

| Category | Total | Passed | Failed | Pass Rate |
|----------|-------|--------|--------|-----------|
| professional | 45 | 20 | 10 | 44.4% |
| dating | 36 | 24 | 11 | 66.7% |
| conflict | 32 | 19 | 13 | 59.4% |
| academic | 30 | 18 | 12 | 60.0% |
| negotiation | 15 | 9 | 0 | 60.0% |

## Difficulty Breakdown

| Difficulty | Total | Passed | Failed | Avg Score |
|------------|-------|--------|--------|-----------|
| easy | 57 | 33 | 15 | 70.8% |
| medium | 57 | 29 | 20 | 69.9% |
| hard | 44 | 28 | 11 | 72.6% |

## Golden Tests

- **Total:** 0
- **Passed:** 0
- **Failed:** 0
- **Critical Failures:** 0

## Adversarial Tests

- **Total:** 0
- **Caught:** 0
- **Missed:** 0
- **Catch Rate:** 0.0%

## Performance

- **Total Latency:** 14ms
- **Average Latency:** 0.1ms
- **Cases/Second:** 3571.43

## Top Failures

### RW-PROF-001 (professional)
- **Severity:** critical
- **Failure Category:** preservation_fact_tomorrow
- **Details:** Fact "tomorrow" missing

### RW-PROF-002 (professional)
- **Severity:** critical
- **Failure Category:** preservation_fact_lost data
- **Details:** Fact "lost data" missing

### RW-PROF-003 (professional)
- **Severity:** critical
- **Failure Category:** preservation_fact_thought still working on it
- **Details:** Fact "thought still working on it" missing

### RW-PROF-005 (professional)
- **Severity:** critical
- **Failure Category:** preservation_fact_4pm
- **Details:** Fact "4pm" missing

### RW-PROF-008 (professional)
- **Severity:** critical
- **Failure Category:** preservation_fact_team helped
- **Details:** Fact "team helped" missing

### RW-PROF-012 (professional)
- **Severity:** critical
- **Failure Category:** preservation_fact_20%
- **Details:** Fact "20%" missing

### RW-PROF-012 (professional)
- **Severity:** critical
- **Failure Category:** preservation_fact_trimmed last quarter
- **Details:** Fact "trimmed last quarter" missing

### RW-PROF-015 (professional)
- **Severity:** critical
- **Failure Category:** preservation_fact_data not ready
- **Details:** Fact "data not ready" missing

### RW-PROF-015 (professional)
- **Severity:** critical
- **Failure Category:** preservation_fact_questioned on gaps
- **Details:** Fact "questioned on gaps" missing

### RW-ACAD-008 (academic)
- **Severity:** critical
- **Failure Category:** preservation_fact_Monday
- **Details:** Fact "Monday" missing

### RW-ACAD-009 (academic)
- **Severity:** critical
- **Failure Category:** preservation_fact_proposal submitted
- **Details:** Fact "proposal submitted" missing

### RW-ACAD-010 (academic)
- **Severity:** critical
- **Failure Category:** preservation_fact_Friday
- **Details:** Fact "Friday" missing

### RW-DATE-002 (dating)
- **Severity:** critical
- **Failure Category:** preservation_fact_great time
- **Details:** Fact "great time" missing

### RW-DATE-004 (dating)
- **Severity:** critical
- **Failure Category:** preservation_fact_coffee
- **Details:** Fact "coffee" missing

### RW-DATE-011 (dating)
- **Severity:** critical
- **Failure Category:** preservation_fact_movies
- **Details:** Fact "movies" missing

### RW-CON-002 (conflict)
- **Severity:** critical
- **Failure Category:** preservation_fact_both mentioned
- **Details:** Fact "both mentioned" missing

## Limitations

- Semantic equivalence evaluation is imperfect
- Human language is inherently ambiguous
- Tone evaluation is subjective
- Multilingual quality varies across languages
- Some evaluations require human judgment
- Benchmark coverage is finite
- Model behavior can change between versions
