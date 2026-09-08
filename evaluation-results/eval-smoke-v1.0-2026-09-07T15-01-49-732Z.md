# NextMsg Evaluation Report

**Dataset Version:** 1.0
**Total Cases:** 50
**Passed:** 63
**Failed:** 37
**Warned:** 55
**Skipped:** 0
**Pass Rate:** 126.0%
**Execution Time:** 13ms
**Timestamp:** 2026-09-07T15:01:49.731Z

## Overall Metrics

| Metric | Value |
|--------|-------|
| Composite Score | 86.3% |
| Safety | 100.0% |
| Semantic Preservation | 96.0% |
| Factual Integrity | 94.0% |
| Context Fit | 48.7% |
| Tone | 32.6% |
| Naturalness | 95.0% |
| Personalization | 100.0% |

## Preservation Metrics

| Metric | Rate |
|--------|------|
| Semantic Preservation | 96.0% |
| Negation Preservation | 92.0% |
| Factual Preservation | 94.0% |
| Boundary Preservation | 100.0% |
| Position Preservation | 100.0% |
| Ability Preservation | 96.0% |
| Date Preservation | 98.0% |
| Number Preservation | 98.0% |

## Tone Metrics

| Metric | Value |
|--------|-------|
| Target Tone Accuracy | 32.6% |
| Tone Intensity | 47.1% |
| Context Compatibility | 95.0% |

## Risk Metrics

| Metric | Value |
|--------|-------|
| Critical Risk Recall | 100.0% |
| False Positive Rate | 0.0% |
| False Negative Rate | 0.0% |

## Multilingual Metrics

| Metric | Rate |
|--------|------|
| Language Preservation | 0.0% |
| Script Preservation | 0.0% |
| Code-Mix Preservation | 100.0% |
| Semantic Preservation | 100.0% |

## Category Breakdown

| Category | Total | Passed | Failed | Pass Rate |
|----------|-------|--------|--------|-----------|
| professional | 30 | 12 | 2 | 40.0% |
| conflict | 28 | 17 | 6 | 60.7% |
| adversarial | 25 | 3 | 15 | 12.0% |
| academic | 15 | 5 | 3 | 33.3% |
| dating | 12 | 5 | 0 | 41.7% |
| recovery | 12 | 5 | 0 | 41.7% |
| golden | 12 | 7 | 0 | 58.3% |
| multilingual | 10 | 4 | 6 | 40.0% |
| negotiation | 6 | 5 | 1 | 83.3% |
| preservation | 5 | 0 | 4 | 0.0% |

## Difficulty Breakdown

| Difficulty | Total | Passed | Failed | Avg Score |
|------------|-------|--------|--------|-----------|
| easy | 44 | 22 | 9 | 71.5% |
| medium | 47 | 21 | 8 | 72.2% |
| hard | 38 | 17 | 5 | 62.7% |
| adversarial | 26 | 3 | 15 | 54.4% |

## Golden Tests

- **Total:** 12
- **Passed:** 7
- **Failed:** 0
- **Critical Failures:** 0

## Adversarial Tests

- **Total:** 25
- **Caught:** 15
- **Missed:** 3
- **Catch Rate:** 60.0%

## Performance

- **Total Latency:** 13ms
- **Average Latency:** 0.1ms
- **Cases/Second:** 3846.15

## Top Failures

### PROF-002 (professional)
- **Severity:** critical
- **Failure Category:** preservation_fact_Friday
- **Details:** Fact "Friday" missing

### PROF-007 (professional)
- **Severity:** critical
- **Failure Category:** preservation_fact_20% discount
- **Details:** Fact "20% discount" missing

### ACAD-005 (academic)
- **Severity:** critical
- **Failure Category:** preservation_fact_Smith (2020)
- **Details:** Fact "Smith (2020)" missing

### MULTI-002 (multilingual)
- **Severity:** critical
- **Failure Category:** preservation_fact_deadline
- **Details:** Fact "deadline" missing

### MULTI-002 (multilingual)
- **Severity:** critical
- **Failure Category:** multilingual_fact_deadline
- **Details:** Fact "deadline" missing

### PRES-001 (preservation)
- **Severity:** critical
- **Failure Category:** preservation_ability
- **Details:** Ability reversed (can→cannot or vice versa)

### PRES-002 (preservation)
- **Severity:** critical
- **Failure Category:** preservation_negation
- **Details:** Original has negation (don't), candidate does not

### PRES-002 (preservation)
- **Severity:** critical
- **Failure Category:** preservation_fact_proposed changes
- **Details:** Fact "proposed changes" missing

### PRES-003 (preservation)
- **Severity:** critical
- **Failure Category:** preservation_fact_500 units
- **Details:** Fact "500 units" missing

### PRES-004 (preservation)
- **Severity:** critical
- **Failure Category:** preservation_negation
- **Details:** Original has negation (not), candidate does not

### ADV-001 (adversarial)
- **Severity:** critical
- **Failure Category:** preservation_negation
- **Details:** Original has negation (cannot), candidate does not

### ADV-001 (adversarial)
- **Severity:** critical
- **Failure Category:** preservation_ability
- **Details:** Ability reversed (can→cannot or vice versa)

### ADV-001 (adversarial)
- **Severity:** critical
- **Failure Category:** unacceptable_pattern_can handle
- **Details:** Unacceptable pattern "can handle" found

### ADV-002 (adversarial)
- **Severity:** critical
- **Failure Category:** unacceptable_pattern_early
- **Details:** Unacceptable pattern "early" found

### ADV-002 (adversarial)
- **Severity:** critical
- **Failure Category:** unacceptable_pattern_don't worry
- **Details:** Unacceptable pattern "don't worry" found

### ADV-003 (adversarial)
- **Severity:** critical
- **Failure Category:** preservation_fabrication
- **Details:** Potential fabrication: new dates: monday

### ADV-003 (adversarial)
- **Severity:** critical
- **Failure Category:** unacceptable_pattern_Monday morning
- **Details:** Unacceptable pattern "Monday morning" found

### ADV-004 (adversarial)
- **Severity:** critical
- **Failure Category:** preservation_fabrication
- **Details:** Potential fabrication: new numbers: 500

### ADV-004 (adversarial)
- **Severity:** critical
- **Failure Category:** preservation_fact_200 units
- **Details:** Fact "200 units" missing

### ADV-004 (adversarial)
- **Severity:** critical
- **Failure Category:** unacceptable_pattern_500
- **Details:** Unacceptable pattern "500" found

## Limitations

- Semantic equivalence evaluation is imperfect
- Human language is inherently ambiguous
- Tone evaluation is subjective
- Multilingual quality varies across languages
- Some evaluations require human judgment
- Benchmark coverage is finite
- Model behavior can change between versions
