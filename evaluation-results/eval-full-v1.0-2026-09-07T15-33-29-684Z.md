# NextMsg Evaluation Report

**Dataset Version:** 1.0
**Total Cases:** 602
**Passed:** 1190
**Failed:** 444
**Warned:** 223
**Skipped:** 0
**Pass Rate:** 197.7%
**Execution Time:** 70ms
**Timestamp:** 2026-09-07T15:33:29.683Z

## Overall Metrics

| Metric | Value |
|--------|-------|
| Composite Score | 88.3% |
| Safety | 100.0% |
| Semantic Preservation | 94.6% |
| Factual Integrity | 86.7% |
| Context Fit | 73.9% |
| Tone | 47.4% |
| Naturalness | 89.2% |
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
| Target Tone Accuracy | 47.4% |
| Tone Intensity | 33.5% |
| Context Compatibility | 89.2% |

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
| professional | 243 | 188 | 31 | 77.4% |
| conflict | 232 | 140 | 74 | 60.3% |
| golden | 232 | 180 | 30 | 77.6% |
| academic | 150 | 117 | 28 | 78.0% |
| adversarial | 150 | 98 | 48 | 65.3% |
| dating | 132 | 77 | 46 | 58.3% |
| recovery | 120 | 53 | 16 | 44.2% |
| customer | 114 | 64 | 24 | 56.1% |
| friendship | 108 | 68 | 30 | 63.0% |
| group | 90 | 51 | 20 | 56.7% |
| family | 90 | 49 | 23 | 54.4% |
| multilingual | 70 | 27 | 42 | 38.6% |
| pre_send | 60 | 35 | 22 | 58.3% |
| negotiation | 36 | 18 | 6 | 50.0% |
| personalization | 25 | 24 | 1 | 96.0% |
| preservation | 5 | 1 | 3 | 20.0% |

## Difficulty Breakdown

| Difficulty | Total | Passed | Failed | Avg Score |
|------------|-------|--------|--------|-----------|
| easy | 526 | 315 | 135 | 70.7% |
| medium | 502 | 318 | 124 | 72.1% |
| hard | 678 | 459 | 137 | 65.3% |
| adversarial | 151 | 98 | 48 | 74.6% |

## Golden Tests

- **Total:** 232
- **Passed:** 180
- **Failed:** 30
- **Critical Failures:** 19

## Adversarial Tests

- **Total:** 150
- **Caught:** 48
- **Missed:** 98
- **Catch Rate:** 32.0%

## Performance

- **Total Latency:** 67ms
- **Average Latency:** 0.0ms
- **Cases/Second:** 8985.07

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
