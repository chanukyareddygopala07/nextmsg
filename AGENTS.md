# NEXTMSG — Project Specification

You are the lead product engineer, AI engineer, UX engineer, security engineer, and code reviewer for this project.

Build a production-quality application called **NEXTMSG**.

## PRODUCT

NEXTMSG is an AI conversation copilot that helps a user decide what to send next in conversations on Instagram, dating apps, WhatsApp, Discord, Telegram, Snapchat, LinkedIn, and other chat platforms.

The user can paste a conversation or upload a screenshot.

NEXTMSG analyzes the conversation, understands the current context, learns the user's personal texting style, and generates the best next reply.

### Core promise

> **"Know what to say next — and make it sound exactly like you."**

The most important requirement of the entire application is:

> **THE MESSAGE MUST NOT SOUND AI-GENERATED.**

Do NOT build a generic ChatGPT wrapper. Do NOT generate polished corporate-sounding responses. Build a **personalized human conversation engine**.

---

## TECH STACK

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js (GitHub + Google) |
| AI Provider | OpenRouter (`google/gemma-4-26b-a4b-it:free`) |
| Testing | Vitest |
| Linting | ESLint |

---

## DEVELOPMENT RULES

Before writing substantial code:

1. Inspect the entire existing repository.
2. Identify the current stack.
3. Identify existing components, utilities, environment configuration, scripts, tests, database setup.
4. Reuse existing architecture where reasonable.
5. Do not unnecessarily rewrite working code.
6. Create a clear implementation plan internally.
7. Then implement incrementally.
8. Run tests and type checks after meaningful changes.
9. Fix errors instead of working around them.
10. Never leave fake implementations, placeholder logic, TODO-only features, or mocked production behavior unless explicitly isolated as demo data.

---

## PRODUCT ARCHITECTURE

```text
                     NEXTMSG
                        |
                        v
              ┌─────────────────┐
              │ Conversation     │
              │ Input Layer      │
              └────────┬────────┘
                       |
              ┌────────▼────────┐
              │ Screenshot /    │
              │ Text Parser     │
              └────────┬────────┘
                       |
              ┌────────▼────────┐
              │ Conversation    │
              │ Understanding   │
              └────────┬────────┘
                       |
          ┌────────────▼────────────┐
          │ Personal Style Engine   │
          └────────────┬────────────┘
                       |
          ┌────────────▼────────────┐
          │ Response Generator      │
          └────────────┬────────────┘
                       |
          ┌────────────▼────────────┐
          │ Humanization Layer      │
          └────────────┬────────────┘
                       |
          ┌────────────▼────────────┐
          │ Reply Quality Ranker    │
          └────────────┬────────────┘
                       |
              ┌────────▼────────┐
              │ Best Replies    │
              └─────────────────┘
```

---

## HUMANIZATION ENGINE

Every generated candidate must pass through a dedicated humanization stage.

Avoid unless context specifically requires it:
- "That sounds amazing!"
- "That's really interesting!"
- "I'd love to hear more about that."
- "That sounds fascinating."
- "What inspired you to...?"
- generic compliments
- formal transitions
- excessive punctuation
- essay-like messages
- perfect grammar where it doesn't fit

Prefer:
- short messages
- natural contractions
- conversational fragments
- user-specific slang
- context-specific references
- natural imperfections
- realistic punctuation
- natural emoji placement

### Humanization Examples

Input: "I'm studying architecture."
Do NOT output: "That sounds fascinating! What inspired you to pursue architecture?"
Prefer: "architecture?? 😂 do you judge every building you walk past"

Input: "I love travelling."
Better: "okay important question 😂 best trip so far?"

---

## AI-LIKENESS PENALTY

Penalize:
- excessive formality
- generic compliments
- unnatural word choice
- overly complete sentence structures
- excessive verbosity
- cliché phrases
- repetitive templates
- unnecessary punctuation
- unnecessary emojis

---

## RESPONSE RANKING

Rank candidate responses with:
- Context relevance
- User style match
- Naturalness
- Conversation continuation potential
- Goal alignment
- Tone compatibility
- Length compatibility
- Originality
- AI-likeness penalty

---

## GOLDEN RULE

Whenever there is a tradeoff between Perfect English and Sounds like a real message from this user, choose: **Sounds like a real message from this user.**

Whenever there is a tradeoff between Clever response and Natural response, choose: **Natural response.**

Whenever there is a tradeoff between More features and Better quality of the core reply engine, choose: **Better quality of the core reply engine.**
