'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity, MessageSquare, Mail, MapPin, Phone,
  ChevronRight, Heart, Facebook, Twitter, Instagram,
  Linkedin, Youtube
} from 'lucide-react';

const quickLinks = [
  { label: 'Home', href: '/dashboard' },
  { label: 'Doctors', href: '/dashboard/doctors' },
  { label: 'Hospitals', href: '/dashboard/hospitals' },
  { label: 'Health Predictors', href: '/dashboard/predictors' },
  { label: 'Appointments', href: '/dashboard/appointments' },
];

const services = [
  'Blood Pressure Check',
  'Blood Sugar Test',
  'Full Blood Count',
  'X-Ray Scan',
  'Eye Check-Up',
];

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-500 p-2 rounded-xl">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black text-emerald-700">Arogya Raksha</h3>
                <p className="text-xs font-bold text-emerald-500">Healthcare Solutions</p>
              </div>
            </div>
            <p className="text-sm text-slate-500 italic leading-relaxed mb-6">
              Your trusted partner in healthcare innovation. We&apos;re committed to providing exceptional medical care with cutting-edge technology and compassionate service.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone className="h-4 w-4 text-emerald-500" />
                <span>+91 7981502973</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail className="h-4 w-4 text-emerald-500" />
                <span>arogyaraksha@gmail.com</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <span>India</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-5">Quick Links</h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium group">
                    <ChevronRight className="h-3 w-3 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-5">Our Services</h3>
            <ul className="space-y-3">
              {services.map((service) => (
                <li key={service} className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                  {service}
                </li>
              ))}
            </ul>
          </div>

          {/* Stay Connected */}
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-5">Stay Connected</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">
              Subscribe for health tips, medical updates, and wellness insights delivered to your inbox.
            </p>
            <form onSubmit={handleSubscribe} className="flex mb-6">
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Enter your email"
                className="flex-1 border-2 border-slate-200 rounded-l-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400" />
              <button type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-r-xl font-bold text-sm transition-colors">
                {subscribed ? '✓' : 'Subscribe'}
              </button>
            </form>
            {/* Social Icons */}
            <div className="flex gap-3">
              {[
                { icon: () => <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>, href: 'https://github.com/ifthekharahmad69-ship-it/Arogya', color: 'hover:bg-slate-100 hover:text-slate-800' },
                { icon: Facebook, href: '#', color: 'hover:bg-blue-50 hover:text-blue-600' },
                { icon: Twitter, href: '#', color: 'hover:bg-sky-50 hover:text-sky-600' },
                { icon: Instagram, href: '#', color: 'hover:bg-pink-50 hover:text-pink-600' },
                { icon: Linkedin, href: '#', color: 'hover:bg-blue-50 hover:text-blue-700' },
                { icon: Youtube, href: '#', color: 'hover:bg-red-50 hover:text-red-600' },
              ].map((s, i) => (
                <a key={i} href={s.href} target={s.href !== '#' ? '_blank' : undefined} rel={s.href !== '#' ? 'noopener noreferrer' : undefined}
                  className={`p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 transition-all ${s.color} shadow-sm hover:shadow-md`}>
                  {typeof s.icon === 'function' ? <s.icon /> : <s.icon className="h-4 w-4" />}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar with Sarvam Branding */}
        <div className="mt-10 pt-6 border-t border-slate-200">
          {/* Sarvam AI Stack Banner */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-5 p-4 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl">
            <span className="text-xs font-bold text-slate-400 mr-1">🤖 AI Powered by</span>
            {[
              { label: '✦ Sarvam AI', gradient: 'from-blue-400 via-violet-500 to-pink-500' },
              { label: '⚡ Sarvam Models', gradient: 'from-amber-400 via-orange-500 to-rose-500' },
              { label: '👁 Sarvam NLP', gradient: 'from-cyan-400 via-blue-500 to-indigo-600' },
              { label: '▲ Sarvam Base', gradient: 'from-blue-500 to-cyan-400' },
              { label: '◆ Sarvam Pro', gradient: 'from-violet-500 via-purple-600 to-indigo-600' },
            ].map((b) => (
              <span key={b.label}
                className={`inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${b.gradient} text-white shadow-sm`}>
                {b.label}
              </span>
            ))}
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-sm text-slate-400">© 2026 Arogya Raksha Healthcare. All rights reserved.</p>
            <p className="text-sm text-slate-400">Designed with <Heart className="h-3 w-3 inline text-red-400 fill-red-400" /> by Team SSRRK</p>
          </div>
        </div>

      </div>

      {/* Floating WhatsApp Button */}
      <a href="https://wa.me/917981502973" target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-[#25D366] hover:bg-[#20BD5A] text-white p-4 rounded-full shadow-2xl shadow-green-500/30 transition-all hover:scale-110 z-50">
        <MessageSquare className="h-6 w-6" />
      </a>
    </footer>
  );
}
