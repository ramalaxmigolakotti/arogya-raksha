# 🏥 Arogya Raksha — Complete Documentation

> **Part 2 of 5** | Feature #2: AI Doctor & Symptom Checker

---

## Feature 2: 🤖 AI Doctor (Arogya AI) + 🩺 Symptom Checker

### Overview

The AI Doctor and Symptom Checker are two tightly integrated features powered by **Groq Cloud's LLaMA 3 70B** model. The AI Doctor provides a real-time streaming chat for medical consultation, while the Symptom Checker delivers structured differential diagnosis with severity assessment.

---

### 2.1 AI Doctor — What It Does

| Capability | Description |
|---|---|
| **Real-time Streaming Chat** | Live token-by-token streaming via Groq SDK — responses appear word-by-word |
| **Context-Aware Conversations** | Maintains conversation history for follow-up questions |
| **Personalized Responses** | Uses patient name and health profile for tailored advice |
| **Markdown Rendering** | Rich text responses with headers, lists, and code blocks |
| **8-Language Support** | Responds in EN, HI, TE, TA, KN, MR, BN, BHO |

---

### 2.2 AI Architecture

```
┌──────────────────────────────────────────────────────────┐
│              GROQ CLOUD (LLaMA 3 by Meta)                │
│                                                          │
│  ┌──────────────────┐    ┌──────────────────┐           │
│  │  llama-3.3-70b   │    │  llama-3.1-8b    │           │
│  │  (versatile)     │    │  (instant)       │           │
│  │                  │    │                  │           │
│  │  Used for:       │    │  Used for:       │           │
│  │  • Medical chat  │    │  • Predictors    │           │
│  │  • Symptom check │    │  • Quiz gen      │           │
│  │  • Med scanning  │    │  • Quick tasks   │           │
│  │  • Navigator     │    │                  │           │
│  │  Avg: ~2-5s      │    │  Avg: ~1-2s      │           │
│  └──────────────────┘    └──────────────────┘           │
└──────────────────────────────────────────────────────────┘
```

---

### 2.3 AI Service — 6 Agent Prompt Types

**File:** `backend/services/aiService.js`

The backend defines **6 specialized AI agent personas**, each with a tailored system prompt:

| Agent Type | System Prompt Purpose | JSON Output Schema |
|---|---|---|
| `symptomChecker` | Analyze symptoms → differential diagnosis, medications, urgency | `{ conditions[], medicines[], urgency, homeRemedies, disclaimer }` |
| `diabetesPredictor` | Calculate diabetes risk from patient data | `{ riskLevel, riskPercentage, analysis, recommendations, dailyPlan }` |
| `reportAnalyzer` | Analyze uploaded medical reports (lab results) | `{ summary, parameters[], abnormalCount, recommendations }` |
| `medicineAdvisor` | Explain medicine usage, dosage, side effects | `{ name, purpose, dosage, sideEffects, alternatives, price }` |
| `generalHealth` | Friendly medical Q&A assistant for Indian patients | Free-form text response |
| `emergencyAgent` | Emergency assessment with first aid + hospital type | `{ emergencyLevel, firstAid[], hospitalType, instructions }` |

**All agents include fallback demo responses** — if Groq API fails, the system returns pre-built JSON so the UI never breaks:

```javascript
// Fallback system — always returns usable data
function getDemoResponse(agentType) {
  const demoResponses = {
    symptomChecker: JSON.stringify({
      conditions: [
        { name: 'Common Cold', probability: '70%', ... },
        { name: 'Seasonal Flu', probability: '20%', ... },
      ],
      medicines: [
        { name: 'Paracetamol 500mg', dosage: '1 tablet every 6 hours', ... },
      ],
      urgency: 'Low - Monitor at home',
      homeRemedies: ['Stay hydrated', 'Rest adequately', ...],
    }),
    // ... 5 more agent fallbacks
  };
}
```

---

### 2.4 Streaming Chat Architecture

**Flow:**
```
User types message
        │
        ▼
┌───────────────────────────┐
│  Frontend: AI Chat Page   │  /dashboard/ai/page.tsx
│  • Textarea input         │
│  • Message history list   │
│  • Streaming token render │
└──────────┬────────────────┘
           │ POST /api/chat
           ▼
┌───────────────────────────┐
│  Next.js API Route        │  src/app/api/chat/route.ts
│  Calls Groq with stream   │
│  mode enabled             │
└──────────┬────────────────┘
           │ Server-Sent Events (SSE)
           ▼
┌───────────────────────────┐
│  Groq SDK streaming       │
│  model: llama-3.3-70b     │
│  temperature: 0.7         │
│  max_tokens: 2000         │
└───────────────────────────┘
           │
           ▼ Tokens arrive one-by-one
┌───────────────────────────┐
│  Frontend renders each    │
│  token in real-time       │
│  with markdown parsing    │
└───────────────────────────┘
```

---

### 2.5 Multi-Key Rotation System

**File:** `frontend/src/lib/groqKeyManager.ts`

To handle Groq API rate limits (especially on free tier), the platform implements automatic key rotation:

```
┌─────────────────────────────┐
│    Groq Key Manager         │
│                             │
│  Key 1: gsk_xxxxx1          │ ← Active
│  Key 2: gsk_xxxxx2          │ ← Cooldown (30s)
│  Key 3: gsk_xxxxx3          │ ← Available
│  Key 4: gsk_xxxxx4          │ ← Available
│  ...up to 10 keys           │
│                             │
│  On rate limit (429):       │
│  1. Mark current key used   │
│  2. Switch to next key      │
│  3. Start cooldown timer    │
│  4. Retry with new key      │
└─────────────────────────────┘
```

- Supports **up to 10 concurrent API keys**
- Tracks per-key usage with cooldown periods
- Automatic cycling on `429 Too Many Requests` errors
- Transparent to the UI — user never sees rate limit errors

---

### 2.6 Symptom Checker — Detailed Flow

```
User enters symptoms (text-based + selection UI)
        │
        ▼
┌───────────────────────────┐
│  Symptom Input Form       │
│  • Free text description  │
│  • Body part selector     │
│  • Duration picker        │
│  • Severity self-rating   │
└──────────┬────────────────┘
           │ POST /api/symptoms
           ▼
┌───────────────────────────┐
│  Next.js API Route        │  src/app/api/symptoms/route.ts
│  System prompt:           │
│  "You are Arogya Raksha   │
│   Symptom Checker..."     │
│  Model: llama-3.3-70b     │
└──────────┬────────────────┘
           │
           ▼
┌───────────────────────────┐
│  AI Returns JSON:         │
│  {                        │
│    conditions: [          │
│      { name, probability, │
│        description }      │
│    ],                     │
│    medicines: [           │
│      { name, dosage,      │
│        purpose }          │
│    ],                     │
│    urgency: "Moderate",   │
│    homeRemedies: [...],   │
│    disclaimer: "..."      │
│  }                        │
└──────────┬────────────────┘
           │
           ▼
┌───────────────────────────┐
│  Results Page Shows:      │
│  • Conditions ranked      │
│  • Severity badge (color) │
│  • Recommended medicines  │
│  • Home remedies          │
│  • HealthcareCTA (loan +  │
│    hospital finder)       │
└───────────────────────────┘
```

**Severity Levels & UI Colors:**

| Severity | Color | Action |
|---|---|---|
| Mild | 🟢 Green | Monitor at home |
| Moderate | 🟡 Yellow | See doctor within 48 hours |
| Severe | 🟠 Orange | Visit hospital today |
| Critical | 🔴 Red | Emergency — call 108 immediately |

---

### 2.7 Key Files

| File | Role |
|---|---|
| `frontend/src/app/dashboard/ai/page.tsx` | AI Doctor streaming chat UI |
| `frontend/src/app/dashboard/symptoms/page.tsx` | Symptom Checker form + results |
| `frontend/src/app/api/chat/route.ts` | Next.js API proxy for chat streaming |
| `frontend/src/app/api/symptoms/route.ts` | Next.js API proxy for symptom analysis |
| `backend/services/aiService.js` | 6 AI agent prompts + fallback demo responses |
| `backend/routes/ai.js` | Backend AI analysis endpoints |
| `backend/routes/chat.js` | Chat persistence (Supabase `chats` table) |
| `frontend/src/lib/groqKeyManager.ts` | Multi-key rotation for rate limits |
| `frontend/src/lib/groqAgent.js` | AI agent with tool-calling capabilities |
| `frontend/src/components/MediBotAgent.jsx` | Floating AI assistant (33KB — the largest component!) |

---

### 2.8 MediBotAgent — Persistent Floating Assistant

**File:** `frontend/src/components/MediBotAgent.jsx` (33,946 bytes — largest single component)

This is a **floating AI chatbot** that persists across ALL dashboard pages:

- 💬 Appears as a chat bubble in the bottom-right corner
- 🧠 Powered by Groq LLaMA 3 via the `/api/agent` route
- 🔧 Has **tool-calling capabilities** (can search hospitals, medicines, etc.)
- 📌 State persists as user navigates between pages
- 🎨 Animated open/close transitions with Framer Motion

```
┌──────────────────────────────────┐
│          Any Dashboard Page      │
│                                  │
│  ┌─────────────────────────┐     │
│  │     Main Content        │     │
│  │                         │     │
│  │                         │     │
│  │                         │     │
│  └─────────────────────────┘     │
│                                  │
│                         ┌──────┐ │
│                         │ 🤖💬 │ │  ← MediBotAgent (floating)
│                         └──────┘ │
└──────────────────────────────────┘
```

---

> **Next:** Part 3 — Medicine Intelligence & Scanner
