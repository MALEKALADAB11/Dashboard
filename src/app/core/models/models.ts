export interface Advisor {
  initials:   string;
  name:       string;
  specialty:  string;
  avatar:     string;
  sales:      number;
  target:     number;
  forecast:   number;
  coachScore: number;
  status:     'sent' | 'urgent' | 'waiting';
}

export interface KpiCard {
  label:     string;
  value:     string;
  sub:       string;
  color:     'blue' | 'red' | 'green' | 'amber' | 'purple';
  progress?: number;
  trend?:    { label: string; type: 'up' | 'down' | 'neutral' };
}

export interface ChatMessage {
  id:          string;
  role:        'ai' | 'user';
  content:     string;
  timestamp:   Date;
  auditScore?: number;
  feedback?:   'up' | 'down' | null;
}

export interface AlertItem {
  title:    string;
  desc:     string;
  time:     string;
  severity: 'red' | 'amber' | 'green';
}

export interface Notification {
  id:       string;
  type:     'alert' | 'coach' | 'forecast' | 'traffic';
  title:    string;
  message:  string;
  time:     string;
  read:     boolean;
  severity: 'red' | 'amber' | 'green' | 'blue';
}