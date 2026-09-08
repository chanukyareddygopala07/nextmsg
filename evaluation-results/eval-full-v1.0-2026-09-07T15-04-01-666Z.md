# NextMsg Evaluation Report

**Dataset Version:** 1.0
**Total Cases:** 602
**Passed:** 703
**Failed:** 409
**Warned:** 745
**Skipped:** 0
**Pass Rate:** 116.8%
**Execution Time:** 50ms
**Timestamp:** 2026-09-07T15:04:01.665Z

## Overall Metrics

| Metric | Value |
|--------|-------|
| Composite Score | 70.7% |
| Safety | 100.0% |
| Semantic Preservation | 16.1% |
| Factual Integrity | 86.7% |
| Context Fit | 62.6% |
| Tone | 34.0% |
| Naturalness | 94.9% |
| Personalization | 94.4% |

## Preservation Metrics

| Metric | Rate |
|--------|------|
| Semantic Preservation | 16.1% |
| Negation Preservation | 77.3% |
| Factual Preservation | 86.7% |
| Boundary Preservation | 100.0% |
| Position Preservation | 100.0% |
| Ability Preservation | 97.9% |
| Date Preservation | 96.7% |
| Number Preservation | 96.0% |

## Tone Metrics

| Metric | Value |
|--------|-------|
| Target Tone Accuracy | 34.0% |
| Tone Intensity | 47.0% |
| Context Compatibility | 94.9% |

## Risk Metrics

| Metric | Value |
|--------|-------|
| Critical Risk Recall | 0.0% |
| False Positive Rate | 0.0% |
| False Negative Rate | 0.0% |

## Multilingual Metrics

| Metric | Rate |
|--------|------|
| Language Preservation | 0.0% |
| Script Preservation | 0.0% |
| Code-Mix Preservation | 100.0% |
| Semantic Preservation | 20.0% |

## Category Breakdown

| Category | Total | Passed | Failed | Pass Rate |
|----------|-------|--------|--------|-----------|
| professional | 243 | 75 | 28 | 30.9% |
| conflict | 232 | 115 | 69 | 49.6% |
| golden | 232 | 131 | 24 | 56.5% |
| academic | 150 | 44 | 45 | 29.3% |
| adversarial | 150 | 94 | 46 | 62.7% |
| dating | 132 | 63 | 24 | 47.7% |
| recovery | 120 | 14 | 16 | 11.7% |
| customer | 114 | 17 | 23 | 14.9% |
| friendship | 108 | 49 | 24 | 45.4% |
| group | 90 | 19 | 18 | 21.1% |
| family | 90 | 14 | 19 | 15.6% |
| multilingual | 70 | 11 | 39 | 15.7% |
| pre_send | 60 | 22 | 22 | 36.7% |
| negotiation | 36 | 11 | 7 | 30.6% |
| personalization | 25 | 24 | 1 | 96.0% |
| preservation | 5 | 0 | 4 | 0.0% |

## Difficulty Breakdown

| Difficulty | Total | Passed | Failed | Avg Score |
|------------|-------|--------|--------|-----------|
| easy | 526 | 167 | 118 | 66.0% |
| medium | 502 | 182 | 115 | 68.6% |
| hard | 678 | 260 | 130 | 62.5% |
| adversarial | 151 | 94 | 46 | 75.6% |

## Golden Tests

- **Total:** 232
- **Passed:** 131
- **Failed:** 24
- **Critical Failures:** 19

## Adversarial Tests

- **Total:** 150
- **Caught:** 46
- **Missed:** 94
- **Catch Rate:** 30.7%

## Performance

- **Total Latency:** 49ms
- **Average Latency:** 0.0ms
- **Cases/Second:** 12285.71

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
