'use client';

import { Star } from 'lucide-react';

const doctorTestimonials = [
  {
    name: "Dr. Sameer",
    role: "General Surgeon",
    text: "This platform has streamlined our clinic operations significantly. Patient management is much more organized.",
    rating: 5,
    image: "/assets/doctors/dr_sameer.png"
  },
  {
    name: "Dr. Rama Lakshmi",
    role: "Dermatologist",
    text: "Excellent platform for managing appointments. Automated reminders reduce no-shows dramatically.",
    rating: 5,
    image: "/assets/doctors/dr_rama_lakshmi.png"
  },
  {
    name: "Dr. Prasanna",
    role: "Cardiologist",
    text: "The appointment booking system is incredibly efficient. It saves valuable time and helps me focus on patient care.",
    rating: 5,
    image: "/assets/doctors/dr_prasanna.png"
  },
  {
    name: "Dr. Bindhu",
    role: "Pediatrician",
    text: "A wonderful platform that helps me connect with parents and provide better child healthcare. The scheduling system is seamless.",
    rating: 5,
    image: "/assets/doctors/dr_bindhu.png"
  },
];

const patientTestimonials = [
  {
    name: "Ravi Kumar",
    role: "Patient",
    text: "Scheduling appointments has never been easier. The interface is intuitive and reminders are very helpful!",
    rating: 5
  },
  {
    name: "Priya Sharma",
    role: "Patient",
    text: "Booking appointments online 24/7 is a game-changer. The confirmation system gives me peace of mind.",
    rating: 5
  },
  {
    name: "Arjun Reddy",
    role: "Patient",
    text: "The wait time has reduced significantly since using this platform. The video call feature is amazing!",
    rating: 4
  },
  {
    name: "Meena Devi",
    role: "Patient",
    text: "The health predictors helped me understand my risk factors. Very informative and easy to use.",
    rating: 5
  },
];

export default function Testimonials() {
  return (
    <section className="py-16">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 mb-3">
          Voices of Trust
        </h2>
        <p className="text-slate-500 font-medium max-w-2xl mx-auto">
          Real stories from doctors and patients sharing their positive experiences with our healthcare platform.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Medical Professionals */}
        <div>
          <div className="flex items-center gap-2 mb-6 justify-center">
            <span className="text-2xl">🩺</span>
            <h3 className="text-xl font-black text-slate-800">Medical Professionals</h3>
          </div>
          <div className="space-y-4">
            {doctorTestimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-4 mb-3">
                  <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-100" />
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800">{t.name}</h4>
                    <p className="text-xs text-emerald-600 font-medium">{t.role}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={`h-3.5 w-3.5 ${j < t.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-600 italic leading-relaxed">&ldquo;{t.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>

        {/* Patients */}
        <div>
          <div className="flex items-center gap-2 mb-6 justify-center">
            <span className="text-2xl">👤</span>
            <h3 className="text-xl font-black text-slate-800">Patients</h3>
          </div>
          <div className="space-y-4">
            {patientTestimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-black text-lg border-2 border-emerald-100">
                    {t.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800">{t.name}</h4>
                    <p className="text-xs text-emerald-600 font-medium">{t.role}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={`h-3.5 w-3.5 ${j < t.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-600 italic leading-relaxed">&ldquo;{t.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
