import { Injectable, signal, computed } from '@angular/core';
import { ChatMessage, Notification } from '../models/models';

const INIT: ChatMessage = {
  id: 'init', role: 'ai', timestamp: new Date(), auditScore: 0.88,
  content: 'Bonjour Karim ! Tu es à **93% de ton objectif** avec 3h28 restantes. La pluie crée une opportunité sur les accessoires (+40%). Je surveille la boutique en temps réel. Que veux-tu travailler ?',
};

const INIT_NOTIFS: Notification[] = [
  { id:'n1', type:'coach',    title:'Conseil IA généré',      message:'Stratégie accessoires pluie disponible',  time:'14:30', read:false, severity:'blue'  },
  { id:'n2', type:'alert',    title:'Sara M. sous objectif',  message:'60% atteint · Plan de rattrapage envoyé', time:'14:15', read:false, severity:'red'   },
  { id:'n3', type:'traffic',  title:'Pic trafic prévu 16h30', message:'+8 visiteurs · Fenêtre 45 min',           time:'14:00', read:true,  severity:'amber' },
  { id:'n4', type:'forecast', title:'Prévision mise à jour',  message:'EOD estimé 6 800€ · IC 80%',             time:'13:45', read:true,  severity:'green' },
];

@Injectable({ providedIn: 'root' })
export class ChatStateService {
  readonly messages      = signal<ChatMessage[]>([INIT]);
  readonly isLoading     = signal(false);
  readonly error         = signal<string | null>(null);
  readonly notifications = signal<Notification[]>(INIT_NOTIFS);

  readonly hasError    = computed(() => this.error() !== null);
  readonly unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  addUserMessage(text: string): void {
    this.messages.update(m => [...m, {
      id: crypto.randomUUID(), role: 'user',
      content: text.trim(), timestamp: new Date(),
    }]);
  }

  addAiMessage(text: string, auditScore?: number): void {
    this.messages.update(m => [...m, {
      id: crypto.randomUUID(), role: 'ai',
      content: text, timestamp: new Date(), auditScore,
    }]);
  }

  pushNotification(n: Omit<Notification, 'id' | 'read'>): void {
    this.notifications.update(list => [
      { ...n, id: crypto.randomUUID(), read: false },
      ...list,
    ]);
  }

  markAllRead(): void {
    this.notifications.update(list => list.map(n => ({ ...n, read: true })));
  }

  markRead(id: string): void {
    this.notifications.update(list =>
      list.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }

  setFeedback(id: string, f: 'up' | 'down'): void {
    this.messages.update(m =>
      m.map(msg => msg.id === id ? { ...msg, feedback: f } : msg)
    );
  }

  clear(): void {
    this.messages.set([INIT]);
    this.error.set(null);
  }
}