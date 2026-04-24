/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Calendar, 
  Trophy,
  Target,
  LayoutDashboard,
  Sparkles,
  ListTodo,
  CheckSquare,
  Square,
  Filter,
  Play,
  Pause,
  Timer,
  History,
  Search,
  Check,
  Trash2,
  RotateCcw,
  Volume2,
  VolumeX
} from 'lucide-react';
import { INITIAL_DATA, MOTIVATIONAL_MESSAGES } from './data';
import { Round, TopicStatus, Subject, Topic, Week, DailyTask } from './types';

export default function App() {
  const [rounds, setRounds] = useState<Round[]>(() => {
    const saved = localStorage.getItem('study_tracker_data');
    if (!saved) return INITIAL_DATA;
    
    try {
      const parsed = JSON.parse(saved) as Round[];
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
  const [sessionTargetMinutes, setSessionTargetMinutes] = useState(25);
  const [showMoodCheck, setShowMoodCheck] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TopicStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'chapter' | 'default'>('default');
  const [studyPoints, setStudyPoints] = useState(() => {
    const saved = localStorage.getItem('study_tracker_points');
    return saved ? parseInt(saved) : 0;
  });
  
  const [timerMode, setTimerMode] = useState<'study' | 'break'>('study');
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [soundEnabled, setSoundEnabled] = useState(true);

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
    localStorage.setItem('study_tracker_points', studyPoints.toString());
  }, [studyPoints]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const handleTimerComplete = () => {
    setIsTimerRunning(false);
    if (soundEnabled) {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(e => console.log('Audio play failed', e));
    }
    
    if (timerMode === 'study') {
      celebrate();
      setStudyPoints(prev => prev + 50);
      setTimerMode('break');
      setTimeLeft(5 * 60);
      setMotivation("أحسنت! وقت استراحة قصيرة، استق وتمدد قليلاً ☕");
    } else {
      setTimerMode('study');
      setTimeLeft(sessionTargetMinutes * 60);
      setMotivation("انتهت الاستراحة، يلا نرجع بكل نشاط! 💪");
    }
    setTimeout(() => setMotivation(null), 5000);
  };

  const celebrate = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F5C842', '#FFFFFF', '#1a1f3c']
    });
  };

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

  useEffect(() => {
    const lastVisit = localStorage.getItem('study_tracker_last_visit');
    const now = Date.now();
    
    if (lastVisit) {
      const timeDiff = now - parseInt(lastVisit);
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      if (hoursDiff >= 24) {
        setWelcomeMessage("أهلاً، مو مهم اللي فات، شو نسوي الحين؟");
      }
    }
    
    localStorage.setItem('study_tracker_last_visit', now.toString());
    setShowMoodCheck(true);
  }, []);

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
    const targetDate = new Date('2026-06-13T00:00:00');
    const now = new Date();
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
                const randomMsg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
                setMotivation(randomMsg);
                setTimeout(() => setMotivation(null), 4000);
                celebrate();
                setStudyPoints(prev => prev + 100);
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

  const handleMoodSelect = (mood: 'great' | 'tired' | 'bored') => {
    if (mood === 'tired' || mood === 'bored') {
      setSessionTargetMinutes(10);
      setTimeLeft(10 * 60);
      setMotivation("أقدر مشاعرك، نجرب 10 دقائق هادئة؟ المهم بس نبدأ 🌙");
    } else {
      setSessionTargetMinutes(25);
      setTimeLeft(25 * 60);
      setMotivation("رائع! يلا نبدأ بكل حماس وقتنا القياسي 🔥");
    }
    setShowMoodCheck(false);
    setTimeout(() => setMotivation(null), 5000);
  };

  const addToDailyTasks = (roundId: string, subjectId: string, topicId: string) => {
    const round = rounds.find(r => r.id === roundId);
    const subject = round?.subjects.find(s => s.id === subjectId);
    const topic = subject?.topics.find(t => t.id === topicId);

    if (!topic || !subject) return;

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
    const randomMsg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
    setMotivation(randomMsg);
    setTimeout(() => setMotivation(null), 4000);
  };

  const toggleDailyTask = (taskId: string) => {
    setDailyTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      
      const newCompleted = !task.completed;
      if (newCompleted) {
        const randomMsg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
        setMotivation(randomMsg);
        setTimeout(() => setMotivation(null), 4000);
        updateTopicStatus(task.roundId, task.subjectId, task.topicId, 'completed');
      }
      
      return { ...task, completed: newCompleted };
    }));
  };

  const removeDailyTask = (taskId: string) => {
    setDailyTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) return `${hrs}س ${mins}د`;
    if (mins > 0) return `${mins}د ${secs}ث`;
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
    if (activeTimer) stopTimer();
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

  const getTotalStudyTime = () => {
    let total = 0;
    rounds.forEach(r => r.subjects.forEach(s => s.topics.forEach(t => { total += (t.studyTime || 0); })));
    return total;
  };

  const getSubjectProgress = React.useCallback((subject: Subject) => {
    const total = subject.topics.length;
    const completed = subject.topics.filter(t => t.status === 'completed').length;
    return Math.round((completed / total) * 100);
  }, []);

  const dynamicWeeks = useMemo(() => {
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
    while (Object.values(uncompletedBySubject).some(s => s.topics.length > 0)) {
      const weekItems: { roundId: 'first', subjectId: string, topicId: string }[] = [];
      (['bio', 'eng', 'isl', 'phys'] as const).forEach(subId => {
        const data = uncompletedBySubject[subId];
        if (data && data.topics.length > 0) {
          let count = 4;
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
      if (sortBy === 'name') sortedTopics.sort((a, b) => a.name.localeCompare(b.name));
      else if (sortBy === 'chapter') sortedTopics.sort((a, b) => a.chapter.localeCompare(b.chapter));
      
      return { ...subject, topics: sortedTopics };
    }).filter(subject => subject.topics.length > 0);

    if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'progress') {
      result.sort((a, b) => {
        const progressA = getSubjectProgress(activeRound.subjects.find(s => s.id === a.id)!);
        const progressB = getSubjectProgress(activeRound.subjects.find(s => s.id === b.id)!);
        return progressB - progressA;
      });
    }
    return result;
  }, [activeRound, searchQuery, statusFilter, sortBy, getSubjectProgress]);

  return (
    <div className="min-h-screen bg-navy text-white pb-12 font-sans selection:bg-gold/30">
      {/* Mood Check Modal */}
      <AnimatePresence>
        {showMoodCheck && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full text-center shadow-2xl space-y-6"
            >
              <div className="flex justify-center">
                <div className="bg-gold/10 p-4 rounded-full">
                  <Sparkles className="w-10 h-10 text-gold" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-navy font-display">
                  {welcomeMessage || "أهلاً بيك يا بطل! كيف حالك اليوم؟"}
                </h2>
                {!welcomeMessage && <p className="text-slate-500 font-bold">كلش طبيعي تكون مشاعرك مخلبطة، شاركنا حتى نساعدك</p>}
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button 
                  onClick={() => handleMoodSelect('great')}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                  كلي طاقة وحماس 🔥
                </button>
                <button 
                  onClick={() => handleMoodSelect('tired')}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-navy py-4 rounded-2xl font-black transition-all active:scale-95"
                >
                  تعبان وما لي خلق 😴
                </button>
                <button 
                  onClick={() => handleMoodSelect('bored')}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 py-4 rounded-2xl font-black transition-all active:scale-95 border-2 border-rose-100"
                >
                  زهقان وضايع 🌀
                </button>
              </div>
              {welcomeMessage && (
                <button 
                  onClick={() => setShowMoodCheck(false)}
                  className="text-gold font-black uppercase tracking-widest text-sm hover:underline"
                >
                  يلا نبدأ، خطوة بخطوة
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      <header className="nav-blur text-white pt-10 pb-6 sticky top-0 z-40 shadow-2xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-6">
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tight flex items-center gap-3 font-display">
                  <div className="bg-gold p-2 rounded-xl shadow-[0_0_20px_rgba(245,200,66,0.2)]">
                    <LayoutDashboard className="text-navy w-6 h-6" />
                  </div>
                  مُنجز
                </h1>
                <div className="flex items-center gap-3 mr-12">
                  <p className="text-gold/60 text-[10px] font-black tracking-widest uppercase">السادس العلمي • ٢٠٢٦</p>
                  <div className="h-1 w-1 bg-white/20 rounded-full" />
                  <div className="flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-gold" />
                    <span className="text-gold font-black text-[10px]">{studyPoints} نقطة</span>
                  </div>
                </div>
              </div>
              <button onClick={resetProgress} className="group flex flex-col items-center gap-1 transition-all">
                <div className="p-2 rounded-lg group-hover:bg-rose-500/10 transition-colors">
                  <RotateCcw className="w-5 h-5 text-white/20 group-hover:text-rose-400" />
                </div>
                <span className="text-[9px] font-black text-white/20 group-hover:text-rose-400 uppercase tracking-tighter">تصفير</span>
              </button>
            </div>
            
            <div className="bg-white/5 p-1.5 rounded-2xl flex gap-2 border border-white/5">
              <button
                onClick={() => setActiveTab('first')}
                className={`flex-1 py-3 rounded-xl font-black transition-all text-sm relative overflow-hidden ${activeTab === 'first' ? 'text-white' : 'text-white/40 hover:text-white'}`}
              >
                {activeTab === 'first' && <motion.div layoutId="activeTab" className="absolute inset-0 bg-rose-600 shadow-lg -z-10" />}
                الدور الأول
              </button>
              <button
                onClick={() => setActiveTab('daily')}
                className={`flex-1 py-3 rounded-xl font-black transition-all text-sm flex items-center justify-center gap-2 relative overflow-hidden ${activeTab === 'daily' ? 'text-white' : 'text-white/40 hover:text-white'}`}
              >
                {activeTab === 'daily' && <motion.div layoutId="activeTab" className="absolute inset-0 bg-emerald-600 shadow-lg -z-10" />}
                <CheckSquare className="w-4 h-4" />
                المهام اليومية
              </button>
              <button
                onClick={() => setActiveTab('plan')}
                className={`flex-1 py-3 rounded-xl font-black transition-all text-sm flex items-center justify-center gap-2 relative overflow-hidden ${activeTab === 'plan' ? 'text-navy' : 'text-white/40 hover:text-white'}`}
              >
                {activeTab === 'plan' && <motion.div layoutId="activeTab" className="absolute inset-0 bg-gold shadow-lg -z-10" />}
                <ListTodo className="w-4 h-4" />
                الخطة
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Pomodoro Timer Section */}
            <div className="glass p-6 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col items-center">
                  <div className="flex items-center gap-3 mb-6">
                    <button 
                      onClick={() => { setTimerMode('study'); setTimeLeft(sessionTargetMinutes * 60); setIsTimerRunning(false); }}
                      className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${timerMode === 'study' ? 'bg-gold text-navy shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                    >
                      دراسة
                    </button>
                    <button 
                      onClick={() => { setTimerMode('break'); setTimeLeft(5 * 60); setIsTimerRunning(false); }}
                      className={`px-4 py-1.5 rounded-full text-xs font-black transition-all ${timerMode === 'break' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                    >
                      استراحة ☕
                    </button>
                  </div>
                  <div className="text-7xl font-black font-mono mb-8 tracking-tighter text-white drop-shadow-2xl">
                    {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setIsTimerRunning(!isTimerRunning)}
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isTimerRunning ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30' : 'bg-emerald-500 text-white shadow-lg'}`}
                    >
                      {isTimerRunning ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                    </button>
                    <button
                      onClick={() => setTimeLeft(timerMode === 'study' ? sessionTargetMinutes * 60 : 5 * 60)}
                      className="w-12 h-12 rounded-xl bg-white/5 text-white/40 flex items-center justify-center hover:bg-white/10 transition-all border border-white/5"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </div>
                </div>
            </div>

            {activeTab === 'daily' ? (
              <div className="space-y-6">
                {dailyTasks.length === 0 ? (
                  <div className="glass border-2 border-dashed border-white/10 p-16 rounded-[2rem] text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ListTodo className="w-10 h-10 text-white/10" />
                    </div>
                    <h3 className="text-xl font-black text-white/20 mb-2 font-display">لا توجد مهام مضافة</h3>
                    <p className="text-white/20 text-sm font-bold">اذهب إلى المواضيع وأضف ما تود إنجازه اليوم.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dailyTasks.map((task) => (
                      <motion.div 
                        layout key={task.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`flex items-center gap-4 p-5 rounded-2xl glass-card transition-all group ${task.completed ? 'opacity-50' : ''}`}
                      >
                        <button 
                          onClick={() => toggleDailyTask(task.id)}
                          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-white/10 text-transparent hover:border-emerald-500'}`}
                        >
                          <Check className="w-4 h-4 stroke-[4px]" />
                        </button>
                        <div className="flex-1">
                          <p className={`font-black text-lg ${task.completed ? 'text-white/40 line-through' : 'text-white'}`}>{task.topicName}</p>
                          <p className={`text-[10px] font-black uppercase tracking-widest ${task.completed ? 'text-white/20' : 'text-white/40'}`}>{task.subjectName}</p>
                        </div>
                        <button onClick={() => removeDailyTask(task.id)} className="p-2 text-white/10 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'plan' ? (
              <div className="space-y-6">
                <div className="glass-card p-6 rounded-2xl">
                  <h2 className="text-xl font-extrabold text-white mb-2 flex items-center gap-2">
                    <Calendar className="text-gold" /> الخطة الدراسية الذكية
                  </h2>
                  <p className="text-white/40 text-sm font-medium">خطة ديناميكية تركز على ما تبقى لك من مواد.</p>
                </div>
                {dynamicWeeks.length === 0 ? (
                  <div className="glass border-2 border-dashed border-emerald-500/20 p-16 rounded-[2rem] text-center">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Trophy className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-emerald-500 mb-2 font-display">أحسنت يا بطل!</h3>
                  </div>
                ) : (
                  dynamicWeeks.map((week) => (
                    <div key={week.id} className="glass-card !p-0 overflow-hidden rounded-[2rem]">
                      <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex justify-between items-center text-right">
                        <h3 className="font-black text-white font-display">{week.title}</h3>
                        <span className="text-[10px] font-black bg-white/5 px-3 py-1 rounded-full text-white/40 uppercase">{week.items.length} مهام</span>
                      </div>
                      <div className="divide-y divide-white/5 text-right">
                        {week.items.map((item, idx) => {
                          const { subject, topic } = getTopicInfo(item.roundId, item.subjectId, item.topicId);
                          if (!topic || !subject) return null;
                          return (
                            <div key={`${item.topicId}-${idx}`} className="p-5 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-xl border border-white/5">{subject.emoji}</div>
                                  <div>
                                    <p className="font-black text-white text-sm">{topic.name}</p>
                                    <p className="text-[10px] font-black text-white/20 uppercase">{subject.name} • {topic.chapter}</p>
                                  </div>
                                </div>
                                <button onClick={() => addToDailyTasks(item.roundId, item.subjectId, topic.id)} className="p-2.5 bg-white/5 text-white/20 hover:text-emerald-500 border border-white/5 rounded-xl transition-all">
                                  <CheckSquare className="w-5 h-5" />
                                </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Rounds Content */}
                <motion.div 
                  key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  className={`p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden ${activeTab === 'first' ? 'bg-gradient-to-br from-rose-600 to-rose-800' : 'bg-gradient-to-br from-blue-600 to-blue-800'}`}
                >
                  <div className="relative z-10 text-right">
                    <div className="flex items-center gap-3 mb-4 opacity-90 justify-end">
                      <span className="text-sm font-black uppercase tracking-[0.2em]">الوقت المتبقي</span>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="flex items-baseline gap-3 justify-end">
                      <span className="text-7xl font-black font-display tracking-tighter">{activeRound.daysLeft}</span>
                      <span className="text-2xl font-black opacity-80">يوم</span>
                    </div>
                    <p className="text-white/80 font-black text-sm mt-2">باقي {activeRound.daysLeft} يوم، وأنت تقدر!</p>
                  </div>
                </motion.div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'المنجز', val: `${stats.completedTopics} / ${stats.totalTopics}`, icon: CheckCircle2, color: 'text-emerald-500' },
                    { label: 'النسبة', val: `${stats.percentage}%`, icon: Trophy, color: 'text-gold' },
                    { label: 'المتبقي', val: stats.remaining, icon: Clock, color: 'text-rose-500' },
                    { label: 'وقت الدراسة', val: formatTime(getTotalStudyTime()), icon: History, color: 'text-blue-500' }
                  ].map((s, i) => (
                    <div key={i} className="glass-card flex flex-col items-center text-center">
                      <s.icon className={`w-5 h-5 ${s.color} mb-3`} />
                      <span className="text-[10px] text-white/20 font-black uppercase mb-1">{s.label}</span>
                      <span className="text-xl font-black font-display">{s.val}</span>
                    </div>
                  ))}
                </div>

                <input
                  type="text" placeholder="ابحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border-2 border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-gold/30 outline-none text-right"
                />

                <div className="space-y-6">
                  {processedSubjects.map((subject) => {
                    const originalSubject = activeRound.subjects.find(s => s.id === subject.id)!;
                    const subjectProgress = getSubjectProgress(originalSubject);
                    const isExpanded = expandedSubjects[subject.id] || searchQuery;

                    return (
                      <div key={subject.id} className="glass-card !p-0 overflow-hidden rounded-[2rem]">
                        <button onClick={() => toggleSubject(subject.id)} className="w-full p-6 flex items-center justify-between text-right">
                          <div className="flex items-center gap-5 flex-1">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-3xl border border-white/10">{subject.emoji}</div>
                            <div className="flex-1">
                              <h3 className="font-black text-white text-xl font-display">{subject.name}</h3>
                              <div className="flex items-center gap-4 mt-2">
                                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                  <motion.div initial={{ width: 0 }} animate={{ width: `${subjectProgress}%` }} className="h-full bg-gold" />
                                </div>
                                <span className="text-xs font-black text-white/40">{subjectProgress}%</span>
                              </div>
                            </div>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-white/10 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-white/5 bg-white/[0.01]">
                              <div className="p-5 space-y-4">
                                {subject.topics.map((topic) => (
                                  <div key={topic.id} className="bg-white/5 p-4 rounded-xl flex items-center justify-between text-right">
                                    <div className="flex-1 ml-4">
                                      <p className="font-black text-white text-sm">{topic.name}</p>
                                      <p className="text-[10px] text-white/20">{topic.chapter} • {formatTime(topic.studyTime || 0)}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button onClick={() => activeTimer?.topicId === topic.id ? stopTimer() : startTimer(activeRound.id, subject.id, topic.id)} className={`p-2 rounded-lg ${activeTimer?.topicId === topic.id ? 'bg-rose-500 text-white' : 'bg-white/5 text-white/20'}`}>
                                        {activeTimer?.topicId === topic.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                      </button>
                                      <button onClick={() => cycleStatus(subject.id, topic.id)} className={`px-4 py-2 rounded-lg text-[10px] font-black ${topic.status === 'completed' ? 'bg-emerald-500 text-white' : topic.status === 'in-progress' ? 'bg-amber-400 text-white' : 'bg-white/5 text-white/20'}`}>
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
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="text-center mt-12 text-white/20 text-[10px] font-black uppercase tracking-[0.2em]">
        صُنع بكل حب لطلاب العراق 🇮🇶 • مُنجز 2026
      </footer>
    </div>
  );
}
