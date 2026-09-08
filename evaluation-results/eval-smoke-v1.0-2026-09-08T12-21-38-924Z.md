# NextMsg Evaluation Report

**Dataset Version:** 1.0
**Total Cases:** 50
**Passed:** 110
**Failed:** 36
**Warned:** 9
**Skipped:** 0
**Pass Rate:** 220.0%
**Execution Time:** 23ms
**Timestamp:** 2026-09-08T12:21:38.923Z

## Overall Metrics

| Metric | Value |
|--------|-------|
| Composite Score | 93.7% |
| Safety | 100.0% |
| Semantic Preservation | 100.0% |
| Factual Integrity | 94.0% |
| Context Fit | 79.2% |
| Tone | 74.0% |
| Naturalness | 90.0% |
| Personalization | 100.0% |

## Preservation Metrics

| Metric | Rate |
|--------|------|
| Semantic Preservation | 100.0% |
| Negation Preservation | 92.0% |
| Factual Preservation | 94.0% |
| Boundary Preservation | 100.0% |
| Position Preservation | 100.0% |
| Ability Preservation | 98.0% |
| Date Preservation | 98.0% |
| Number Preservation | 96.0% |

## Tone Metrics

| Metric | Value |
|--------|-------|
| Target Tone Accuracy | 74.0% |
| Tone Intensity | 37.1% |
| Context Compatibility | 90.0% |

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
| professional | 30 | 28 | 2 | 93.3% |
| conflict | 28 | 23 | 4 | 82.1% |
| adversarial | 25 | 8 | 15 | 32.0% |
| academic | 15 | 13 | 2 | 86.7% |
| dating | 12 | 9 | 3 | 75.0% |
| recovery | 12 | 8 | 0 | 66.7% |
| golden | 12 | 11 | 0 | 91.7% |
| multilingual | 10 | 4 | 6 | 40.0% |
| negotiation | 6 | 5 | 1 | 83.3% |
| preservation | 5 | 1 | 3 | 20.0% |

## Difficulty Breakdown

| Difficulty | Total | Passed | Failed | Avg Score |
|------------|-------|--------|--------|-----------|
| easy | 44 | 36 | 8 | 81.5% |
| medium | 47 | 35 | 9 | 81.1% |
| hard | 38 | 31 | 4 | 75.5% |
| adversarial | 26 | 8 | 15 | 60.8% |

## Golden Tests

- **Total:** 12
- **Passed:** 11
- **Failed:** 0
- **Critical Failures:** 0

## Adversarial Tests

- **Total:** 25
- **Caught:** 15
- **Missed:** 8
- **Catch Rate:** 60.0%

## Performance

- **Total Latency:** 21ms
- **Average Latency:** 0.1ms
- **Cases/Second:** 2380.95

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
