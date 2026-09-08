/**
 * Dataset Expander
 * 
 * Expands the base dataset to 500+ cases by generating additional variants.
 */

import * as fs from "fs";
import * as path from "path";
import type { BenchmarkCase, BenchmarkDataset } from "../types";

const BASE_PATH = path.join(__dirname, "data", "dataset-v1.0.json");

function loadBaseDataset(): BenchmarkDataset {
  const raw = fs.readFileSync(BASE_PATH, "utf-8");
  return JSON.parse(raw);
}

function generateAdditionalCases(): BenchmarkCase[] {
  const cases: BenchmarkCase[] = [];
  
  // Professional cases (80 total, need ~70 more)
  const professionalTemplates: Array<Omit<BenchmarkCase, "id">> = [
    {
      category: "professional", difficulty: "easy", context: "professional", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Can you send me the updated spreadsheet?" }],
      draft: "Sure, I'll send it within the hour.", goal: "fulfill_request",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["request", "fulfillment"]
    },
    {
      category: "professional", difficulty: "easy", context: "professional", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "How's the project progressing?" }],
      draft: "On track. We're at 75% completion and expect to hit the milestone by Friday.", goal: "status_update",
      expected: { tone: "professional", semanticPreservationRequired: true, preservedFacts: ["75%", "Friday"], contextFitRequired: true },
      tags: ["status", "progress"]
    },
    {
      category: "professional", difficulty: "medium", context: "professional", relationship: "client",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "We need this done by end of day." }],
      draft: "I understand the urgency. I'll prioritize this and have it ready by 5pm.", goal: "commit_deadline",
      expected: { tone: "professional", semanticPreservationRequired: true, preservedFacts: ["end of day", "5pm"], commitmentPreserved: true, contextFitRequired: true },
      tags: ["deadline", "commitment"]
    },
    {
      category: "professional", difficulty: "medium", context: "professional", relationship: "teammate",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I think we should reconsider the timeline." }],
      draft: "What's your concern? I'd like to understand before we make changes.", goal: "seek_clarity",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["timeline", "discussion"]
    },
    {
      category: "professional", difficulty: "hard", context: "professional", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Why wasn't I informed about the issue sooner?" }],
      draft: "You're right, I should have escalated earlier. I'll ensure better communication going forward.", goal: "accept_accountability",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["accountability", "communication"]
    },
    {
      category: "professional", difficulty: "easy", context: "professional", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Great work on the analysis!" }],
      draft: "Thanks! The team collaboration really made it possible.", goal: "accept_compliment",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["compliment"]
    },
    {
      category: "professional", difficulty: "medium", context: "professional", relationship: "client",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Your team missed the last two deadlines." }],
      draft: "I acknowledge the pattern. Here's what we're implementing to prevent recurrence: dedicated sprint reviews and early risk identification.", goal: "address_pattern",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["accountability", "pattern"]
    },
    {
      category: "professional", difficulty: "hard", context: "professional", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I'm considering you for the team lead position." }],
      draft: "I appreciate the consideration. I'd like to discuss the expectations and timeline for the role.", goal: "explore_opportunity",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["opportunity", "promotion"]
    },
    {
      category: "professional", difficulty: "easy", context: "professional", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Do you have the meeting notes from today?" }],
      draft: "Yes, I'll share them now.", goal: "share_information",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["information_sharing"]
    },
    {
      category: "professional", difficulty: "medium", context: "professional", relationship: "client",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "The deliverable quality has declined." }],
      draft: "I take this seriously. Let me review the recent submissions and address specific quality concerns.", goal: "address_quality",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["quality", "improvement"]
    },
    {
      category: "professional", difficulty: "easy", context: "professional", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Please submit your timesheet by Friday." }],
      draft: "Will do. I'll have it submitted by Thursday.", goal: "confirm_task",
      expected: { tone: "professional", semanticPreservationRequired: true, preservedFacts: ["Friday"], commitmentPreserved: true, contextFitRequired: true },
      tags: ["task", "commitment"]
    },
    {
      category: "professional", difficulty: "medium", context: "professional", relationship: "teammate",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I'm blocked on the API integration." }],
      draft: "Let me help. Can you share the error logs? I've worked with this API before.", goal: "offer_help",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["help", "technical"]
    },
    {
      category: "professional", difficulty: "hard", context: "professional", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Your team's velocity has dropped significantly." }],
      draft: "I've identified the bottlenecks: two team members are handling critical path items. I'd like to redistribute work and bring in短期 support.", goal: "address_velocity",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["performance", "velocity"]
    },
    {
      category: "professional", difficulty: "easy", context: "professional", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Can we discuss the budget allocation?" }],
      draft: "Sure. I have the latest figures ready. When works for you?", goal: "schedule_discussion",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["budget", "scheduling"]
    },
    {
      category: "professional", difficulty: "medium", context: "professional", relationship: "client",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "We're not seeing ROI on the recent investment." }],
      draft: "I understand the concern. Let me prepare a detailed ROI analysis with recommendations for optimization.", goal: "address_roi",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["ROI", "value"]
    },
    {
      category: "professional", difficulty: "hard", context: "professional", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I need to reassign two of your team members to another project." }],
      draft: "I understand the business need. Can we discuss the impact on our current sprint and a transition plan?", goal: "negotiate_resource",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["resource", "negotiation"]
    },
    {
      category: "professional", difficulty: "easy", context: "professional", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "The vendor confirmed the order." }],
      draft: "Great. I'll update the tracking sheet and notify the team.", goal: "acknowledge_update",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["update", "tracking"]
    },
    {
      category: "professional", difficulty: "medium", context: "professional", relationship: "teammate",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I disagree with the technical approach." }],
      draft: "What's your alternative? I want to understand the tradeoffs.", goal: "seek_alternative",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["disagreement", "technical"]
    },
    {
      category: "professional", difficulty: "hard", context: "professional", relationship: "client",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "We're terminating the contract effective immediately." }],
      draft: "I'm disappointed but respect the decision. I'd like to ensure a smooth transition and discuss any outstanding items.", goal: "handle_termination",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["termination", "professional"]
    },
  ];

  // Academic cases (50 total, need ~45 more)
  const academicTemplates: Array<Omit<BenchmarkCase, "id">> = [
    {
      category: "academic", difficulty: "easy", context: "academic", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Can you review my abstract?" }],
      draft: "Happy to. I'll provide feedback by end of day.", goal: "agree_to_review",
      expected: { tone: "formal", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["review", "collaboration"]
    },
    {
      category: "academic", difficulty: "medium", context: "academic", relationship: "reviewer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "The literature review is insufficient." }],
      draft: "Thank you for the feedback. I'll expand the review with additional sources from 2023-2025.", goal: "address_review",
      expected: { tone: "formal", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["review", "literature"]
    },
    {
      category: "academic", difficulty: "hard", context: "academic", relationship: "reviewer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "The methodology section lacks rigor." }],
      draft: "We appreciate the critique. We've added detailed protocols, power analysis, and inter-rater reliability measures.", goal: "defend_methodology",
      expected: { tone: "formal", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["methodology", "defense"]
    },
    {
      category: "academic", difficulty: "easy", context: "academic", relationship: "advisor",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "When will the first draft be ready?" }],
      draft: "I expect to have it ready by March 20. I'll share it for your review.", goal: "commit_timeline",
      expected: { tone: "formal", semanticPreservationRequired: true, preservedFacts: ["March 20"], commitmentPreserved: true, contextFitRequired: true },
      tags: ["timeline", "commitment"]
    },
    {
      category: "academic", difficulty: "medium", context: "academic", relationship: "student",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I don't understand the regression analysis." }],
      draft: "Let me explain step by step. The regression tests the relationship between X and Y while controlling for Z.", goal: "explain_concept",
      expected: { tone: "formal", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["teaching", "explanation"]
    },
    {
      category: "academic", difficulty: "easy", context: "academic", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "The conference deadline is April 15." }],
      draft: "I'll have the paper ready by April 10 to allow buffer time.", goal: "commit_deadline",
      expected: { tone: "formal", semanticPreservationRequired: true, preservedFacts: ["April 15", "April 10"], commitmentPreserved: true, contextFitRequired: true },
      tags: ["deadline", "conference"]
    },
    {
      category: "academic", difficulty: "medium", context: "academic", relationship: "reviewer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "The sample size is too small for generalization." }],
      draft: "We acknowledge the limitation. The findings should be interpreted as preliminary, and we've noted this in the discussion.", goal: "acknowledge_limitation",
      expected: { tone: "formal", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["limitation", "sample_size"]
    },
    {
      category: "academic", difficulty: "hard", context: "academic", relationship: "committee",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Your dissertation doesn't contribute original knowledge." }],
      draft: "I respectfully disagree. The novel contribution is the integration of framework X with method Y, which hasn't been done in this field.", goal: "defend_contribution",
      expected: { tone: "formal", semanticPreservationRequired: true, positionPreserved: true, boundaryPreserved: true, contextFitRequired: true },
      tags: ["defense", "contribution"]
    },
    {
      category: "academic", difficulty: "easy", context: "academic", relationship: "advisor",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Your proposal looks solid. Just minor revisions needed." }],
      draft: "Thank you. I'll address the minor revisions and resubmit by end of week.", goal: "acknowledge_feedback",
      expected: { tone: "formal", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["feedback", "revision"]
    },
    {
      category: "academic", difficulty: "medium", context: "academic", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Can we collaborate on a joint paper?" }],
      draft: "I'm interested. What's your proposed topic and timeline?", goal: "explore_collaboration",
      expected: { tone: "formal", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["collaboration", "paper"]
    },
    {
      category: "academic", difficulty: "hard", context: "academic", relationship: "reviewer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "The results don't support your conclusions." }],
      draft: "We've re-examined the data and found additional support in Table 3. We'll strengthen the discussion section to clarify the connection.", goal: "defend_results",
      expected: { tone: "formal", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["results", "defense"]
    },
    {
      category: "academic", difficulty: "easy", context: "academic", relationship: "student",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Is this topic too ambitious for a master's thesis?" }],
      draft: "It's manageable if we narrow the scope. I suggest focusing on the urban context first.", goal: "advise_scope",
      expected: { tone: "formal", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["advice", "scope"]
    },
    {
      category: "academic", difficulty: "medium", context: "academic", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "The journal rejected our submission." }],
      draft: "Let's review the reviewer comments and resubtain to a more appropriate journal.", goal: "handle_rejection",
      expected: { tone: "formal", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["rejection", "resubmission"]
    },
    {
      category: "academic", difficulty: "hard", context: "academic", relationship: "committee",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Why should we fund this research?" }],
      draft: "Our preliminary data shows 40% improvement. With full funding, we can scale to 500 participants and publish in top-tier journals.", goal: "pitch_research",
      expected: { tone: "formal", semanticPreservationRequired: true, preservedFacts: ["40%", "500 participants"], contextFitRequired: true },
      tags: ["funding", "pitch"]
    },
    {
      category: "academic", difficulty: "easy", context: "academic", relationship: "advisor",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Add more quantitative data to chapter 4." }],
      draft: "I'll expand the quantitative analysis and include additional statistical tests.", goal: "accept_revision",
      expected: { tone: "formal", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["revision", "quantitative"]
    },
  ];

  // Conflict cases (60 total, need ~55 more)
  const conflictTemplates: Array<Omit<BenchmarkCase, "id">> = [
    {
      category: "conflict", difficulty: "easy", context: "conflict", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You took credit for my idea!" }],
      draft: "I apologize if it came across that way. Your contribution was essential. Let me clarify the attribution.", goal: "correct_attribution",
      expected: { tone: "warm", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["attribution", "de_escalation"]
    },
    {
      category: "conflict", difficulty: "medium", context: "conflict", relationship: "partner",
      language: "english", script: "latin",
      conversation: [{ role: "other", "content": "You never listen to me!" }],
      draft: "I'm sorry you feel that way. I want to listen better. Can you tell me what's most important to you right now?", goal: "improve_communication",
      expected: { tone: "warm", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["listening", "empathy"]
    },
    {
      category: "conflict", difficulty: "hard", context: "conflict", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Your mistake cost us the client." }],
      draft: "I take responsibility for the error. Here's my plan to recover the relationship: immediate outreach, service recovery offer, and process improvement.", goal: "accept_responsibility",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["accountability", "recovery"]
    },
    {
      category: "conflict", difficulty: "easy", context: "conflict", relationship: "friend",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You forgot my birthday!" }],
      draft: "I'm so sorry. That was thoughtless of me. Let me make it up to you this weekend.", goal: "apologize",
      expected: { tone: "warm", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["apology", "forgotten"]
    },
    {
      category: "conflict", difficulty: "medium", context: "conflict", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Your approach is wrong and will fail." }],
      draft: "I'd like to understand your concerns. What specific risks do you see?", goal: "seek_understanding",
      expected: { tone: "professional", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["disagreement", "technical"]
    },
    {
      category: "conflict", difficulty: "hard", context: "conflict", relationship: "family",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You always choose your job over family!" }],
      draft: "I hear you, and I'm sorry. Family matters to me. Let me prove it by taking time off next week.", goal: "reassure_family",
      expected: { tone: "warm", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["family", "work_life_balance"]
    },
    {
      category: "conflict", difficulty: "easy", context: "conflict", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Why wasn't I included in the decision?" }],
      draft: "You're right, I should have looped you in. Let me fill you in now and ensure it doesn't happen again.", goal: "include_stakeholder",
      expected: { tone: "professional", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["inclusion", "communication"]
    },
    {
      category: "conflict", difficulty: "medium", context: "conflict", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Your team is underperforming." }],
      draft: "I'm addressing it directly. Here are the specific actions: weekly performance reviews, targeted training, and clear KPIs.", goal: "respond_to_performance",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["performance", "action_plan"]
    },
    {
      category: "conflict", difficulty: "hard", context: "conflict", relationship: "stranger",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "This is the worst service I've ever experienced!" }],
      draft: "I'm truly sorry. That's not the experience we want for you. Let me make this right immediately.", goal: "de_escalate_complaint",
      expected: { tone: "warm", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["complaint", "service"]
    },
    {
      category: "conflict", difficulty: "easy", context: "conflict", relationship: "partner",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You're always on your phone!" }],
      draft: "You're right. I'll put it away during dinner. Let's focus on each other.", goal: "change_behavior",
      expected: { tone: "warm", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["behavior", "attention"]
    },
    {
      category: "conflict", difficulty: "medium", context: "conflict", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You're not a team player." }],
      draft: "I value teamwork. What specific situations made you feel that way? I want to improve.", goal: "seek_feedback",
      expected: { tone: "professional", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["teamwork", "feedback"]
    },
    {
      category: "conflict", difficulty: "hard", context: "conflict", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I'm putting you on a performance improvement plan." }],
      draft: "I understand. I'd like to review the specific expectations and support available. I'm committed to meeting them.", goal: "accept_pip",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["pip", "accountability"]
    },
    {
      category: "conflict", difficulty: "easy", context: "conflict", relationship: "friend",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You bailed on our plans again." }],
      draft: "I'm sorry. I've been unreliable lately. I'll make it up to you this weekend.", goal: "apologize_unreliability",
      expected: { tone: "warm", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["unreliability", "apology"]
    },
    {
      category: "conflict", difficulty: "medium", context: "conflict", relationship: "family",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You never call home!" }],
      draft: "You're right, and I'm sorry. I'll set a weekly reminder to call every Sunday evening.", goal: "commit_regular_contact",
      expected: { tone: "warm", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["family", "regular_contact"]
    },
    {
      category: "conflict", difficulty: "hard", context: "conflict", relationship: "partner",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I can't trust you anymore." }],
      draft: "I understand. Trust is earned, not given. I'll work consistently to rebuild it. What would help you feel safe?", goal: "rebuild_trust",
      expected: { tone: "warm", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["trust", "rebuilding"]
    },
    {
      category: "conflict", difficulty: "easy", context: "conflict", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You're being unreasonable." }],
      draft: "I want to find a solution that works for both of us. What would you suggest?", goal: "compromise",
      expected: { tone: "professional", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["compromise", "reasonable"]
    },
    {
      category: "conflict", difficulty: "medium", context: "conflict", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You missed another deadline." }],
      draft: "I take full responsibility. The pattern stops now. I've restructured my workflow and added buffer time.", goal: "stop_pattern",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["pattern", "accountability"]
    },
    {
      category: "conflict", difficulty: "hard", context: "conflict", relationship: "stranger",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You're incompetent!" }],
      draft: "I understand your frustration. I'm committed to resolving this. Let me focus on the solution.", goal: "de_escalate_insult",
      expected: { tone: "diplomatic", semanticPreservationRequired: true, deEscalationExpected: true, boundaryPreserved: true, contextFitRequired: true },
      tags: ["insult", "de_escalation"]
    },
    {
      category: "conflict", difficulty: "easy", context: "conflict", relationship: "friend",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You talked about me behind my back." }],
      draft: "I'm sorry. That was wrong. I should have spoken directly to you. Can we talk about it now?", goal: "address_gossip",
      expected: { tone: "warm", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["gossip", "trust"]
    },
    {
      category: "conflict", difficulty: "medium", context: "conflict", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You're not pulling your weight." }],
      draft: "I appreciate the direct feedback. Can you point out specific areas where I can improve?", goal: "seek_clarity",
      expected: { tone: "professional", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["workload", "feedback"]
    },
    {
      category: "conflict", difficulty: "hard", context: "conflict", relationship: "partner",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I want a separation." }],
      draft: "I'm heartbroken but I respect your feelings. Can we discuss this with a counselor before making final decisions?", goal: "seek_resolution",
      expected: { tone: "warm", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["separation", "professional_help"]
    },
  ];

  // More cases across other categories
  const datingTemplates: Array<Omit<BenchmarkCase, "id">> = [
    {
      category: "dating", difficulty: "easy", context: "dating", relationship: "date",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Want to grab coffee sometime?" }],
      draft: "I'd love that! When works for you?", goal: "accept_date",
      expected: { tone: "casual", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["date", "acceptance"]
    },
    {
      category: "dating", difficulty: "medium", context: "dating", relationship: "date",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I had fun tonight, but I don't think we're a match." }],
      draft: "I appreciate your honesty. I had a great time too. Wishing you the best!", goal: "accept_rejection",
      expected: { tone: "casual", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["rejection", "grace"]
    },
    {
      category: "dating", difficulty: "hard", context: "dating", relationship: "date",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You seem too perfect. Are you being real?" }],
      draft: "I'm just being myself. I appreciate you being direct about it though.", goal: "respond_authenticity",
      expected: { tone: "casual", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["authenticity", "skepticism"]
    },
    {
      category: "dating", difficulty: "easy", context: "dating", relationship: "date",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "What are you looking for?" }],
      draft: "Something genuine. Someone I can laugh with and be myself around. You?", goal: "share_intentions",
      expected: { tone: "casual", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["intentions", "getting_to_know"]
    },
    {
      category: "dating", difficulty: "medium", context: "dating", relationship: "date",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I'm not ready for anything serious." }],
      draft: "I respect that. I'm enjoying getting to know you too. Let's see where things go naturally.", goal: "align_expectations",
      expected: { tone: "casual", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["expectations", "casual"]
    },
    {
      category: "dating", difficulty: "hard", context: "dating", relationship: "date",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "My ex still texts me." }],
      draft: "Thanks for telling me. I'm not worried about the past, but I appreciate honesty about the present.", goal: "respond_to_ex",
      expected: { tone: "casual", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["ex", "boundary"]
    },
    {
      category: "dating", difficulty: "easy", context: "dating", relationship: "date",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "This was fun. Same time next week?" }],
      draft: "Definitely! Looking forward to it.", goal: "confirm_second_date",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["second_date", "enthusiasm"]
    },
    {
      category: "dating", difficulty: "medium", context: "dating", relationship: "date",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I feel like you're holding back." }],
      draft: "I'm taking things slow intentionally. I want to be genuine, not performative.", goal: "explain_pace",
      expected: { tone: "casual", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["pace", "authenticity"]
    },
    {
      category: "dating", difficulty: "hard", context: "dating", relationship: "date",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I think I'm developing feelings." }],
      draft: "I appreciate you sharing that. I enjoy spending time with you too. Let's keep communicating openly.", goal: "respond_to_feelings",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["feelings", "vulnerability"]
    },
    {
      category: "dating", difficulty: "easy", context: "dating", relationship: "date",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Do you want to split the bill?" }],
      draft: "I'm happy to split it. Thanks for a great evening!", goal: "split_bill",
      expected: { tone: "casual", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["bill", "casual"]
    },
  ];

  const friendshipTemplates: Array<Omit<BenchmarkCase, "id">> = [
    {
      category: "friendship", difficulty: "easy", context: "friendship", relationship: "friend",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Long time no see!" }],
      draft: "I know, right? We should catch up soon!", goal: "reconnect",
      expected: { tone: "casual", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["reconnection"]
    },
    {
      category: "friendship", difficulty: "medium", context: "friendship", relationship: "friend",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I got the job!" }],
      draft: "That's amazing!! I'm so happy for you. Drinks on you? 😄", goal: "celebrate",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["celebration", "good_news"]
    },
    {
      category: "friendship", difficulty: "hard", context: "friendship", relationship: "friend",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I'm going through a tough time." }],
      draft: "I'm here for you. Whatever you need. Want to talk about it?", goal: "offer_support",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["support", "vulnerability"]
    },
    {
      category: "friendship", difficulty: "easy", context: "friendship", relationship: "friend",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Want to go hiking this weekend?" }],
      draft: "Yes! Where are you thinking?", goal: "accept_plan",
      expected: { tone: "casual", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["plan", "activity"]
    },
    {
      category: "friendship", difficulty: "medium", context: "friendship", relationship: "friend",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I need advice about my relationship." }],
      draft: "I'm all ears. What's going on?", goal: "offer_advice",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["advice", "relationship"]
    },
    {
      category: "friendship", difficulty: "hard", context: "friendship", relationship: "friend",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I think you should break up with them." }],
      draft: "That's a big decision. What's making you feel that way?", goal: "explore_feelings",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["relationship", "advice"]
    },
    {
      category: "friendship", difficulty: "easy", context: "friendship", relationship: "friend",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Happy birthday!" }],
      draft: "Thanks so much! 🎉", goal: "acknowledge_birthday",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["birthday", "thanks"]
    },
    {
      category: "friendship", difficulty: "medium", context: "friendship", relationship: "friend",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I'm moving to another city." }],
      draft: "I'll miss you, but I'm excited for your new adventure. Let's plan a going-away dinner.", goal: "acknowledge_move",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["moving", "farewell"]
    },
    {
      category: "friendship", difficulty: "hard", context: "friendship", relationship: "friend",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I need space right now." }],
      draft: "I understand. I'll be here when you're ready. Take care of yourself.", goal: "respect_space",
      expected: { tone: "warm", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["space", "boundary"]
    },
    {
      category: "friendship", difficulty: "easy", context: "friendship", relationship: "friend",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Check out this restaurant!" }],
      draft: "Looks great! Let's go together next week.", goal: "accept_recommendation",
      expected: { tone: "casual", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["recommendation", "plan"]
    },
  ];

  const familyTemplates: Array<Omit<BenchmarkCase, "id">> = [
    {
      category: "family", difficulty: "easy", context: "family", relationship: "parent",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Call me when you get a chance." }],
      draft: "I'll call you tonight after work, around 7pm.", goal: "schedule_call",
      expected: { tone: "warm", semanticPreservationRequired: true, preservedFacts: ["7pm"], contextFitRequired: true },
      tags: ["call", "scheduling"]
    },
    {
      category: "family", difficulty: "medium", context: "family", relationship: "sibling",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Mom's asking about you." }],
      draft: "I'll give her a call this weekend. How's she doing?", goal: "reconnect_family",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["family", "reconnection"]
    },
    {
      category: "family", difficulty: "hard", context: "family", relationship: "parent",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You never visit anymore." }],
      draft: "You're right, and I'm sorry. I'll plan a visit next month. I miss you too.", goal: "reconnect_family",
      expected: { tone: "warm", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["visiting", "reconnection"]
    },
    {
      category: "family", difficulty: "easy", context: "family", relationship: "sibling",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Can you help me move next Saturday?" }],
      draft: "Sure! What time should I be there?", goal: "offer_help",
      expected: { tone: "warm", semanticPreservationRequired: true, preservedFacts: ["Saturday"], contextFitRequired: true },
      tags: ["help", "moving"]
    },
    {
      category: "family", difficulty: "medium", context: "family", relationship: "parent",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I'm worried about your health." }],
      draft: "I appreciate your concern. I've been making changes. Let me share my progress.", goal: "reassure_parent",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["health", "reassurance"]
    },
    {
      category: "family", difficulty: "hard", context: "family", relationship: "sibling",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I can't forgive what happened." }],
      draft: "I understand. I won't push. Just know I'm here when you're ready.", goal: "respect_boundary",
      expected: { tone: "warm", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["forgiveness", "boundary"]
    },
    {
      category: "family", difficulty: "easy", context: "family", relationship: "parent",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Dinner's ready!" }],
      draft: "On my way! Smells amazing.", goal: "acknowledge_meal",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["meal", "family"]
    },
    {
      category: "family", difficulty: "medium", context: "family", relationship: "sibling",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I need to borrow money." }],
      draft: "I can help with a specific amount. What do you need and when can you repay?", goal: "offer_financial_help",
      expected: { tone: "warm", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["money", "boundary"]
    },
    {
      category: "family", difficulty: "hard", context: "family", relationship: "parent",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Your choices disappoint me." }],
      draft: "I'm sorry you feel that way. I'm making the best decisions I can for my life.", goal: "maintain_boundary",
      expected: { tone: "warm", semanticPreservationRequired: true, positionPreserved: true, boundaryPreserved: true, contextFitRequired: true },
      tags: ["disappointment", "boundary"]
    },
    {
      category: "family", difficulty: "easy", context: "family", relationship: "sibling",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Happy anniversary!" }],
      draft: "Thank you! Can you believe it's been 5 years?", goal: "celebrate",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["anniversary", "celebration"]
    },
  ];

  const negotiationTemplates: Array<Omit<BenchmarkCase, "id">> = [
    {
      category: "negotiation", difficulty: "easy", context: "negotiation", relationship: "vendor",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Our final price is $50,000." }],
      draft: "I appreciate the offer. Based on market research, $42,000 would be more aligned with our budget. Can we meet in the middle?", goal: "counter_offer",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["counter", "price"]
    },
    {
      category: "negotiation", difficulty: "medium", context: "negotiation", relationship: "employer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "The benefits package is non-negotiable." }],
      draft: "I understand. Can we discuss the base salary then, given the fixed benefits?", goal: "redirect_negotiation",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["benefits", "redirect"]
    },
    {
      category: "negotiation", difficulty: "hard", context: "negotiation", relationship: "partner",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I want full custody." }],
      draft: "I want what's best for our child. I believe shared custody provides stability. Can we discuss a plan that prioritizes their wellbeing?", goal: "negotiate_custody",
      expected: { tone: "warm", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["custody", "child_welfare"]
    },
    {
      category: "negotiation", difficulty: "easy", context: "negotiation", relationship: "vendor",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "We can offer a 10% discount for bulk orders." }],
      draft: "I appreciate that. What would the discount be for a 50% larger order?", goal: "negotiate_volume",
      expected: { tone: "professional", semanticPreservationRequired: true, preservedFacts: ["10%"], contextFitRequired: true },
      tags: ["volume", "discount"]
    },
    {
      category: "negotiation", difficulty: "medium", context: "negotiation", relationship: "landlord",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "The rent is going up 15%." }],
      draft: "I understand costs are rising. A 15% increase is significant. Would you consider 7% with a longer lease commitment?", goal: "negotiate_rent",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["rent", "lease"]
    },
    {
      category: "negotiation", difficulty: "hard", context: "negotiation", relationship: "employer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "We can't meet your salary expectations." }],
      draft: "I understand budget constraints. Can we discuss equity, flexible work, or additional PTO to bridge the gap?", goal: "negotiate_benefits",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["salary", "alternative_compensation"]
    },
    {
      category: "negotiation", difficulty: "easy", context: "negotiation", relationship: "vendor",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Delivery will take 6 weeks." }],
      draft: "That's longer than expected. Can we expedite for an additional fee?", goal: "negotiate_timeline",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["delivery", "timeline"]
    },
    {
      category: "negotiation", difficulty: "medium", context: "negotiation", relationship: "partner",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I want to sell the house." }],
      draft: "I understand. Let's discuss the financial implications and agree on fair terms before proceeding.", goal: "negotiate_sale",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["house", "financial"]
    },
    {
      category: "negotiation", difficulty: "hard", context: "negotiation", relationship: "employer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Take it or leave it." }],
      draft: "I respect your position. Before I decide, can you clarify if there's any flexibility on the start date?", goal: "explore_flexibility",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["ultimatum", "explore_options"]
    },
    {
      category: "negotiation", difficulty: "easy", context: "negotiation", relationship: "vendor",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "We include free installation." }],
      draft: "That's great. Does the installation include training for our team?", goal: "clarify_scope",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["installation", "scope"]
    },
  ];

  const customerTemplates: Array<Omit<BenchmarkCase, "id">> = [
    {
      category: "customer", difficulty: "easy", context: "customer", relationship: "customer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "How do I reset my password?" }],
      draft: "I'll walk you through it. Go to Settings > Account > Reset Password. Need more help?", goal: "provide_instructions",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["password", "instructions"]
    },
    {
      category: "customer", difficulty: "medium", context: "customer", relationship: "customer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Your product broke after one week!" }],
      draft: "I'm sorry to hear that. That's not the experience we want. I'll send a replacement immediately.", goal: "replace_product",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["defect", "replacement"]
    },
    {
      category: "customer", difficulty: "hard", context: "customer", relationship: "customer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I'm going to leave a 1-star review." }],
      draft: "I understand your frustration and want to make this right. Can we resolve this before you post? Your satisfaction matters to us.", goal: "prevent_negative_review",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["review", "resolution"]
    },
    {
      category: "customer", difficulty: "easy", context: "customer", relationship: "customer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Is this item in stock?" }],
      draft: "Yes, it's available. Would you like to place an order?", goal: "confirm_availability",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["stock", "availability"]
    },
    {
      category: "customer", difficulty: "medium", context: "customer", relationship: "customer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I was charged twice." }],
      draft: "I apologize for the billing error. I'll process a refund for the duplicate charge right away.", goal: "fix_billing",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["billing", "refund"]
    },
    {
      category: "customer", difficulty: "hard", context: "customer", relationship: "customer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "This is unacceptable. I want to speak to a manager." }],
      draft: "I understand. I'll connect you with my manager right away. In the meantime, can I note your concern to help resolve it faster?", goal: "escalate_to_manager",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["escalation", "manager"]
    },
    {
      category: "customer", difficulty: "easy", context: "customer", relationship: "customer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "What are your hours?" }],
      draft: "We're open Monday to Friday, 9am to 6pm. How can I help?", goal: "provide_hours",
      expected: { tone: "warm", semanticPreservationRequired: true, preservedFacts: ["Monday to Friday", "9am to 6pm"], contextFitRequired: true },
      tags: ["hours", "information"]
    },
    {
      category: "customer", difficulty: "medium", context: "customer", relationship: "customer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I want to cancel my subscription." }],
      draft: "I'm sorry to see you go. Before I process the cancellation, is there anything we can improve?", goal: "retain_customer",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["cancellation", "retention"]
    },
    {
      category: "customer", difficulty: "hard", context: "customer", relationship: "customer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Your service caused me to lose money." }],
      draft: "I take that very seriously. Let me investigate what happened and discuss appropriate compensation.", goal: "address_loss",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["loss", "compensation"]
    },
    {
      category: "customer", difficulty: "easy", context: "customer", relationship: "customer",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Thank you for your help!" }],
      draft: "You're welcome! Don't hesitate to reach out if you need anything else.", goal: "close_interaction",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["thanks", "closing"]
    },
  ];

  const recoveryTemplates: Array<Omit<BenchmarkCase, "id">> = [
    {
      category: "recovery", difficulty: "easy", context: "professional", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You sent the wrong file to the client." }],
      draft: "I apologize for the error. I've identified the correct file and will send it immediately with an explanation.", goal: "correct_error",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["error", "correction"]
    },
    {
      category: "recovery", difficulty: "medium", context: "professional", relationship: "client",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "We're missing the quarterly data." }],
      draft: "I'll have it to you within the hour. I'm pulling the numbers now.", goal: "recover_missing_data",
      expected: { tone: "professional", semanticPreservationRequired: true, preservedFacts: ["within the hour"], contextFitRequired: true },
      tags: ["missing_data", "recovery"]
    },
    {
      category: "recovery", difficulty: "hard", context: "professional", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", "content": "The client is furious about the delay." }],
      draft: "I take full responsibility. I've already called the client to apologize and propose a recovery plan with compressed timelines.", goal: "manage_angry_client",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["angry_client", "accountability"]
    },
    {
      category: "recovery", difficulty: "easy", context: "professional", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "The meeting link isn't working." }],
      draft: "Let me send a new link right away. Sorry for the technical issue.", goal: "fix_technical_issue",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["technical", "meeting"]
    },
    {
      category: "recovery", difficulty: "medium", context: "professional", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Your team delivered subpar work." }],
      draft: "I'm addressing it immediately. I'll review all deliverables today and ensure quality standards are met before resubmission.", goal: "recover_quality",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["quality", "recovery"]
    },
    {
      category: "recovery", difficulty: "hard", context: "professional", relationship: "client",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "We're reviewing other vendors because of this." }],
      draft: "I understand your concern. I'd like 30 minutes to present our recovery plan and demonstrate our commitment to your success.", goal: "retain_client",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["client_retention", "recovery"]
    },
    {
      category: "recovery", difficulty: "easy", context: "professional", relationship: "teammate",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "The test suite is failing." }],
      draft: "I'm on it. Looks like a regression from my last commit. I'll have a fix within the hour.", goal: "fix_regression",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["regression", "technical"]
    },
    {
      category: "recovery", difficulty: "medium", context: "professional", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Budget was exceeded by 20%." }],
      draft: "I take responsibility. I'll present a detailed breakdown and cost-reduction plan by end of week.", goal: "address_budget_overrun",
      expected: { tone: "professional", semanticPreservationRequired: true, preservedFacts: ["20%"], positionPreserved: true, contextFitRequired: true },
      tags: ["budget", "accountability"]
    },
    {
      category: "recovery", difficulty: "hard", context: "professional", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "We lost the contract." }],
      draft: "I'm deeply sorry. I'll prepare a full post-mortem and recovery strategy. I take accountability for my role in this outcome.", goal: "handle_contract_loss",
      expected: { tone: "professional", semanticPreservationRequired: true, positionPreserved: true, contextFitRequired: true },
      tags: ["contract_loss", "accountability"]
    },
    {
      category: "recovery", difficulty: "easy", context: "professional", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You forgot to invite me to the meeting." }],
      draft: "I'm sorry about that. I've added you to the invite and will include you in future meetings.", goal: "correct_oversight",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["oversight", "inclusion"]
    },
  ];

  const groupTemplates: Array<Omit<BenchmarkCase, "id">> = [
    {
      category: "group", difficulty: "easy", context: "group", relationship: "team",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Who's taking notes today?" }],
      draft: "I can take notes. I'll share them after the meeting.", goal: "volunteer",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["volunteer", "notes"]
    },
    {
      category: "group", difficulty: "medium", context: "group", relationship: "team",
      language: "english", script: "latin",
      conversation: [
        { role: "other", content: "I think we should delay the launch." },
        { role: "other", content: "No, we should launch on time." }
      ],
      draft: "Both points have merit. Let's list the risks of launching early vs. the costs of delaying.", goal: "mediate",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["mediation", "decision"]
    },
    {
      category: "group", difficulty: "hard", context: "group", relationship: "team",
      language: "english", script: "latin",
      conversation: [
        { role: "other", content: "This project is a disaster." },
        { role: "other", content: "It's not my fault!" }
      ],
      draft: "Let's focus on solutions rather than blame. What are the top 3 things we can fix this week?", goal: "refocus_team",
      expected: { tone: "professional", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["blame", "solution_focused"]
    },
    {
      category: "group", difficulty: "easy", context: "group", relationship: "team",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Any updates from everyone?" }],
      draft: "I'll start. My team completed the API integration. Testing starts tomorrow.", goal: "provide_update",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["update", "status"]
    },
    {
      category: "group", difficulty: "medium", context: "group", relationship: "team",
      language: "english", script: "latin",
      conversation: [
        { role: "other", content: "We need to choose between React and Vue." },
        { role: "other", "content": "Vue is obviously better." },
        { role: "other", "content": "No way, React is the standard." }
      ],
      draft: "Let's evaluate both against our specific requirements: team expertise, ecosystem, and maintenance cost.", goal: "facilitate_decision",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["decision", "facilitation"]
    },
    {
      category: "group", difficulty: "hard", context: "group", relationship: "team",
      language: "english", script: "latin",
      conversation: [
        { role: "other", content: "Someone needs to be held accountable." },
        { role: "other", content: "Don't look at me." }
      ],
      draft: "I agree accountability matters. Let's do a structured post-mortem focused on process improvement, not individual blame.", goal: "structure_postmortem",
      expected: { tone: "professional", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["accountability", "postmortem"]
    },
    {
      category: "group", difficulty: "easy", context: "group", relationship: "team",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Great work on the release, team!" }],
      draft: "Thanks! Everyone's effort made this possible. Special thanks to the QA team for catching those bugs.", goal: "acknowledge_team",
      expected: { tone: "warm", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["celebration", "team"]
    },
    {
      category: "group", difficulty: "medium", context: "group", relationship: "team",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "We're behind schedule." }],
      draft: "Let's assess where we are and what we can realistically complete this sprint. I'll update the priority list.", goal: "reassess",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["schedule", "reassessment"]
    },
    {
      category: "group", difficulty: "hard", context: "group", relationship: "team",
      language: "english", script: "latin",
      conversation: [
        { role: "other", content: "The client hates the new design." },
        { role: "other", content: "I told you this would happen." }
      ],
      draft: "Let's not point fingers. The client's feedback is valuable. I'll schedule a revision meeting for tomorrow.", goal: "move_forward",
      expected: { tone: "professional", semanticPreservationRequired: true, deEscalationExpected: true, contextFitRequired: true },
      tags: ["blame", "forward_looking"]
    },
    {
      category: "group", difficulty: "easy", context: "group", relationship: "team",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Does anyone have questions?" }],
      draft: "I have one about the deployment timeline. Can we clarify the rollback plan?", goal: "ask_question",
      expected: { tone: "professional", semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["question", "clarification"]
    },
  ];

  const personalizationTemplates: Array<Omit<BenchmarkCase, "id">> = [
    {
      category: "personalization", difficulty: "medium", context: "professional", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "user", content: "Send a thank you note." }],
      draft: "Thank you for your time and insights.",
      goal: "send_thanks",
      expected: { coldStartExpected: true, semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["cold_start", "thank_you"]
    },
    {
      category: "personalization", difficulty: "hard", context: "professional", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "user", content: "Make it more assertive." }],
      draft: "I require this completed by Friday.",
      goal: "send_request",
      expected: { personalizationExpected: true, semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["explicit_override", "assertive"]
    },
    {
      category: "personalization", difficulty: "easy", context: "professional", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "user", content: "Reply to the email." }],
      draft: "Received, thanks.",
      goal: "reply_email",
      expected: { coldStartExpected: true, semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["cold_start", "email"]
    },
    {
      category: "personalization", difficulty: "medium", context: "dating", relationship: "date",
      language: "english", script: "latin",
      conversation: [{ role: "user", content: "Send a flirty response." }],
      draft: "Can't stop thinking about you 😊",
      goal: "send_flirty",
      expected: { personalizationExpected: true, semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["context_preference", "dating"]
    },
    {
      category: "personalization", difficulty: "hard", context: "conflict", relationship: "partner",
      language: "english", script: "latin",
      conversation: [{ role: "user", content: "Make it more empathetic." }],
      draft: "I understand how you feel, and I'm sorry this has been so difficult.",
      goal: "respond_to_conflict",
      expected: { personalizationExpected: true, semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["explicit_override", "empathetic"]
    },
    {
      category: "personalization", difficulty: "easy", context: "professional", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "user", content: "Draft a meeting response." }],
      draft: "Confirmed. See you there.",
      goal: "confirm_meeting",
      expected: { coldStartExpected: true, semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["cold_start", "meeting"]
    },
    {
      category: "personalization", difficulty: "medium", context: "professional", relationship: "client",
      language: "english", script: "latin",
      conversation: [{ role: "user", content: "Make it shorter." }],
      draft: "Done.",
      goal: "acknowledge_request",
      expected: { personalizationExpected: true, semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["explicit_override", "concise"]
    },
    {
      category: "personalization", difficulty: "hard", context: "professional", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "user", content: "Use my usual style." }],
      draft: "Hey team, quick update: we're on track for Friday. Let me know if anything changes.",
      goal: "send_update",
      expected: { personalizationExpected: true, semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["explicit_override", "style"]
    },
    {
      category: "personalization", difficulty: "easy", context: "professional", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "user", content: "Reply to feedback." }],
      draft: "Thanks for the feedback.",
      goal: "acknowledge_feedback",
      expected: { coldStartExpected: true, semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["cold_start", "feedback"]
    },
    {
      category: "personalization", difficulty: "medium", context: "dating", relationship: "date",
      language: "english", script: "latin",
      conversation: [{ role: "user", content: "Make it more playful." }],
      draft: "You're trouble 😏",
      goal: "send_playful",
      expected: { personalizationExpected: true, semanticPreservationRequired: true, contextFitRequired: true },
      tags: ["explicit_override", "playful"]
    },
  ];

  const preSendTemplates: Array<Omit<BenchmarkCase, "id">> = [
    {
      category: "pre_send", difficulty: "easy", context: "professional", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Can you help with the report?" }],
      draft: "Sure, I'll have it ready by end of day.",
      goal: "offer_help",
      expected: { preSendStatus: "READY", semanticPreservationRequired: true },
      tags: ["ready", "help"]
    },
    {
      category: "pre_send", difficulty: "medium", context: "conflict", relationship: "partner",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You never listen!" }],
      draft: "I'm listening now. Tell me what's important.",
      goal: "respond_to_frustration",
      expected: { preSendStatus: "READY", semanticPreservationRequired: true },
      tags: ["ready", "empathy"]
    },
    {
      category: "pre_send", difficulty: "hard", context: "professional", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Explain the budget overrun." }],
      draft: "The overrun was caused by scope changes. I should have flagged this sooner.",
      goal: "explain_overrun",
      expected: { preSendStatus: "READY", semanticPreservationRequired: true },
      tags: ["ready", "accountability"]
    },
    {
      category: "pre_send", difficulty: "easy", context: "professional", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Meeting at 3pm?" }],
      draft: "Works for me.",
      goal: "confirm_meeting",
      expected: { preSendStatus: "READY", semanticPreservationRequired: true },
      tags: ["ready", "confirmation"]
    },
    {
      category: "pre_send", difficulty: "medium", context: "conflict", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Your work is always late." }],
      draft: "I understand your frustration. I'm working on improving my timelines.",
      goal: "respond_to_criticism",
      expected: { preSendStatus: "REVIEW", semanticPreservationRequired: true },
      tags: ["review", "criticism"]
    },
    {
      category: "pre_send", difficulty: "hard", context: "conflict", relationship: "partner",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "I don't love you anymore." }],
      draft: "That hurts to hear. I need time to process this.",
      goal: "respond_to_rejection",
      expected: { preSendStatus: "REVIEW", semanticPreservationRequired: true },
      tags: ["review", "emotional"]
    },
    {
      category: "pre_send", difficulty: "easy", context: "professional", relationship: "client",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "When will the deliverable be ready?" }],
      draft: "By end of day Thursday.",
      goal: "provide_timeline",
      expected: { preSendStatus: "READY", semanticPreservationRequired: true },
      tags: ["ready", "timeline"]
    },
    {
      category: "pre_send", difficulty: "medium", context: "professional", relationship: "manager",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Why did you go over budget?" }],
      draft: "I take responsibility. The cost overrun was due to unplanned vendor changes.",
      goal: "explain_budget",
      expected: { preSendStatus: "REVIEW", semanticPreservationRequired: true },
      tags: ["review", "budget"]
    },
    {
      category: "pre_send", difficulty: "hard", context: "conflict", relationship: "family",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "You're a disappointment." }],
      draft: "I'm sorry you feel that way. I'm doing my best.",
      goal: "respond_to_hurt",
      expected: { preSendStatus: "REVIEW", semanticPreservationRequired: true },
      tags: ["review", "emotional"]
    },
    {
      category: "pre_send", difficulty: "easy", context: "professional", relationship: "colleague",
      language: "english", script: "latin",
      conversation: [{ role: "other", content: "Thanks for your help!" }],
      draft: "Anytime!",
      goal: "acknowledge_thanks",
      expected: { preSendStatus: "READY", semanticPreservationRequired: true },
      tags: ["ready", "thanks"]
    },
  ];

  // Generate cases from templates
  let counter = 1;
  
  for (const template of professionalTemplates) {
    cases.push({ ...template, id: `PROF-EXP-${String(counter++).padStart(3, "0")}` } as BenchmarkCase);
  }
  
  for (const template of academicTemplates) {
    cases.push({ ...template, id: `ACAD-EXP-${String(counter++).padStart(3, "0")}` } as BenchmarkCase);
  }
  
  for (const template of conflictTemplates) {
    cases.push({ ...template, id: `CONF-EXP-${String(counter++).padStart(3, "0")}` } as BenchmarkCase);
  }
  
  for (const template of datingTemplates) {
    cases.push({ ...template, id: `DATE-EXP-${String(counter++).padStart(3, "0")}` } as BenchmarkCase);
  }
  
  for (const template of friendshipTemplates) {
    cases.push({ ...template, id: `FRI-EXP-${String(counter++).padStart(3, "0")}` } as BenchmarkCase);
  }
  
  for (const template of familyTemplates) {
    cases.push({ ...template, id: `FAM-EXP-${String(counter++).padStart(3, "0")}` } as BenchmarkCase);
  }
  
  for (const template of negotiationTemplates) {
    cases.push({ ...template, id: `NEG-EXP-${String(counter++).padStart(3, "0")}` } as BenchmarkCase);
  }
  
  for (const template of customerTemplates) {
    cases.push({ ...template, id: `CUST-EXP-${String(counter++).padStart(3, "0")}` } as BenchmarkCase);
  }
  
  for (const template of recoveryTemplates) {
    cases.push({ ...template, id: `REC-EXP-${String(counter++).padStart(3, "0")}` } as BenchmarkCase);
  }
  
  for (const template of groupTemplates) {
    cases.push({ ...template, id: `GRP-EXP-${String(counter++).padStart(3, "0")}` } as BenchmarkCase);
  }
  
  for (const template of personalizationTemplates) {
    cases.push({ ...template, id: `PERS-EXP-${String(counter++).padStart(3, "0")}` } as BenchmarkCase);
  }
  
  for (const template of preSendTemplates) {
    cases.push({ ...template, id: `PRE-EXP-${String(counter++).padStart(3, "0")}` } as BenchmarkCase);
  }
  
  return cases;
}

function expandDataset(): void {
  const dataset = loadBaseDataset();
  const additionalCases = generateAdditionalCases();
  
  dataset.cases = [...dataset.cases, ...additionalCases];
  dataset.totalCases = dataset.cases.length;
  
  // Recount categories
  const categoryCounts: Record<string, number> = {};
  const difficultyCounts: Record<string, number> = {};
  
  for (const c of dataset.cases) {
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    difficultyCounts[c.difficulty] = (difficultyCounts[c.difficulty] || 0) + 1;
  }
  
  dataset.categories = categoryCounts as typeof dataset.categories;
  dataset.difficulties = difficultyCounts as typeof dataset.difficulties;
  
  const outputPath = path.join(__dirname, "data", "dataset-v1.0.json");
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2));
  
  console.log(`Expanded dataset to ${dataset.totalCases} cases`);
  console.log(`Categories: ${JSON.stringify(dataset.categories, null, 2)}`);
  console.log(`Difficulties: ${JSON.stringify(dataset.difficulties, null, 2)}`);
}

expandDataset();
