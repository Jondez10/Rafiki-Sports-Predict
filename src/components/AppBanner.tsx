import React from 'react';
import { Sparkles, Trophy, TrendingUp, ShieldCheck, Flame, ArrowRight, Zap, Target } from 'lucide-react';
import { motion } from 'motion/react';

interface AppBannerProps {
  onExploreClick: () => void;
  onVipClick: () => void;
  language: 'en' | 'sw';
  theme: 'midnight' | 'high-contrast';
  isVip?: boolean;
}

export default function AppBanner({
  onExploreClick,
  onVipClick,
  language,
  theme,
  isVip = false
}: AppBannerProps) {
  return (
    <div 
      className={`relative rounded-3xl overflow-hidden mb-8 border transition-all duration-300 shadow-2xl ${
        theme === 'high-contrast'
          ? 'bg-slate-900 border-emerald-600/40'
          : 'bg-zinc-950 border-zinc-800'
      }`}
      id="rafiki-app-banner"
    >
      {/* Background Glows and Atmospheric Energy */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Dual Column Layout: Content Left, Rich Banner Artwork Right */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center p-6 sm:p-8 lg:p-10">
        
        {/* Left Info Column */}
        <div className="lg:col-span-7 space-y-5">
          {/* Top Pill with Logo & Live Status */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-mono font-bold">
              <div className="w-5 h-5 rounded-full overflow-hidden ring-1 ring-emerald-400/50 shrink-0">
                <img 
                  src="/src/assets/images/rafiki_app_logo_1787728334689.jpg" 
                  alt="Rafiki Predict" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <span>RAFIKI PREDICT</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-full text-xs font-mono font-semibold">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
              <span>{language === 'en' ? 'SMART PICKS • BIG WINS' : 'UTABIRI BORA • USHINDI MKUBWA'}</span>
            </div>
          </div>

          {/* Main Hero Slogan & Headline */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-black tracking-tight text-white uppercase leading-[1.1]">
              Predict. <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">Analyze.</span> Win.
            </h1>
            <p className="text-sm sm:text-base font-medium text-emerald-300 font-mono tracking-wide uppercase">
              {language === 'en' 
                ? 'Your Winning Edge in Every Match' 
                : 'Nguvu Yako ya Ushindi Katika Kila Mechi'}
            </p>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed max-w-xl">
              {language === 'en'
                ? 'Experience East Africa’s premier AI-powered sports consensus engine. High-confidence single match probability, daily high-yield accumulators, and verifiably tracked performance metrics.'
                : 'Pata uchambuzi wa hali ya juu wa michezo kwa kutumia AI. Utabiri wa mechi moja, mikeka ya uhakika ya kila siku, na kumbukumbu thabiti za ushindi.'}
            </p>
          </div>

          {/* Key Value Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-2.5 text-center">
              <span className="block text-base sm:text-lg font-black font-mono text-emerald-400">78%+</span>
              <span className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                {language === 'en' ? 'Win Rate' : 'Kiwango Ushindi'}
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-2.5 text-center">
              <span className="block text-base sm:text-lg font-black font-mono text-white">@2.12</span>
              <span className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                {language === 'en' ? 'Avg Odds' : 'Wastani Odds'}
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-2.5 text-center">
              <span className="block text-base sm:text-lg font-black font-mono text-emerald-400">+35%</span>
              <span className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                {language === 'en' ? 'Monthly ROI' : 'Faida ya Kila Mwezi'}
              </span>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-2.5 text-center">
              <span className="block text-base sm:text-lg font-black font-mono text-amber-400">1,520+</span>
              <span className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                {language === 'en' ? 'Tips Logged' : 'Mechi Zilizochambuliwa'}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onExploreClick}
              className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black text-xs font-black rounded-xl transition-all shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)] cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-98"
            >
              <Target className="w-4 h-4 text-black" />
              <span>{language === 'en' ? "Explore Today's Picks" : 'Tazama Utabiri wa Leo'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-black" />
            </button>

            {!isVip && (
              <button
                onClick={onVipClick}
                className="px-5 py-3 bg-zinc-900/90 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 text-xs font-bold rounded-xl border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer flex items-center gap-2 shadow-lg"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>{language === 'en' ? 'Unlock VIP Accumulators' : 'Fungua Mikeka ya VIP'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Artwork Showcase Column */}
        <div className="lg:col-span-5 flex justify-center items-center">
          <div className="relative w-full max-w-md rounded-2xl overflow-hidden ring-1 ring-emerald-500/30 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] group">
            {/* The Actual Rectangular Banner Image */}
            <img 
              src="/src/assets/images/rafiki_app_banner_1787728353530.jpg" 
              alt="Rafiki Predict Banner - Predict. Analyze. Win." 
              referrerPolicy="no-referrer"
              className="w-full h-auto object-cover object-center transform transition-transform duration-700 group-hover:scale-105"
            />
            
            {/* Subtle Gradient Overlays for integration */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent pointer-events-none" />
            
            {/* Floating Live Badge Over Image */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between p-2.5 bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 rounded-xl">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider">
                  AI Consensus Live
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                85%+ Confidence
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Feature Badges Bar */}
      <div className={`px-6 py-3 border-t grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono ${
        theme === 'high-contrast'
          ? 'bg-slate-950 border-slate-800 text-slate-300'
          : 'bg-zinc-900/60 border-zinc-900 text-gray-400'
      }`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] truncate">{language === 'en' ? 'Accurate Predictions' : 'Utabiri wa Uhakika'}</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="text-[11px] truncate">{language === 'en' ? 'Detailed Analysis' : 'Uchambuzi wa Kina'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] truncate">{language === 'en' ? 'Trusted by Winners' : 'Inayoaminika na Washindi'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] truncate">{language === 'en' ? 'Fast & Real-Time' : 'Muda Halisi'}</span>
        </div>
      </div>
    </div>
  );
}
