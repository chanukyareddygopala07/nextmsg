# NextMsg Evaluation Report

**Dataset Version:** 1.0
**Total Cases:** 602
**Passed:** 811
**Failed:** 418
**Warned:** 628
**Skipped:** 0
**Pass Rate:** 134.7%
**Execution Time:** 65ms
**Timestamp:** 2026-09-07T15:15:14.097Z

## Overall Metrics

| Metric | Value |
|--------|-------|
| Composite Score | 77.6% |
| Safety | 100.0% |
| Semantic Preservation | 50.6% |
| Factual Integrity | 86.7% |
| Context Fit | 62.6% |
| Tone | 34.0% |
| Naturalness | 94.9% |
| Personalization | 94.4% |

## Preservation Metrics

| Metric | Rate |
|--------|------|
| Semantic Preservation | 50.6% |
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
| professional | 243 | 85 | 30 | 35.0% |
| conflict | 232 | 127 | 68 | 54.7% |
| golden | 232 | 145 | 24 | 62.5% |
| academic | 150 | 48 | 45 | 32.0% |
| adversarial | 150 | 94 | 46 | 62.7% |
| dating | 132 | 68 | 26 | 51.5% |
| recovery | 120 | 16 | 16 | 13.3% |
| customer | 114 | 28 | 23 | 24.6% |
| friendship | 108 | 59 | 25 | 54.6% |
| group | 90 | 25 | 20 | 27.8% |
| family | 90 | 24 | 20 | 26.7% |
| multilingual | 70 | 20 | 42 | 28.6% |
| pre_send | 60 | 32 | 22 | 53.3% |
| negotiation | 36 | 15 | 7 | 41.7% |
| personalization | 25 | 24 | 1 | 96.0% |
| preservation | 5 | 1 | 3 | 20.0% |

## Difficulty Breakdown

| Difficulty | Total | Passed | Failed | Avg Score |
|------------|-------|--------|--------|-----------|
| easy | 526 | 218 | 125 | 68.0% |
| medium | 502 | 201 | 115 | 68.6% |
| hard | 678 | 298 | 132 | 62.0% |
| adversarial | 151 | 94 | 46 | 73.6% |

## Golden Tests

- **Total:** 232
- **Passed:** 145
- **Failed:** 24
- **Critical Failures:** 19

## Adversarial Tests

- **Total:** 150
- **Caught:** 46
- **Missed:** 94
- **Catch Rate:** 30.7%

## Performance

- **Total Latency:** 64ms
- **Average Latency:** 0.0ms
- **Cases/Second:** 9406.25

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
