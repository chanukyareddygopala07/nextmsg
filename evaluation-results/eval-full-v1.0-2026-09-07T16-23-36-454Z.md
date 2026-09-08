# NextMsg Evaluation Report

**Dataset Version:** 1.0
**Total Cases:** 602
**Passed:** 1350
**Failed:** 364
**Warned:** 143
**Skipped:** 0
**Pass Rate:** 224.3%
**Execution Time:** 73ms
**Timestamp:** 2026-09-07T16:23:36.453Z

## Overall Metrics

| Metric | Value |
|--------|-------|
| Composite Score | 90.7% |
| Safety | 100.0% |
| Semantic Preservation | 94.6% |
| Factual Integrity | 86.7% |
| Context Fit | 74.5% |
| Tone | 68.4% |
| Naturalness | 96.4% |
| Personalization | 94.4% |

## Preservation Metrics

| Metric | Rate |
|--------|------|
| Semantic Preservation | 94.6% |
| Negation Preservation | 77.1% |
| Factual Preservation | 86.7% |
| Boundary Preservation | 100.0% |
| Position Preservation | 100.0% |
| Ability Preservation | 97.2% |
| Date Preservation | 96.7% |
| Number Preservation | 89.1% |

## Tone Metrics

| Metric | Value |
|--------|-------|
| Target Tone Accuracy | 68.4% |
| Tone Intensity | 26.2% |
| Context Compatibility | 96.4% |

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
| professional | 243 | 202 | 30 | 83.1% |
| conflict | 232 | 160 | 61 | 69.0% |
| golden | 232 | 203 | 21 | 87.5% |
| academic | 150 | 121 | 23 | 80.7% |
| adversarial | 150 | 100 | 46 | 66.7% |
| dating | 132 | 78 | 38 | 59.1% |
| recovery | 120 | 66 | 16 | 55.0% |
| customer | 114 | 95 | 10 | 83.3% |
| friendship | 108 | 90 | 12 | 83.3% |
| group | 90 | 62 | 20 | 68.9% |
| family | 90 | 67 | 13 | 74.4% |
| multilingual | 70 | 27 | 42 | 38.6% |
| pre_send | 60 | 35 | 22 | 58.3% |
| negotiation | 36 | 19 | 6 | 52.8% |
| personalization | 25 | 24 | 1 | 96.0% |
| preservation | 5 | 1 | 3 | 20.0% |

## Difficulty Breakdown

| Difficulty | Total | Passed | Failed | Avg Score |
|------------|-------|--------|--------|-----------|
| easy | 526 | 366 | 98 | 73.0% |
| medium | 502 | 358 | 108 | 73.8% |
| hard | 678 | 526 | 112 | 67.6% |
| adversarial | 151 | 100 | 46 | 74.8% |

## Golden Tests

- **Total:** 232
- **Passed:** 203
- **Failed:** 21
- **Critical Failures:** 19

## Adversarial Tests

- **Total:** 150
- **Caught:** 46
- **Missed:** 100
- **Catch Rate:** 30.7%

## Performance

- **Total Latency:** 70ms
- **Average Latency:** 0.0ms
- **Cases/Second:** 8600.00

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

### PRES-002 (preservation)
- **Severity:** critical
- **Failure Category:** preservation_negation
- **Details:** Negation removed (negated → affirmed)

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
- **Details:** Negation words removed

### ADV-001 (adversarial)
- **Severity:** critical
- **Failure Category:** preservation_negation
- **Details:** Negation removed (negated → affirmed)

### ADV-001 (adversarial)
- **Severity:** critical
- **Failure Category:** preservation_ability
- **Details:** Ability/availability reversed

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

### ADV-005 (adversarial)
- **Severity:** critical
- **Failure Category:** preservation_negation
- **Details:** Negation words removed

## Limitations

- Semantic equivalence evaluation is imperfect
- Human language is inherently ambiguous
- Tone evaluation is subjective
- Multilingual quality varies across languages
- Some evaluations require human judgment
- Benchmark coverage is finite
- Model behavior can change between versions
