import { NextRequest, NextResponse } from 'next/server';
import { callGroqVision, callGroq, parseGroqJSON, GROQ_MODELS } from '@/lib/groqClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageData: string = body.image || body.imageBase64 || '';
    const medicineName: string = body.medicineName || '';
    const { language } = body;

    if (!imageData && !medicineName) {
      return NextResponse.json({ error: 'Image or medicine name is required.' }, { status: 400 });
    }

    const LANG_NAMES: Record<string, string> = {
      en: 'English', hi: 'Hindi (हिंदी)', te: 'Telugu (తెలుగు)', ta: 'Tamil (தமிழ்)',
      kn: 'Kannada (ಕನ್ನಡ)', mr: 'Marathi (मराठी)', bn: 'Bengali (বাংলা)', bho: 'Bhojpuri (भोजपुरी)',
      gu: 'Gujarati (ગુજરાતી)', pa: 'Punjabi (ਪੰਜਾਬੀ)', or: 'Odia (ଓଡ଼ିଆ)', as: 'Assamese (অসমীয়া)',
      ur: 'Urdu (اردو)', ml: 'Malayalam (മലയാളം)', mai: 'Maithili (मैथिली)', sat: 'Santali (ᱥᱟᱱᱛᱟᱲᱤ)',
      kok: 'Konkani (कोंकणी)', doi: 'Dogri (डोगरी)', ks: 'Kashmiri (کٲشُر)', mni: 'Manipuri (মেইতেই)',
      ne: 'Nepali (नेपाली)', sd: 'Sindhi (سنڌي)', sa: 'Sanskrit (संस्कृतम्)',
    };
    const targetLangName = LANG_NAMES[language || 'en'] || 'English';
    const langInstruction = language && language !== 'en'
      ? `\n\nIMPORTANT: Respond ENTIRELY in ${targetLangName} using native script for description, benefits, sideEffects, warnings, dosage, and Indian brand details. Keep JSON structure intact.` : '';

    // ── STEP 1: Llama 4 Scout VISION — Read the ACTUAL image ─────────────────
    // This is a real vision call — the model SEES the image and reads ALL text
    let scanResult: any = {};

    if (imageData) {
      const visionPrompt = `You are a medicine packaging OCR expert. Carefully read EVERY piece of text visible in this medicine image.

CRITICAL RULES:
1. Read the ACTUAL text on the packaging — do NOT guess or substitute with other medicine names
2. Look for: brand name, generic/salt name, manufacturer, strength (mg/ml), form (tablet/capsule/syrup), pack size, MRP, expiry date, batch number
3. If you see "PYRIN-C" then the medicine name IS "Pyrin-C" — do NOT change it to Crocin or anything else
4. Be extremely accurate — patients depend on this for their health

Return ONLY valid JSON (no markdown):
{
  "identified": true,
  "medicineName": "<EXACT brand name from packaging>",
  "genericName": "<generic/salt name e.g. Paracetamol + Chlorpheniramine>",
  "manufacturer": "<company name from packaging>",
  "form": "<tablet|capsule|syrup|injection|cream>",
  "strength": "<e.g. 500mg or 500mg+2mg>",
  "packSize": "<e.g. 10 tablets, 100ml>",
  "mrp": "<MRP in ₹ if visible, else 'Not visible'>",
  "expiryDate": "<expiry if visible>",
  "batchNo": "<batch number if visible>",
  "rawTextRead": "<all text you could read from the image>"
}`;

      try {
        const { content: visionContent } = await callGroqVision(
          imageData,
          visionPrompt,
          'You are a medical OCR system. Read medicine packaging text exactly as printed. Never substitute brand names. Return JSON only.'
        );
        scanResult = parseGroqJSON(visionContent);
        console.log('[Scanner] Vision identified:', scanResult.medicineName, '| Raw text:', scanResult.rawTextRead?.slice(0, 100));
      } catch (visionErr: any) {
        console.error('[Scanner] Vision error:', visionErr.message);
        // Vision failed — use medicine name if provided, else unknown
        scanResult = { medicineName: medicineName || 'Unknown Medicine', identified: false };
      }
    } else if (medicineName) {
      scanResult = { medicineName, identified: true };
    }

    const identifiedName   = scanResult.medicineName || medicineName || 'Unknown Medicine';
    const identifiedGeneric = scanResult.genericName || '';

    // ── STEP 2: Llama 3.3 70B — Deep medicine info based on ACTUAL identified name ──
    const detailPrompt = `You are a pharmaceutical expert for India.

Provide complete information about: "${identifiedName}"
${identifiedGeneric ? `Generic/Salt name: ${identifiedGeneric}` : ''}
${scanResult.manufacturer ? `Manufacturer: ${scanResult.manufacturer}` : ''}

IMPORTANT: Use the EXACT medicine name provided. If the name is "Pyrin-C", give info about Pyrin-C (it contains Paracetamol + Chlorpheniramine Maleate), NOT Crocin.

Return ONLY valid JSON — no markdown:
{
  "identified": true,
  "medicineName": "${identifiedName}",
  "genericName": "<full generic/salt composition>",
  "manufacturer": "${scanResult.manufacturer || '<Indian pharma company>'}",
  "composition": "<active ingredients with exact strength>",
  "form": "${scanResult.form || 'tablet'}",
  "strength": "${scanResult.strength || '<strength>'}",
  "packSize": "${scanResult.packSize || '<pack size>'}",
  "mrp": "${scanResult.mrp || '<₹ price>'}",
  "category": "<pharmacological class e.g. Analgesic + Antihistamine>",
  "prescriptionRequired": false,
  "description": "<2-sentence explanation of what this medicine does and for whom>",
  "uses": ["<primary use>", "<use 2>", "<use 3>", "<use 4>"],
  "sideEffects": ["<common side effect 1>", "<side effect 2>", "<side effect 3>", "<side effect 4>"],
  "dosage": "<adult dosage and children dosage if applicable>",
  "storage": "<storage conditions>",
  "warnings": ["<important warning 1>", "<warning 2>"],
  "drugInteractions": ["<drug it interacts with and effect>", "<interaction 2>"],
  "symptomsItTreats": ["<symptom 1>", "<symptom 2>", "<symptom 3>", "<symptom 4>"],
  "alternatives": [
    { "name": "<similar Indian brand>", "manufacturer": "<company>", "approxPrice": "₹XX" },
    { "name": "<another alternative>", "manufacturer": "<company>", "approxPrice": "₹XX" }
  ]
}${langInstruction}`;

    const { content: detailContent } = await callGroq('scanner', {
      model:           GROQ_MODELS.BALANCED,
      messages:        [
        { role: 'system', content: 'You are a pharmaceutical AI expert for India. Return valid JSON only. No markdown. Never substitute or rename medicines.' },
        { role: 'user',   content: detailPrompt },
      ],
      temperature:     0.2,
      max_tokens:      2000,
      response_format: { type: 'json_object' },
    });

    let parsed: any;
    try {
      parsed = parseGroqJSON(detailContent);
    } catch {
      // Fallback with whatever we know from vision
      parsed = {
        identified:           scanResult.identified || false,
        medicineName:         identifiedName,
        genericName:          identifiedGeneric || 'Unknown',
        manufacturer:         scanResult.manufacturer || 'Unknown',
        composition:          identifiedGeneric || 'Not available',
        form:                 scanResult.form || 'tablet',
        strength:             scanResult.strength || 'Unknown',
        packSize:             scanResult.packSize || 'Unknown',
        mrp:                  scanResult.mrp || 'Unknown',
        category:             'General',
        prescriptionRequired: false,
        description:          'Medicine details could not be fully retrieved. Please consult a pharmacist.',
        uses:                 ['Please consult a pharmacist for accurate information.'],
        sideEffects:          [],
        dosage:               'As directed by physician',
        storage:              'Store below 30°C in a dry place.',
        warnings:             ['Always consult a doctor before taking any medicine.'],
        drugInteractions:     [],
        symptomsItTreats:     [],
        alternatives:         [],
      };
    }

    return NextResponse.json({ ...parsed, success: true });
  } catch (error: any) {
    console.error('[Scanner API]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
