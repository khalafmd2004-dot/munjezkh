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
  History
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
    setActiveTab('daily');
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
            className="fixed bottom-0 left-0 right-0 z-50 bg-navy text-white p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] border-t border-gold/30"
          >
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
                  <Timer className="w-6 h-6 text-gold animate-pulse" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gold/60 uppercase tracking-wider">قيد الدراسة الآن</p>
                  <p className="font-bold text-sm truncate max-w-[150px]">
                    {rounds.find(r => r.id === activeTimer.roundId)?.subjects.find(s => s.id === activeTimer.subjectId)?.topics.find(t => t.id === activeTimer.topicId)?.name}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gold/60 uppercase tracking-wider">الوقت المنقضي</p>
                  <p className="text-xl font-black font-mono text-gold">{formatTime(elapsedSeconds)}</p>
                </div>
                <button
                  onClick={stopTimer}
                  className="bg-rose-500 hover:bg-rose-600 text-white p-3 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 font-bold text-sm"
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
                onClick={() => setActiveTab('daily')}
                className={`flex-1 py-2.5 rounded-lg font-bold transition-all text-sm flex items-center justify-center gap-2 ${
                  activeTab === 'daily' 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <CheckSquare className="w-4 h-4" />
                مهامي اليومية
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
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-extrabold text-navy mb-2 flex items-center gap-2">
                <CheckSquare className="text-emerald-500" />
                مهامي لليوم
              </h2>
              <p className="text-slate-500 text-sm font-medium">
                أضف مواضيع من الدور الأول أو الخطة لتركز عليها اليوم.
              </p>
            </div>

            {dailyTasks.length === 0 ? (
              <div className="bg-slate-100 border border-slate-200 p-12 rounded-3xl text-center">
                <ListTodo className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-500 mb-2">لا توجد مهام مضافة</h3>
                <p className="text-slate-400 text-sm">اذهب إلى الدور الأول أو الخطة وأضف مواضيعك لليوم.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dailyTasks.map((task) => (
                  <div 
                    key={task.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      task.completed 
                        ? 'bg-emerald-50 border-emerald-100 opacity-75' 
                        : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <button 
                      onClick={() => toggleDailyTask(task.id)}
                      className={`transition-colors ${task.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-emerald-500'}`}
                    >
                      {task.completed ? <CheckCircle2 className="w-7 h-7" /> : <Square className="w-7 h-7" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                          {task.subjectName}
                        </span>
                      </div>
                      <p className={`font-bold text-sm ${task.completed ? 'text-emerald-900 line-through' : 'text-navy'}`}>
                        {task.topicName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-1 text-slate-400">
                          <History className="w-3 h-3" />
                          <span className="text-[10px] font-bold">
                            {formatTime(rounds.find(r => r.id === task.roundId)?.subjects.find(s => s.id === task.subjectId)?.topics.find(t => t.id === task.topicId)?.studyTime || 0)}
                          </span>
                        </div>
                        {activeTimer?.topicId === task.topicId && (
                          <span className="text-[10px] font-black text-emerald-500 animate-pulse">
                            • جاري التسجيل...
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => activeTimer?.topicId === task.topicId ? stopTimer() : startTimer(task.roundId, task.subjectId, task.topicId)}
                        className={`p-2 rounded-lg transition-all active:scale-95 ${
                          activeTimer?.topicId === task.topicId 
                            ? 'bg-rose-50 text-rose-500 border border-rose-100' 
                            : 'text-slate-300 hover:text-gold hover:bg-gold/5'
                        }`}
                        title={activeTimer?.topicId === task.topicId ? "إيقاف المؤقت" : "بدء الدراسة"}
                      >
                        {activeTimer?.topicId === task.topicId ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                      </button>
                      <button 
                        onClick={() => removeDailyTask(task.id)}
                        className="text-slate-300 hover:text-rose-500 transition-colors p-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'plan' ? (
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
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex items-center gap-1 text-slate-400">
                                <History className="w-3 h-3" />
                                <span className="text-[10px] font-bold">{formatTime(topic.studyTime || 0)}</span>
                              </div>
                              {activeTimer?.topicId === topic.id && (
                                <span className="text-[10px] font-black text-emerald-500 animate-pulse">
                                  • جاري التسجيل...
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => activeTimer?.topicId === topic.id ? stopTimer() : startTimer(item.roundId, item.subjectId, item.topicId)}
                              className={`p-2 rounded-lg transition-all active:scale-95 ${
                                activeTimer?.topicId === topic.id 
                                  ? 'bg-rose-50 text-rose-500 border border-rose-100' 
                                  : 'text-slate-300 hover:text-gold hover:bg-gold/5'
                              }`}
                              title={activeTimer?.topicId === topic.id ? "إيقاف المؤقت" : "بدء الدراسة"}
                            >
                              {activeTimer?.topicId === topic.id ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                            </button>
                            <button
                              onClick={() => addToDailyTasks(item.roundId, item.subjectId, item.topicId)}
                              className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"
                              title="إضافة للمهام اليومية"
                            >
                              <CheckSquare className="w-5 h-5" />
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
                <span className="text-[10px] text-slate-500 font-bold mb-1">المنجز</span>
                <span className="text-lg font-black text-navy">{stats.completedTopics} / {stats.totalTopics}</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <Trophy className="w-5 h-5 text-gold mb-2" />
                <span className="text-[10px] text-slate-500 font-bold mb-1">النسبة</span>
                <span className="text-lg font-black text-navy">{stats.percentage}%</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <Clock className="w-5 h-5 text-rose-500 mb-2" />
                <span className="text-[10px] text-slate-500 font-bold mb-1">المتبقي</span>
                <span className="text-lg font-black text-navy">{stats.remaining}</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                <History className="w-5 h-5 text-blue-500 mb-2" />
                <span className="text-[10px] text-slate-500 font-bold mb-1">وقت الدراسة</span>
                <span className="text-lg font-black text-navy">{formatTime(getTotalStudyTime())}</span>
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
            <div className="space-y-4">
              {processedSubjects.map((subject) => {
                const originalSubject = activeRound.subjects.find(s => s.id === subject.id)!;
                const subjectProgress = getSubjectProgress(originalSubject);

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
                          <div className="flex items-center gap-4 mt-1">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${subjectProgress}%` }}
                                className="h-full bg-gold"
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-500">{subjectProgress}%</span>
                            <div className="flex items-center gap-1 text-slate-400">
                              <History className="w-3 h-3" />
                              <span className="text-[10px] font-bold">{formatTime(getSubjectStudyTime(originalSubject))}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mr-4 text-slate-400">
                        {(expandedSubjects[subject.id] || searchQuery || statusFilter !== 'all') ? <ChevronUp /> : <ChevronDown />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {(expandedSubjects[subject.id] || searchQuery || statusFilter !== 'all') && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-slate-100 bg-slate-50/50"
                        >
                          <div className="p-4 space-y-6">
                            {Object.entries(
                              subject.topics.reduce((acc, topic) => {
                                if (!acc[topic.chapter]) acc[topic.chapter] = [];
                                acc[topic.chapter].push(topic);
                                return acc;
                              }, {} as Record<string, Topic[]>)
                            ).map(([chapter, chapterTopics]) => {
                              const topics = chapterTopics as Topic[];
                              const isChapterExpanded = expandedChapters[chapter] || searchQuery || statusFilter !== 'all';
                              
                              // Calculate progress based on original topics in this chapter
                              const originalChapterTopics = originalSubject.topics.filter(t => t.chapter === chapter);
                              const chapterCompleted = originalChapterTopics.every(t => t.status === 'completed');
                              const chapterProgress = Math.round((originalChapterTopics.filter(t => t.status === 'completed').length / originalChapterTopics.length) * 100);

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
                                                <div className="flex items-center gap-2 mt-0.5">
                                                  <div className="flex items-center gap-1 text-slate-400">
                                                    <History className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold">{formatTime(topic.studyTime || 0)}</span>
                                                  </div>
                                                  {activeTimer?.topicId === topic.id && (
                                                    <span className="text-[10px] font-black text-emerald-500 animate-pulse">
                                                      • جاري التسجيل...
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <button
                                                  onClick={() => activeTimer?.topicId === topic.id ? stopTimer() : startTimer(activeRound.id, subject.id, topic.id)}
                                                  className={`p-2 rounded-lg transition-all active:scale-95 ${
                                                    activeTimer?.topicId === topic.id 
                                                      ? 'bg-rose-50 text-rose-500 border border-rose-100' 
                                                      : 'text-slate-300 hover:text-gold hover:bg-gold/5'
                                                  }`}
                                                  title={activeTimer?.topicId === topic.id ? "إيقاف المؤقت" : "بدء الدراسة"}
                                                >
                                                  {activeTimer?.topicId === topic.id ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                                                </button>
                                                <button
                                                  onClick={() => addToDailyTasks(activeRound.id, subject.id, topic.id)}
                                                  className="p-2 text-slate-300 hover:text-emerald-500 transition-colors"
                                                  title="إضافة للمهام اليومية"
                                                >
                                                  <CheckSquare className="w-5 h-5" />
                                                </button>
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
