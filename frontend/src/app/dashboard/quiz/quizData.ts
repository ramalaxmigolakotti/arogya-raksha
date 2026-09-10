export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface QuizCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  questions: QuizQuestion[];
}

export const quizCategories: QuizCategory[] = [
  {
    id: 'blood-pressure',
    name: 'Blood Pressure',
    description: 'Test your knowledge about hypertension, blood pressure management, and cardiovascular health.',
    icon: '🩸',
    color: 'rose',
    gradient: 'from-rose-500 to-pink-600',
    questions: [
      {
        id: 1,
        question: 'What is considered a normal blood pressure reading for an adult?',
        options: ['140/90 mmHg', '120/80 mmHg', '160/100 mmHg', '100/60 mmHg'],
        correctAnswer: 1,
        explanation: 'A normal blood pressure reading is around 120/80 mmHg. Readings consistently above 130/80 mmHg are considered high blood pressure (hypertension).'
      },
      {
        id: 2,
        question: 'Which number in a blood pressure reading represents the pressure during heartbeats?',
        options: ['Diastolic (bottom number)', 'Systolic (top number)', 'Both numbers', 'Neither'],
        correctAnswer: 1,
        explanation: 'The systolic pressure (top number) measures the force of blood against artery walls when the heart beats. The diastolic (bottom) measures when the heart rests between beats.'
      },
      {
        id: 3,
        question: 'Which of the following is a major risk factor for high blood pressure?',
        options: ['Drinking green tea', 'Regular exercise', 'Excessive salt intake', 'Eating fruits'],
        correctAnswer: 2,
        explanation: 'Excessive salt (sodium) intake causes the body to retain water, increasing blood volume and pressure. The recommended limit is less than 2,300 mg of sodium per day.'
      },
      {
        id: 4,
        question: 'What is "white coat hypertension"?',
        options: ['BP caused by wearing tight clothes', 'High BP only at the doctor\'s office', 'Low BP in hospitals', 'A type of medication'],
        correctAnswer: 1,
        explanation: 'White coat hypertension refers to elevated blood pressure readings in a medical setting due to anxiety, while home readings remain normal.'
      },
      {
        id: 5,
        question: 'Which organ is most directly damaged by prolonged high blood pressure?',
        options: ['Liver', 'Kidneys', 'Stomach', 'Lungs'],
        correctAnswer: 1,
        explanation: 'High blood pressure damages the blood vessels in the kidneys, reducing their ability to filter blood properly. It is one of the leading causes of kidney failure.'
      },
      {
        id: 6,
        question: 'What lifestyle change is most effective in reducing high blood pressure?',
        options: ['Sleeping more', 'Regular aerobic exercise', 'Drinking coffee', 'Eating more protein'],
        correctAnswer: 1,
        explanation: 'Regular aerobic exercise (150 min/week) can lower systolic BP by 5-8 mmHg. It strengthens the heart so it pumps more blood with less effort.'
      },
      {
        id: 7,
        question: 'Which mineral helps counteract the effects of sodium on blood pressure?',
        options: ['Calcium', 'Iron', 'Potassium', 'Zinc'],
        correctAnswer: 2,
        explanation: 'Potassium helps balance sodium levels in cells and relaxes blood vessel walls. Foods like bananas, spinach, and sweet potatoes are rich sources.'
      },
      {
        id: 8,
        question: 'At what BP reading should you seek emergency medical care?',
        options: ['130/85 mmHg', '140/90 mmHg', '180/120 mmHg or higher', '150/95 mmHg'],
        correctAnswer: 2,
        explanation: 'A reading of 180/120 mmHg or higher is a hypertensive crisis. If accompanied by symptoms like chest pain or difficulty breathing, call emergency services immediately.'
      },
      {
        id: 9,
        question: 'Why is high blood pressure called the "silent killer"?',
        options: ['It only happens while sleeping', 'It often has no noticeable symptoms', 'It kills instantly', 'It cannot be detected'],
        correctAnswer: 1,
        explanation: 'High blood pressure typically has no symptoms until it causes serious damage to the heart, brain, kidneys, or eyes. Regular monitoring is crucial.'
      },
      {
        id: 10,
        question: 'Which dietary approach is specifically recommended for lowering blood pressure?',
        options: ['Keto diet', 'DASH diet', 'Carnivore diet', 'Intermittent fasting'],
        correctAnswer: 1,
        explanation: 'The DASH (Dietary Approaches to Stop Hypertension) diet emphasizes fruits, vegetables, whole grains, and low-fat dairy while limiting saturated fat and sodium.'
      }
    ]
  },
  {
    id: 'diabetes',
    name: 'Diabetes & Sugar',
    description: 'How well do you understand diabetes, blood sugar levels, and insulin management?',
    icon: '🍬',
    color: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    questions: [
      {
        id: 1,
        question: 'What is the normal fasting blood sugar level?',
        options: ['70-100 mg/dL', '140-200 mg/dL', '200-300 mg/dL', '50-60 mg/dL'],
        correctAnswer: 0,
        explanation: 'Normal fasting blood sugar is 70-100 mg/dL. Prediabetes is 100-125 mg/dL, and diabetes is diagnosed at 126 mg/dL or higher on two separate tests.'
      },
      {
        id: 2,
        question: 'What is the primary difference between Type 1 and Type 2 diabetes?',
        options: [
          'Type 1 is more common',
          'Type 1 involves no insulin production; Type 2 involves insulin resistance',
          'Type 2 only affects children',
          'There is no difference'
        ],
        correctAnswer: 1,
        explanation: 'In Type 1, the immune system destroys insulin-producing cells. In Type 2 (90-95% of cases), the body becomes resistant to insulin or doesn\'t produce enough.'
      },
      {
        id: 3,
        question: 'What does the HbA1c test measure?',
        options: ['Blood sugar right now', 'Average blood sugar over 2-3 months', 'Insulin levels', 'Cholesterol levels'],
        correctAnswer: 1,
        explanation: 'HbA1c reflects the average blood sugar level over the past 2-3 months by measuring the percentage of hemoglobin coated with sugar. Normal is below 5.7%.'
      },
      {
        id: 4,
        question: 'Which organ produces insulin?',
        options: ['Liver', 'Kidneys', 'Pancreas', 'Heart'],
        correctAnswer: 2,
        explanation: 'The pancreas produces insulin through beta cells in the islets of Langerhans. Insulin allows cells to absorb glucose from the blood for energy.'
      },
      {
        id: 5,
        question: 'What is hypoglycemia?',
        options: ['Very high blood sugar', 'Very low blood sugar', 'Normal blood sugar', 'High cholesterol'],
        correctAnswer: 1,
        explanation: 'Hypoglycemia occurs when blood sugar drops below 70 mg/dL. Symptoms include shakiness, sweating, confusion, and in severe cases, loss of consciousness.'
      },
      {
        id: 6,
        question: 'Which food has the highest glycemic index?',
        options: ['Brown rice', 'White bread', 'Oats', 'Lentils'],
        correctAnswer: 1,
        explanation: 'White bread has a high glycemic index (~75), causing rapid blood sugar spikes. Low-GI foods like lentils (~30) are digested slowly and provide steady energy.'
      },
      {
        id: 7,
        question: 'What is a common early symptom of diabetes?',
        options: ['Hair growth', 'Frequent urination', 'Improved vision', 'Weight gain'],
        correctAnswer: 1,
        explanation: 'Frequent urination (polyuria) occurs because excess sugar in the blood causes the kidneys to work overtime to filter and absorb it. Other signs include excessive thirst and hunger.'
      },
      {
        id: 8,
        question: 'Which complication is most associated with uncontrolled diabetes?',
        options: ['Hearing loss', 'Diabetic retinopathy (eye damage)', 'Hair loss', 'Nail fungus'],
        correctAnswer: 1,
        explanation: 'Diabetic retinopathy damages blood vessels in the retina and is the leading cause of blindness in working-age adults. Regular eye exams are essential for diabetics.'
      },
      {
        id: 9,
        question: 'How does regular exercise help manage diabetes?',
        options: ['It increases blood sugar', 'It improves insulin sensitivity', 'It has no effect', 'It produces more insulin'],
        correctAnswer: 1,
        explanation: 'Exercise makes muscles more sensitive to insulin, allowing them to use glucose more efficiently. Even a 30-minute walk can lower blood sugar for up to 24 hours.'
      },
      {
        id: 10,
        question: 'What is gestational diabetes?',
        options: ['Diabetes in elderly people', 'Diabetes that develops during pregnancy', 'A mild form of Type 1 diabetes', 'Diabetes caused by surgery'],
        correctAnswer: 1,
        explanation: 'Gestational diabetes develops during pregnancy due to hormonal changes affecting insulin action. It usually resolves after delivery but increases the risk of Type 2 diabetes later.'
      }
    ]
  },
  {
    id: 'asthma',
    name: 'Asthma',
    description: 'Understand asthma triggers, management, and breathing techniques for better lung health.',
    icon: '🫁',
    color: 'sky',
    gradient: 'from-sky-500 to-blue-600',
    questions: [
      {
        id: 1,
        question: 'What happens to the airways during an asthma attack?',
        options: ['They widen', 'They narrow and swell', 'Nothing happens', 'They dry out'],
        correctAnswer: 1,
        explanation: 'During an asthma attack, the muscles around the airways tighten (bronchospasm), the lining swells, and excess mucus is produced, making breathing difficult.'
      },
      {
        id: 2,
        question: 'Which type of inhaler provides quick relief during an asthma attack?',
        options: ['Preventer (corticosteroid)', 'Reliever (bronchodilator/blue inhaler)', 'Combination inhaler', 'Nasal inhaler'],
        correctAnswer: 1,
        explanation: 'Reliever inhalers (typically blue, containing salbutamol) relax airway muscles within minutes. They should be carried at all times but used as needed, not regularly.'
      },
      {
        id: 3,
        question: 'Which of these is a common asthma trigger?',
        options: ['Drinking water', 'Dust mites', 'Eating vegetables', 'Sleeping well'],
        correctAnswer: 1,
        explanation: 'Dust mites are one of the most common asthma triggers. Others include pollen, pet dander, mold, smoke, cold air, exercise, and strong emotions.'
      },
      {
        id: 4,
        question: 'What device measures how well air moves out of the lungs?',
        options: ['Thermometer', 'Peak flow meter', 'Blood pressure cuff', 'Pulse oximeter'],
        correctAnswer: 1,
        explanation: 'A peak flow meter measures peak expiratory flow rate (PEFR). Regular monitoring helps track asthma control and predict attacks before symptoms worsen.'
      },
      {
        id: 5,
        question: 'Can asthma be completely cured?',
        options: ['Yes, with antibiotics', 'Yes, with surgery', 'No, but it can be well-controlled', 'Yes, it goes away with age'],
        correctAnswer: 2,
        explanation: 'There is currently no cure for asthma, but with proper medication, trigger avoidance, and an action plan, most people with asthma can live fully active lives.'
      },
      {
        id: 6,
        question: 'What is the role of a preventer inhaler in asthma management?',
        options: ['Provides instant relief', 'Reduces ongoing airway inflammation', 'Treats infections', 'Monitors lung function'],
        correctAnswer: 1,
        explanation: 'Preventer inhalers (corticosteroids) reduce inflammation and mucus in the airways over time. They must be used daily, even when feeling well, to prevent attacks.'
      },
      {
        id: 7,
        question: 'Which breathing technique is often recommended for asthma patients?',
        options: ['Rapid shallow breathing', 'Pursed lip breathing', 'Holding breath for 30 seconds', 'Mouth breathing only'],
        correctAnswer: 1,
        explanation: 'Pursed lip breathing slows down breathing, keeps airways open longer, and helps move old air out of the lungs. It reduces work of breathing during an attack.'
      },
      {
        id: 8,
        question: 'What is exercise-induced asthma?',
        options: ['Asthma cured by exercise', 'Asthma symptoms triggered by physical activity', 'A fake condition', 'Asthma that prevents all exercise'],
        correctAnswer: 1,
        explanation: 'Exercise-induced bronchoconstriction occurs during or after exercise, especially in cold, dry air. With proper management, people with this condition can still exercise.'
      },
      {
        id: 9,
        question: 'Which of these is NOT typically an asthma symptom?',
        options: ['Wheezing', 'Chest tightness', 'Fever', 'Shortness of breath'],
        correctAnswer: 2,
        explanation: 'Fever is not a typical asthma symptom — it suggests an infection. Classic asthma symptoms include wheezing, coughing (especially at night), chest tightness, and breathlessness.'
      },
      {
        id: 10,
        question: 'What should you do first if someone is having a severe asthma attack and has no inhaler?',
        options: ['Make them lie down', 'Have them sit upright and call emergency services', 'Give them cold water', 'Ask them to exercise'],
        correctAnswer: 1,
        explanation: 'Keep the person calm, seated upright (leaning slightly forward), and call emergency services. Lying down can make breathing harder. Loosen tight clothing around their chest.'
      }
    ]
  },
  {
    id: 'heart-health',
    name: 'Heart Health',
    description: 'Learn about heart disease prevention, symptoms, and keeping your cardiovascular system strong.',
    icon: '❤️',
    color: 'red',
    gradient: 'from-red-500 to-rose-600',
    questions: [
      {
        id: 1,
        question: 'What is the leading cause of death worldwide?',
        options: ['Cancer', 'Heart disease', 'Diabetes', 'Respiratory infections'],
        correctAnswer: 1,
        explanation: 'Cardiovascular disease is the #1 cause of death globally, claiming approximately 17.9 million lives each year — about 32% of all deaths worldwide.'
      },
      {
        id: 2,
        question: 'What is a normal resting heart rate for adults?',
        options: ['40-50 bpm', '60-100 bpm', '100-140 bpm', '120-160 bpm'],
        correctAnswer: 1,
        explanation: 'A normal resting heart rate for adults is 60-100 beats per minute. Well-trained athletes may have rates as low as 40-60 bpm, which indicates excellent cardiovascular fitness.'
      },
      {
        id: 3,
        question: 'Which type of cholesterol is known as "good" cholesterol?',
        options: ['LDL', 'HDL', 'VLDL', 'Triglycerides'],
        correctAnswer: 1,
        explanation: 'HDL (High-Density Lipoprotein) carries cholesterol away from arteries to the liver for removal. Higher HDL levels (above 60 mg/dL) are protective against heart disease.'
      },
      {
        id: 4,
        question: 'What is the classic warning sign of a heart attack?',
        options: ['Headache', 'Chest pain or pressure spreading to arm/jaw', 'Back pain', 'Ankle swelling'],
        correctAnswer: 1,
        explanation: 'The classic sign is chest pain/pressure (often described as an elephant sitting on the chest) that may radiate to the left arm, jaw, or back. Women may also experience nausea and fatigue.'
      },
      {
        id: 5,
        question: 'Which fat is most harmful to heart health?',
        options: ['Monounsaturated fat', 'Polyunsaturated fat', 'Trans fat', 'Omega-3 fatty acids'],
        correctAnswer: 2,
        explanation: 'Trans fats raise LDL (bad) cholesterol and lower HDL (good) cholesterol, dramatically increasing heart disease risk. They are found in partially hydrogenated oils used in processed foods.'
      },
      {
        id: 6,
        question: 'What does an ECG (Electrocardiogram) measure?',
        options: ['Blood pressure', 'Electrical activity of the heart', 'Oxygen levels', 'Cholesterol levels'],
        correctAnswer: 1,
        explanation: 'An ECG records the electrical signals that control heart rhythm. It can detect irregular heartbeats (arrhythmias), heart attacks, and other cardiac conditions.'
      },
      {
        id: 7,
        question: 'How does smoking affect heart health?',
        options: ['It has no effect', 'It strengthens blood vessels', 'It damages blood vessels and reduces oxygen in blood', 'It lowers cholesterol'],
        correctAnswer: 2,
        explanation: 'Smoking damages blood vessel walls, raises blood pressure, reduces oxygen carrying capacity, and increases blood clotting — doubling the risk of heart attack.'
      },
      {
        id: 8,
        question: 'What is atherosclerosis?',
        options: ['A type of heart rhythm', 'Buildup of plaque in artery walls', 'A heart surgery procedure', 'A medication for heart disease'],
        correctAnswer: 1,
        explanation: 'Atherosclerosis is the buildup of fatty deposits (plaque) inside artery walls, causing them to narrow and harden. It is the underlying cause of most heart attacks and strokes.'
      },
      {
        id: 9,
        question: 'Which nutrient is most important for heart health?',
        options: ['Omega-3 fatty acids', 'Vitamin C', 'Calcium', 'Iron'],
        correctAnswer: 0,
        explanation: 'Omega-3 fatty acids (found in fish, walnuts, flaxseeds) reduce inflammation, lower triglycerides, and decrease the risk of arrhythmias — all key for heart health.'
      },
      {
        id: 10,
        question: 'What is cardiac arrest?',
        options: ['A slow heart rate', 'The heart suddenly stops beating', 'High blood pressure', 'Chest pain during exercise'],
        correctAnswer: 1,
        explanation: 'Cardiac arrest is when the heart suddenly stops pumping blood. Without CPR within minutes, it is fatal. It differs from a heart attack, where blood flow is blocked but the heart still beats.'
      }
    ]
  },
  {
    id: 'nutrition',
    name: 'Nutrition & Diet',
    description: 'Explore your understanding of balanced nutrition, vitamins, and healthy eating habits.',
    icon: '🥗',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    questions: [
      {
        id: 1,
        question: 'How many essential nutrients does the human body need?',
        options: ['About 10', 'About 20', 'About 40', 'About 60'],
        correctAnswer: 2,
        explanation: 'The human body needs approximately 40 essential nutrients from food, including vitamins, minerals, amino acids, and fatty acids that the body cannot synthesize on its own.'
      },
      {
        id: 2,
        question: 'What is the recommended daily water intake for an average adult?',
        options: ['1-2 glasses', '4-5 glasses', '8-10 glasses (2-2.5 liters)', '15-20 glasses'],
        correctAnswer: 2,
        explanation: 'The general recommendation is about 8-10 glasses (2-2.5 liters) of water daily. However, needs vary based on activity level, climate, and individual health conditions.'
      },
      {
        id: 3,
        question: 'Which vitamin is produced by the body when exposed to sunlight?',
        options: ['Vitamin A', 'Vitamin B12', 'Vitamin C', 'Vitamin D'],
        correctAnswer: 3,
        explanation: 'Vitamin D is synthesized in the skin when exposed to UVB sunlight. It is essential for calcium absorption, bone health, and immune function. Deficiency is very common in India.'
      },
      {
        id: 4,
        question: 'What is the main role of dietary fiber?',
        options: ['Provides energy', 'Builds muscle', 'Aids digestion and prevents constipation', 'Strengthens bones'],
        correctAnswer: 2,
        explanation: 'Dietary fiber promotes healthy digestion, prevents constipation, helps maintain healthy blood sugar levels, and lowers cholesterol. Good sources include whole grains, fruits, and vegetables.'
      },
      {
        id: 5,
        question: 'Which deficiency causes anemia?',
        options: ['Vitamin C', 'Calcium', 'Iron', 'Zinc'],
        correctAnswer: 2,
        explanation: 'Iron deficiency anemia is the most common nutritional deficiency worldwide. Iron is needed to make hemoglobin, which carries oxygen in red blood cells. Symptoms include fatigue and weakness.'
      },
      {
        id: 6,
        question: 'What are complete proteins?',
        options: ['Proteins from plants only', 'Proteins that contain all 9 essential amino acids', 'Proteins with no fat', 'Proteins from supplements only'],
        correctAnswer: 1,
        explanation: 'Complete proteins contain all 9 essential amino acids. Animal sources (eggs, milk, meat, fish) are complete. Plant sources can be combined (rice + dal) to form complete proteins.'
      },
      {
        id: 7,
        question: 'Which cooking method best preserves nutrients in vegetables?',
        options: ['Deep frying', 'Boiling for a long time', 'Steaming', 'Soaking in water overnight'],
        correctAnswer: 2,
        explanation: 'Steaming preserves the most nutrients because vegetables don\'t come in direct contact with water (which leaches vitamins) and cooking time is shorter than boiling.'
      },
      {
        id: 8,
        question: 'What does BMI (Body Mass Index) measure?',
        options: ['Body fat percentage', 'Weight relative to height', 'Muscle mass', 'Bone density'],
        correctAnswer: 1,
        explanation: 'BMI = weight (kg) / height² (m²). It is a screening tool: <18.5 is underweight, 18.5-24.9 is normal, 25-29.9 is overweight, and >30 is obese. It doesn\'t directly measure body fat.'
      },
      {
        id: 9,
        question: 'Which food group should make up the largest portion of your plate?',
        options: ['Proteins', 'Fats', 'Vegetables and fruits', 'Sweets'],
        correctAnswer: 2,
        explanation: 'According to the MyPlate guidelines, vegetables and fruits should fill half your plate. They provide essential vitamins, minerals, fiber, and antioxidants with relatively few calories.'
      },
      {
        id: 10,
        question: 'What is the healthiest type of cooking oil for daily use in Indian cooking?',
        options: ['Palm oil', 'Mustard oil / Cold-pressed oils', 'Refined vegetable oil', 'Coconut oil for everything'],
        correctAnswer: 1,
        explanation: 'Cold-pressed oils (mustard, groundnut, sesame) retain more nutrients. Experts recommend rotating oils. Mustard oil is rich in omega-3 and has a high smoke point, ideal for Indian cooking.'
      }
    ]
  },
  {
    id: 'mental-health',
    name: 'Mental Health',
    description: 'Assess your awareness of stress management, mental wellness, and psychological well-being.',
    icon: '🧠',
    color: 'violet',
    gradient: 'from-violet-500 to-purple-600',
    questions: [
      {
        id: 1,
        question: 'How many hours of sleep are recommended for adults for optimal mental health?',
        options: ['4-5 hours', '5-6 hours', '7-9 hours', '10-12 hours'],
        correctAnswer: 2,
        explanation: 'Adults need 7-9 hours of quality sleep for optimal mental and physical health. Chronic sleep deprivation increases the risk of depression, anxiety, and cognitive decline.'
      },
      {
        id: 2,
        question: 'What is the most common mental health disorder worldwide?',
        options: ['Schizophrenia', 'Bipolar disorder', 'Depression', 'OCD'],
        correctAnswer: 2,
        explanation: 'Depression affects over 280 million people globally. It is more than just feeling sad — it involves persistent low mood, loss of interest, energy changes, and can affect daily functioning.'
      },
      {
        id: 3,
        question: 'Which hormone is often called the "stress hormone"?',
        options: ['Insulin', 'Cortisol', 'Melatonin', 'Serotonin'],
        correctAnswer: 1,
        explanation: 'Cortisol is released by the adrenal glands during stress. While helpful in short bursts, chronically elevated cortisol can lead to weight gain, high BP, weakened immunity, and anxiety.'
      },
      {
        id: 4,
        question: 'What is mindfulness meditation?',
        options: ['Thinking about the past', 'Focusing on the present moment without judgment', 'Planning for the future', 'Avoiding all thoughts'],
        correctAnswer: 1,
        explanation: 'Mindfulness involves paying attention to the present moment — thoughts, sensations, emotions — without judgment. Research shows it reduces stress, anxiety, and improves emotional regulation.'
      },
      {
        id: 5,
        question: 'Which activity releases endorphins (natural mood boosters)?',
        options: ['Watching TV', 'Physical exercise', 'Social media scrolling', 'Eating junk food'],
        correctAnswer: 1,
        explanation: 'Exercise releases endorphins, serotonin, and dopamine — all natural mood elevators. Even 30 minutes of moderate exercise can significantly reduce symptoms of depression and anxiety.'
      },
      {
        id: 6,
        question: 'What is a panic attack?',
        options: ['A heart attack', 'A sudden episode of intense fear with physical symptoms', 'A type of anger outburst', 'Fainting'],
        correctAnswer: 1,
        explanation: 'A panic attack is a sudden surge of intense fear triggering physical symptoms like rapid heartbeat, sweating, trembling, and shortness of breath. It peaks within minutes and is not dangerous.'
      },
      {
        id: 7,
        question: 'Which of these is a healthy way to cope with stress?',
        options: ['Alcohol consumption', 'Social isolation', 'Talking to a trusted person', 'Excessive sleeping'],
        correctAnswer: 2,
        explanation: 'Social support is one of the strongest protective factors for mental health. Talking to a trusted friend, family member, or therapist helps process emotions and find solutions.'
      },
      {
        id: 8,
        question: 'What is the impact of excessive social media use on mental health?',
        options: ['Always positive', 'Can increase anxiety, depression, and loneliness', 'No impact at all', 'Improves self-esteem'],
        correctAnswer: 1,
        explanation: 'Studies show excessive social media use is linked to increased rates of anxiety, depression, loneliness, and poor body image, especially in young adults. Mindful usage is recommended.'
      },
      {
        id: 9,
        question: 'What is the importance of seeking professional help for mental health?',
        options: ['Only for severe cases', 'It is a sign of weakness', 'Early intervention leads to better outcomes', 'Not necessary if you have friends'],
        correctAnswer: 2,
        explanation: 'Seeking professional help early is a sign of strength, not weakness. Mental health conditions are treatable, and early intervention significantly improves recovery outcomes.'
      },
      {
        id: 10,
        question: 'Which breathing technique is commonly used to reduce acute anxiety?',
        options: ['Rapid breathing', '4-7-8 breathing technique', 'Holding breath for 2 minutes', 'Breathing into a paper bag always'],
        correctAnswer: 1,
        explanation: 'The 4-7-8 technique (inhale 4 sec, hold 7 sec, exhale 8 sec) activates the parasympathetic nervous system, slowing heart rate and promoting calm. It is a simple, effective anxiety tool.'
      }
    ]
  }
];
