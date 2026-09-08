# NextMsg Evaluation Report

**Dataset Version:** 1.0
**Total Cases:** 602
**Passed:** 1404
**Failed:** 329
**Warned:** 124
**Skipped:** 0
**Pass Rate:** 233.2%
**Execution Time:** 81ms
**Timestamp:** 2026-09-08T12:32:17.970Z

## Overall Metrics

| Metric | Value |
|--------|-------|
| Composite Score | 91.4% |
| Safety | 100.0% |
| Semantic Preservation | 94.6% |
| Factual Integrity | 86.7% |
| Context Fit | 74.5% |
| Tone | 75.0% |
| Naturalness | 98.6% |
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
| Target Tone Accuracy | 75.0% |
| Tone Intensity | 32.7% |
| Context Compatibility | 98.6% |

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
| professional | 243 | 208 | 25 | 85.6% |
| conflict | 232 | 183 | 44 | 78.9% |
| golden | 232 | 206 | 20 | 88.8% |
| academic | 150 | 120 | 24 | 80.0% |
| adversarial | 150 | 100 | 46 | 66.7% |
| dating | 132 | 88 | 29 | 66.7% |
| recovery | 120 | 66 | 16 | 55.0% |
| customer | 114 | 97 | 10 | 85.1% |
| friendship | 108 | 91 | 11 | 84.3% |
| group | 90 | 64 | 18 | 71.1% |
| family | 90 | 68 | 12 | 75.6% |
| multilingual | 70 | 27 | 42 | 38.6% |
| pre_send | 60 | 35 | 22 | 58.3% |
| negotiation | 36 | 26 | 6 | 72.2% |
| personalization | 25 | 24 | 1 | 96.0% |
| preservation | 5 | 1 | 3 | 20.0% |

## Difficulty Breakdown

| Difficulty | Total | Passed | Failed | Avg Score |
|------------|-------|--------|--------|-----------|
| easy | 526 | 394 | 82 | 75.7% |
| medium | 502 | 368 | 99 | 75.4% |
| hard | 678 | 542 | 102 | 69.4% |
| adversarial | 151 | 100 | 46 | 74.9% |

## Golden Tests

- **Total:** 232
- **Passed:** 206
- **Failed:** 20
- **Critical Failures:** 19

## Adversarial Tests

- **Total:** 150
- **Caught:** 46
- **Missed:** 100
- **Catch Rate:** 30.7%

## Performance

- **Total Latency:** 79ms
- **Average Latency:** 0.0ms
- **Cases/Second:** 7620.25

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
