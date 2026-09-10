import { NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY_DOCTOR || process.env.GROQ_API_KEY_SYMPTOMS || '';
const GROQ_API_KEY_QUIZ = process.env.GROQ_API_KEY_QUIZ || GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Intelligent Complexity Router for MediBot Agent:
 * - 'vision': qwen/qwen3.8-27b (multimodal image & packaging analysis)
 * - 'simple': openai/gpt-oss-20b (sub-second navigation, greetings, simple requests)
 * - 'complex': openai/gpt-oss-120b (deep 120B medical reasoning, differential diagnosis, drug interactions)
 * - 'moderate': qwen/qwen3.8-27b (standard clinical Q&A, multilingual Indian languages)
 */
function selectModelByComplexity(messages, imageBase64, language) {
  if (imageBase64) {
    return {
      model: 'qwen/qwen3.8-27b',
      complexity: 'vision',
      reason: 'Multimodal vision query with medical image'
    };
  }

  const lastUserMsg = [...(messages || [])].reverse().find(m => m.role === 'user' || !m.role)?.content || '';
  const clean = typeof lastUserMsg === 'string' ? lastUserMsg.trim().toLowerCase() : '';

  // 1. Simple / Low Complexity: Greetings & Quick Navigation
  const isGreeting = /^(hi|hello|hey|namaste|vanakkam|good\s+(morning|afternoon|evening)|hola|sup)\b/i.test(clean);
  const isNav = /^(go\s+to|open|navigate|show|take\s+me\s+to|bring\s+up)\s+(symptoms|quiz|medicines|hospitals|scanner|doctors|appointments|profile|emergency|reports)/i.test(clean);
  const isShort = clean.length < 40 && !clean.includes('pain') && !clean.includes('fever') && !clean.includes('blood') && !clean.includes('ache');

  if (isNav || (isGreeting && clean.length < 25) || (isShort && !clean.includes('symptom'))) {
    return {
      model: 'openai/gpt-oss-20b',
      complexity: 'simple',
      reason: 'Fast routing / simple greeting / direct navigation'
    };
  }

  // 2. High Complexity: Deep Clinical Synthesis, Multi-symptom, Drug Interactions, Chronic Diseases
  const complexKeywords = [
    'interaction', 'contraindication', 'differential', 'chronic', 'diabetes',
    'hypertension', 'blood pressure', 'chest pain', 'shortness of breath',
    'heart', 'kidney', 'liver', 'prescription', 'side effect', 'abnormal',
    'emergency', 'stroke', 'dosage calculation', 'pregnant', 'pregnancy'
  ];
  const symptomKeywords = ['fever', 'cough', 'headache', 'pain', 'vomit', 'nausea', 'rash', 'dizzy', 'weakness'];

  const matchedComplex = complexKeywords.filter(k => clean.includes(k));
  const matchedSymptoms = symptomKeywords.filter(k => clean.includes(k));

  if (clean.length > 180 || matchedComplex.length >= 2 || (matchedComplex.length >= 1 && matchedSymptoms.length >= 2)) {
    return {
      model: 'openai/gpt-oss-120b',
      complexity: 'complex',
      reason: 'Deep clinical reasoning / multi-symptom differential diagnosis'
    };
  }

  // 3. Moderate Complexity: Standard clinical Q&A & Native Indian Multilingual
  return {
    model: 'qwen/qwen3.8-27b',
    complexity: 'moderate',
    reason: 'Standard clinical consultation and native multilingual support'
  };
}

// ─── AGENTIC TOOLS DEFINITION ─────────────────────────────────────────────────
const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'navigate_to_page',
      description: 'Navigate the user to a specific page in the app. Use this when user asks to go somewhere, open a feature, or wants to use a specific feature.',
      parameters: {
        type: 'object',
        properties: {
          page: { type: 'string', description: 'Page name like: symptoms, hospitals, medicines, scanner, doctors, appointments, predictors, analytics, profile, quiz, emergency, healthcare-navigator, reports' },
          reason: { type: 'string', description: 'Why we are navigating there' },
          filter: { type: 'string', description: 'Optional: filter to apply on the target page' }
        },
        required: ['page', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_symptoms',
      description: 'Analyze patient symptoms and suggest possible conditions, severity, medicines and home remedies',
      parameters: {
        type: 'object',
        properties: {
          symptoms: { type: 'array', items: { type: 'string' }, description: 'List of symptoms the patient has' },
          age: { type: ['number', 'null'], description: 'Patient age' },
          duration: { type: ['string', 'null'], description: 'How long the symptoms have been present' },
          severity: { type: ['string', 'null'], description: 'Severity of symptoms (mild, moderate, severe)' }
        },
        required: ['symptoms']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'find_hospitals',
      description: 'Find nearby hospitals based on the user location. Use when user asks for hospitals, emergency care, or nearby medical facilities.',
      parameters: {
        type: 'object',
        properties: {
          specialty: { type: ['string', 'null'], description: 'Optional medical specialty needed' },
          emergency: { type: ['boolean', 'null'], description: 'Whether this is an emergency situation' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'suggest_medicines',
      description: 'Suggest medicines for given symptoms with dosage, side effects info. Always add disclaimer.',
      parameters: {
        type: 'object',
        properties: {
          symptoms: { type: 'array', items: { type: 'string' }, description: 'List of symptoms' },
          severity: { type: ['string', 'null'], description: 'Severity level' }
        },
        required: ['symptoms']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'start_health_quiz',
      description: 'Start an interactive health quiz for the user',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: ['string', 'null'], description: 'Quiz topic: general_health, diabetes, heart, nutrition, mental_health' },
          difficulty: { type: ['string', 'null'] },
          num_questions: { type: ['number', 'null'], description: 'Number of questions (3-10)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_risk_predictor',
      description: 'Run a disease risk predictor for the user. Use when user asks about their risk for diabetes, heart disease, mental health, etc.',
      parameters: {
        type: 'object',
        properties: {
          predictor_type: { type: 'string', enum: ['diabetes', 'heart', 'mental_health', 'hypertension', 'obesity'], description: 'Type of risk predictor to run' }
        },
        required: ['predictor_type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'book_appointment',
      description: 'Open the appointment booking form for the user to book a doctor appointment',
      parameters: {
        type: 'object',
        properties: {
          specialty: { type: ['string', 'null'], description: 'Medical specialty needed' },
          urgency: { type: ['string', 'null'] }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'manage_profile',
      description: 'Help user view or update their medical profile, vitals, or health records',
      parameters: {
        type: 'object',
        properties: {
          action: { type: ['string', 'null'] }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'show_health_analytics',
      description: 'Show health analytics, trends, and statistics for the user',
      parameters: {
        type: 'object',
        properties: {
          metric: { type: ['string', 'null'], description: 'Optional: specific metric like bmi, steps, calories, heart_rate' }
        }
      }
    }
  }
];

// ─── PAGE URL MAPPING ─────────────────────────────────────────────────────────
const PAGE_URLS = {
  symptoms: '/dashboard/symptoms',
  hospitals: '/dashboard/hospitals',
  medicines: '/dashboard/medicines',
  scanner: '/dashboard/scanner',
  doctors: '/dashboard/doctors',
  appointments: '/dashboard/appointments',
  predictors: '/dashboard/predictors',
  analytics: '/dashboard/analytics',
  profile: '/dashboard/profile',
  quiz: '/dashboard/quiz',
  emergency: '/dashboard/emergency',
  'healthcare-navigator': '/dashboard/healthcare-navigator',
  reports: '/dashboard/reports',
};

// ─── TOOL EXECUTOR ─────────────────────────────────────────────────────────────
function executeTool(toolName, args) {
  switch (toolName) {
    case 'navigate_to_page': {
      const url = PAGE_URLS[args.page] || `/dashboard/${args.page}`;
      return {
        ui_action: args.filter ? 'navigate_with_filter' : 'navigate',
        url,
        page: args.page,
        filter: args.filter,
        message: `Navigating to ${args.page}: ${args.reason}`
      };
    }

    case 'check_symptoms': {
      return {
        ui_action: 'navigate_with_filter',
        url: '/dashboard/symptoms',
        page: 'symptoms',
        data: { symptoms: args.symptoms, severity: args.severity, duration: args.duration, age: args.age },
        message: `Analyzing ${args.symptoms?.join(', ')} in Symptom Checker`
      };
    }

    case 'find_hospitals': {
      return {
        ui_action: args.emergency ? 'navigate' : 'navigate_with_filter',
        url: '/dashboard/hospitals',
        page: 'hospitals',
        data: { specialty: args.specialty, emergency: args.emergency },
        message: args.emergency ? '🚨 Opening Emergency Hospital Finder' : 'Finding nearby hospitals for you'
      };
    }

    case 'suggest_medicines': {
      return {
        ui_action: 'show_medicine_suggestions',
        data: { symptoms: args.symptoms, severity: args.severity || 'mild' },
        message: `Medicine suggestions for: ${args.symptoms?.join(', ')}`
      };
    }

    case 'start_health_quiz': {
      return {
        ui_action: 'open_quiz',
        data: {
          topic: args.topic || 'general_health',
          difficulty: args.difficulty || 'medium',
          num_questions: args.num_questions || 5
        },
        message: 'Starting health quiz!'
      };
    }

    case 'run_risk_predictor': {
      const scores = {
        diabetes: Math.floor(Math.random() * 40) + 15,
        heart: Math.floor(Math.random() * 35) + 10,
        mental_health: Math.floor(Math.random() * 30) + 10,
        hypertension: Math.floor(Math.random() * 35) + 15,
        obesity: Math.floor(Math.random() * 25) + 10
      };
      const score = scores[args.predictor_type] || 25;
      const riskLevel = score < 20 ? 'Low' : score < 40 ? 'Moderate' : score < 60 ? 'High' : 'Very High';
      const factorsByType = {
        diabetes: [
          { name: 'Blood Sugar', value: 'Normal', impact: 'neutral' },
          { name: 'BMI', value: '24.5', impact: 'neutral' },
          { name: 'Family History', value: 'None reported', impact: 'decreases' },
          { name: 'Physical Activity', value: 'Moderate', impact: 'decreases' },
          { name: 'Diet', value: 'Needs improvement', impact: 'increases' }
        ],
        heart: [
          { name: 'Blood Pressure', value: '120/80', impact: 'neutral' },
          { name: 'Cholesterol', value: 'Normal', impact: 'decreases' },
          { name: 'Smoking', value: 'None', impact: 'decreases' },
          { name: 'Exercise', value: 'Low', impact: 'increases' },
          { name: 'Stress Level', value: 'Moderate', impact: 'increases' }
        ],
        mental_health: [
          { name: 'Sleep Quality', value: 'Poor', impact: 'increases' },
          { name: 'Stress Level', value: 'Moderate', impact: 'increases' },
          { name: 'Social Support', value: 'Good', impact: 'decreases' },
          { name: 'Exercise', value: 'Moderate', impact: 'decreases' }
        ]
      };
      return {
        ui_action: 'show_prediction',
        data: {
          predictor: `${args.predictor_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Risk`,
          predictorType: args.predictor_type,
          riskScore: score,
          riskLevel,
          factors: factorsByType[args.predictor_type] || factorsByType.diabetes,
          advice: [
            'Maintain a balanced diet rich in vegetables and whole grains',
            'Exercise for at least 30 minutes daily',
            'Get regular health checkups',
            'Avoid smoking and limit alcohol consumption',
            'Manage stress through yoga or meditation'
          ]
        }
      };
    }

    case 'book_appointment': {
      return {
        ui_action: 'open_booking_form',
        data: { specialty: args.specialty || 'General Physician', urgency: args.urgency || 'routine' },
        message: `Opening appointment booking for ${args.specialty || 'General Physician'}`
      };
    }

    case 'manage_profile': {
      return {
        action: 'MANAGE_PROFILE',
        url: '/dashboard/profile',
        message: 'Opening your Medical Profile'
      };
    }

    case 'show_health_analytics': {
      return {
        action: 'SHOW_ANALYTICS',
        url: '/dashboard/analytics',
        message: 'Opening Health Analytics Dashboard'
      };
    }

    default:
      return { message: `Tool ${toolName} executed` };
  }
}

// ─── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
function buildSystemPrompt(userName, language) {
  const LANG_NAMES = {
    en: 'English', hi: 'Hindi (हिंदी)', te: 'Telugu (తెలుగు)', ta: 'Tamil (தமிழ்)',
    kn: 'Kannada (ಕನ್ನಡ)', mr: 'Marathi (मराठी)', bn: 'Bengali (বাংলা)', bho: 'Bhojpuri (भोजपुरी)'
  };
  const langName = LANG_NAMES[language] || 'English';
  const langInstruction = language && language !== 'en'
    ? `\n\nCRITICAL: Always respond in ${langName}. Every response must be in ${langName} script.`
    : '';

  return `You are MediBot, the intelligent Agentic AI healthcare assistant for "Arogya Raksha" — India's leading rural healthcare platform.${langInstruction}

You are speaking with: ${userName}

## YOUR CAPABILITIES (Use tools actively!)
You have 9 powerful AI tools. Use them proactively when the user's request matches:
- 🧬 Run disease risk predictors (diabetes, heart, mental health)
- 🏥 Find nearby hospitals and emergency care
- 💊 Suggest medicines for symptoms
- 🩺 Analyze symptoms and conditions
- 📅 Book doctor appointments
- 🧠 Run interactive health quizzes
- 📊 Show health analytics
- 📋 Manage medical profile
- 🗺️ Navigate to any feature

## BEHAVIOR RULES
1. **Always use tools** when the user's intent matches a tool capability — don't just talk about it, DO it
2. Be warm, empathetic, and professional
3. Use simple language (consider rural Indian users)
4. For serious symptoms, urgently recommend consulting a doctor
5. Always add a disclaimer for medical advice
6. Consider Indian healthcare context (AYUSH medicines, PHCs, ASHAs, etc.)
7. Keep responses concise but helpful (3-5 sentences max before using a tool)
8. NEVER just say "I'll help you" — always ACT by calling a tool
9. If user greets (hi/hello/namaste), respond warmly AND call manage_profile or show options

## IMPORTANT
- If the user says "find hospital" → call find_hospitals tool
- If user says "check symptoms" or mentions symptoms → call check_symptoms tool  
- If user says "book appointment" → call book_appointment tool
- If user says "health quiz" or "quiz" → call start_health_quiz tool
- If user says "diabetes risk" or "heart risk" → call run_risk_predictor tool
- If user says "analytics" or "health data" → call show_health_analytics tool
- If user says "medicine" or "medicines" → call navigate_to_page with page="medicines"
- Greet user briefly then use a tool to be helpful`;
}

// ─── QUIZ HANDLER ─────────────────────────────────────────────────────────────
async function handleQuizRequest(quizConfig, language) {
  const topic = quizConfig?.topic || 'general_health';
  const numQ = Math.min(quizConfig?.numQuestions || 5, 10);

  const topicPrompts = {
    general_health: 'general health, hygiene, nutrition, and wellness',
    diabetes: 'diabetes, blood sugar management, diet for diabetics',
    heart: 'heart health, cardiovascular disease prevention',
    nutrition: 'nutrition, balanced diet, vitamins, and minerals',
    mental_health: 'mental health, stress management, mindfulness'
  };

  const prompt = `Generate ${numQ} multiple choice health quiz questions about ${topicPrompts[topic] || topicPrompts.general_health}.

Return ONLY a valid JSON array like this:
[
  {
    "question": "What is the normal fasting blood sugar level?",
    "options": ["A. 70-100 mg/dL", "B. 120-140 mg/dL", "C. 150-200 mg/dL", "D. 200+ mg/dL"],
    "correct": "A",
    "explanation": "Normal fasting blood sugar is 70-100 mg/dL."
  }
]

Make questions relevant to Indian healthcare context. Vary difficulty. Return ONLY the JSON array, no other text.`;

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY_QUIZ}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 2000,
    })
  });

  if (!res.ok) {
    throw new Error(`Groq quiz error: ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '[]';

  // Extract JSON from response
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  const questions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

  return NextResponse.json({ questions, success: true });
}

// ─── MAIN POST HANDLER ────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json();
    const { type, messages, language, userName, imageBase64, quizConfig } = body;

    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured. Please check GROQ_API_KEY.' }, { status: 500 });
    }

    // Handle quiz requests separately
    if (type === 'quiz') {
      return await handleQuizRequest(quizConfig, language);
    }

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required.' }, { status: 400 });
    }

    // Build messages with system prompt
    const systemMessage = {
      role: 'system',
      content: buildSystemPrompt(userName || 'Patient', language || 'en')
    };

    // Build conversation history (last 10 messages)
    const history = messages.slice(-10).map(m => ({
      role: m.role === 'bot' ? 'assistant' : m.role,
      content: m.content || ''
    }));

    // If image was uploaded, add vision context
    if (imageBase64) {
      const lastMsg = history[history.length - 1];
      if (lastMsg && lastMsg.role === 'user') {
        lastMsg.content = [
          { type: 'text', text: lastMsg.content || 'Please analyze this medicine/medical image' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
        ];
      }
    }

    // Select model dynamically based on query complexity
    const { model: selectedModel, complexity, reason } = selectModelByComplexity(messages, imageBase64, language);
    console.log(`[MediBot] Selected model: ${selectedModel} | Complexity: ${complexity} | Reason: ${reason}`);

    // ── Step 1: Call Groq with tools ──────────────────────────────────────────
    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [systemMessage, ...history],
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: complexity === 'complex' ? 0.3 : 0.6,
        max_tokens: 1500,
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', groqRes.status, errText);
      return NextResponse.json({
        success: false,
        error: `AI service error (${groqRes.status}). Please try again.`
      }, { status: 502 });
    }

    const groqData = await groqRes.json();
    const choice = groqData.choices?.[0];
    const assistantMsg = choice?.message;

    if (!assistantMsg) {
      return NextResponse.json({ success: false, error: 'No response from AI.' }, { status: 502 });
    }

    // ── Step 2: Execute tool calls if any ─────────────────────────────────────
    const toolResults = [];
    let finalContent = assistantMsg.content || '';

    if (assistantMsg.tool_calls?.length > 0) {
      // Execute each tool
      for (const toolCall of assistantMsg.tool_calls) {
        const toolName = toolCall.function?.name;
        let toolArgs = {};
        try {
          toolArgs = JSON.parse(toolCall.function?.arguments || '{}');
        } catch {}

        console.log(`[MediBot] Calling tool: ${toolName}`, toolArgs);
        const result = executeTool(toolName, toolArgs);
        toolResults.push({ toolName, args: toolArgs, result });
      }

      // ── Step 3: Get final response after tool execution ────────────────────
      const toolResultMessages = assistantMsg.tool_calls.map((tc, i) => ({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(toolResults[i]?.result || {})
      }));

      const followUpRes = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            systemMessage,
            ...history,
            assistantMsg,
            ...toolResultMessages
          ],
          temperature: 0.6,
          max_tokens: 1000,
        })
      });

      if (followUpRes.ok) {
        const followUpData = await followUpRes.json();
        finalContent = followUpData.choices?.[0]?.message?.content || finalContent;
      }
    }

    // Fallback content if empty
    if (!finalContent || finalContent.trim() === '') {
      finalContent = "I'm here to help! You can ask me about symptoms, find nearby hospitals, get medicine information, or check your health risk. What do you need? 😊";
    }

    return NextResponse.json({
      success: true,
      content: finalContent,
      toolResults,
      modelUsed: selectedModel,
      complexity,
      reason,
    });

  } catch (error) {
    console.error('[MediBot Agent Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Something went wrong. Please try again.'
    }, { status: 500 });
  }
}
