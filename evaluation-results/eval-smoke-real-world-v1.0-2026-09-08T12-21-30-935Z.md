# NextMsg Evaluation Report

**Dataset Version:** real-world-v1.0
**Total Cases:** 50
**Passed:** 120
**Failed:** 28
**Warned:** 10
**Skipped:** 0
**Pass Rate:** 240.0%
**Execution Time:** 17ms
**Timestamp:** 2026-09-08T12:21:30.935Z

## Overall Metrics

| Metric | Value |
|--------|-------|
| Composite Score | 93.4% |
| Safety | 100.0% |
| Semantic Preservation | 100.0% |
| Factual Integrity | 100.0% |
| Context Fit | 71.8% |
| Tone | 64.3% |
| Naturalness | 96.0% |
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
| Target Tone Accuracy | 64.3% |
| Tone Intensity | 29.6% |
| Context Compatibility | 96.0% |

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
| professional | 45 | 36 | 7 | 80.0% |
| dating | 36 | 26 | 6 | 72.2% |
| conflict | 32 | 22 | 9 | 68.8% |
| academic | 30 | 25 | 5 | 83.3% |
| negotiation | 15 | 11 | 1 | 73.3% |

## Difficulty Breakdown

| Difficulty | Total | Passed | Failed | Avg Score |
|------------|-------|--------|--------|-----------|
| easy | 57 | 43 | 12 | 76.0% |
| medium | 57 | 40 | 11 | 76.0% |
| hard | 44 | 37 | 5 | 77.9% |

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

- **Total Latency:** 17ms
- **Average Latency:** 0.1ms
- **Cases/Second:** 2941.18

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
