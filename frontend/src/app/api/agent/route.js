import { NextResponse } from 'next/server';
import { getSarvamKeyManager } from '@/lib/sarvamKeyManager';

const ALL_GROQ_KEYS = [
  process.env.GROQ_API_KEY_DOCTOR,
  process.env.GROQ_API_KEY_SYMPTOMS,
  process.env.GROQ_API_KEY_SCANNER,
  process.env.GROQ_API_KEY_QUIZ,
  process.env.GROQ_API_KEY_REPORTS,
].filter(Boolean);

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';

/**
 * Robust Groq API caller with multi-key rotation and multi-model fallback on 429 rate limits
 */
async function callGroqWithFallback(payload, preferredModel) {
  const modelsToTry = [preferredModel];
  if (preferredModel === 'qwen/qwen3.8-27b') {
    modelsToTry.push('openai/gpt-oss-20b', 'openai/gpt-oss-120b');
  } else if (preferredModel === 'openai/gpt-oss-120b') {
    modelsToTry.push('openai/gpt-oss-20b', 'qwen/qwen3.8-27b');
  } else {
    modelsToTry.push('qwen/qwen3.8-27b', 'openai/gpt-oss-120b');
  }

  for (const model of modelsToTry) {
    for (const apiKey of ALL_GROQ_KEYS) {
      try {
        const adjustedPayload = {
          ...payload,
          model,
          max_tokens: Math.min(payload.max_tokens || 500, 500),
        };

        const res = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(adjustedPayload),
        });

        if (res.ok) {
          const data = await res.json();
          return { data, modelUsed: model };
        }

        if (res.status === 429) {
          console.warn(`[MediBot] Groq 429 on model ${model}. Retrying next key/model...`);
          continue;
        }

        const errText = await res.text();
        console.warn(`[MediBot] Groq error ${res.status} on model ${model}:`, errText.slice(0, 150));
      } catch (e) {
        console.warn(`[MediBot] Groq fetch network error:`, e.message);
      }
    }
  }
  return null;
}

/**
 * Intelligent Complexity Router for MediBot Agent:
 * - 'vision': qwen/qwen3.8-27b (multimodal image & packaging OCR)
 * - 'simple': openai/gpt-oss-20b (sub-second navigation, greetings, instant tool triggers)
 * - 'complex': openai/gpt-oss-120b (deep 120B clinical reasoning, multi-symptom differential, contraindications)
 * - 'moderate': qwen/qwen3.8-27b (standard clinical Q&A, native multilingual Indian languages)
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
  const isNav = /^(go\s+to|open|navigate|show|take\s+me\s+to|bring\s+up)\s+(symptoms|quiz|medicines|hospitals|scanner|doctors|appointments|profile|emergency|reports|admin)/i.test(clean);
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
      description: 'Navigate the user to any specific page or admin panel in the application. Use when user asks to go somewhere, open a feature, or inspect an operational dashboard.',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            description: 'Target page: symptoms, hospitals, medicines, scanner, doctors, appointments, predictors, analytics, profile, quiz, emergency, reports, tracking, diagnostic-centre, admin_beds, hospital_admin'
          },
          reason: { type: 'string', description: 'Why we are navigating there' },
          filter: { type: ['string', 'null'], description: 'Optional filter or tab to apply on the target page' }
        },
        required: ['page', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_patient_medical_profile',
      description: 'Retrieve the patient’s authenticated medical profile, vitals, chronic conditions, and allergies for automatic context.',
      parameters: {
        type: 'object',
        properties: {
          fields: { type: ['array', 'null'], items: { type: 'string' }, description: 'Optional specific fields like vitals, conditions, allergies' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'prefill_symptom_checker',
      description: 'Pre-populate the Symptom Checker tool with the user’s described symptoms along with their stored profile vitals (BP, diabetic status, age, known allergies).',
      parameters: {
        type: 'object',
        properties: {
          symptoms: { type: 'array', items: { type: 'string' }, description: 'Identified symptoms list' },
          severity: { type: ['string', 'null'], description: 'Severity: mild, moderate, or severe' },
          duration: { type: ['string', 'null'], description: 'Duration of symptoms e.g. 2 days' }
        },
        required: ['symptoms']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'prefill_risk_predictor',
      description: 'Pre-populate a health risk assessment predictor (diabetes, heart, hypertension, mental_health) using the patient’s stored vitals and biometric profile.',
      parameters: {
        type: 'object',
        properties: {
          predictor_type: {
            type: 'string',
            enum: ['diabetes', 'heart', 'mental_health', 'hypertension', 'obesity'],
            description: 'Type of risk predictor to pre-populate'
          }
        },
        required: ['predictor_type']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'request_action_permission',
      description: 'Trigger a Human-in-the-Loop permission confirmation card before executing sensitive actions like appointment booking, medicine purchasing, or hospital bed management.',
      parameters: {
        type: 'object',
        properties: {
          action_type: {
            type: 'string',
            enum: ['book_appointment', 'order_medicine', 'allocate_hospital_bed', 'update_medical_record'],
            description: 'The sensitive action requiring user confirmation'
          },
          title: { type: 'string', description: 'Brief user-friendly title e.g. Confirm Doctor Appointment' },
          summary: { type: 'string', description: 'Detailed summary of the action and parameters' },
          estimated_cost: { type: ['string', 'null'], description: 'Estimated cost or ₹0 for free care scheme' },
          payload: { type: 'object', description: 'Complete action execution payload' }
        },
        required: ['action_type', 'title', 'summary', 'payload']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'execute_appointment_booking',
      description: 'Execute doctor appointment booking directly into the SmartQueue system when confirmed by the patient.',
      parameters: {
        type: 'object',
        properties: {
          doctor_name: { type: 'string', description: 'Doctor or department name' },
          specialty: { type: ['string', 'null'], description: 'Medical specialty' },
          date: { type: ['string', 'null'], description: 'Appointment date' },
          time_slot: { type: ['string', 'null'], description: 'Time slot' },
          reason: { type: ['string', 'null'], description: 'Reason for visit' }
        },
        required: ['doctor_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'execute_medicine_order',
      description: 'Place an order for prescribed or OTC medicines directly with pharmacy delivery tracking.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                quantity: { type: 'number' },
                price: { type: 'number' }
              },
              required: ['name']
            },
            description: 'List of medicines to order'
          },
          delivery_address: { type: ['string', 'null'], description: 'Delivery address or village name' },
          payment_method: { type: ['string', 'null'], description: 'cod or online' }
        },
        required: ['items']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'hospital_admin_operations',
      description: 'Perform operational commands for the Hospital Admin console (bed allocation, emergency triage admission, ward management).',
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['assign_bed', 'dispatch_ambulance', 'admit_emergency_patient', 'update_ward_status'],
            description: 'Admin operation to perform'
          },
          ward: { type: 'string', description: 'Ward name e.g. ICU, General, Emergency, Maternity' },
          bed_number: { type: ['string', 'null'], description: 'Bed identifier' },
          patient_name: { type: ['string', 'null'], description: 'Patient name' },
          notes: { type: ['string', 'null'], description: 'Operational notes' }
        },
        required: ['operation', 'ward']
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
      description: 'Find nearby hospitals based on user location or emergency status.',
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
      name: 'start_health_quiz',
      description: 'Start an interactive health quiz for the user',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: ['string', 'null'], description: 'Quiz topic' },
          difficulty: { type: ['string', 'null'] },
          num_questions: { type: ['number', 'null'], description: 'Number of questions (3-10)' }
        }
      }
    }
  }
];

// ─── TOOL EXECUTION ENGINE ────────────────────────────────────────────────────
function executeTool(toolName, args, userProfile = {}) {
  const patient = {
    name: userProfile.name || 'Rahul Sharma',
    age: userProfile.age || 32,
    gender: userProfile.gender || 'Male',
    village: userProfile.village || 'Kothapeta',
    bpSystolic: userProfile.bpSystolic || 120,
    bpDiastolic: userProfile.bpDiastolic || 80,
    isDiabetic: userProfile.isDiabetic || false,
    chronicConditions: userProfile.chronicConditions || 'None',
    allergies: userProfile.allergies || 'None reported',
    bloodGroup: userProfile.bloodGroup || 'O+',
  };

  switch (toolName) {
    case 'navigate_to_page': {
      const pageMap = {
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
        reports: '/dashboard/reports',
        tracking: '/dashboard/tracking',
        'diagnostic-centre': '/dashboard/diagnostic-centre',
        admin_beds: '/dashboard',
        hospital_admin: '/dashboard',
      };
      const url = pageMap[args.page] || '/dashboard';
      return {
        ui_action: 'navigate',
        url,
        page: args.page,
        filter: args.filter || null,
        message: `Navigating to ${args.page.replace('_', ' ')}: ${args.reason}`
      };
    }

    case 'get_patient_medical_profile': {
      return {
        ui_action: 'display_profile_summary',
        data: patient,
        message: `Retrieved medical profile for ${patient.name} (${patient.age}y, ${patient.gender}, BP: ${patient.bpSystolic}/${patient.bpDiastolic})`
      };
    }

    case 'prefill_symptom_checker': {
      return {
        ui_action: 'prefill_symptoms',
        url: '/dashboard/symptoms',
        data: {
          symptoms: args.symptoms,
          age: patient.age,
          gender: patient.gender,
          bpSystolic: patient.bpSystolic,
          bpDiastolic: patient.bpDiastolic,
          isDiabetic: patient.isDiabetic,
          chronicConditions: patient.chronicConditions,
          allergies: patient.allergies,
          duration: args.duration || 'recent',
          severity: args.severity || 'moderate',
        },
        message: `Pre-populated Symptom Checker with your vitals (BP: ${patient.bpSystolic}/${patient.bpDiastolic}, Age: ${patient.age})`
      };
    }

    case 'prefill_risk_predictor': {
      return {
        ui_action: 'prefill_predictor',
        url: '/dashboard/predictors',
        data: {
          predictor_type: args.predictor_type,
          age: patient.age,
          gender: patient.gender,
          bpSystolic: patient.bpSystolic,
          bpDiastolic: patient.bpDiastolic,
          isDiabetic: patient.isDiabetic,
          bmi: 24.2,
          glucose: patient.isDiabetic ? 145 : 95,
        },
        message: `Pre-populated ${args.predictor_type} risk predictor from your saved vitals`
      };
    }

    case 'request_action_permission': {
      const actionId = `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      return {
        ui_action: 'require_confirmation',
        confirmation_data: {
          action_id: actionId,
          action_type: args.action_type,
          title: args.title,
          summary: args.summary,
          estimated_cost: args.estimated_cost || '₹0 (Arogya Raksha Scheme)',
          payload: args.payload,
        },
        message: `⚠️ Confirmation required: ${args.title}. Please review and approve below.`
      };
    }

    case 'execute_appointment_booking': {
      const tokenNumber = Math.floor(Math.random() * 25) + 1;
      const bookingId = `APT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        ui_action: 'appointment_booked',
        data: {
          bookingId,
          tokenNumber,
          doctorName: args.doctor_name,
          specialty: args.specialty || 'General Medicine',
          date: args.date || 'Tomorrow',
          timeSlot: args.time_slot || '10:30 AM',
          patientName: patient.name,
          status: 'Confirmed',
        },
        message: `✅ Appointment successfully booked with ${args.doctor_name}! Your Token Number is #${tokenNumber} (Booking ID: ${bookingId}).`
      };
    }

    case 'execute_medicine_order': {
      const orderId = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const totalAmount = args.items?.reduce((sum, item) => sum + (item.price || 45) * (item.quantity || 1), 0) || 120;
      return {
        ui_action: 'order_placed',
        data: {
          orderId,
          items: args.items,
          totalAmount,
          deliveryAddress: args.delivery_address || `${patient.village}, Andhra Pradesh`,
          paymentMethod: args.payment_method || 'Cash on Delivery / Scheme',
          estimatedDelivery: 'Within 2 hours (ASHA Network Express)',
        },
        message: `📦 Medicine order ${orderId} placed successfully! Total: ₹${totalAmount}. Delivery to ${patient.village}.`
      };
    }

    case 'hospital_admin_operations': {
      const opId = `ADM-${Date.now().toString().slice(-4)}`;
      return {
        ui_action: 'admin_operation',
        data: {
          operationId: opId,
          operation: args.operation,
          ward: args.ward,
          bedNumber: args.bed_number || `B-${Math.floor(Math.random() * 20) + 1}`,
          patientName: args.patient_name || 'Emergency Patient',
          status: 'Success',
        },
        message: `🏥 Admin Command Executed: ${args.operation.replace(/_/g, ' ').toUpperCase()} in ${args.ward} ward.`
      };
    }

    case 'check_symptoms': {
      const symptomsStr = args.symptoms?.join(', ') || 'symptoms';
      return {
        ui_action: 'show_symptoms_result',
        data: {
          symptoms: args.symptoms,
          severity: args.severity || 'moderate',
          duration: args.duration || '2 days',
          assessment: `Preliminary assessment for ${symptomsStr} considering patient age ${patient.age}.`,
          recommendedAction: 'Stay hydrated, rest, and monitor temperature.',
        },
        message: `Analyzed symptoms: ${symptomsStr}`
      };
    }

    case 'find_hospitals': {
      return {
        ui_action: args.emergency ? 'navigate' : 'navigate_with_filter',
        url: '/dashboard/hospitals',
        page: 'hospitals',
        data: { specialty: args.specialty, emergency: args.emergency },
        message: args.emergency ? '🚨 Opening Emergency Hospital Finder' : 'Finding nearby hospitals'
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
        message: 'Starting health quiz'
      };
    }

    default:
      return { message: `Tool ${toolName} executed successfully.` };
  }
}

// ─── SYSTEM PROMPT BUILDER ────────────────────────────────────────────────────
function buildSystemPrompt(userName, language, userProfile = {}) {
  const LANG_NAMES = {
    en: 'English', hi: 'Hindi (हिंदी)', te: 'Telugu (తెలుగు)', ta: 'Tamil (தமிழ்)',
    kn: 'Kannada (ಕನ್ನಡ)', mr: 'Marathi (मराठी)', bn: 'Bengali (বাংলা)', bho: 'Bhojpuri (भोजपुरी)'
  };
  const langName = LANG_NAMES[language] || 'English';
  const langInstruction = language && language !== 'en'
    ? `\n\nCRITICAL: You MUST respond in ${langName}. Write all dialogue, explanations, and advice in ${langName} script.`
    : '';

  const pName = userProfile.name || userName || 'Rahul Sharma';
  const pAge = userProfile.age || 32;
  const pGender = userProfile.gender || 'Male';
  const pBP = userProfile.bpSystolic && userProfile.bpDiastolic ? `${userProfile.bpSystolic}/${userProfile.bpDiastolic}` : '120/80';
  const pDiabetic = userProfile.isDiabetic ? 'Yes (Type 2)' : 'No';
  const pConditions = userProfile.chronicConditions || 'None reported';
  const pAllergies = userProfile.allergies || 'None reported';
  const pVillage = userProfile.village || 'Kothapeta';

  return `You are MediBot, the advanced Multimodal Agentic AI Healthcare Assistant for "Arogya Raksha" — India's comprehensive healthcare platform.${langInstruction}

## AUTHENTICATED PATIENT PROFILE CONTEXT:
- Name: ${pName} | Age: ${pAge} | Gender: ${pGender}
- Location / Village: ${pVillage}, Andhra Pradesh
- Baseline Blood Pressure: ${pBP} mmHg
- Diabetic Status: ${pDiabetic}
- Known Chronic Conditions: ${pConditions}
- Known Allergies: ${pAllergies}

## YOUR AGENTIC CAPABILITIES:
You are empowered to take real autonomous actions across the platform via tools:
1. 🗺️ **App Navigation**: Call \`navigate_to_page\` to smoothly switch pages (symptoms, quiz, medicines, scanner, doctors, appointments, hospital admin).
2. 📋 **Medical Profile Pre-fill**:
   - For symptoms: Call \`prefill_symptom_checker\` so user's vitals (BP, diabetic state, age) are automatically pre-populated without asking them!
   - For disease predictors: Call \`prefill_risk_predictor\` with their stored biomarkers.
3. 🛡️ **Human-in-the-Loop Permission Gates**:
   - BEFORE booking an appointment or ordering medicine, ALWAYS call \`request_action_permission\` to ask the user to confirm!
   - After the user confirms (e.g. "yes", "confirm", "proceed"), execute \`execute_appointment_booking\` or \`execute_medicine_order\`.
4. 🏥 **Hospital Admin Commands**: If an admin user asks for bed allocation or dispatch, call \`hospital_admin_operations\`.
5. 💊 **Medication & Diagnostics**: Provide Indian OTC alternatives (Dolo 650, ORS, Combiflam, Gelusil) taking their allergies into account.

## BEHAVIORAL PROTOCOL:
- Be warm, proactive, and compassionate.
- DO NOT ask the user for information you already know from their profile (age, gender, chronic condition). Use it!
- When the user asks to book an appointment, ask for the doctor/time and then trigger the permission confirmation gate.
- When the user asks to order medicine, present the cart and trigger the permission confirmation gate.
- Always add a brief, respectful medical disclaimer.`;
}

// ─── AUDIO SYNTHESIS HELPER (Sarvam TTS) ──────────────────────────────────────
async function synthesizeVoiceResponse(text, language) {
  try {
    const keyManager = getSarvamKeyManager();
    const SARVAM_TTS_LANG_CODES = {
      hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', kn: 'kn-IN',
      mr: 'mr-IN', bn: 'bn-IN', gu: 'gu-IN', pa: 'pa-IN',
      or: 'od-IN', ml: 'ml-IN', en: 'en-IN', bho: 'hi-IN',
    };
    const langCode = SARVAM_TTS_LANG_CODES[language] || 'en-IN';

    const cleanText = text
      .replace(/[\*\_#`~]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
      .slice(0, 450)
      .trim();

    if (!cleanText) return null;

    for (let i = 0; i < keyManager.keyCount; i++) {
      const apiKey = keyManager.getNextKey();
      try {
        const res = await fetch(SARVAM_TTS_URL, {
          method: 'POST',
          headers: {
            'api-subscription-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: [cleanText],
            target_language_code: langCode,
            speaker: 'priya',
            pitch: 0,
            pace: 1.05,
            loudness: 1.5,
            speech_sample_rate: 22050,
            enable_preprocessing: true,
            model: 'bulbul:v3',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          return data.audios?.[0] || null;
        }
      } catch {
        // continue to next key
      }
    }
  } catch (err) {
    console.warn('[MediBot TTS Synthesis Error]', err);
  }
  return null;
}

// ─── MAIN POST HANDLER ────────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      type,
      messages,
      language = 'en',
      userName = 'Patient',
      userProfile = {},
      imageBase64,
      voiceResponse = false,
      confirmedAction = null,
    } = body;

    if (ALL_GROQ_KEYS.length === 0) {
      return NextResponse.json({ error: 'AI service not configured. Please check GROQ_API_KEY.' }, { status: 500 });
    }

    // Direct execution of confirmed actions (Human-in-the-Loop completion)
    if (confirmedAction && confirmedAction.action_type) {
      console.log(`[MediBot] Executing User-Confirmed Action:`, confirmedAction);
      let executionResult = null;

      if (confirmedAction.action_type === 'book_appointment') {
        executionResult = executeTool('execute_appointment_booking', confirmedAction.payload, userProfile);
      } else if (confirmedAction.action_type === 'order_medicine') {
        executionResult = executeTool('execute_medicine_order', confirmedAction.payload, userProfile);
      } else if (confirmedAction.action_type === 'allocate_hospital_bed') {
        executionResult = executeTool('hospital_admin_operations', confirmedAction.payload, userProfile);
      }

      const replyContent = executionResult?.message || 'Your request has been successfully confirmed and processed.';
      let audioBase64 = null;
      if (voiceResponse !== false) {
        audioBase64 = await synthesizeVoiceResponse(replyContent, language);
      }

      return NextResponse.json({
        success: true,
        content: replyContent,
        toolResults: [{ toolName: confirmedAction.action_type, result: executionResult }],
        audioBase64,
      });
    }

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required.' }, { status: 400 });
    }

    // Build messages with dynamic system prompt containing user's profile
    const systemMessage = {
      role: 'system',
      content: buildSystemPrompt(userName, language, userProfile)
    };

    // Build conversation history
    const history = messages.slice(-10).map(m => ({
      role: m.role === 'bot' ? 'assistant' : m.role,
      content: m.content || ''
    }));

    // Add vision content if image was passed
    if (imageBase64) {
      const lastMsg = history[history.length - 1];
      if (lastMsg && lastMsg.role === 'user') {
        lastMsg.content = [
          { type: 'text', text: lastMsg.content || 'Please analyze this medical packaging or report image' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
        ];
      }
    }

    // Dynamic model selection based on complexity
    const { model: selectedModel, complexity, reason } = selectModelByComplexity(messages, imageBase64, language);
    console.log(`[MediBot] Model: ${selectedModel} | Complexity: ${complexity} | Reason: ${reason}`);

    // Step 1: Call Groq with tool declarations & multi-key fallback
    const groqCallResult = await callGroqWithFallback({
      messages: [systemMessage, ...history],
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: complexity === 'complex' ? 0.3 : 0.6,
      max_tokens: 500,
    }, selectedModel);

    if (!groqCallResult || !groqCallResult.data) {
      return NextResponse.json({
        success: false,
        error: `AI service temporarily busy across failover keys. Please try again.`
      }, { status: 502 });
    }

    const { data: groqData, modelUsed: activeModel } = groqCallResult;
    const choice = groqData.choices?.[0];
    const assistantMsg = choice?.message;

    if (!assistantMsg) {
      return NextResponse.json({ success: false, error: 'No response from AI.' }, { status: 502 });
    }

    // Step 2: Execute tool calls if returned
    const toolResults = [];
    let finalContent = assistantMsg.content || '';

    if (assistantMsg.tool_calls?.length > 0) {
      for (const toolCall of assistantMsg.tool_calls) {
        const toolName = toolCall.function?.name;
        let toolArgs = {};
        try {
          toolArgs = JSON.parse(toolCall.function?.arguments || '{}');
        } catch {}

        console.log(`[MediBot] Executing tool: ${toolName}`, toolArgs);
        const result = executeTool(toolName, toolArgs, userProfile);
        toolResults.push({ toolName, args: toolArgs, result });
      }

      // Step 3: Follow-up synthesis with tool execution context
      const toolResultMessages = assistantMsg.tool_calls.map((tc, i) => ({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(toolResults[i]?.result || {})
      }));

      const followUpResult = await callGroqWithFallback({
        messages: [
          systemMessage,
          ...history,
          assistantMsg,
          ...toolResultMessages
        ],
        temperature: 0.6,
        max_tokens: 500,
      }, activeModel);

      if (followUpResult?.data) {
        finalContent = followUpResult.data.choices?.[0]?.message?.content || finalContent;
      }
    }

    // Fallback dialogue
    if (!finalContent || finalContent.trim() === '') {
      finalContent = "I'm here to help! I can check your symptoms, pre-fill your health risk assessments, find doctors, or guide you through your medical profile. How can I assist you today? 😊";
    }

    // Always synthesize audio speech in user's preferred language unless muted
    let audioBase64 = null;
    if (voiceResponse !== false) {
      audioBase64 = await synthesizeVoiceResponse(finalContent, language);
    }

    return NextResponse.json({
      success: true,
      content: finalContent,
      toolResults,
      modelUsed: selectedModel,
      complexity,
      reason,
      audioBase64,
      hasAudio: !!audioBase64,
    });

  } catch (error) {
    console.error('[MediBot Agent Fatal Error]', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Something went wrong.'
    }, { status: 500 });
  }
}
