# NextMsg Evaluation Report

**Dataset Version:** 1.0
**Total Cases:** 50
**Passed:** 51
**Failed:** 65
**Warned:** 39
**Skipped:** 0
**Pass Rate:** 102.0%
**Execution Time:** 11ms
**Timestamp:** 2026-09-07T14:10:12.807Z

## Overall Metrics

| Metric | Value |
|--------|-------|
| Composite Score | 89.9% |
| Safety | 100.0% |
| Semantic Preservation | 96.0% |
| Factual Integrity | 94.0% |
| Context Fit | 51.4% |
| Tone | 14.3% |
| Naturalness | 95.0% |
| Personalization | 166.7% |

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
| Target Tone Accuracy | 14.3% |
| Tone Intensity | 30.2% |
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
| professional | 30 | 9 | 11 | 30.0% |
| conflict | 28 | 9 | 13 | 32.1% |
| adversarial | 25 | 3 | 15 | 12.0% |
| academic | 15 | 6 | 4 | 40.0% |
| dating | 12 | 6 | 2 | 50.0% |
| recovery | 12 | 5 | 4 | 41.7% |
| golden | 12 | 6 | 3 | 50.0% |
| multilingual | 10 | 4 | 6 | 40.0% |
| negotiation | 6 | 3 | 3 | 50.0% |
| preservation | 5 | 0 | 4 | 0.0% |

## Difficulty Breakdown

| Difficulty | Total | Passed | Failed | Avg Score |
|------------|-------|--------|--------|-----------|
| easy | 44 | 17 | 17 | 69.3% |
| medium | 47 | 15 | 20 | 67.9% |
| hard | 38 | 16 | 13 | 61.9% |
| adversarial | 26 | 3 | 15 | 54.1% |

## Golden Tests

- **Total:** 12
- **Passed:** 6
- **Failed:** 3
- **Critical Failures:** 0

## Adversarial Tests

- **Total:** 25
- **Caught:** 15
- **Missed:** 3
- **Catch Rate:** 60.0%

## Performance

- **Total Latency:** 11ms
- **Average Latency:** 0.1ms
- **Cases/Second:** 4545.45

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
