// ============================================================
// GROQ AGENTIC AI ENGINE - Medical AI Assistant
// Now with multi-key rotation for maximum reliability
// ============================================================

import Groq from "groq-sdk";
import { getGroqKeyManager } from "./groqKeyManager";

// Create a Groq client for a specific key
function createGroqClient(apiKey) {
  return new Groq({
    apiKey,
    dangerouslyAllowBrowser: false,
  });
}

// Get a working Groq client with key rotation
function getGroqClient() {
  const manager = getGroqKeyManager();
  const key = manager.getNextKey();
  return { client: createGroqClient(key), key, manager };
}

// ─── LANGUAGE CONFIG ────────────────────────────────────────
export const SUPPORTED_LANGUAGES = {
  en: { name: "English", code: "en", groqCode: "en" },
  te: { name: "తెలుగు", code: "te", groqCode: "te" },
  hi: { name: "हिंदी", code: "hi", groqCode: "hi" },
  ta: { name: "தமிழ்", code: "ta", groqCode: "ta" },
  kn: { name: "ಕನ್ನಡ", code: "kn", groqCode: "kn" },
  ml: { name: "മലയാളം", code: "ml", groqCode: "ml" },
  mr: { name: "मराठी", code: "mr", groqCode: "mr" },
  bn: { name: "বাংলা", code: "bn", groqCode: "bn" },
  bho: { name: "भोजपुरी", code: "bho", groqCode: "hi" },
};

// ─── ROUTE MAP (matches existing Arogya Raksha app) ─────────
const ROUTE_MAP = {
  "dashboard": "/dashboard",
  "ai": "/dashboard/ai",
  "symptoms": "/dashboard/symptoms",
  "medicines": "/dashboard/medicines",
  "scanner": "/dashboard/scanner",
  "hospitals": "/dashboard/hospitals",
  "healthcare_navigator": "/dashboard/healthcare-navigator",
  "reports": "/dashboard/reports",
  "quiz": "/dashboard/quiz",
  "appointments": "/dashboard/appointments",
  "emergency": "/dashboard/emergency",
  "settings": "/dashboard/settings",
  "profile": "/dashboard/profile",
  "predictors": "/dashboard/predictors",
  "doctors": "/dashboard/doctors",
  "doctor_dashboard": "/dashboard/doctor-dashboard",
  "analytics": "/dashboard/analytics",
  "crisis": "/dashboard/crisis",
  "video_call": "/dashboard/video-call",
};

// ─── AGENT TOOLS DEFINITION ─────────────────────────────────
export const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "book_appointment",
      description:
        "Book a doctor appointment for the user. Extract doctor name, date, time, and specialty from conversation.",
      parameters: {
        type: "object",
        properties: {
          doctor_name: { type: "string", description: "Name of the doctor" },
          specialty: {
            type: "string",
            description: "Medical specialty (Cardiologist, General Physician, etc.)",
          },
          date: { type: "string", description: "Appointment date in YYYY-MM-DD format" },
          time: { type: "string", description: "Appointment time in HH:MM format" },
          patient_name: { type: "string", description: "Patient full name" },
          reason: { type: "string", description: "Reason for appointment" },
        },
        required: ["specialty", "date", "time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "suggest_medicines",
      description:
        "Suggest medicines and remedies based on symptoms. Always recommend consulting a doctor.",
      parameters: {
        type: "object",
        properties: {
          symptoms: {
            type: "array",
            items: { type: "string" },
            description: "List of symptoms reported by user",
          },
          severity: {
            type: "string",
            enum: ["mild", "moderate", "severe"],
            description: "Severity of symptoms",
          },
          age_group: {
            type: "string",
            enum: ["child", "adult", "elderly"],
            description: "Age group of the patient",
          },
        },
        required: ["symptoms", "severity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scan_medicine",
      description:
        "Analyze a medicine image or name to provide usage, dosage, side effects, and warnings.",
      parameters: {
        type: "object",
        properties: {
          medicine_name: {
            type: "string",
            description: "Name of the medicine from scan or text",
          },
          query_type: {
            type: "string",
            enum: ["usage", "dosage", "side_effects", "interactions", "full_info"],
            description: "What information is needed",
          },
        },
        required: ["medicine_name", "query_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate_to_page",
      description: "Navigate the user to a specific page in the Medical AI app.",
      parameters: {
        type: "object",
        properties: {
          page: {
            type: "string",
            enum: [
              "dashboard",
              "ai",
              "symptoms",
              "medicines",
              "scanner",
              "hospitals",
              "healthcare_navigator",
              "reports",
              "quiz",
              "appointments",
              "emergency",
              "settings",
              "profile",
              "predictors",
              "doctors",
              "doctor_dashboard",
              "analytics",
              "crisis",
              "video_call",
            ],
            description: "Target page to navigate to",
          },
          reason: { type: "string", description: "Why navigating there" },
        },
        required: ["page"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "play_health_quiz",
      description: "Start an interactive health knowledge quiz with multiple choice questions.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            enum: [
              "general_health",
              "nutrition",
              "first_aid",
              "diabetes",
              "heart_health",
              "mental_health",
            ],
            description: "Quiz topic",
          },
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard"],
            description: "Difficulty level",
          },
          num_questions: {
            type: "number",
            description: "Number of questions (5-15)",
          },
        },
        required: ["topic", "difficulty", "num_questions"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_medical_image",
      description:
        "Analyze an uploaded medical image (prescription, report, skin condition photo).",
      parameters: {
        type: "object",
        properties: {
          image_type: {
            type: "string",
            enum: ["prescription", "lab_report", "xray", "skin_condition", "medicine_package"],
            description: "Type of medical image",
          },
          analysis_focus: {
            type: "string",
            description: "What to focus on in the analysis",
          },
        },
        required: ["image_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_nearby_hospitals",
      description: "Find nearby hospitals, clinics, or pharmacies based on location and specialty.",
      parameters: {
        type: "object",
        properties: {
          facility_type: {
            type: "string",
            enum: ["hospital", "clinic", "pharmacy", "all"],
          },
          specialty: { type: "string", description: "Medical specialty needed" },
          radius_km: { type: "number", description: "Search radius in kilometers" },
        },
        required: ["facility_type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_health_tips",
      description: "Provide personalized health tips, diet plans, or wellness advice.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["diet", "exercise", "sleep", "mental_health", "hydration", "general"],
          },
          condition: {
            type: "string",
            description: "Specific health condition if any",
          },
        },
        required: ["category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_health_predictor",
      description: "Run a health risk prediction/assessment for the user. Available predictors: diabetes-heart, dengue, kidney, liver, lung, cancer, thyroid, asthma, mental-health. Collect the user's health inputs (age, gender, BMI, blood pressure, glucose, smoking, etc.) and run the predictor to get a risk score.",
      parameters: {
        type: "object",
        properties: {
          predictor: {
            type: "string",
            enum: ["diabetes-heart", "dengue", "kidney", "liver", "lung", "cancer", "thyroid", "asthma", "mental-health"],
            description: "Which health risk predictor to run",
          },
          age: { type: "string", description: "Patient age" },
          gender: { type: "string", enum: ["Male", "Female"], description: "Patient gender" },
          bmi: { type: "string", description: "BMI value (weight/height²)" },
          sysBP: { type: "string", description: "Systolic blood pressure" },
          totChol: { type: "string", description: "Total cholesterol" },
          glucose: { type: "string", description: "Blood glucose level" },
          smoking: { type: "string", enum: ["Yes", "No", "Former"], description: "Smoking status" },
          diabetes: { type: "string", enum: ["Yes", "No"], description: "Has diabetes?" },
          hypertension: { type: "string", enum: ["Yes", "No"], description: "Has hypertension?" },
        },
        required: ["predictor"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "manage_medical_profile",
      description: "Help the user manage their medical profile — view, update personal info, vitals, medical conditions, or emergency contacts. Use this when the user wants to check their profile, update vitals (BP, sugar, pulse), or manage their medical information.",
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["view_profile", "update_vitals", "update_personal", "update_medical", "view_emergency_card"],
            description: "What profile action to perform",
          },
          section: {
            type: "string",
            enum: ["personal", "medical", "vitals", "contacts", "hospitals"],
            description: "Which section of the profile to navigate to",
          },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_doctors",
      description: "Browse the doctor directory to find doctors by specialization, or help users book appointments with specific doctors.",
      parameters: {
        type: "object",
        properties: {
          specialty: { type: "string", description: "Doctor specialization to filter by (e.g. Cardiologist, Dermatologist)" },
          action: {
            type: "string",
            enum: ["browse", "book_appointment"],
            description: "Whether to browse doctors or book an appointment",
          },
        },
        required: ["action"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "health_analytics",
      description: "Show the user their health analytics, trends, and insights dashboard. Use when the user asks about their health trends, statistics, or wants to see analytics.",
      parameters: {
        type: "object",
        properties: {
          view: {
            type: "string",
            enum: ["overview", "vitals_trend", "risk_summary"],
            description: "Which analytics view to show",
          },
        },
        required: ["view"],
      },
    },
  },
];

// ─── TOOL HANDLERS ──────────────────────────────────────────
export async function executeToolCall(toolName, toolArgs, language = "en") {
  switch (toolName) {
    case "book_appointment":
      return {
        success: true,
        action: "BOOK_APPOINTMENT",
        data: toolArgs,
        message: `Appointment booking initiated for ${toolArgs.specialty} on ${toolArgs.date} at ${toolArgs.time}`,
        ui_action: "open_booking_form",
      };

    case "suggest_medicines":
      return {
        success: true,
        action: "SHOW_MEDICINES",
        data: toolArgs,
        message: `Analyzing symptoms: ${toolArgs.symptoms.join(", ")}`,
        ui_action: "show_medicine_suggestions",
        disclaimer: "⚠️ Always consult a licensed doctor before taking any medication.",
      };

    case "scan_medicine":
      return {
        success: true,
        action: "MEDICINE_INFO",
        data: toolArgs,
        ui_action: "show_medicine_details",
      };

    case "navigate_to_page":
      return {
        success: true,
        action: "NAVIGATE",
        page: toolArgs.page,
        url: ROUTE_MAP[toolArgs.page] || `/dashboard/${toolArgs.page}`,
        ui_action: "navigate",
      };

    case "play_health_quiz":
      return {
        success: true,
        action: "START_QUIZ",
        data: toolArgs,
        ui_action: "open_quiz",
      };

    case "analyze_medical_image":
      return {
        success: true,
        action: "ANALYZE_IMAGE",
        data: toolArgs,
        ui_action: "show_image_analysis",
      };

    case "find_nearby_hospitals":
      return {
        success: true,
        action: "SHOW_HOSPITALS",
        data: toolArgs,
        url: "/dashboard/hospitals",
        ui_action: "navigate_with_filter",
      };

    case "get_health_tips":
      return {
        success: true,
        action: "HEALTH_TIPS",
        data: toolArgs,
        ui_action: "show_tips",
      };

    case "run_health_predictor": {
      // Execute the predictor server-side
      try {
        const predictorInputs = { ...toolArgs };
        delete predictorInputs.predictor;
        const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ predictor: toolArgs.predictor, inputs: predictorInputs, language }),
        });
        const data = await res.json();
        return {
          success: true,
          action: "SHOW_PREDICTION",
          data: { ...data, predictorType: toolArgs.predictor },
          ui_action: "show_prediction",
          url: `/dashboard/predictors`,
        };
      } catch (err) {
        return {
          success: true,
          action: "NAVIGATE_PREDICTORS",
          data: toolArgs,
          url: `/dashboard/predictors`,
          ui_action: "navigate",
          message: `Navigate to predictors page for ${toolArgs.predictor} risk assessment`,
        };
      }
    }

    case "manage_medical_profile":
      return {
        success: true,
        action: "MANAGE_PROFILE",
        data: toolArgs,
        url: `/dashboard/profile`,
        ui_action: "navigate_with_filter",
        message: `Opening your medical profile — ${toolArgs.action} section`,
      };

    case "find_doctors":
      return {
        success: true,
        action: "FIND_DOCTORS",
        data: toolArgs,
        url: `/dashboard/doctors`,
        ui_action: toolArgs.action === 'book_appointment' ? 'navigate_with_filter' : 'navigate',
        message: toolArgs.specialty
          ? `Browsing ${toolArgs.specialty} doctors`
          : 'Opening the doctor directory',
      };

    case "health_analytics":
      return {
        success: true,
        action: "SHOW_ANALYTICS",
        data: toolArgs,
        url: `/dashboard/analytics`,
        ui_action: "navigate",
        message: `Opening your health analytics — ${toolArgs.view}`,
      };

    default:
      return { success: false, error: "Unknown tool" };
  }
}

// ─── SYSTEM PROMPT BUILDER ──────────────────────────────────
function buildSystemPrompt(language, userName) {
  const langInstructions = {
    te: "ALWAYS respond in Telugu (తెలుగు) script. Use natural conversational Telugu.",
    hi: "ALWAYS respond in Hindi (हिंदी). Use natural conversational Hindi.",
    ta: "ALWAYS respond in Tamil (தமிழ்). Use natural conversational Tamil.",
    kn: "ALWAYS respond in Kannada (ಕನ್ನಡ). Use natural conversational Kannada.",
    ml: "ALWAYS respond in Malayalam (മലയാളം).",
    mr: "ALWAYS respond in Marathi (मराठी).",
    bn: "ALWAYS respond in Bengali (বাংলা).",
    bho: "ALWAYS respond in Bhojpuri (भोजपुरी). Use Bhojpuri script and vocabulary.",
    en: "Respond in clear, friendly English.",
  };

  return `You are MediBot, an advanced AI medical assistant for the Medical AI (Arogya Raksha) platform. You are helping ${userName || "a patient"}.

LANGUAGE INSTRUCTION: ${langInstructions[language] || langInstructions.en}
CRITICAL: You MUST respond ENTIRELY in the language specified above. Every single word of your response — greetings, explanations, tool result summaries, medical advice, disclaimers, follow-up questions — MUST be in that language. Do NOT mix English words unless they are proper nouns (medicine names, disease names). Even emojis labels and action descriptions must be in the specified language.

YOUR CAPABILITIES:
1. 📅 Book doctor appointments - collect details naturally through conversation
2. 💊 Suggest medicines & remedies for symptoms (always add disclaimer)
3. 🔍 Scan & explain medicines from images or names
4. 🗺️ Navigate the user to any page in the app
5. 🧠 Play health knowledge quizzes
6. 📸 Analyze medical images (prescriptions, lab reports, skin conditions)
7. 🏥 Find nearby hospitals and clinics
8. 💡 Provide personalized health tips

APP PAGES YOU CAN NAVIGATE TO:
- dashboard → Main Dashboard
- ai → Ask AI Doctor
- symptoms → Symptom Checker
- medicines → Medicine Finder
- scanner → Medicine Scanner
- hospitals → Nearby Hospitals
- healthcare_navigator → Healthcare Navigator (AI-powered hospital discovery & cost estimation)
- reports → Medical Reports
- quiz → Health Quiz / Tracker
- appointments → Appointments
- emergency → Emergency Services
- settings → Settings
- profile → Medical Profile (personal info, vitals, medical history, emergency contacts)
- predictors → Health Risk Predictors (diabetes, heart, kidney, liver, lung, cancer, thyroid, asthma, mental health)
- doctors → Doctor Directory (browse and book doctors)
- doctor_dashboard → Doctor Dashboard (for doctors to manage their practice)
- analytics → Health Analytics & Trends
- crisis → Crisis Response Center
- video_call → Video Call with Doctor

HEALTH RISK PREDICTORS (use run_health_predictor tool):
- diabetes-heart: Diabetes & Heart Disease Risk
- dengue: Dengue Fever Risk Assessment
- kidney: Kidney Disease Risk
- liver: Liver Disease Risk
- lung: Lung Disease Risk
- cancer: Cancer Risk Assessment
- thyroid: Thyroid Disorder Risk
- asthma: Asthma Risk Assessment
- mental-health: Mental Health Risk Score

MEDICAL PROFILE MANAGEMENT (use manage_medical_profile tool):
- You can help users update their personal info, vitals, medical conditions, emergency contacts
- You can help users view their emergency ID card
- You can help users update BP, blood sugar, pulse rate, BMI etc.

DOCTOR DIRECTORY (use find_doctors tool):
- Help users find doctors by specialty
- Help users book appointments
- Browse doctor profiles

PERSONALITY:
- Warm, empathetic, and professional
- Proactive - ask follow-up questions to help better
- Always recommend consulting a real doctor for serious issues
- Keep responses concise but helpful
- Use relevant emojis to make responses friendly
- For emergencies, immediately suggest calling emergency services
- ALWAYS use tools proactively when the user mentions anything related to their health data, risk scoring, profiles, or predictors

AGENTIC BEHAVIOR:
- When user mentions symptoms, PROACTIVELY suggest running a risk predictor
- When user mentions updating health info, use the manage_medical_profile tool
- When user wants to check their risk for any disease, use run_health_predictor
- When user asks about doctors, use find_doctors tool
- You are an AGENTIC AI — you take action autonomously, not just answer questions

IMPORTANT RULES:
- Never diagnose diseases definitively
- Always add medical disclaimer for medicine suggestions
- If unsure, ask clarifying questions
- Be sensitive to cultural context of Indian patients
- Emergency cases: always say call 108 (India ambulance)

You have access to 12 tools — use them proactively when the user's intent is clear. You are an AGENTIC AI assistant that takes autonomous actions.`;
}

// ─── RETRY HELPER ────────────────────────────────────────────
async function groqChatWithRetry(params, maxRetries = 4) {
  const manager = getGroqKeyManager();
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const key = manager.getNextKey();
    const client = createGroqClient(key);

    try {
      const response = await client.chat.completions.create(params);
      manager.reportSuccess(key);
      return response;
    } catch (err) {
      lastError = err;

      if (err.status === 429 || err.message?.includes('rate_limit') || err.message?.includes('429')) {
        manager.reportRateLimit(key, 60000);
        console.warn(`🔄 Agent: Key ${key.slice(0, 12)}... rate-limited (attempt ${attempt + 1}/${maxRetries}). Trying next...`);
        continue;
      }

      if (err.status === 401 || err.status === 403) {
        manager.reportRateLimit(key, 300000);
        console.error(`❌ Agent: Key ${key.slice(0, 12)}... is invalid. Trying next...`);
        continue;
      }

      manager.reportFailure(key);
      console.error(`❌ Agent: Error with key ${key.slice(0, 12)}...:`, err.message);

      // For non-rate-limit errors, still try next key
      if (attempt < maxRetries - 1) continue;
    }
  }

  throw lastError || new Error('All Groq API keys exhausted. Please try again later.');
}

// ─── MAIN AGENT FUNCTION ─────────────────────────────────────
export async function runMedicalAgent({
  messages,
  language = "en",
  userName = "Patient",
  imageBase64 = null,
  imageType = null,
}) {
  const systemPrompt = buildSystemPrompt(language, userName);

  const formattedMessages = messages.map((msg, idx) => {
    if (idx === messages.length - 1 && imageBase64 && msg.role === "user") {
      return {
        role: "user",
        content: [
          { type: "text", text: msg.content },
          {
            type: "image_url",
            image_url: {
              url: `data:image/${imageType || "jpeg"};base64,${imageBase64}`,
            },
          },
        ],
      };
    }
    return msg;
  });

  const response = await groqChatWithRetry({
    model: imageBase64 ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile",
    messages: [{ role: "system", content: systemPrompt }, ...formattedMessages],
    tools: AGENT_TOOLS,
    tool_choice: "auto",
    temperature: 0.7,
    max_tokens: 1500,
  });

  const assistantMessage = response.choices[0].message;
  const toolCalls = assistantMessage.tool_calls;

  if (!toolCalls || toolCalls.length === 0) {
    return {
      type: "text",
      content: assistantMessage.content,
      toolResults: [],
    };
  }

  const toolResults = [];
  const toolMessages = [];

  for (const toolCall of toolCalls) {
    const toolArgs = JSON.parse(toolCall.function.arguments);
    const result = await executeToolCall(toolCall.function.name, toolArgs, language);
    toolResults.push({ tool: toolCall.function.name, args: toolArgs, result });
    toolMessages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify(result),
    });
  }

  const finalResponse = await groqChatWithRetry({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...formattedMessages,
      assistantMessage,
      ...toolMessages,
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return {
    type: "tool_response",
    content: finalResponse.choices[0].message.content,
    toolResults,
  };
}

// ─── STREAMING AGENT ─────────────────────────────────────────
export async function* streamMedicalAgent({
  messages,
  language = "en",
  userName = "Patient",
}) {
  const systemPrompt = buildSystemPrompt(language, userName);

  const stream = await groqChatWithRetry({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    stream: true,
    temperature: 0.7,
    max_tokens: 1000,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

// ─── QUIZ GENERATOR ──────────────────────────────────────────
export async function generateHealthQuiz({ topic, difficulty, numQuestions, language = "en" }) {
  const langName = SUPPORTED_LANGUAGES[language]?.name || "English";

  const prompt = `Generate ${numQuestions} multiple-choice health quiz questions about "${topic}" at "${difficulty}" difficulty level.
Respond in ${langName}.
Return ONLY a JSON array (no markdown, no explanation) like:
[
  {
    "question": "Question text here",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correct": "A",
    "explanation": "Brief explanation"
  }
]`;

  const response = await groqChatWithRetry({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
    max_tokens: 2000,
  });

  try {
    const text = response.choices[0].message.content;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    return [];
  }
}

// ─── IMAGE ANALYZER ──────────────────────────────────────────
export async function analyzeMedicalImage({ imageBase64, imageType, analysisType, language = "en" }) {
  const langName = SUPPORTED_LANGUAGES[language]?.name || "English";

  const prompts = {
    prescription: `Analyze this prescription image. List: 1) Medicines prescribed 2) Dosage instructions 3) Any warnings. Respond in ${langName}. Add disclaimer to consult doctor.`,
    lab_report: `Analyze this lab report. Explain: 1) What tests were done 2) Normal vs abnormal values 3) What it means in simple terms. Respond in ${langName}.`,
    skin_condition: `Describe what you see in this skin image. Mention possible conditions but DO NOT diagnose. Recommend seeing a dermatologist. Respond in ${langName}.`,
    medicine_package: `Read this medicine package/label. Extract: medicine name, active ingredients, dosage, uses, side effects. Respond in ${langName}.`,
    xray: `Describe what you observe in this medical image. Do NOT provide diagnosis. Recommend consulting a radiologist. Respond in ${langName}.`,
  };

  const visionModels = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "llama-3.2-11b-vision-preview",
    "llama-3.2-90b-vision-preview",
  ];

  const manager = getGroqKeyManager();

  // Try each key with each vision model
  for (let keyAttempt = 0; keyAttempt < manager.keyCount; keyAttempt++) {
    const key = manager.getNextKey();
    const client = createGroqClient(key);

    for (const model of visionModels) {
      try {
        const response = await client.chat.completions.create({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompts[analysisType] || prompts.prescription },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
                },
              ],
            },
          ],
          max_tokens: 1000,
        });
        manager.reportSuccess(key);
        return response.choices[0].message.content;
      } catch (err) {
        if (err.status === 429 || err.message?.includes('rate_limit')) {
          manager.reportRateLimit(key, 60000);
          console.warn(`Vision: Key ${key.slice(0, 12)}... rate-limited on ${model}. Rotating key...`);
          break; // Try next key
        }
        console.warn(`Vision model ${model} failed with key ${key.slice(0, 12)}...:`, err.message);
        continue; // Try next model
      }
    }
  }

  return "Unable to analyze image at this time. Please try again later or consult a healthcare professional.";
}
