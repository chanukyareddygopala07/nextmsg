# NextMsg Evaluation Report

**Dataset Version:** 1.0
**Total Cases:** 602
**Passed:** 1224
**Failed:** 434
**Warned:** 199
**Skipped:** 0
**Pass Rate:** 203.3%
**Execution Time:** 70ms
**Timestamp:** 2026-09-07T15:40:21.930Z

## Overall Metrics

| Metric | Value |
|--------|-------|
| Composite Score | 89.2% |
| Safety | 100.0% |
| Semantic Preservation | 94.6% |
| Factual Integrity | 86.7% |
| Context Fit | 74.5% |
| Tone | 52.4% |
| Naturalness | 93.9% |
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
| Target Tone Accuracy | 52.4% |
| Tone Intensity | 28.9% |
| Context Compatibility | 93.9% |

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
| professional | 243 | 195 | 37 | 80.2% |
| conflict | 232 | 148 | 65 | 63.8% |
| golden | 232 | 189 | 26 | 81.5% |
| academic | 150 | 96 | 31 | 64.0% |
| adversarial | 150 | 100 | 46 | 66.7% |
| dating | 132 | 71 | 53 | 53.8% |
| recovery | 120 | 62 | 18 | 51.7% |
| customer | 114 | 73 | 17 | 64.0% |
| friendship | 108 | 72 | 26 | 66.7% |
| group | 90 | 60 | 22 | 66.7% |
| family | 90 | 54 | 19 | 60.0% |
| multilingual | 70 | 27 | 42 | 38.6% |
| pre_send | 60 | 35 | 22 | 58.3% |
| negotiation | 36 | 17 | 6 | 47.2% |
| personalization | 25 | 24 | 1 | 96.0% |
| preservation | 5 | 1 | 3 | 20.0% |

## Difficulty Breakdown

| Difficulty | Total | Passed | Failed | Avg Score |
|------------|-------|--------|--------|-----------|
| easy | 526 | 323 | 132 | 71.2% |
| medium | 502 | 324 | 126 | 72.4% |
| hard | 678 | 477 | 130 | 66.3% |
| adversarial | 151 | 100 | 46 | 75.0% |

## Golden Tests

- **Total:** 232
- **Passed:** 189
- **Failed:** 26
- **Critical Failures:** 19

## Adversarial Tests

- **Total:** 150
- **Caught:** 46
- **Missed:** 100
- **Catch Rate:** 30.7%

## Performance

- **Total Latency:** 69ms
- **Average Latency:** 0.0ms
- **Cases/Second:** 8724.64

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
