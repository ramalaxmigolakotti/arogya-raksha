const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'demo-key' });

const AGENT_PROMPTS = {
  symptomChecker: `You are a medical AI assistant called Arogya Raksha Symptom Checker. Analyze the patient's symptoms and provide:
1. Possible conditions (ranked by likelihood)
2. Recommended medicines (with dosage)
3. When to see a doctor
4. Home remedies

IMPORTANT: Always add this disclaimer: "This is AI-generated advice and should not replace professional medical consultation."

Respond in a structured JSON format with fields: conditions, medicines, urgency, homeRemedies, disclaimer.`,

  diabetesPredictor: `You are a diabetes risk assessment AI agent. Based on the patient's data:
1. Calculate diabetes risk level (Low/Moderate/High/Very High)
2. Analyze each symptom's significance
3. Provide personalized lifestyle recommendations
4. Create a daily health plan
5. Suggest monitoring frequency

Respond in JSON format with fields: riskLevel, riskPercentage, analysis, recommendations, dailyPlan, monitoringSchedule.`,

  reportAnalyzer: `You are a medical report analyzer AI. Analyze the medical report text and:
1. Identify all test parameters and their values
2. Flag abnormal values (high/low/critical)
3. Provide a health summary
4. Give recommendations
5. Explain in simple language

Respond in JSON format with fields: summary, parameters (array with name, value, normalRange, status), abnormalCount, recommendations, simpleExplanation.`,

  medicineAdvisor: `You are a medicine intelligence AI. For the given medicine or query:
1. Explain usage and purpose
2. Provide dosage information
3. List side effects
4. Mention precautions
5. Suggest alternatives
6. Provide approximate pricing

Respond in JSON format with fields: name, purpose, dosage, sideEffects, precautions, alternatives, approximatePrice, disclaimer.`,

  generalHealth: `You are Arogya Raksha AI, a friendly healthcare assistant for Indian patients. Help users with:
- Health queries
- Medicine information
- Lifestyle advice
- Understanding medical reports
- Mental health support

Be empathetic, thorough, and always recommend consulting a doctor for serious concerns. Respond in the user's preferred language if specified.`,

  emergencyAgent: `You are an emergency response AI. When triggered:
1. Assess the emergency level
2. Provide immediate first aid instructions
3. Suggest nearest hospital type needed
4. Give calming instructions

Respond in JSON format with fields: emergencyLevel, firstAid, hospitalType, instructions.`,
};

async function callGeminiAgent(agentType, userMessage, context = '') {
  try {
    const systemPrompt = AGENT_PROMPTS[agentType] || AGENT_PROMPTS.generalHealth;

    const chatCompletion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Patient Context: ${context}\n\nUser Message: ${userMessage}` },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = chatCompletion.choices?.[0]?.message?.content || '';

    return {
      success: true,
      data: responseText,
      agent: agentType,
    };
  } catch (error) {
    console.error(`Groq AI error (${agentType}):`, error.message);
    return {
      success: false,
      error: error.message,
      agent: agentType,
      data: getDemoResponse(agentType),
    };
  }
}

function getDemoResponse(agentType) {
  const demoResponses = {
    symptomChecker: JSON.stringify({
      conditions: [
        { name: 'Common Cold', probability: '70%', description: 'Viral infection affecting upper respiratory tract' },
        { name: 'Seasonal Flu', probability: '20%', description: 'Influenza virus infection' },
        { name: 'Allergic Rhinitis', probability: '10%', description: 'Allergic reaction to environmental triggers' },
      ],
      medicines: [
        { name: 'Paracetamol 500mg', dosage: '1 tablet every 6 hours', purpose: 'Fever and pain relief' },
        { name: 'Cetirizine 10mg', dosage: '1 tablet at night', purpose: 'Allergy relief' },
      ],
      urgency: 'Low - Monitor at home',
      homeRemedies: ['Stay hydrated', 'Rest adequately', 'Warm salt water gargle', 'Steam inhalation'],
      disclaimer: 'This is AI-generated advice and should not replace professional medical consultation.',
    }),
    diabetesPredictor: JSON.stringify({
      riskLevel: 'Moderate',
      riskPercentage: 42,
      analysis: 'Based on reported symptoms, there is a moderate risk of Type 2 diabetes.',
      recommendations: ['Reduce sugar intake', 'Exercise 30 min daily', 'Regular blood sugar monitoring', 'Increase fiber intake'],
      dailyPlan: { morning: 'Walk 20 min, low-GI breakfast', afternoon: 'Light lunch, avoid sweets', evening: 'Exercise 30 min, early dinner' },
      monitoringSchedule: 'Check fasting blood sugar weekly',
    }),
    reportAnalyzer: JSON.stringify({
      summary: 'Overall health status: Attention needed. 2 parameters are outside normal range.',
      parameters: [
        { name: 'Hemoglobin', value: '11.2 g/dL', normalRange: '12-16 g/dL', status: 'low' },
        { name: 'Blood Sugar (Fasting)', value: '126 mg/dL', normalRange: '70-100 mg/dL', status: 'high' },
        { name: 'Cholesterol', value: '185 mg/dL', normalRange: '<200 mg/dL', status: 'normal' },
      ],
      abnormalCount: 2,
      recommendations: ['Consult endocrinologist for blood sugar', 'Iron-rich diet for hemoglobin', 'Follow-up test in 3 months'],
      simpleExplanation: 'Your blood sugar is slightly elevated and hemoglobin is low. This needs attention but is manageable.',
    }),
    medicineAdvisor: JSON.stringify({
      name: 'Metformin',
      purpose: 'Used to treat Type 2 diabetes by controlling blood sugar levels',
      dosage: '500mg twice daily with meals, may be increased to 1000mg twice daily',
      sideEffects: ['Nausea', 'Diarrhea', 'Stomach discomfort', 'Metallic taste'],
      precautions: ['Take with food', 'Avoid alcohol', 'Monitor kidney function', 'Report any muscle pain'],
      alternatives: ['Glimepiride', 'Sitagliptin', 'Vildagliptin'],
      approximatePrice: '₹30-80 for 10 tablets',
      disclaimer: 'Always consult your doctor before starting or changing medication.',
    }),
    generalHealth: 'Hello! I am Arogya Raksha AI, your personal healthcare assistant. How can I help you today? I can assist with symptom analysis, medicine information, report analysis, and general health queries.',
    emergencyAgent: JSON.stringify({
      emergencyLevel: 'HIGH',
      firstAid: ['Stay calm', 'Call 108 for ambulance', 'Keep the person comfortable', 'Do not give food or water'],
      hospitalType: 'Emergency/Trauma Center',
      instructions: 'Emergency services have been notified. Help is on the way.',
    }),
  };
  return demoResponses[agentType] || demoResponses.generalHealth;
}

module.exports = { callGeminiAgent, getDemoResponse, AGENT_PROMPTS };
