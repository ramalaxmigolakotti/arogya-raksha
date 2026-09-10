import { NextRequest, NextResponse } from 'next/server';
import { callGroqVision, callGroq, parseGroqJSON, GROQ_MODELS } from '@/lib/groqClient';

// Helper to query backend or local 253K dataset for fuzzy match
async function queryLocalDataset(queryText: string): Promise<any | null> {
  if (!queryText || queryText.length < 2) return null;
  const cleanQ = queryText.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
  const words = cleanQ.split(/\s+/).filter(w => w.length >= 2);

  const candidateQueries = [
    cleanQ,
    words.slice(0, 2).join(' '),
    words[0],
  ].filter(Boolean);

  for (const q of candidateQueries) {
    try {
      const res = await fetch(`http://localhost:5000/api/medicines/search?q=${encodeURIComponent(q)}&limit=5`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.medicines?.length > 0) {
          return data.medicines[0];
        }
      }
    } catch {
      // Ignore backend fetch errors
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageData: string = body.image || body.imageBase64 || '';
    const medicineName: string = body.medicineName || '';
    const manualClue: string = body.manualClue || body.hint || '';
    const { language } = body;

    if (!imageData && !medicineName && !manualClue) {
      return NextResponse.json({ error: 'Image or medicine name is required.' }, { status: 400 });
    }

    const LANG_NAMES: Record<string, string> = {
      en: 'English', hi: 'Hindi (हिंदी)', te: 'Telugu (తెలుగు)', ta: 'Tamil (தமிழ்)',
      kn: 'Kannada (ಕನ್ನಡ)', mr: 'Marathi (मराठी)', bn: 'Bengali (বাংলা)', bho: 'Bhojpuri (भोजपुरी)',
      gu: 'Gujarati (ગુજરાતી)', pa: 'Punjabi (ਪੰਜਾਬੀ)', or: 'Odia (ଓଡ଼ିଆ)', as: 'Assamese (অসমীয়া)',
      ur: 'Urdu (اردو)', ml: 'Malayalam (മലയാളം)', mai: 'Maithili (मैथिली)', sat: 'Santali (ᱥᱟᱱᱛᱟᱲᱤ)',
      kok: 'Konkani (कोंकणी)', doi: 'Dogri (डোগরী)', ks: 'Kashmiri (کٲشُر)', mni: 'Manipuri (মেইতেই)',
      ne: 'Nepali (नेपाली)', sd: 'Sindhi (سنڌي)', sa: 'Sanskrit (संस्कृतम्)',
    };
    const targetLangName = LANG_NAMES[language || 'en'] || 'English';
    const langInstruction = language && language !== 'en'
      ? `\n\nIMPORTANT: Respond ENTIRELY in ${targetLangName} using native script for description, benefits, sideEffects, warnings, dosage, and Indian brand details. Keep JSON structure intact.` : '';

    // ── STEP 1: FORENSIC MEDICAL VISION OCR (Handles Blurry, Low-Res, Silver Foil Glare) ──
    let scanResult: any = {};
    let isForensicallyReconstructed = false;

    if (imageData) {
      const forensicVisionPrompt = `You are an elite forensic pharmaceutical vision OCR expert specializing in Indian medicine blister packs, foil strips, and bottles.
The user image may be BLURRY, SHINY (silver foil glare/reflection), OUT-OF-FOCUS, LOW-RESOLUTION, or taken at an angle.

FORENSIC IDENTIFICATION INSTRUCTIONS:
1. EXAMINE THROUGH BLUR & GLARE:
   - Look for letter fragments, font characteristics, brand logos, color themes, capsule/tablet blister pocket shapes, and red schedule H/H1 warning stripes.
   - Look for partial brand names: e.g. "B29" or "B-29 Max", "Health OK", "Dolo 650", "Augmentin", "Pan-D", "Shelcal", "Becosules", "Neurobion", "Limcee", "Supradyn", "Telma", "Rosuvas", "Montair", "Azithral", "Calpol", "Crocin", etc.
   - Look for salt fragments: e.g. "Mecobalamin", "Methylcobalamin", "Alpha Lipoic", "Pyridoxine", "Folic Acid", "Paracetamol", "Amoxicillin", "Pantoprazole", "Taurine", "Ginseng", "Zinc", "Multivitamin".
   - Look for strength clues: e.g. "1500 mcg", "500 mg", "650 mg", "625", "100 mg", "40 mg", "20 mg".
2. HEURISTIC RECONSTRUCTION:
   - Even if the image is partially blurred or has foil reflection, DEDUCE the most probable Indian medicine brand and generic composition using medical context.
   - For example:
     * If you see blue letters "B29" or "B 29" or "Max" with capsule blister -> Medicine is "B29 Max Capsule" (Methylcobalamin + Alpha Lipoic Acid).
     * If you see "Health" and "OK" or reddish/purple packaging -> Medicine is "Health OK" (Multivitamins, Multiminerals, Taurine, Ginseng).
     * If you see "Dolo" -> "Dolo 650" (Paracetamol 650mg).
     * If you see "Augm" or "625" -> "Augmentin 625 Duo" (Amoxicillin + Clavulanic Acid).
     * If you see "Pan" and "D" -> "Pan-D Capsule" (Pantoprazole + Domperidone).
3. If letters are blurry, NEVER return "Unknown Medicine" if any partial clue is visible. Reconstruct the most probable drug.
${manualClue ? `4. IMPORTANT USER CLUE: The user noted these letters/words visible on the packaging: "${manualClue}". Use this to immediately zero in on the exact medicine.\n` : ''}
Return ONLY valid JSON (no markdown):
{
  "identified": true,
  "medicineName": "<Identified or reconstructed brand name, e.g. B29 Max Capsule>",
  "genericName": "<Generic/salt composition, e.g. Methylcobalamin + Alpha Lipoic Acid + Pyridoxine + Folic Acid>",
  "manufacturer": "<Pharma company name if visible/deducible, e.g. Corona Remedies / Mankind / Blue Cross>",
  "form": "<tablet|capsule|syrup|injection|cream>",
  "strength": "<e.g. 1500mcg + 100mg or 500mg>",
  "packSize": "<e.g. strip of 10 capsules>",
  "mrp": "<Estimated or printed MRP in ₹>",
  "confidence": "<high|medium|reconstructed_from_fragments>",
  "isBlurry": true,
  "detectedClues": ["<clue 1 seen in image>", "<clue 2 seen in image>"],
  "rawTextRead": "<raw letters and fragments read from the packaging>"
}`;

      try {
        const { content: visionContent } = await callGroqVision(
          imageData,
          forensicVisionPrompt,
          'You are an Indian medical packaging forensic OCR engine. Even from blurry images or shiny blister foils, reconstruct the medicine accurately using partial clues. Return JSON only.'
        );
        scanResult = parseGroqJSON(visionContent);
        console.log('[Scanner] Forensic Vision identified:', scanResult.medicineName, '| Confidence:', scanResult.confidence, '| Clues:', scanResult.detectedClues);
      } catch (visionErr: any) {
        console.error('[Scanner] Vision error:', visionErr.message);
        scanResult = { medicineName: medicineName || '', identified: false };
      }
    } else if (medicineName) {
      scanResult = { medicineName, identified: true, confidence: 'high' };
    }

    // ── STEP 1.5: CROSS-REFERENCE AGAINST 253K INDIAN MEDICINES DATASET ──
    const searchCandidate = scanResult.medicineName || manualClue || medicineName || scanResult.rawTextRead || '';
    let datasetMed: any = null;
    if (searchCandidate) {
      const foundMed = await queryLocalDataset(searchCandidate);
      if (foundMed) {
        const candNorm = searchCandidate.toLowerCase().replace(/[^a-z0-9]/g, '');
        const foundNorm = (foundMed.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const isClose = candNorm.length >= 2 && (foundNorm.includes(candNorm) || candNorm.includes(foundNorm));

        if (isClose) {
          datasetMed = foundMed;
          console.log('[Scanner] Verified match with 253K Indian Medicines dataset:', datasetMed.name, '| Gen:', datasetMed.generic_name);
          isForensicallyReconstructed = true;
          if (!scanResult.identified || scanResult.confidence === 'reconstructed_from_fragments' || !scanResult.genericName) {
            scanResult.identified = true;
            scanResult.medicineName = datasetMed.name || scanResult.medicineName;
            scanResult.genericName = datasetMed.generic_name || datasetMed.short_composition1 || scanResult.genericName;
            scanResult.manufacturer = datasetMed.manufacturer || datasetMed.manufacturer_name || scanResult.manufacturer;
            scanResult.mrp = datasetMed.price ? `₹${datasetMed.price}` : scanResult.mrp;
            scanResult.packSize = datasetMed.pack_size || scanResult.packSize;
          }
        }
      }
    }

    const identifiedName = scanResult.medicineName || (datasetMed ? datasetMed.name : (medicineName || manualClue || 'Unknown Medicine'));
    const identifiedGeneric = scanResult.genericName || (datasetMed ? datasetMed.generic_name : '');
    const identifiedManufacturer = scanResult.manufacturer || (datasetMed ? datasetMed.manufacturer : '');

    // ── STEP 2: DEEP PHARMACEUTICAL CLINICAL REASONING (Llama 3.3 70B / GPT-OSS 120B) ──
    const detailPrompt = `You are a distinguished Indian clinical pharmacologist and pharmaceutical specialist.
Provide an exhaustive, in-depth clinical monograph for this medicine:

Medicine Brand Name: "${identifiedName}"
${identifiedGeneric ? `Generic / Salt Formulation: ${identifiedGeneric}` : ''}
${identifiedManufacturer ? `Manufacturer: ${identifiedManufacturer}` : ''}
${datasetMed?.price ? `Official Dataset Price: ₹${datasetMed.price}` : ''}
${scanResult.detectedClues?.length ? `Visual Clues Detected: ${scanResult.detectedClues.join(', ')}` : ''}

CRITICAL CLINICAL INSTRUCTIONS:
1. Provide DEEP, IN-DEPTH information — do NOT give vague or generic placeholders.
2. If this is a multivitamin/neuropathy/antioxidant pill (e.g. B29 Max, Health OK, Becosules, Neurobion):
   - Detail the individual roles of active ingredients (e.g. Methylcobalamin for nerve myelin sheath regeneration, Alpha Lipoic Acid as a potent antioxidant, Taurine/Ginseng for cellular vitality).
3. If this is an antibiotic, painkiller, or chronic medication, explain the precise mechanism of action and timing with food.
4. List genuine Indian pharmaceutical generic/alternative brands with realistic approximate market prices in ₹.

Return ONLY valid JSON (no markdown):
{
  "identified": true,
  "medicineName": "${identifiedName}",
  "genericName": "<full chemical / active ingredients>",
  "manufacturer": "${identifiedManufacturer || '<Top Indian Pharma>'}",
  "composition": "<exact strengths of each active component, e.g. Methylcobalamin (1500 mcg) + Alpha Lipoic Acid (100 mg)>",
  "form": "${scanResult.form || datasetMed?.type || 'capsule'}",
  "strength": "${scanResult.strength || '<strength>'}",
  "packSize": "${scanResult.packSize || datasetMed?.pack_size || 'strip of 10'}",
  "mrp": "${scanResult.mrp || (datasetMed?.price ? '₹' + datasetMed.price : '₹180 - ₹220')}",
  "category": "<precise pharmacological class, e.g. Nutritional Supplement / Neuropathic Adjuvant>",
  "prescriptionRequired": ${scanResult.form === 'injection' || (identifiedGeneric && /antibiotic|steroid|pregabalin|gabapentin/i.test(identifiedGeneric)) ? true : false},
  "description": "<in-depth 3-sentence clinical summary of what this medicine does, its therapeutic indication, and patient benefits>",
  "mechanismOfAction": "<detailed scientific explanation of how it works inside the body>",
  "uses": [
    "<detailed clinical indication 1, e.g. Peripheral diabetic neuropathy and nerve pain>",
    "<detailed clinical indication 2, e.g. Vitamin B12 deficiency and megaloblastic anemia>",
    "<detailed clinical indication 3, e.g. Cellular energy production and chronic fatigue>",
    "<detailed clinical indication 4, e.g. Antioxidant protection against free-radical tissue damage>"
  ],
  "sideEffects": [
    "<common side effect 1, e.g. Mild gastrointestinal upset or nausea>",
    "<common side effect 2, e.g. Metallic taste or transient loss of appetite>",
    "<rare side effect 3, e.g. Allergic skin rash or itching>",
    "<rare side effect 4, e.g. Headache or mild dizziness>"
  ],
  "dosage": "<precise administration instructions: e.g. 1 capsule once daily after lunch or dinner with water, or as directed by physician>",
  "storage": "Store below 25°C - 30°C in a dry place protected from direct sunlight and moisture.",
  "warnings": [
    "<critical warning 1: e.g. Inform doctor if you have chronic kidney disease or diabetes>",
    "<critical warning 2: e.g. Consult doctor if pregnant or breastfeeding>",
    "<critical warning 3: e.g. Avoid alcohol consumption as it reduces vitamin absorption>"
  ],
  "drugInteractions": [
    "<interaction 1: e.g. Metformin may decrease vitamin B12 absorption over prolonged use>",
    "<interaction 2: e.g. Proton pump inhibitors (Omeprazole, Pantoprazole) may impair oral bioavailability>"
  ],
  "symptomsItTreats": [
    "<symptom 1: e.g. Numbness or tingling sensation in feet and hands (pins and needles)>",
    "<symptom 2: e.g. Burning pain in extremities>",
    "<symptom 3: e.g. General weakness, lethargy, and physical exhaustion>",
    "<symptom 4: e.g. Muscle cramps and poor stamina>"
  ],
  "alternatives": [
    { "name": "<Alternative Indian Brand 1, e.g. Nurokind-Plus RF>", "manufacturer": "<Company, e.g. Mankind Pharma>", "approxPrice": "₹110" },
    { "name": "<Alternative Indian Brand 2, e.g. Rejunex-CD3>", "manufacturer": "<Company, e.g. Intas Pharmaceuticals>", "approxPrice": "₹195" },
    { "name": "<Alternative Indian Brand 3, e.g. Meganeuron Forte>", "manufacturer": "<Company, e.g. Aristo Pharmaceuticals>", "approxPrice": "₹140" }
  ],
  "forensicAnalysis": {
    "isBlurry": ${scanResult.isBlurry ? true : false},
    "confidence": "${scanResult.confidence || (datasetMed ? 'high' : 'medium')}",
    "forensicReconstructed": ${isForensicallyReconstructed || scanResult.confidence === 'reconstructed_from_fragments'},
    "detectedClues": ${JSON.stringify(scanResult.detectedClues || [])}
  }
}${langInstruction}`;

    const { content: detailContent } = await callGroq('scanner', {
      model: GROQ_MODELS.REASONING_COMPLEX,
      messages: [
        { role: 'system', content: 'You are an elite clinical pharmaceutical AI for India. Return ONLY valid JSON without preamble, markdown or thought tags.' },
        { role: 'user', content: detailPrompt },
      ],
      temperature: 0.2,
      max_tokens: 3000,
    });

    let parsed: any;
    try {
      parsed = parseGroqJSON(detailContent);
    } catch (parseErr) {
      console.warn('[Scanner] Detail parse error, using fallback:', parseErr);
      parsed = {
        identified: true,
        medicineName: identifiedName,
        genericName: identifiedGeneric || 'Active Formulation',
        manufacturer: identifiedManufacturer || 'Indian Pharmaceuticals',
        composition: identifiedGeneric || 'Standard formulation',
        form: scanResult.form || 'tablet',
        strength: scanResult.strength || 'Standard',
        packSize: scanResult.packSize || 'Standard pack',
        mrp: scanResult.mrp || 'Contact pharmacy',
        category: 'Prescription / Healthcare',
        prescriptionRequired: false,
        description: `${identifiedName} is a widely prescribed pharmaceutical formulation in India.`,
        uses: ['Please consult your doctor for detailed clinical indications.'],
        sideEffects: ['Generally well tolerated when taken as advised.'],
        dosage: 'As directed by physician. Take with water after meals.',
        storage: 'Store in a cool, dry place away from direct sunlight.',
        warnings: ['Do not exceed the recommended dose.', 'Keep out of reach of children.'],
        drugInteractions: [],
        symptomsItTreats: [],
        alternatives: [],
      };
    }

    // Attach forensic telemetry if missing
    if (!parsed.forensicAnalysis) {
      parsed.forensicAnalysis = {
        isBlurry: scanResult.isBlurry || false,
        confidence: scanResult.confidence || 'medium',
        forensicReconstructed: isForensicallyReconstructed || scanResult.confidence === 'reconstructed_from_fragments',
        detectedClues: scanResult.detectedClues || [],
      };
    }

    return NextResponse.json({ ...parsed, success: true });
  } catch (error: any) {
    console.error('[Scanner API Error]:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
