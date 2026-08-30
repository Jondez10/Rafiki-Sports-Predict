import React, { useState } from 'react';
import { Article } from '../types';
import { BookOpen, Calendar, User, Clock, ChevronRight, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ArticlesTabProps {
  articles: Article[];
}

export default function ArticlesTab({ articles }: ArticlesTabProps) {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  return (
    <div className="space-y-8" id="articles-section">
      <div className="text-center md:text-left space-y-1.5 border-b border-zinc-800 pb-5">
        <h3 className="text-xl font-sans font-bold text-white flex items-center justify-center md:justify-start gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          Sports Analytics & Strategy Hub
        </h3>
        <p className="text-xs text-gray-400">Increase your betting proficiency with deep-dive articles authored by our analyst and AI team.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {articles.map((art) => (
          <div 
            key={art.id}
            onClick={() => setSelectedArticle(art)}
            className="bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all hover:bg-zinc-800/10 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[10px] text-gray-400 font-mono uppercase">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-emerald-400" />
                  {art.author}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  {art.readTime}
                </span>
              </div>

              <h4 className="text-base font-bold text-white font-sans hover:text-emerald-400 transition-colors">
                {art.title}
              </h4>
              
              <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
                {art.summary}
              </p>
            </div>

            <div className="flex justify-between items-center border-t border-zinc-800 pt-3">
              <span className="text-[10px] bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800 font-mono uppercase tracking-wider text-emerald-400">
                {art.sport || 'strategy'}
              </span>
              <span className="text-xs font-semibold text-white flex items-center gap-1 hover:text-emerald-400 transition-colors">
                Read Article
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ARTICLE READER MODAL */}
      <AnimatePresence>
        {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedArticle(null)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-3 text-[10px] text-gray-400 font-mono uppercase">
                    <span>By {selectedArticle.author}</span>
                    <span>•</span>
                    <span>{selectedArticle.readTime}</span>
                  </div>
                  <h4 className="text-lg font-bold text-white font-sans mt-1.5 leading-snug">
                    {selectedArticle.title}
                  </h4>
                </div>
                <button 
                  onClick={() => setSelectedArticle(null)}
                  className="text-gray-400 hover:text-white bg-zinc-950 hover:bg-zinc-800 p-1.5 rounded-lg text-xs transition-colors cursor-pointer border border-zinc-800"
                >
                  ✕
                </button>
              </div>

              {/* Markdown Render simulated cleanly */}
              <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                <div className="text-sm text-gray-300 leading-relaxed space-y-4 whitespace-pre-line font-sans">
                  {selectedArticle.content}
                </div>
              </div>

              <div className="p-5 border-t border-zinc-800 bg-zinc-950/40 rounded-b-2xl flex justify-between items-center text-xs">
                <span className="text-gray-500 font-mono">
                  Published: {new Date(selectedArticle.publishedAt).toLocaleDateString()}
                </span>
                <span className="text-emerald-400 flex items-center gap-1 font-mono">
                  <FileText className="w-3.5 h-3.5" />
                  Verified Analysis
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
