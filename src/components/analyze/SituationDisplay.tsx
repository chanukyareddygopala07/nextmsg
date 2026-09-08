"use client";

interface SituationDisplayProps {
  situation: string;
  severity: string;
  accountability: string;
  userGoal: string;
  nextAction?: string;
}

const SITUATION_LABELS: Record<string, string> = {
  late_submission: "Late Submission",
  missed_deadline: "Missed Deadline",
  missed_interview: "Missed Interview",
  late_arrival: "Late Arrival",
  missed_meeting: "Missed Meeting",
  delayed_response: "Delayed Response",
  missed_call: "Missed Call",
  wrong_file: "Wrong File Sent",
  misunderstanding: "Misunderstanding",
  disagreement: "Disagreement",
  heated_argument: "Heated Argument",
  personal_conflict: "Personal Conflict",
  customer_complaint: "Customer Complaint",
  negotiation: "Negotiation",
  request: "Request",
  apology: "Apology",
  rejection: "Rejection",
  romantic_interest: "Romantic Interest",
  casual_chat: "Casual Chat",
  professional_feedback: "Professional Feedback",
  performance_issue: "Performance Issue",
  scheduling_problem: "Scheduling Issue",
  follow_up: "Follow Up",
  request_for_help: "Request for Help",
  boundary_setting: "Boundary Setting",
  reconnecting: "Reconnecting",
  unknown: "Unknown",
};

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-green-500/10 text-green-400 border border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  high: "bg-red-500/10 text-red-400 border border-red-500/20",
  critical: "bg-red-500/20 text-red-300 border border-red-500/30",
};

const ACCOUNTABILITY_LABELS: Record<string, string> = {
  full: "Full Responsibility",
  partial: "Partial Responsibility",
  minimal: "Minimal Responsibility",
  none: "No Responsibility Required",
};

const GOAL_LABELS: Record<string, string> = {
  reply: "Reply",
  explain: "Explain",
  apologize: "Apologize",
  convince: "Convince",
  negotiate: "Negotiate",
  deescalate: "De-escalate",
  clarify: "Clarify",
  support: "Support",
  confront: "Confront",
  request: "Request",
  decline: "Decline",
  reconnect: "Reconnect",
  close: "Close",
};

export default function SituationDisplay({
  situation,
  severity,
  accountability,
  userGoal,
  nextAction,
}: SituationDisplayProps) {
  const situationLabel = SITUATION_LABELS[situation] || situation;
  const severityStyle = SEVERITY_STYLES[severity] || SEVERITY_STYLES.medium;
  const accountabilityLabel = ACCOUNTABILITY_LABELS[accountability] || accountability;
  const goalLabel = GOAL_LABELS[userGoal] || userGoal;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/60">Detected Situation</h3>
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${severityStyle}`}>
          {severity}
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs w-20">Situation</span>
          <span className="text-white text-sm font-medium">{situationLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs w-20">Goal</span>
          <span className="text-white/80 text-sm">{goalLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs w-20">Accountability</span>
          <span className="text-white/80 text-sm">{accountabilityLabel}</span>
        </div>
      </div>

      {nextAction && (
        <div className="pt-3 border-t border-white/5">
          <p className="text-xs text-white/30 mb-1">Recommended next step</p>
          <p className="text-sm text-white/70">{nextAction}</p>
        </div>
      )}
    </div>
  );
}
