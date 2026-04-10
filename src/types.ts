export type TopicStatus = 'not-started' | 'in-progress' | 'completed';

export interface Topic {
  id: string;
  name: string;
  chapter: string;
  status: TopicStatus;
}

export interface Subject {
  id: string;
  name: string;
  emoji: string;
  topics: Topic[];
}

export interface Round {
  id: 'first';
  name: string;
  daysLeft: number;
  subjects: Subject[];
  plan: string;
}

export interface WeeklyPlanItem {
  topicId: string;
  subjectId: string;
  roundId: 'first';
}

export interface Week {
  id: number;
  title: string;
  items: WeeklyPlanItem[];
}

export interface AppState {
  rounds: Round[];
  weeklyPlan: Week[];
}
