'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrainCircuit, ArrowRight, ArrowLeft, RotateCcw, Trophy,
  CheckCircle2, XCircle, Sparkles, Target, Zap, ChevronRight,
  Star, TrendingUp, Clock, Search, Loader2
} from 'lucide-react';
import { quizCategories, QuizCategory, QuizQuestion } from './quizData';
import HealthcareCTA from '@/components/HealthcareCTA';
import { useLanguage } from '@/context/LanguageContext';
import { useUserRole } from '@/context/UserRoleContext';
import { persistMedicalRecord } from '@/lib/medicalHistoryService';

type Screen = 'categories' | 'quiz' | 'results';

interface AIQuizCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  questions: QuizQuestion[];
}

export default function QuizPage() {
  const { user } = useUserRole();
  const { t, language } = useLanguage();
  const [screen, setScreen] = useState<Screen>('categories');
  const [selectedCategory, setSelectedCategory] = useState<AIQuizCategory | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);

  // AI search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  const startQuiz = useCallback((category: AIQuizCategory) => {
    setSelectedCategory(category);
    setCurrentQ(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setScore(0);
    setAnswers([]);
    setScreen('quiz');
  }, []);

  const handleAIQuiz = useCallback(async (topic: string) => {
    if (!topic.trim() || isGenerating) return;
    setIsGenerating(true);
    setAiError('');

    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), language }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAiError(data.error || 'Failed to generate quiz. Try again.');
        return;
      }

      const aiCategory: AIQuizCategory = {
        id: `ai-${Date.now()}`,
        name: data.categoryName || topic,
        description: `AI-generated quiz about ${topic}`,
        icon: data.categoryIcon || '🤖',
        color: 'violet',
        gradient: 'from-violet-500 to-purple-600',
        questions: data.questions,
      };

      startQuiz(aiCategory);
    } catch (err) {
      setAiError('Network error. Please check your connection and try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, startQuiz]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleAIQuiz(searchQuery);
  }, [searchQuery, handleAIQuiz]);

  const handleOptionSelect = useCallback((optionIndex: number) => {
    if (showExplanation) return;
    setSelectedOption(optionIndex);
    setShowExplanation(true);
    if (optionIndex === selectedCategory!.questions[currentQ].correctAnswer) {
      setScore(prev => prev + 1);
    }
    setAnswers(prev => [...prev, optionIndex]);
  }, [showExplanation, selectedCategory, currentQ]);

  const nextQuestion = useCallback(() => {
    if (currentQ < selectedCategory!.questions.length - 1) {
      setCurrentQ(prev => prev + 1);
      setSelectedOption(null);
      setShowExplanation(false);
    } else {
      setScreen('results');
      const totalQuestions = selectedCategory!.questions.length;
      const pct = Math.round((score / totalQuestions) * 100);
      persistMedicalRecord(user?.id || 'usr_pat_8812', {
        type: 'health_quiz',
        title: `Health Assessment: ${selectedCategory!.name}`,
        userQuery: `Completed ${selectedCategory!.name} quiz (${totalQuestions} questions)`,
        aiResponse: `Score: ${score}/${totalQuestions} (${pct}%). Awareness level: ${pct >= 80 ? 'Excellent' : pct >= 50 ? 'Moderate' : 'Needs Attention'}.`,
        summary: `${selectedCategory!.name} • ${score}/${totalQuestions} (${pct}%)`,
        metadata: {
          category: selectedCategory!.name,
          categoryId: selectedCategory!.id,
          score,
          totalQuestions,
          percentage: pct,
        },
      }).catch(console.warn);
    }
  }, [currentQ, selectedCategory, score]);

  const resetQuiz = useCallback(() => {
    setScreen('categories');
    setSelectedCategory(null);
    setCurrentQ(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setScore(0);
    setAnswers([]);
    setAiError('');
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-12 w-full">
      <AnimatePresence mode="wait">
        {screen === 'categories' && (
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <CategorySelection
              onSelect={startQuiz}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onSearchSubmit={handleSearchSubmit}
              isGenerating={isGenerating}
              aiError={aiError}
              onQuickTopic={handleAIQuiz}
              t={t}
            />
          </motion.div>
        )}

        {screen === 'quiz' && selectedCategory && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <QuizScreen
              category={selectedCategory}
              currentQ={currentQ}
              selectedOption={selectedOption}
              showExplanation={showExplanation}
              score={score}
              onSelect={handleOptionSelect}
              onNext={nextQuestion}
              onBack={resetQuiz}
              t={t}
            />
          </motion.div>
        )}

        {screen === 'results' && selectedCategory && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
          >
            <ResultsScreen
              category={selectedCategory}
              score={score}
              answers={answers}
              onRetry={() => startQuiz(selectedCategory)}
              onHome={resetQuiz}
              t={t}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Category Selection ──────────────────────────────────────────── */

const quickTopics = [
  'Malaria', 'Thyroid', 'Yoga & Health', 'COVID-19', 'Pregnancy Care',
  'Dengue', 'Tuberculosis', 'Eye Health', 'First Aid', 'Child Nutrition'
];

interface CategorySelectionProps {
  onSelect: (cat: AIQuizCategory) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  isGenerating: boolean;
  aiError: string;
  onQuickTopic: (topic: string) => void;
  t: (key: string) => string;
}

function CategorySelection({
  onSelect, searchQuery, setSearchQuery, onSearchSubmit, isGenerating, aiError, onQuickTopic, t
}: CategorySelectionProps) {
  return (
    <>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 w-full mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/25">
              <BrainCircuit className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{t('quizTitle')}</h1>
          </div>
          <p className="text-slate-500 font-medium text-lg">
            {t('quizSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Sparkles className="h-5 w-5 text-violet-500" />
          <span className="text-sm font-semibold text-slate-700">{t('poweredByAI')}</span>
        </div>
      </header>

      {/* ─── AI Search Bar ─── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-violet-50 rounded-full blur-3xl -mx-32 -my-32 opacity-60 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-violet-500" />
            <h2 className="text-lg font-bold text-slate-800">{t('generateWithAI')}</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Type any health topic — diabetes, yoga, malaria, pregnancy, mental health... AI will create 10 quiz questions instantly!
          </p>

          <form onSubmit={onSearchSubmit} className="relative flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type any health topic... e.g., 'malaria', 'yoga benefits', 'thyroid'"
                disabled={isGenerating}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim() || isGenerating}
              className={`px-6 py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center gap-2 flex-shrink-0 ${
                !searchQuery.trim() || isGenerating
                  ? 'bg-slate-300 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:scale-[1.02] hover:-translate-y-0.5 shadow-violet-500/25'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5" />
                  {t('generateQuiz')}
                </>
              )}
            </button>
          </form>

          {/* Error message */}
          {aiError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium flex items-center gap-2"
            >
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {aiError}
            </motion.div>
          )}

          {/* Loading shimmer */}
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 space-y-3"
            >
              <div className="flex items-center gap-3 text-violet-600 text-sm font-medium">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI is crafting your quiz questions...
              </div>
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 rounded-xl animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </motion.div>
          )}

          {/* Quick topic pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-slate-400 font-medium mr-1 self-center">Try:</span>
            {quickTopics.map(topic => (
              <button
                key={topic}
                onClick={() => {
                  setSearchQuery(topic);
                  onQuickTopic(topic);
                }}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-full text-xs font-medium text-slate-600 hover:text-violet-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Divider ─── */}
      <div className="flex items-center gap-4 my-2">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-sm font-semibold text-slate-400">{t('orPickCategory')}</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {/* ─── Preset Categories ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-4">
        {quizCategories.map((cat, idx) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.4 }}
          >
            <button
              onClick={() => onSelect(cat as AIQuizCategory)}
              className="w-full text-left group relative overflow-hidden bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 hover:-translate-y-1.5 hover:shadow-2xl transition-all duration-300"
            >
              <div className={`h-1.5 bg-gradient-to-r ${cat.gradient} w-full`} />
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{cat.icon}</div>
                  <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs font-bold text-slate-500">
                    {cat.questions.length} Qs
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-5 line-clamp-2">
                  {cat.description}
                </p>
                <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                  {t('startQuiz')}
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 pointer-events-none`} />
            </button>
          </motion.div>
        ))}
      </div>
    </>
  );
}

/* ─── Quiz Screen ─────────────────────────────────────────────────── */

interface QuizScreenProps {
  category: AIQuizCategory;
  currentQ: number;
  selectedOption: number | null;
  showExplanation: boolean;
  score: number;
  onSelect: (idx: number) => void;
  onNext: () => void;
  onBack: () => void;
  t: (key: string) => string;
}

function QuizScreen({
  category, currentQ, selectedOption, showExplanation, score, onSelect, onNext, onBack, t
}: QuizScreenProps) {
  const question = category.questions[currentQ];
  const total = category.questions.length;
  const progress = ((currentQ + (showExplanation ? 1 : 0)) / total) * 100;
  const isLast = currentQ === total - 1;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {t('allCategories')}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{category.icon}</span>
          <div>
            <h2 className="font-bold text-slate-800">{category.name}</h2>
            <p className="text-xs text-slate-500">Question {currentQ + 1} of {total}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
          <Star className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-bold text-emerald-700">{score}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 mb-8 overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${category.gradient}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Question card */}
      <motion.div
        key={currentQ}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden"
      >
        {/* Question */}
        <div className="p-8 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${category.gradient} text-white`}>
              Q{currentQ + 1}
            </span>
            {category.id.startsWith('ai-') && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-600 border border-violet-200 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> AI Generated
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-800 leading-relaxed">
            {question.question}
          </h3>
        </div>

        {/* Options */}
        <div className="px-8 pb-4 space-y-3">
          {question.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === question.correctAnswer;
            const showResult = showExplanation;

            let optionClasses = 'bg-slate-50 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50';
            if (showResult && isCorrect) {
              optionClasses = 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20';
            } else if (showResult && isSelected && !isCorrect) {
              optionClasses = 'bg-red-50 border-red-400 ring-2 ring-red-400/20';
            } else if (isSelected) {
              optionClasses = 'bg-emerald-50 border-emerald-400';
            }

            return (
              <motion.button
                key={idx}
                whileHover={!showExplanation ? { scale: 1.01 } : {}}
                whileTap={!showExplanation ? { scale: 0.99 } : {}}
                onClick={() => onSelect(idx)}
                disabled={showExplanation}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 ${optionClasses} ${showExplanation ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  showResult && isCorrect
                    ? 'bg-emerald-500 text-white'
                    : showResult && isSelected && !isCorrect
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {showResult && isCorrect ? <CheckCircle2 className="h-5 w-5" /> :
                   showResult && isSelected && !isCorrect ? <XCircle className="h-5 w-5" /> :
                   String.fromCharCode(65 + idx)}
                </span>
                <span className={`font-medium ${
                  showResult && isCorrect ? 'text-emerald-800' :
                  showResult && isSelected && !isCorrect ? 'text-red-800' :
                  'text-slate-700'
                }`}>
                  {option}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="overflow-hidden"
            >
              <div className="mx-8 mb-6 p-5 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800 text-sm mb-1">{t('explanation')}</p>
                    <p className="text-slate-600 text-sm leading-relaxed">{question.explanation}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next button */}
        {showExplanation && (
          <div className="px-8 pb-8">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={onNext}
              className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all hover:scale-[1.01] hover:-translate-y-0.5 flex items-center justify-center gap-2 bg-gradient-to-r ${category.gradient} shadow-emerald-500/20`}
            >
              {isLast ? (
                <>{t('viewResults')} <Trophy className="h-5 w-5" /></>
              ) : (
                <>{t('nextQuestion')} <ArrowRight className="h-5 w-5" /></>
              )}
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ─── Results Screen ──────────────────────────────────────────────── */

interface ResultsScreenProps {
  category: AIQuizCategory;
  score: number;
  answers: (number | null)[];
  onRetry: () => void;
  onHome: () => void;
  t: (key: string) => string;
}

function ResultsScreen({ category, score, answers, onRetry, onHome, t }: ResultsScreenProps) {
  const total = category.questions.length;
  const percentage = Math.round((score / total) * 100);

  const getGrade = () => {
    if (percentage >= 90) return { label: 'Outstanding! 🏆', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
    if (percentage >= 70) return { label: 'Great Job! 🌟', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    if (percentage >= 50) return { label: 'Good Effort! 💪', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    return { label: 'Keep Learning! 📚', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' };
  };

  const grade = getGrade();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden mb-6">
        <div className={`bg-gradient-to-r ${category.gradient} p-8 text-center text-white relative overflow-hidden`}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-50" />
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white/20 backdrop-blur-sm mb-4"
            >
              <span className="text-5xl font-black">{percentage}%</span>
            </motion.div>
            <h2 className="text-2xl font-bold mb-1">{category.icon} {category.name}</h2>
            <p className="text-white/80 font-medium">You scored {score} out of {total} questions</p>
            {category.id.startsWith('ai-') && (
              <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">
                <Sparkles className="h-3 w-3" /> AI-Generated Quiz
              </span>
            )}
          </div>
        </div>

        <div className="p-8">
          <div className={`p-4 rounded-2xl ${grade.bg} border ${grade.border} text-center mb-6`}>
            <p className={`text-xl font-bold ${grade.color}`}>{grade.label}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-4 bg-emerald-50 rounded-2xl">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-emerald-700">{score}</p>
              <p className="text-xs text-emerald-600 font-medium">{t('correct')}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-2xl">
              <XCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">{total - score}</p>
              <p className="text-xs text-red-500 font-medium">{t('wrong')}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-2xl">
              <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-700">{percentage}%</p>
              <p className="text-xs text-blue-600 font-medium">{t('accuracy')}</p>
            </div>
          </div>

          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-400" />
            {t('questionBreakdown')}
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-8">
            {category.questions.map((q, idx) => {
              const userAnswer = answers[idx];
              const isCorrect = userAnswer === q.correctAnswer;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-start gap-3 ${
                    isCorrect ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'
                  }`}
                >
                  <span className={`mt-0.5 flex-shrink-0 ${isCorrect ? 'text-emerald-500' : 'text-red-500'}`}>
                    {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{q.question}</p>
                    {!isCorrect && (
                      <p className="text-xs text-emerald-600 mt-1">
                        Correct: {q.options[q.correctAnswer]}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onRetry}
              className={`flex-1 py-3.5 rounded-2xl font-bold text-white shadow-lg bg-gradient-to-r ${category.gradient} hover:scale-[1.02] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2`}
            >
              <RotateCcw className="h-5 w-5" /> {t('retryQuiz')}
            </button>
            <button
              onClick={onHome}
              className="flex-1 py-3.5 rounded-2xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-5 w-5" /> {t('allCategories')}
            </button>
          </div>

          {/* Healthcare CTA — Loan & Nearby Hospitals */}
          <div className="mt-6">
            <HealthcareCTA
              context={`After completing your ${category.name} health quiz`}
              condition={category.name}
              variant="compact"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
