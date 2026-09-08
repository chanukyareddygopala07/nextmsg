"use client";

interface RecoveryGuidanceProps {
  requiredElements: string[];
  recommendedStrategies: string[];
  conflictAdjusted: boolean;
  groupAdjusted: boolean;
}

const ELEMENT_LABELS: Record<string, string> = {
  acknowledgement: "Acknowledge the issue",
  accountability: "Take responsibility",
  new_timeline: "Provide new timeline",
  solution: "Offer a solution",
  prevention: "Prevent recurrence",
  empathy: "Show empathy",
  compromise: "Find middle ground",
  reassurance: "Offer reassurance",
  boundary: "Set clear boundary",
  factual_correction: "Correct the record",
  validation: "Validate feelings",
  redirect: "Redirect conversation",
  closing: "Close gracefully",
  evidence: "Provide evidence",
  logical_argument: "Present logical case",
  shared_values: "Appeal to shared values",
  practical_benefit: "Highlight practical benefits",
  timeline: "Set clear timeline",
  clarity: "Clarify expectations",
  sincerity: "Express genuine sincerity",
  removal_of_pressure: "Reduce pressure",
  demonstration_of_value: "Demonstrate value",
  time_to_consider: "Give space to think",
  specific_examples: "Use concrete examples",
  positive_impact: "Show positive outcomes",
  emotional_connection: "Build emotional rapport",
  normative_pressure: "Reference social norms",
  action_request: "Make clear request",
};

const STRATEGY_LABELS: Record<string, string> = {
  accountable: "Accountable approach",
  solution_oriented: "Solution-focused",
  empathetic: "Empathetic tone",
  direct: "Direct communication",
  de_escalating: "De-escalation",
  compromise_seeking: "Seeking compromise",
  evidence_based: "Evidence-based",
  boundary_setting: "Clear boundaries",
  reassurance: "Reassuring",
  factual_correction: "Correcting facts",
  redirecting: "Redirecting focus",
  closing: "Closing gracefully",
};

export default function RecoveryGuidance({
  requiredElements,
  recommendedStrategies,
  conflictAdjusted,
  groupAdjusted,
}: RecoveryGuidanceProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-medium text-white/60">Recovery Guidance</h3>

      {(conflictAdjusted || groupAdjusted) && (
        <div className="flex flex-wrap gap-2">
          {conflictAdjusted && (
            <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-lg border border-yellow-500/20">
              Conflict adjusted
            </span>
          )}
          {groupAdjusted && (
            <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-lg border border-purple-500/20">
              Group context
            </span>
          )}
        </div>
      )}

      {requiredElements.length > 0 && (
        <div>
          <p className="text-xs text-white/30 mb-2">Recommended to include</p>
          <div className="flex flex-wrap gap-2">
            {requiredElements.map((element) => (
              <span
                key={element}
                className="px-2.5 py-1.5 bg-white/5 text-white/70 text-xs rounded-lg border border-white/10"
              >
                {ELEMENT_LABELS[element] || element}
              </span>
            ))}
          </div>
        </div>
      )}

      {recommendedStrategies.length > 0 && (
        <div>
          <p className="text-xs text-white/30 mb-2">Strategies to use</p>
          <div className="flex flex-wrap gap-2">
            {recommendedStrategies.map((strategy) => (
              <span
                key={strategy}
                className="px-2.5 py-1.5 bg-blue-500/10 text-blue-400 text-xs rounded-lg border border-blue-500/20"
              >
                {STRATEGY_LABELS[strategy] || strategy}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
