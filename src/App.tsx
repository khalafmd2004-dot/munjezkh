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
  Square,
  Filter,
  ArrowUpDown,
  X,
  Play,
  Pause,
  Timer,
  History,
  Search,
  Check,
  Trash2
} from 'lucide-react';
import { INITIAL_DATA, MOTIVATIONAL_MESSAGES } from './data';
import { Round, TopicStatus, Subject, Topic, Week, DailyTask } from './types';

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

  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(() => {
    const saved = localStorage.getItem('study_tracker_daily_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTab, setActiveTab] = useState<'first' | 'plan' | 'daily'>('first');
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [motivation, setMotivation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TopicStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'chapter' | 'default'>('default');
  const [activeTimer, setActiveTimer] = useState<{
    topicId: string;
    subjectId: string;
    roundId: string;
    startTime: number;
  } | null>(() => {
    const saved = localStorage.getItem('study_tracker_active_timer');
    return saved ? JSON.parse(saved) : null;
  });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    localStorage.setItem('study_tracker_data', JSON.stringify(rounds));
  }, [rounds]);

  useEffect(() => {
    localStorage.setItem('study_tracker_daily_tasks', JSON.stringify(dailyTasks));
  }, [dailyTasks]);

  useEffect(() => {
    localStorage.setItem('study_tracker_active_timer', JSON.stringify(activeTimer));
  }, [activeTimer]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - activeTimer.startTime) / 1000));
      }, 1000);
    } else {
      setElapsedSeconds(0);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const resetProgress = () => {
    if (window.confirm('هل أنت متأكد من تصفير كل التقدم؟ لا يمكن التراجع عن هذه الخطوة.')) {
      setRounds(INITIAL_DATA);
      setDailyTasks([]);
      localStorage.removeItem('study_tracker_data');
      localStorage.removeItem('study_tracker_daily_tasks');
    }
  };

  const activeRound = useMemo(() => {
    const round = rounds.find(r => r.id === activeTab) || rounds[0];
    
    // Calculate days left dynamically to June 13, 2026
    const targetDate = new Date('2026-06-13T00:00:00');
    const now = new Date();
    
    // Calculate difference in days
    const diffTime = targetDate.getTime() - now.getTime();
    const dynamicDaysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    return {
      ...round,
      daysLeft: dynamicDaysLeft
    };
  }, [rounds, activeTab]);

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

  const addToDailyTasks = (roundId: string, subjectId: string, topicId: string) => {
    const round = rounds.find(r => r.id === roundId);
    const subject = round?.subjects.find(s => s.id === subjectId);
    const topic = subject?.topics.find(t => t.id === topicId);

    if (!topic || !subject) return;

    // Check if already exists
    if (dailyTasks.find(t => t.topicId === topicId)) {
      alert('هذا الموضوع موجود بالفعل في مهامك اليومية');
      return;
    }

    const newTask: DailyTask = {
      id: Math.random().toString(36).substr(2, 9),
      topicId,
      subjectId,
      roundId,
      topicName: topic.name,
      subjectName: subject.name,
      completed: false,
      dateAdded: new Date().toISOString()
    };

    setDailyTasks(prev => [newTask, ...prev]);
    // Removed setActiveTab('daily') to prevent unwanted navigation
    showMotivation(); // Show a small motivation toast instead of switching tabs
  };

  const toggleDailyTask = (taskId: string) => {
    setDailyTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      
      const newCompleted = !task.completed;
      if (newCompleted) {
        showMotivation();
        // Also update the main topic status to completed
        updateTopicStatus(task.roundId, task.subjectId, task.topicId, 'completed');
      }
      
      return { ...task, completed: newCompleted };
    }));
  };

  const removeDailyTask = (taskId: string) => {
    setDailyTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const getStatusColor = (status: TopicStatus) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500 text-white';
      case 'in-progress': return 'bg-amber-400 text-white';
      case 'not-started': return 'bg-rose-500 text-white';
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}س ${mins}د`;
    }
    if (mins > 0) {
      return `${mins}د ${secs}ث`;
    }
    return `${secs}ث`;
  };

  const getStatusLabel = (status: TopicStatus) => {
    switch (status) {
      case 'completed': return 'تم الإكمال';
      case 'in-progress': return 'قيد الدراسة';
      case 'not-started': return 'لم يبدأ';
      default: return '';
    }
  };

  const startTimer = (roundId: string, subjectId: string, topicId: string) => {
    if (activeTimer) {
      if (activeTimer.topicId === topicId) return;
      stopTimer();
    }
    setActiveTimer({
      roundId,
      subjectId,
      topicId,
      startTime: Date.now()
    });
  };

  const stopTimer = () => {
    if (!activeTimer) return;

    const sessionSeconds = Math.floor((Date.now() - activeTimer.startTime) / 1000);
    
    setRounds(prevRounds => prevRounds.map(round => {
      if (round.id !== activeTimer.roundId) return round;
      return {
        ...round,
        subjects: round.subjects.map(sub => {
          if (sub.id !== activeTimer.subjectId) return sub;
          return {
            ...sub,
            topics: sub.topics.map(topic => {
              if (topic.id !== activeTimer.topicId) return topic;
              return { ...topic, studyTime: (topic.studyTime || 0) + sessionSeconds };
            })
          };
        })
      };
    }));

    setActiveTimer(null);
  };

  const getSubjectStudyTime = (subject: Subject) => {
    return subject.topics.reduce((acc, t) => acc + (t.studyTime || 0), 0);
  };

  const getTotalStudyTime = () => {
    let total = 0;
    rounds.forEach(r => {
      r.subjects.forEach(s => {
        s.topics.forEach(t => {
          total += (t.studyTime || 0);
        });
      });
    });
    return total;
  };

  const getSubjectProgress = React.useCallback((subject: Subject) => {
    const total = subject.topics.length;
    const completed = subject.topics.filter(t => t.status === 'completed').length;
    return Math.round((completed / total) * 100);
  }, []);

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

  const processedSubjects = useMemo(() => {
    let result = activeRound.subjects.map(subject => {
      const filteredTopics = subject.topics.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             t.chapter.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
        return matchesSearch && matchesStatus;
      });

      const sortedTopics = [...filteredTopics];
      if (sortBy === 'name') {
        sortedTopics.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortBy === 'chapter') {
        sortedTopics.sort((a, b) => a.chapter.localeCompare(b.chapter));
      }
      
      return { ...subject, topics: sortedTopics };
    }).filter(subject => subject.topics.length > 0);

    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'progress') {
      result.sort((a, b) => {
        const progressA = getSubjectProgress(activeRound.subjects.find(s => s.id === a.id)!);
        const progressB = getSubjectProgress(activeRound.subjects.find(s => s.id === b.id)!);
        return progressB - progressA;
      });
    } else if (sortBy === 'chapter') {
      result.sort((a, b) => {
        const firstChapterA = a.topics[0]?.chapter || '';
        const firstChapterB = b.topics[0]?.chapter || '';
        return firstChapterA.localeCompare(firstChapterB);
      });
    }

    return result;
  }, [activeRound, searchQuery, statusFilter, sortBy, getSubjectProgress]);

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans selection:bg-gold/30">
      {/* Motivation Toast */}
      <AnimatePresence>
        {motivation && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-navy text-gold px-6 py-3 rounded-full shadow-2xl border-2 border-gold flex items-center gap-3"
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-bold text-lg">{motivation}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Timer Bar */}
      <AnimatePresence>
        {activeTimer && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6"
          >
            <div className="max-w-2xl mx-auto glass-card rounded-3xl p-5 border-2 border-gold/30 shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-navy rounded-2xl flex items-center justify-center shadow-lg border border-gold/20">
                  <Timer className="w-7 h-7 text-gold animate-pulse" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gold uppercase tracking-[0.2em]">جاري التركيز الآن</p>
                  <p className="font-black text-navy text-sm truncate max-w-[150px] font-display">
                    {rounds.find(r => r.id === activeTimer.roundId)?.subjects.find(s => s.id === activeTimer.subjectId)?.topics.find(t => t.id === activeTimer.topicId)?.name}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الوقت المنقضي</p>
                  <p className="text-2xl font-black font-mono text-navy tracking-tighter">{formatTime(elapsedSeconds)}</p>
                </div>
                <button
                  onClick={stopTimer}
                  className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-2xl shadow-xl shadow-rose-500/20 transition-all active:scale-95 flex items-center gap-2 font-black text-sm"
                >
                  <Pause className="w-5 h-5 fill-current" />
                  إيقاف
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Tabs */}
      <header className="bg-navy text-white pt-10 pb-6 sticky top-0 z-40 shadow-2xl border-b border-gold/10">
        <div className="max-w-2xl mx-auto px-6">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 font-display">
                  <div className="bg-gold p-2 rounded-xl shadow-[0_0_20px_rgba(245,200,66,0.3)]">
                    <LayoutDashboard className="text-navy w-6 h-6" />
                  </div>
                  مُنجز
                </h1>
                <p className="text-gold/60 text-xs font-bold tracking-widest uppercase mr-12">السادس العلمي • ٢٠٢٦</p>
              </div>
              <button 
                onClick={resetProgress}
                className="group flex flex-col items-center gap-1 transition-all"
              >
                <div className="p-2 rounded-lg group-hover:bg-rose-500/10 transition-colors">
                  <History className="w-5 h-5 text-white/20 group-hover:text-rose-400" />
                </div>
                <span className="text-[9px] font-black text-white/20 group-hover:text-rose-400 uppercase tracking-tighter">تصفير</span>
              </button>
            </div>
            
            <div className="bg-white/5 p-1.5 rounded-2xl flex gap-2 backdrop-blur-sm border border-white/5">
              <button
                onClick={() => setActiveTab('first')}
                className={`flex-1 py-3 rounded-xl font-black transition-all text-sm relative overflow-hidden ${
                  activeTab === 'first' 
                    ? 'bg-rose-600 text-white shadow-lg' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {activeTab === 'first' && (
                  <motion.div layoutId="activeTab" className="absolute inset-0 bg-rose-600 -z-10" />
                )}
                الدور الأول
              </button>
              <button
                onClick={() => setActiveTab('daily')}
                className={`flex-1 py-3 rounded-xl font-black transition-all text-sm flex items-center justify-center gap-2 relative overflow-hidden ${
                  activeTab === 'daily' 
                    ? 'bg-emerald-600 text-white shadow-lg' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {activeTab === 'daily' && (
                  <motion.div layoutId="activeTab" className="absolute inset-0 bg-emerald-600 -z-10" />
                )}
                <CheckSquare className="w-4 h-4" />
                المهام اليومية
              </button>
              <button
                onClick={() => setActiveTab('plan')}
                className={`flex-1 py-3 rounded-xl font-black transition-all text-sm flex items-center justify-center gap-2 relative overflow-hidden ${
                  activeTab === 'plan' 
                    ? 'bg-gold text-navy shadow-lg' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                {activeTab === 'plan' && (
                  <motion.div layoutId="activeTab" className="absolute inset-0 bg-gold -z-10" />
                )}
                <ListTodo className="w-4 h-4" />
                الخطة
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-6">
        {activeTab === 'daily' ? (
          /* Daily Tasks Tab */
          <div className="space-y-6">
            <div className="bento-card bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-none">
              <h2 className="text-2xl font-black mb-2 flex items-center gap-3 font-display">
                <div className="bg-white/20 p-2 rounded-xl">
                  <CheckSquare className="text-white w-6 h-6" />
                </div>
                مهامي لليوم
              </h2>
              <p className="text-white/80 text-sm font-bold">
                أضف مواضيع من الدور الأول أو الخطة لتركز عليها اليوم.
              </p>
            </div>

            {dailyTasks.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 p-16 rounded-3xl text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ListTodo className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-slate-400 mb-2 font-display">لا توجد مهام مضافة</h3>
                <p className="text-slate-400 text-sm font-bold">اذهب إلى الدور الأول أو الخطة وأضف مواضيعك لليوم.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dailyTasks.map((task) => (
                  <motion.div 
                    layout
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all group ${
                      task.completed 
                        ? 'bg-emerald-50 border-emerald-100 opacity-75' 
                        : 'bg-white border-slate-100 hover:border-emerald-300 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <button 
                      onClick={() => toggleDailyTask(task.id)}
                      className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                        task.completed 
                          ? 'bg-emerald-500 border-emerald-500 text-white' 
                          : 'border-slate-200 text-transparent hover:border-emerald-500'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[4px]" />
                    </button>
                    <div className="flex-1">
                      <p className={`font-black text-lg ${task.completed ? 'text-emerald-700 line-through opacity-50' : 'text-navy'}`}>
                        {task.topicName}
                      </p>
                      <p className={`text-xs font-bold ${task.completed ? 'text-emerald-600/50' : 'text-slate-400'}`}>
                        {task.subjectName} • {task.chapterName}
                      </p>
                    </div>
                    <button 
                      onClick={() => removeDailyTask(task.id)}
                      className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'plan' ? (
          /* Weekly Plan Tab */
          <div className="space-y-6">
            {/* Countdown Banner in Plan Tab too */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl text-white shadow-xl relative overflow-hidden bg-gradient-to-br from-gold to-amber-600"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 opacity-90">
                  <Calendar className="w-4 h-4 text-navy" />
                  <span className="text-sm font-semibold text-navy">العد التنازلي لـ 13 يونيو</span>
                </div>
                <div className="flex items-baseline gap-2 text-navy">
                  <span className="text-5xl font-black">{activeRound.daysLeft}</span>
                  <span className="text-xl font-bold">يوم متبقي</span>
                </div>
              </div>
              <div className="absolute -bottom-6 -left-6 opacity-10">
                <Target className="w-48 h-48 text-navy" />
              </div>
            </motion.div>

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
              <div className="bg-emerald-50 border-2 border-dashed border-emerald-200 p-16 rounded-3xl text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Trophy className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-black text-emerald-900 mb-2 font-display">أحسنت يا بطل!</h3>
                <p className="text-emerald-700 font-bold">لقد أكملت جميع المواضيع في خطتك الدراسية.</p>
              </div>
            ) : (
              dynamicWeeks.map((week) => (
                <div key={week.id} className="bento-card !p-0 overflow-hidden border-2 border-slate-100">
                  <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <h3 className="font-black text-navy font-display">{week.title}</h3>
                      {week.id === 1 && (
                        <span className="bg-gold text-navy text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                          قيد التنفيذ
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-black bg-white px-3 py-1 rounded-full border border-slate-200 text-slate-500 uppercase tracking-widest">
                      {week.items.length} مهام
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {week.items.map((item, idx) => {
                      const { subject, topic } = getTopicInfo(item.roundId, item.subjectId, item.topicId);
                      if (!topic || !subject) return null;

                      return (
                        <div 
                          key={`${item.topicId}-${idx}`}
                          className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors group"
                        >
                          <div className="flex items-center gap-4 flex-1 text-right">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm border border-slate-100 group-hover:border-gold/30 transition-colors">
                              {subject.emoji}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className="font-black text-navy text-sm">{topic.name}</p>
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                                  item.roundId === 'first' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                  {item.roundId === 'first' ? 'دور 1' : 'دور 2'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  {subject.name} • {topic.chapter}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => activeTimer?.topicId === topic.id ? stopTimer() : startTimer(item.roundId, item.subjectId, topic.id)}
                              className={`p-2.5 rounded-xl transition-all active:scale-95 shadow-sm ${
                                activeTimer?.topicId === topic.id 
                                  ? 'bg-rose-50 text-rose-500 border border-rose-100' 
                                  : 'bg-slate-50 text-slate-400 hover:text-gold hover:bg-gold/10 border border-slate-100'
                              }`}
                              title={activeTimer?.topicId === topic.id ? "إيقاف المؤقت" : "بدء الدراسة"}
                            >
                              {activeTimer?.topicId === topic.id ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                            </button>
                            <button
                              onClick={() => addToDailyTasks(item.roundId, item.subjectId, topic.id)}
                              className="p-2.5 bg-slate-50 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 border border-slate-100 rounded-xl transition-all shadow-sm"
                              title="إضافة للمهام اليومية"
                            >
                              <CheckSquare className="w-4 h-4" />
                            </button>
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
              className={`p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden border-none ${
                activeTab === 'first' 
                  ? 'bg-gradient-to-br from-rose-600 to-rose-800' 
                  : 'bg-gradient-to-br from-blue-600 to-blue-800'
              }`}
            >
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4 opacity-90">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-black uppercase tracking-[0.2em]">الوقت المتبقي</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-7xl font-black font-display tracking-tighter">{activeRound.daysLeft}</span>
                  <span className="text-2xl font-black opacity-80">{activeTab === 'first' ? 'يوم' : 'يوم تقريباً'}</span>
                </div>
                
                <div className="mt-8 space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-widest block">التقدم الكلي للدور</span>
                      <span className="text-2xl font-black text-gold font-display">{stats.percentage}%</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-widest block">المواضيع المنجزة</span>
                      <span className="text-lg font-black">{stats.completedTopics} / {stats.totalTopics}</span>
                    </div>
                  </div>
                  <div className="h-4 bg-white/10 rounded-2xl overflow-hidden border border-white/5 p-1 backdrop-blur-sm">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.percentage}%` }}
                      className="h-full bg-gold rounded-xl shadow-[0_0_20px_rgba(245,200,66,0.6)]"
                    />
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-10 -left-10 opacity-10 rotate-12">
                <Target className="w-64 h-64" />
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bento-card flex flex-col items-center text-center group">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">المنجز</span>
                <span className="text-xl font-black text-navy font-display">{stats.completedTopics} / {stats.totalTopics}</span>
              </div>
              <div className="bento-card flex flex-col items-center text-center group">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Trophy className="w-5 h-5 text-gold" />
                </div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">النسبة</span>
                <span className="text-xl font-black text-navy font-display">{stats.percentage}%</span>
              </div>
              <div className="bento-card flex flex-col items-center text-center group">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5 text-rose-500" />
                </div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">المتبقي</span>
                <span className="text-xl font-black text-navy font-display">{stats.remaining}</span>
              </div>
              <div className="bento-card flex flex-col items-center text-center group">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <History className="w-5 h-5 text-blue-500" />
                </div>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">وقت الدراسة</span>
                <span className="text-xl font-black text-navy font-display">{formatTime(getTotalStudyTime())}</span>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative group">
              <input
                type="text"
                placeholder="ابحث عن موضوع أو فصل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-12 py-4 text-sm font-bold text-navy focus:outline-none focus:ring-4 focus:ring-gold/10 focus:border-gold transition-all shadow-sm group-hover:border-slate-200"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-gold transition-colors">
                <Search className="w-5 h-5" />
              </div>
            </div>

            {/* Filter & Sort Controls */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <div className="flex-1 min-w-[140px] relative">
                  <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold appearance-none transition-all"
                  >
                    <option value="all">كل الحالات</option>
                    <option value="completed">تم الإنجاز</option>
                    <option value="in-progress">قيد الدراسة</option>
                    <option value="not-started">لم يبدأ</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[140px] relative">
                  <ArrowUpDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded-xl pr-9 pl-3 py-2 text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold/20 focus:border-gold appearance-none transition-all"
                  >
                    <option value="default">الترتيب الافتراضي</option>
                    <option value="name">الاسم</option>
                    <option value="progress">نسبة الإنجاز</option>
                    <option value="chapter">الفصل</option>
                  </select>
                </div>
              </div>

              {(searchQuery || statusFilter !== 'all' || sortBy !== 'default') && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setSortBy('default');
                    }}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1 bg-rose-50 px-3 py-1 rounded-full border border-rose-100"
                  >
                    <X className="w-3 h-3" />
                    تفريغ الفلاتر
                  </button>
                </div>
              )}
            </div>

            {/* Subjects List */}
            <div className="space-y-6">
              {processedSubjects.map((subject) => {
                const originalSubject = activeRound.subjects.find(s => s.id === subject.id)!;
                const subjectProgress = getSubjectProgress(originalSubject);

                return (
                  <div key={subject.id} className="bento-card !p-0 overflow-hidden border-2 border-slate-100">
                    <button 
                      onClick={() => toggleSubject(subject.id)}
                      className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors text-right"
                    >
                      <div className="flex items-center gap-5 flex-1">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-slate-200/50">
                          {subject.emoji}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-black text-navy text-xl font-display">{subject.name}</h3>
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/30">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${subjectProgress}%` }}
                                className="h-full bg-gold shadow-[0_0_10px_rgba(245,200,66,0.3)]"
                              />
                            </div>
                            <span className="text-xs font-black text-slate-500 font-mono">{subjectProgress}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="mr-6 text-slate-300 group-hover:text-gold transition-colors">
                        {(expandedSubjects[subject.id] || searchQuery || statusFilter !== 'all') ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {(expandedSubjects[subject.id] || searchQuery || statusFilter !== 'all') && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-slate-100 bg-slate-50/30"
                        >
                          <div className="p-5 space-y-8">
                            {Object.entries(
                              subject.topics.reduce((acc, topic) => {
                                if (!acc[topic.chapter]) acc[topic.chapter] = [];
                                acc[topic.chapter].push(topic);
                                return acc;
                              }, {} as Record<string, Topic[]>)
                            ).map(([chapter, chapterTopics]) => {
                              const topics = chapterTopics as Topic[];
                              const isChapterExpanded = expandedChapters[chapter] || searchQuery || statusFilter !== 'all';
                              
                              const originalChapterTopics = originalSubject.topics.filter(t => t.chapter === chapter);
                              const chapterCompleted = originalChapterTopics.every(t => t.status === 'completed');
                              const chapterProgress = Math.round((originalChapterTopics.filter(t => t.status === 'completed').length / originalChapterTopics.length) * 100);

                              return (
                                <div key={chapter} className="space-y-4">
                                  <button 
                                    onClick={() => toggleChapter(chapter)}
                                    className="w-full flex items-center justify-between group text-right"
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className={`w-2 h-8 rounded-full shadow-sm ${chapterCompleted ? 'bg-emerald-500' : 'bg-gold'}`} />
                                      <div>
                                        <h4 className="text-base font-black text-navy group-hover:text-gold transition-colors font-display">
                                          {chapter}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {topics.length} موضوع • {chapterProgress}% منجز
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-slate-300 group-hover:text-gold transition-colors">
                                      {isChapterExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
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
                                        <div className="space-y-3 pt-2 pr-6 border-r-2 border-slate-100 mr-1">
                                          {(topics as Topic[]).map((topic) => (
                                            <div 
                                              key={topic.id}
                                              className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between group hover:border-gold/50 hover:shadow-md transition-all"
                                            >
                                              <div className="flex-1 ml-4 text-right">
                                                <span className="font-black text-navy text-sm block mb-1">
                                                  {topic.name}
                                                </span>
                                                <div className="flex items-center gap-3">
                                                  <div className="flex items-center gap-1 text-slate-400">
                                                    <History className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-black font-mono">{formatTime(topic.studyTime || 0)}</span>
                                                  </div>
                                                  {activeTimer?.topicId === topic.id && (
                                                    <span className="text-[10px] font-black text-emerald-500 animate-pulse flex items-center gap-1">
                                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                      جاري التسجيل...
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-3">
                                                <button
                                                  onClick={() => activeTimer?.topicId === topic.id ? stopTimer() : startTimer(activeRound.id, subject.id, topic.id)}
                                                  className={`p-2.5 rounded-xl transition-all active:scale-95 shadow-sm ${
                                                    activeTimer?.topicId === topic.id 
                                                      ? 'bg-rose-50 text-rose-500 border border-rose-100' 
                                                      : 'bg-slate-50 text-slate-400 hover:text-gold hover:bg-gold/10 border border-slate-100'
                                                  }`}
                                                  title={activeTimer?.topicId === topic.id ? "إيقاف المؤقت" : "بدء الدراسة"}
                                                >
                                                  {activeTimer?.topicId === topic.id ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                                                </button>
                                                <button
                                                  onClick={() => addToDailyTasks(activeRound.id, subject.id, topic.id)}
                                                  className="p-2.5 bg-slate-50 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 border border-slate-100 rounded-xl transition-all shadow-sm"
                                                  title="إضافة للمهام اليومية"
                                                >
                                                  <CheckSquare className="w-5 h-5" />
                                                </button>
                                                <button
                                                  onClick={() => cycleStatus(subject.id, topic.id)}
                                                  className={`px-5 py-2.5 rounded-xl text-[11px] font-black transition-all active:scale-95 shadow-sm flex items-center gap-2 min-w-[125px] justify-center border-2 ${
                                                    topic.status === 'completed' 
                                                      ? 'bg-emerald-500 text-white border-emerald-600' 
                                                      : topic.status === 'in-progress'
                                                      ? 'bg-amber-400 text-white border-amber-500'
                                                      : 'bg-white text-slate-400 border-slate-200 hover:border-rose-300 hover:text-rose-500'
                                                  }`}
                                                >
                                                  {topic.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                  {topic.status === 'in-progress' && <AlertCircle className="w-3.5 h-3.5" />}
                                                  {topic.status === 'not-started' && <Square className="w-3.5 h-3.5" />}
                                                  {getStatusLabel(topic.status)}
                                                </button>
                                              </div>
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
