/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  BookOpen, 
  Trophy,
  Target,
  LayoutDashboard,
  Sparkles,
  ListTodo,
  CheckSquare,
  Square
} from 'lucide-react';
import { INITIAL_DATA, MOTIVATIONAL_MESSAGES } from './data';
import { Round, TopicStatus, Subject, Topic, Week } from './types';

export default function App() {
  const [rounds, setRounds] = useState<Round[]>(() => {
    const saved = localStorage.getItem('study_tracker_data');
    if (!saved) return INITIAL_DATA;
    
    try {
      const parsed = JSON.parse(saved) as Round[];
      // Merge logic: ensure all subjects from INITIAL_DATA exist and update metadata
      return INITIAL_DATA.map(initialRound => {
        const savedRound = parsed.find(r => r.id === initialRound.id);
        if (!savedRound) return initialRound;
        
        return {
          ...initialRound,
          subjects: initialRound.subjects.map(initialSub => {
            const savedSub = savedRound.subjects.find(s => s.id === initialSub.id);
            if (!savedSub) return initialSub;
            
            return {
              ...initialSub,
              topics: initialSub.topics.map(initialTopic => {
                const savedTopic = savedSub.topics.find(t => t.id === initialTopic.id);
                return savedTopic ? { ...initialTopic, status: savedTopic.status } : initialTopic;
              })
            };
          })
        };
      });
    } catch (e) {
      console.error('Error parsing saved data:', e);
      return INITIAL_DATA;
    }
  });
  const [activeTab, setActiveTab] = useState<'first' | 'plan'>('first');
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [motivation, setMotivation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem('study_tracker_data', JSON.stringify(rounds));
  }, [rounds]);

  const resetProgress = () => {
    if (window.confirm('هل أنت متأكد من تصفير كل التقدم؟ لا يمكن التراجع عن هذه الخطوة.')) {
      setRounds(INITIAL_DATA);
      localStorage.removeItem('study_tracker_data');
    }
  };

  const activeRound = useMemo(() => 
    rounds.find(r => r.id === activeTab) || rounds[0], [rounds, activeTab]
  );

  const stats = useMemo(() => {
    let totalTopics = 0;
    let completedTopics = 0;
    
    // Calculate stats for the current round if in round tab, or total if in plan tab
    const targetRounds = activeTab === 'plan' ? rounds : [activeRound];

    targetRounds.forEach(round => {
      round.subjects.forEach(sub => {
        sub.topics.forEach(topic => {
          totalTopics++;
          if (topic.status === 'completed') completedTopics++;
        });
      });
    });

    const percentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
    const remaining = totalTopics - completedTopics;

    return { totalTopics, completedTopics, percentage, remaining };
  }, [rounds, activeRound, activeTab]);

  const toggleSubject = (id: string) => {
    setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleChapter = (chapter: string) => {
    setExpandedChapters(prev => ({ ...prev, [chapter]: !prev[chapter] }));
  };

  const updateTopicStatus = (roundId: string, subjectId: string, topicId: string, newStatus: TopicStatus) => {
    setRounds(prevRounds => prevRounds.map(round => {
      if (round.id !== roundId) return round;
      
      return {
        ...round,
        subjects: round.subjects.map(sub => {
          if (sub.id !== subjectId) return sub;
          
          return {
            ...sub,
            topics: sub.topics.map(topic => {
              if (topic.id !== topicId) return topic;
              
              if (newStatus === 'completed' && topic.status !== 'completed') {
                showMotivation();
              }
              
              return { ...topic, status: newStatus };
            })
          };
        })
      };
    }));
  };

  const cycleStatus = (subjectId: string, topicId: string) => {
    const statusOrder: TopicStatus[] = ['not-started', 'in-progress', 'completed'];
    const currentTopic = activeRound.subjects.find(s => s.id === subjectId)?.topics.find(t => t.id === topicId);
    if (!currentTopic) return;

    const currentIndex = statusOrder.indexOf(currentTopic.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    updateTopicStatus(activeRound.id, subjectId, topicId, nextStatus);
  };

  const toggleTopicCompletion = (roundId: string, subjectId: string, topicId: string) => {
    const round = rounds.find(r => r.id === roundId);
    const topic = round?.subjects.find(s => s.id === subjectId)?.topics.find(t => t.id === topicId);
    if (!topic) return;

    const newStatus: TopicStatus = topic.status === 'completed' ? 'not-started' : 'completed';
    updateTopicStatus(roundId, subjectId, topicId, newStatus);
  };

  const showMotivation = () => {
    const randomMsg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
    setMotivation(randomMsg);
    setTimeout(() => setMotivation(null), 2000);
  };

  const getStatusColor = (status: TopicStatus) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500 text-white';
      case 'in-progress': return 'bg-amber-400 text-white';
      case 'not-started': return 'bg-rose-500 text-white';
    }
  };

  const getStatusLabel = (status: TopicStatus) => {
    switch (status) {
      case 'completed': return 'تم الإنجاز';
      case 'in-progress': return 'قيد الدراسة';
      case 'not-started': return 'لم يبدأ';
    }
  };

  const getSubjectProgress = (subject: Subject) => {
    const total = subject.topics.length;
    const completed = subject.topics.filter(t => t.status === 'completed').length;
    return Math.round((completed / total) * 100);
  };

  const dynamicWeeks = useMemo(() => {
    // Deep clone to avoid mutating state during calculation
    const uncompletedBySubject: Record<string, { roundId: string, subject: Subject, topics: Topic[] }> = {};
    
    rounds.forEach(round => {
      round.subjects.forEach(subject => {
        const uncompleted = subject.topics.filter(t => t.status !== 'completed');
        if (uncompleted.length > 0) {
          uncompletedBySubject[subject.id] = { roundId: round.id, subject, topics: [...uncompleted] };
        }
      });
    });

    const weeks: Week[] = [];
    let weekNum = 1;
    
    // Continue creating weeks as long as there are uncompleted topics
    while (Object.values(uncompletedBySubject).some(s => s.topics.length > 0)) {
      const weekItems: { roundId: 'first', subjectId: string, topicId: string }[] = [];
      
      // First Round Subjects
      (['bio', 'eng', 'isl', 'phys'] as const).forEach(subId => {
        const data = uncompletedBySubject[subId];
        if (data && data.topics.length > 0) {
          let count = 4; // Default
          if (subId === 'bio') count = 22;
          if (subId === 'eng') count = 7;
          if (subId === 'isl') count = 4;
          if (subId === 'phys') count = 5;
          
          const taken = data.topics.splice(0, count);
          taken.forEach(t => weekItems.push({ roundId: data.roundId as 'first', subjectId: subId, topicId: t.id }));
        }
      });

      if (weekItems.length === 0) break;

      weeks.push({
        id: weekNum,
        title: weekNum === 1 ? 'الأسبوع الحالي: مهامك القادمة' : `الأسبوع ${weekNum}`,
        items: weekItems
      });
      weekNum++;
      
      // Limit to 20 weeks to avoid infinite loops
      if (weekNum > 20) break;
    }

    return weeks;
  }, [rounds]);

  const getTopicInfo = (roundId: string, subjectId: string, topicId: string) => {
    const round = rounds.find(r => r.id === roundId);
    const subject = round?.subjects.find(s => s.id === subjectId);
    const topic = subject?.topics.find(t => t.id === topicId);
    return { subject, topic };
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans selection:bg-gold/30">
      {/* Motivation Toast */}
      <AnimatePresence>
        {motivation && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-navy text-gold px-6 py-3 rounded-full shadow-2xl border-2 border-gold flex items-center gap-3"
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-bold text-lg">{motivation}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Tabs */}
      <header className="bg-navy text-white pt-8 pb-4 sticky top-0 z-40 shadow-lg">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-extrabold flex items-center gap-2">
                <LayoutDashboard className="text-gold" />
                مُنجز <span className="text-gold/80 text-sm font-normal">السادس العلمي</span>
              </h1>
              <button 
                onClick={resetProgress}
                className="text-[10px] font-bold text-white/40 hover:text-rose-400 transition-colors flex items-center gap-1"
              >
                تصفير التقدم
              </button>
            </div>
            
            <div className="bg-white/10 p-1 rounded-xl flex gap-1">
              <button
                onClick={() => setActiveTab('first')}
                className={`flex-1 py-2.5 rounded-lg font-bold transition-all text-sm ${
                  activeTab === 'first' 
                    ? 'bg-rose-600 text-white shadow-md' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                الدور الأول
              </button>
              <button
                onClick={() => setActiveTab('plan')}
                className={`flex-1 py-2.5 rounded-lg font-bold transition-all text-sm flex items-center justify-center gap-2 ${
                  activeTab === 'plan' 
                    ? 'bg-gold text-navy shadow-md' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <ListTodo className="w-4 h-4" />
                الخطة الأسبوعية
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-6">
        {activeTab === 'plan' ? (
          /* Weekly Plan Tab */
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-extrabold text-navy mb-2 flex items-center gap-2">
                <Calendar className="text-gold" />
                الخطة الدراسية الذكية
              </h2>
              <p className="text-slate-500 text-sm font-medium">
                خطة ديناميكية تركز على ما تبقى لك من مواد، مع إعطاء الأولوية لمواد الدور الأول.
              </p>
            </div>

            {dynamicWeeks.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-100 p-12 rounded-3xl text-center">
                <Trophy className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-emerald-900 mb-2">أحسنت يا بطل!</h3>
                <p className="text-emerald-700 font-medium">لقد أكملت جميع المواضيع في خطتك الدراسية.</p>
              </div>
            ) : (
              dynamicWeeks.map((week) => (
                <div key={week.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-extrabold text-navy">{week.title}</h3>
                    {week.id === 1 && (
                      <span className="bg-gold/20 text-navy text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                        قيد التنفيذ
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    {week.items.map((item, idx) => {
                      const { subject, topic } = getTopicInfo(item.roundId, item.subjectId, item.topicId);
                      if (!topic || !subject) return null;
                      
                      return (
                        <div 
                          key={idx}
                          className="flex items-center gap-4 p-4 rounded-xl border bg-white border-slate-100 hover:border-gold/30 transition-all"
                        >
                          <button 
                            onClick={() => toggleTopicCompletion(item.roundId, item.subjectId, item.topicId)}
                            className="text-slate-300 hover:text-emerald-500 transition-colors"
                          >
                            <Square className="w-6 h-6" />
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                                {subject.emoji} {subject.name}
                              </span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                item.roundId === 'first' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                              }`}>
                                {item.roundId === 'first' ? 'دور 1' : 'دور 2'}
                              </span>
                            </div>
                            <p className="font-bold text-sm text-navy">
                              {topic.name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {topic.chapter}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Round Tabs (First/Second) */
          <>
            {/* Banner */}
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-6 rounded-2xl text-white shadow-xl relative overflow-hidden ${
                activeTab === 'first' ? 'bg-gradient-to-br from-rose-600 to-rose-800' : 'bg-gradient-to-br from-blue-600 to-blue-800'
              }`}
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 opacity-90">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-semibold">الوقت المتبقي</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black">{activeRound.daysLeft}</span>
                  <span className="text-xl font-bold">{activeTab === 'first' ? 'يوم' : 'يوم تقريباً'}</span>
                </div>
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-white/80">التقدم الكلي للدور</span>
                    <span className="text-xs font-black text-gold">{stats.percentage}%</span>
                  </div>
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden border border-white/10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.percentage}%` }}
                      className="h-full bg-gold shadow-[0_0_15px_rgba(245,200,66,0.5)]"
                    />
                  </div>
                </div>
                <p className="mt-4 text-white/90 font-medium leading-relaxed text-sm">
                  موادك: {activeRound.subjects.map(s => s.name).join(' + ')}
                </p>
              </div>
              <div className="absolute -bottom-6 -left-6 opacity-10">
                <Target className="w-48 h-48" />
              </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
                <span className="text-xs text-slate-500 font-bold mb-1">المنجز</span>
                <span className="text-xl font-black text-navy">{stats.completedTopics} / {stats.totalTopics}</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <Trophy className="w-5 h-5 text-gold mb-2" />
                <span className="text-xs text-slate-500 font-bold mb-1">النسبة</span>
                <span className="text-xl font-black text-navy">{stats.percentage}%</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <Clock className="w-5 h-5 text-rose-500 mb-2" />
                <span className="text-xs text-slate-500 font-bold mb-1">المتبقي</span>
                <span className="text-xl font-black text-navy">{stats.remaining}</span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث عن موضوع أو فصل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-10 py-3 text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Subjects List */}
            <div className="space-y-4">
              {activeRound.subjects.map((subject) => {
                const filteredTopics = subject.topics.filter(t => 
                  t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                  t.chapter.toLowerCase().includes(searchQuery.toLowerCase())
                );

                if (searchQuery && filteredTopics.length === 0) return null;

                return (
                  <div key={subject.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <button 
                      onClick={() => toggleSubject(subject.id)}
                      className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl shadow-inner">
                          {subject.emoji}
                        </div>
                        <div className="flex-1 text-right">
                          <h3 className="font-bold text-navy text-lg">{subject.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${getSubjectProgress(subject)}%` }}
                                className="h-full bg-gold"
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-500">{getSubjectProgress(subject)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="mr-4 text-slate-400">
                        {(expandedSubjects[subject.id] || searchQuery) ? <ChevronUp /> : <ChevronDown />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {(expandedSubjects[subject.id] || searchQuery) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-slate-100 bg-slate-50/50"
                        >
                          <div className="p-4 space-y-6">
                            {Object.entries(
                              filteredTopics.reduce((acc, topic) => {
                                if (!acc[topic.chapter]) acc[topic.chapter] = [];
                                acc[topic.chapter].push(topic);
                                return acc;
                              }, {} as Record<string, Topic[]>)
                            ).map(([chapter, chapterTopics]) => {
                              const topics = chapterTopics as Topic[];
                              const isChapterExpanded = expandedChapters[chapter] || searchQuery;
                              const chapterCompleted = topics.every(t => t.status === 'completed');
                              const chapterProgress = Math.round((topics.filter(t => t.status === 'completed').length / topics.length) * 100);

                              return (
                                <div key={chapter} className="space-y-3 bg-white/50 p-3 rounded-2xl border border-slate-100 shadow-sm">
                                  <button 
                                    onClick={() => toggleChapter(chapter)}
                                    className="w-full flex items-center justify-between group"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-1.5 h-6 rounded-full ${chapterCompleted ? 'bg-emerald-500' : 'bg-gold'}`} />
                                      <div className="text-right">
                                        <h4 className="text-sm font-black text-navy group-hover:text-gold transition-colors">
                                          {chapter}
                                        </h4>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                          {topics.length} موضوع • {chapterProgress}% منجز
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-slate-300 group-hover:text-gold transition-colors">
                                      {isChapterExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </div>
                                  </button>

                                  <AnimatePresence>
                                    {isChapterExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="space-y-2 pt-2">
                                          {(topics as Topic[]).map((topic) => (
                                            <div 
                                              key={topic.id}
                                              className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between group hover:border-gold/50 transition-all"
                                            >
                                              <div className="flex-1 ml-4">
                                                <span className="font-bold text-navy text-sm">
                                                  {topic.name}
                                                </span>
                                              </div>
                                              <button
                                                onClick={() => cycleStatus(subject.id, topic.id)}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-sm flex items-center gap-2 min-w-[115px] justify-center border ${
                                                  topic.status === 'completed' 
                                                    ? 'bg-emerald-500 text-white border-emerald-600' 
                                                    : topic.status === 'in-progress'
                                                    ? 'bg-amber-400 text-white border-amber-500'
                                                    : 'bg-white text-slate-400 border-slate-200 hover:border-rose-300 hover:text-rose-500'
                                                }`}
                                              >
                                                {topic.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                                {topic.status === 'in-progress' && <AlertCircle className="w-3 h-3" />}
                                                {topic.status === 'not-started' && <Square className="w-3 h-3" />}
                                                {getStatusLabel(topic.status)}
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <footer className="text-center mt-12 text-slate-400 text-xs font-medium">
        صُنع بكل حب لطلاب العراق 🇮🇶 • مُنجز 2026
      </footer>
    </div>
  );
}
