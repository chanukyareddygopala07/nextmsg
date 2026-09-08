export const INTELLIGENCE_ANALYSIS_PROMPT = `You are a conversation intelligence analyst. Your job is to deeply understand a conversation and produce a structured intelligence report.

Analyze the complete conversation. Distinguish evidence from inference. Do not invent facts.

## What to analyze:

### Language
- Identify the PRIMARY language spoken (e.g., Telugu, Tamil, Hindi, Kannada, Malayalam, English, etc.)
- Identify any SECONDARY languages
- Script type: romanized (Latin characters used for non-English), native (Unicode scripts), english, mixed (multiple scripts in same message)
- Whether the conversation is code-mixed (multiple languages naturally mixed)
- Whether romanized/transliterated text is present
- Confidence in language detection

**IMPORTANT for language detection:**
- Latin characters do NOT automatically mean English. "naku ivala work undhi" is Romanized Telugu, not English.
- Recognize Romanized Indian languages as valid communication, not broken English.
- When text mixes languages (e.g., "repu project submit chestha"), identify the primary language AND English.
- For native script text, identify the specific script (Devanagari, Telugu, Tamil, Kannada, Malayalam, etc.)
- Short messages like "ra", "da", "bro", "haan", "seri" — use LOW confidence. Use surrounding messages for context.

### Participants
- How many people are in the conversation
- Their likely roles (manager, employee, professor, student, interviewer, candidate, recruiter, coworker, teammate, client, customer, friend, classmate, family, partner, date, romantic_interest, stranger, group, unknown)
- Who is the user (identified as "me" in the messages)
- Who are the other participants
- If different participants use different languages, note this

### Relationship
- The relationship between the user and the other participant(s)
- Use "unknown" when uncertain

### Context
- The communication context: professional, academic, interview, friendship, dating, family, social, customer, negotiation, conflict, general

### Situation
- What is happening RIGHT NOW in this conversation
- Possible situations: late_submission, missed_deadline, missed_interview, late_arrival, missed_meeting, delayed_response, missed_call, wrong_file, misunderstanding, disagreement, heated_argument, personal_conflict, customer_complaint, negotiation, request, apology, rejection, romantic_interest, casual_chat, professional_feedback, performance_issue, scheduling_problem, follow_up, request_for_help, boundary_setting, reconnecting, unknown
- Use "unknown" when there is insufficient evidence

### User Intent
- What does the user want to accomplish
- If the UI has supplied a goal, prioritize the explicit user goal
- Possible intents: reply, explain, apologize, convince, persuade, negotiate, request, decline, accept, clarify, de_escalate, resolve_conflict, set_boundary, ask_for_extension, ask_for_reschedule, continue_conversation, start_conversation, flirt, show_interest, impress, make_them_laugh, comfort, reassure, follow_up, defend_position, recover_from_mistake, end_conversation, unknown

### Other Person's Intent
- What the other participant appears to be trying to accomplish
- Treat as inference, not fact

### Emotion
- Primary and secondary emotions of the participants
- Intensity from 0.0 to 1.0
- Use language like "likely", "appears", "suggests" when appropriate
- For multilingual text: understand the SEMANTIC meaning before classifying emotion. "Enduku ra ila chesthunav?" could indicate frustration, teasing, or playful annoyance depending on context.

### Tone
- Primary and secondary tones
- Intensity from 0.0 to 1.0

### Conflict
- Conflict level (0.0 = none, 1.0 = extreme)
- Escalation level
- What triggered the conflict
- Core disagreement
- Whether personal attacks are present
- Whether there is a misunderstanding
- Whether resolution is possible

### Conversation Dynamics
- Engagement, reciprocity, cooperation, defensiveness, escalation, rapport, pressure, uncertainty, responsiveness
- All on 0.0 to 1.0 scale

### Communication Risks
- Identify risks: misunderstanding, unnecessary escalation, overly aggressive wording, excessive formality, inappropriate flirting, pressure, ambiguity, lack of accountability, fabricated explanation risk
- Each risk has a type, severity (0-1), and description

### Recommended Strategies
- Based on ALL of the above analysis, recommend 3-5 communication strategies
- Strategies must depend on context, situation, goal, emotion, relationship, and dynamics
- Available strategies: natural, friendly, professional, concise, clear_direct, diplomatic, empathetic, assertive, persuasive, accountable, solution_oriented, reassuring, clarifying, de_escalate, boundary_setting, compromise, negotiation, apologetic, confident, curious, playful, funny, flirty, charming, romantic, supportive, follow_up, reschedule_request, extension_request

### Confidence
- Confidence for language, context, situation, relationship, and intent classifications
- Use 0.0 to 1.0

## Important rules:
- Do NOT invent facts about the participants
- Do NOT assume emotions with certainty
- Use "unknown" when classification is uncertain
- Prioritize evidence over inference
- Consider the ENTIRE conversation, not just recent messages
- For multilingual/code-mixed text, understand meaning before classifying
- Recognize romanized Indian languages (Hindi, Telugu, Tamil, Kannada, Malayalam, etc.) as valid communication, not broken English
- Latin script ≠ English language
- Preserve natural code-switching — do not force everything into one language
- For short ambiguous messages (1-2 words), use LOW confidence`;

export const INTELLIGENCE_OUTPUT_CONFIG = {
  name: "conversation_intelligence",
  schema: {
    type: "object",
    properties: {
      language: {
        type: "object",
        properties: {
          primary: { type: "string" },
          secondary: { type: "array", items: { type: "string" } },
          script: { type: "string", enum: ["romanized", "native", "english", "mixed"] },
          codeMixed: { type: "boolean" },
          romanized: { type: "boolean" },
          confidence: { type: "number" },
        },
        required: ["primary", "secondary", "script", "codeMixed", "romanized", "confidence"],
        additionalProperties: false,
      },
      participants: {
        type: "object",
        properties: {
          count: { type: "number" },
          roles: { type: "array", items: { type: "string" } },
          userIdentification: { type: "string" },
          otherParticipants: { type: "array", items: { type: "string" } },
        },
        required: ["count", "roles", "userIdentification", "otherParticipants"],
        additionalProperties: false,
      },
      relationship: {
        type: "string",
        enum: [
          "manager", "employee", "professor", "student", "interviewer",
          "candidate", "recruiter", "coworker", "teammate", "client",
          "customer", "friend", "classmate", "family", "partner",
          "date", "romantic_interest", "stranger", "group", "unknown",
        ],
      },
      context: {
        type: "string",
        enum: [
          "professional", "academic", "interview", "friendship", "dating",
          "family", "social", "customer", "negotiation", "conflict", "general",
        ],
      },
      situation: {
        type: "string",
        enum: [
          "late_submission", "missed_deadline", "missed_interview", "late_arrival",
          "missed_meeting", "delayed_response", "missed_call", "wrong_file",
          "misunderstanding", "disagreement", "heated_argument", "personal_conflict",
          "customer_complaint", "negotiation", "request", "apology", "rejection",
          "romantic_interest", "casual_chat", "professional_feedback", "performance_issue",
          "scheduling_problem", "follow_up", "request_for_help", "boundary_setting",
          "reconnecting", "unknown",
        ],
      },
      userIntent: {
        type: "string",
        enum: [
          "reply", "explain", "apologize", "convince", "persuade", "negotiate",
          "request", "decline", "accept", "clarify", "de_escalate", "resolve_conflict",
          "set_boundary", "ask_for_extension", "ask_for_reschedule", "continue_conversation",
          "start_conversation", "flirt", "show_interest", "impress", "make_them_laugh",
          "comfort", "reassure", "follow_up", "defend_position", "recover_from_mistake",
          "end_conversation", "unknown",
        ],
      },
      otherIntent: {
        type: "string",
        enum: [
          "asking_for_explanation", "expressing_frustration", "requesting_action",
          "seeking_reassurance", "disagreeing", "flirting", "ending_conversation",
          "negotiating", "asking_question", "expressing_interest", "unknown",
        ],
      },
      emotion: {
        type: "object",
        properties: {
          primary: {
            type: "string",
            enum: [
              "neutral", "happy", "excited", "curious", "confused", "sad",
              "disappointed", "frustrated", "angry", "anxious", "nervous",
              "embarrassed", "hurt", "defensive", "hopeful", "romantic", "playful", "unknown",
            ],
          },
          secondary: {
            type: "string",
            enum: [
              "neutral", "happy", "excited", "curious", "confused", "sad",
              "disappointed", "frustrated", "angry", "anxious", "nervous",
              "embarrassed", "hurt", "defensive", "hopeful", "romantic", "playful", "unknown",
            ],
          },
          intensity: { type: "number" },
        },
        required: ["primary", "secondary", "intensity"],
        additionalProperties: false,
      },
      tone: {
        type: "object",
        properties: {
          primary: {
            type: "string",
            enum: [
              "professional", "formal", "casual", "friendly", "warm", "playful",
              "humorous", "flirty", "romantic", "serious", "diplomatic", "assertive",
              "empathetic", "angry", "sarcastic", "passive_aggressive", "defensive",
              "urgent", "unknown",
            ],
          },
          secondary: {
            type: "string",
            enum: [
              "professional", "formal", "casual", "friendly", "warm", "playful",
              "humorous", "flirty", "romantic", "serious", "diplomatic", "assertive",
              "empathetic", "angry", "sarcastic", "passive_aggressive", "defensive",
              "urgent", "unknown",
            ],
          },
          intensity: { type: "number" },
        },
        required: ["primary", "secondary", "intensity"],
        additionalProperties: false,
      },
      conflict: {
        type: "object",
        properties: {
          level: { type: "number" },
          escalation: { type: "number" },
          trigger: { type: "string" },
          coreDisagreement: { type: "string" },
          personalAttacks: { type: "boolean" },
          misunderstanding: { type: "boolean" },
          resolutionOpportunity: { type: "boolean" },
        },
        required: ["level", "escalation", "trigger", "coreDisagreement", "personalAttacks", "misunderstanding", "resolutionOpportunity"],
        additionalProperties: false,
      },
      dynamics: {
        type: "object",
        properties: {
          engagement: { type: "number" },
          reciprocity: { type: "number" },
          cooperation: { type: "number" },
          defensiveness: { type: "number" },
          escalation: { type: "number" },
          rapport: { type: "number" },
          pressure: { type: "number" },
          uncertainty: { type: "number" },
          responsiveness: { type: "number" },
        },
        required: ["engagement", "reciprocity", "cooperation", "defensiveness", "escalation", "rapport", "pressure", "uncertainty", "responsiveness"],
        additionalProperties: false,
      },
      risks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            severity: { type: "number" },
            description: { type: "string" },
          },
          required: ["type", "severity", "description"],
          additionalProperties: false,
        },
      },
      recommendedStrategies: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "natural", "friendly", "professional", "concise", "clear_direct",
            "diplomatic", "empathetic", "assertive", "persuasive", "accountable",
            "solution_oriented", "reassuring", "clarifying", "de_escalate",
            "boundary_setting", "compromise", "negotiation", "apologetic",
            "confident", "curious", "playful", "funny", "flirty", "charming",
            "romantic", "supportive", "follow_up", "reschedule_request", "extension_request",
          ],
        },
        minItems: 1,
        maxItems: 5,
      },
      confidence: {
        type: "object",
        properties: {
          language: { type: "number" },
          context: { type: "number" },
          situation: { type: "number" },
          relationship: { type: "number" },
          intent: { type: "number" },
        },
        required: ["language", "context", "situation", "relationship", "intent"],
        additionalProperties: false,
      },
    },
    required: [
      "language", "participants", "relationship", "context", "situation",
      "userIntent", "otherIntent", "emotion", "tone", "conflict",
      "dynamics", "risks", "recommendedStrategies", "confidence",
    ],
    additionalProperties: false,
  },
};
