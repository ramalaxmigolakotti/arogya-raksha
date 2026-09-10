import { NextRequest, NextResponse } from 'next/server';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_KEY = process.env.GROQ_API_KEY_DOCTOR || process.env.GROQ_API_KEY_SYMPTOMS || '';
const MODEL = 'qwen/qwen3.8-27b';

const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';
const SARVAM_STT_URL = 'https://api.sarvam.ai/speech-to-text';

// ── 22+ Indian language mapping ──────────────────────────────────────────────
const LANG_MAP: Record<string, { name: string; sarvam: string; speaker: string }> = {
  'hi':  { name: 'Hindi',      sarvam: 'hi-IN', speaker: 'meera'  },
  'te':  { name: 'Telugu',     sarvam: 'te-IN', speaker: 'meera'  },
  'ta':  { name: 'Tamil',      sarvam: 'ta-IN', speaker: 'meera'  },
  'kn':  { name: 'Kannada',    sarvam: 'kn-IN', speaker: 'meera'  },
  'ml':  { name: 'Malayalam',  sarvam: 'ml-IN', speaker: 'meera'  },
  'mr':  { name: 'Marathi',    sarvam: 'mr-IN', speaker: 'meera'  },
  'bn':  { name: 'Bengali',    sarvam: 'bn-IN', speaker: 'meera'  },
  'gu':  { name: 'Gujarati',   sarvam: 'gu-IN', speaker: 'meera'  },
  'pa':  { name: 'Punjabi',    sarvam: 'pa-IN', speaker: 'meera'  },
  'or':  { name: 'Odia',       sarvam: 'od-IN', speaker: 'meera'  },
  'as':  { name: 'Assamese',   sarvam: 'as-IN', speaker: 'meera'  },
  'ur':  { name: 'Urdu',       sarvam: 'ur-IN', speaker: 'meera'  },
  'bho': { name: 'Bhojpuri',   sarvam: 'hi-IN', speaker: 'meera'  },
  'mai': { name: 'Maithili',   sarvam: 'hi-IN', speaker: 'meera'  },
  'sat': { name: 'Santali',    sarvam: 'hi-IN', speaker: 'meera'  },
  'kok': { name: 'Konkani',    sarvam: 'mr-IN', speaker: 'meera'  },
  'doi': { name: 'Dogri',      sarvam: 'hi-IN', speaker: 'meera'  },
  'ks':  { name: 'Kashmiri',   sarvam: 'ur-IN', speaker: 'meera'  },
  'mni': { name: 'Manipuri',   sarvam: 'bn-IN', speaker: 'meera'  },
  'ne':  { name: 'Nepali',     sarvam: 'hi-IN', speaker: 'meera'  },
  'sd':  { name: 'Sindhi',     sarvam: 'ur-IN', speaker: 'meera'  },
  'sa':  { name: 'Sanskrit',   sarvam: 'hi-IN', speaker: 'meera'  },
  'en':  { name: 'English',    sarvam: 'en-IN', speaker: 'meera'  },
};

// ── Groq helper ──────────────────────────────────────────────────────────────
async function groqChat(messages: any[], maxTokens = 500, temperature = 0.5): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens: maxTokens }),
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Sarvam TTS ───────────────────────────────────────────────────────────────
async function sarvamTTS(text: string, langCode: string, speaker = 'meera'): Promise<string | null> {
  const keys = [
    process.env.SARVAM_API_KEY_1,
    process.env.SARVAM_API_KEY_2,
    process.env.SARVAM_API_KEY_3,
  ].filter(Boolean) as string[];

  if (!keys.length) return null;

  for (const key of keys) {
    try {
      const res = await fetch(SARVAM_TTS_URL, {
        method: 'POST',
        headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: [text.slice(0, 500)],
          target_language_code: langCode,
          speaker,
          pitch: 0,
          pace: 1.0,
          loudness: 1.5,
          speech_sample_rate: 22050,
          enable_preprocessing: true,
          model: 'bulbul:v1',
        }),
      });
      if (res.ok) {
        const d = await res.json();
        return d.audios?.[0] || null;
      }
    } catch {}
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
//  MULTI-AGENT PIPELINE
// ════════════════════════════════════════════════════════════════════════════

// 1️⃣ SYMPTOM AGENT — understands symptoms, asks follow-ups
async function symptomAgent(userText: string, langName: string, history: any[]) {
  const messages = [
    {
      role: 'system',
      content: `You are the Symptom Analysis Agent for Arogya Raksha. ALWAYS respond in ${langName}.
      
Your job: Extract symptoms, duration, and severity from patient's message.
Output JSON only:
{
  "symptoms": ["fever", "cough"],
  "duration": "2 days",
  "severity_guess": "mild|moderate|severe",
  "needs_followup": true|false,
  "followup_question": "Question to ask patient if more info needed (in ${langName})"
}`,
    },
    ...history.slice(-4),
    { role: 'user', content: userText },
  ];
  const raw = await groqChat(messages, 300, 0.3);
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { symptoms: [userText], severity_guess: 'mild', needs_followup: false };
  } catch {
    return { symptoms: [userText], severity_guess: 'mild', needs_followup: false };
  }
}

// 2️⃣ TRIAGE AGENT — severity assessment
async function triageAgent(symptoms: string[], duration: string, langName: string) {
  const messages = [
    {
      role: 'system',
      content: `You are the Medical Triage Agent. ALWAYS respond in ${langName}.
      
Given symptoms, assess severity and urgency.
Output JSON only:
{
  "severity": "mild|moderate|severe|emergency",
  "urgency": "home_care|visit_clinic|visit_hospital|call_108_immediately",
  "red_flags": ["list of warning signs if any"],
  "assessment": "2-sentence assessment in ${langName}"
}`,
    },
    {
      role: 'user',
      content: `Symptoms: ${symptoms.join(', ')}. Duration: ${duration || 'not specified'}`,
    },
  ];
  const raw = await groqChat(messages, 300, 0.3);
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { severity: 'mild', urgency: 'home_care', red_flags: [], assessment: '' };
  } catch {
    return { severity: 'mild', urgency: 'home_care', red_flags: [], assessment: '' };
  }
}

// 3️⃣ MEDICINE AGENT — suggest medicines with Indian context
async function medicineAgent(symptoms: string[], severity: string, langName: string) {
  const messages = [
    {
      role: 'system',
      content: `You are the Medicine Intelligence Agent for Indian patients. ALWAYS respond in ${langName}.
      
Suggest safe OTC medicines available in India for the given symptoms.
Output JSON only:
{
  "medicines": [
    {
      "name": "Paracetamol 500mg",
      "brand": "Crocin/Dolo",
      "dosage": "1 tablet every 6 hours",
      "use": "Fever and body pain",
      "caution": "Do not exceed 4 tablets/day"
    }
  ],
  "home_remedies": ["Drink warm water", "Rest"],
  "foods_to_eat": ["Light khichdi", "Coconut water"],
  "foods_to_avoid": ["Oily food", "Spicy food"],
  "disclaimer": "Consult a doctor if symptoms worsen (in ${langName})"
}`,
    },
    {
      role: 'user',
      content: `Symptoms: ${symptoms.join(', ')}. Severity: ${severity}`,
    },
  ];
  const raw = await groqChat(messages, 600, 0.4);
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : { medicines: [], home_remedies: [], disclaimer: 'Please consult a doctor' };
  } catch {
    return { medicines: [], home_remedies: [], disclaimer: 'Please consult a doctor' };
  }
}

// 4️⃣ HOSPITAL AGENT — match symptoms to hospital type
async function hospitalAgent(symptoms: string[], severity: string, urgency: string) {
  const specialtyMap: Record<string, string[]> = {
    'Cardiology':     ['chest pain', 'heart', 'palpitation', 'shortness of breath'],
    'Neurology':      ['headache', 'seizure', 'stroke', 'paralysis', 'confusion'],
    'Pulmonology':    ['cough', 'breathing', 'asthma', 'pneumonia'],
    'Gastroenterology': ['stomach', 'vomiting', 'diarrhea', 'abdominal pain', 'nausea'],
    'Orthopedics':    ['bone', 'fracture', 'joint pain', 'back pain'],
    'Pediatrics':     ['child', 'infant', 'baby'],
    'General Medicine': [],
  };

  let recommendedSpecialty = 'General Medicine';
  const lowerSymptoms = symptoms.map(s => s.toLowerCase()).join(' ');
  for (const [specialty, keywords] of Object.entries(specialtyMap)) {
    if (keywords.some(k => lowerSymptoms.includes(k))) {
      recommendedSpecialty = specialty;
      break;
    }
  }

  const facilityType =
    urgency === 'call_108_immediately' ? 'Emergency Hospital' :
    urgency === 'visit_hospital'       ? 'District/Private Hospital' :
    urgency === 'visit_clinic'         ? 'PHC / Clinic' :
    'Home Care (Consult ASHA worker)';

  return { recommendedSpecialty, facilityType, urgency };
}

// 5️⃣ EMERGENCY AGENT — detect & handle emergencies
async function emergencyAgent(symptoms: string[], severity: string, redFlags: string[]) {
  const EMERGENCY_KEYWORDS = [
    'chest pain', 'heart attack', 'stroke', 'seizure', 'unconscious',
    'breathing difficulty', 'severe bleeding', 'poisoning', 'drowning',
    'severe burn', 'high fever', 'meningitis', 'anaphylaxis', 'paralysis',
  ];

  const lowerSymptoms = [...symptoms, ...redFlags].map(s => s.toLowerCase()).join(' ');
  const isEmergency =
    severity === 'emergency' ||
    EMERGENCY_KEYWORDS.some(kw => lowerSymptoms.includes(kw));

  return {
    isEmergency,
    action: isEmergency ? 'CALL_108' : null,
    message: isEmergency ? '🚨 EMERGENCY: Please call 108 immediately or go to the nearest hospital emergency!' : null,
    smsAlert: isEmergency ? 'EMERGENCY: Patient needs immediate medical attention. Please call 108.' : null,
  };
}

// 6️⃣ RESPONSE AGENT — build final spoken response in patient's language
async function responseAgent(
  userText: string,
  langName: string,
  symptomData: any,
  triageData: any,
  medicineData: any,
  hospitalData: any,
  emergencyData: any
) {
  const context = `
Patient said: "${userText}"
Symptoms: ${symptomData.symptoms?.join(', ')}
Severity: ${triageData.severity}
Assessment: ${triageData.assessment}
Medicines: ${medicineData.medicines?.map((m: any) => `${m.name} (${m.brand})`).join(', ')}
Home remedies: ${medicineData.home_remedies?.join(', ')}
Recommended facility: ${hospitalData.facilityType}
Specialty needed: ${hospitalData.recommendedSpecialty}
Emergency: ${emergencyData.isEmergency}
`;

  const messages = [
    {
      role: 'system',
      content: `You are Dr. Arogya, a warm Indian AI doctor. ALWAYS respond ENTIRELY in ${langName}.

Generate a helpful, empathetic 3-4 sentence spoken response. Include:
1. Acknowledge the patient's symptoms warmly
2. Assessment and severity (simple language)  
3. Key advice (medicine or home remedy)
4. When to see a doctor

If emergency: Start with "🚨 यह गंभीर है!" (or equivalent in ${langName}) and say to call 108 immediately.
Keep it concise — it will be spoken aloud. Use simple words a rural patient can understand.`,
    },
    { role: 'user', content: context },
  ];

  return await groqChat(messages, 400, 0.6);
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN HANDLER
// ════════════════════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,          // User's text (already transcribed or typed)
      language = 'en',
      history = [],  // Previous conversation
      generateVoice = true, // Whether to generate TTS
      userName = 'Patient',
    } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!GROQ_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    const langInfo = LANG_MAP[language] || LANG_MAP['en'];
    const langName = langInfo.name;

    console.log(`[MultiAgent] Language: ${langName} | Text: ${text.slice(0, 50)}...`);

    // ── Run agent pipeline in parallel where possible ──────────────────────
    // Step 1: Symptom extraction (sequential first)
    const symptomData = await symptomAgent(text, langName, history);
    const symptoms = symptomData.symptoms || [text];
    const duration = symptomData.duration || 'not specified';

    // Step 2: Run triage, medicine, hospital agents in parallel
    const [triageData, medicineData] = await Promise.all([
      triageAgent(symptoms, duration, langName),
      medicineAgent(symptoms, symptomData.severity_guess || 'mild', langName),
    ]);

    const hospitalData = await hospitalAgent(symptoms, triageData.severity, triageData.urgency);

    // Step 3: Emergency check
    const emergencyData = await emergencyAgent(symptoms, triageData.severity, triageData.red_flags || []);

    // Step 4: Build final response
    const finalResponse = await responseAgent(
      text, langName, symptomData, triageData, medicineData, hospitalData, emergencyData
    );

    // Step 5: Generate Sarvam TTS voice (if requested)
    let audioBase64: string | null = null;
    if (generateVoice && language !== 'en') {
      // Use TTS for Indian languages
      audioBase64 = await sarvamTTS(
        finalResponse.replace(/[🚨💊🩺🏥]/g, ''), // remove emojis for cleaner speech
        langInfo.sarvam,
        langInfo.speaker
      );
    }

    // ── Build structured response ──────────────────────────────────────────
    return NextResponse.json({
      success: true,

      // Final spoken response
      response: finalResponse,
      audioBase64,       // Sarvam TTS base64 audio (if generated)

      // Agent outputs (for UI rendering)
      agents: {
        symptom: {
          symptoms,
          duration,
          severity: symptomData.severity_guess,
          needsFollowup: symptomData.needs_followup,
          followupQuestion: symptomData.followup_question,
        },
        triage: {
          severity: triageData.severity,
          urgency: triageData.urgency,
          redFlags: triageData.red_flags || [],
          assessment: triageData.assessment,
        },
        medicine: {
          medicines: medicineData.medicines || [],
          homeRemedies: medicineData.home_remedies || [],
          foodsToEat: medicineData.foods_to_eat || [],
          foodsToAvoid: medicineData.foods_to_avoid || [],
          disclaimer: medicineData.disclaimer,
        },
        hospital: {
          specialty: hospitalData.recommendedSpecialty,
          facilityType: hospitalData.facilityType,
          urgency: hospitalData.urgency,
        },
        emergency: {
          isEmergency: emergencyData.isEmergency,
          action: emergencyData.action,
          message: emergencyData.message,
        },
      },

      // Language info
      language: { code: language, name: langName, sarvam: langInfo.sarvam },
    });

  } catch (error: any) {
    console.error('[MultiAgent Error]', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
