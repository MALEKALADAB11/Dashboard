import {
  Component, inject, viewChild, ElementRef,
  AfterViewChecked, effect, OnInit
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownPipe } from '../../../shared/pipes/markdown-pipe';
import { ChatStateService } from '../../../core/services/chat-state';
import { ThemeService } from '../../../core/services/theme';

interface Conversation {
  id:      string;
  title:   string;
  preview: string;
  time:    string;
  unread:  boolean;
  active:  boolean;
}

@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, MarkdownPipe],
  templateUrl: './chat-panel.html',
  styleUrl:    './chat-panel.scss',
})
export class ChatPanelComponent implements OnInit, AfterViewChecked {
  readonly chat  = inject(ChatStateService);
  private  theme = inject(ThemeService);

  private readonly msgContainer = viewChild<ElementRef>('msgContainer');

  chatInput = '';
  searchInput = '';

  readonly quickQuestions = [
    'Argument 5G ?',
    'Gérer client SFR ?',
    'Pic trafic 16h30 ?',
    'Script assurance ?',
    'Upsell accessoires ?',
    'Objection prix ?',
  ];

  readonly sessionMetrics = [
    { label: 'Messages',      value: '12',   color: 'blue'   },
    { label: 'Audit Score',   value: '0.87', color: 'green'  },
    { label: 'Conseils app.', value: '4',    color: 'purple' },
    { label: 'Durée session', value: '18min',color: 'amber'  },
  ];

  conversations: Conversation[] = [
    { id:'c1', title:'Stratégie trafic 16h30',   preview:'Pic prévu +8 visiteurs…',      time:'14:31', unread:false, active:true  },
    { id:'c2', title:'Upsell 5G · Karim',        preview:'Argument différenciation…',    time:'13:45', unread:true,  active:false },
    { id:'c3', title:'Script assurance bundle',  preview:'Sur ventes ≥400€ proposer…',   time:'12:20', unread:false, active:false },
    { id:'c4', title:'Gestion objection prix',   preview:'Technique ancrage valeur…',    time:'11:05', unread:false, active:false },
    { id:'c5', title:'Coaching Sara M.',         preview:'Objectif 60% · Plan action…',  time:'10:30', unread:true,  active:false },
  ];

  constructor() {
    effect(() => { this.chat.messages(); this.scrollBottom(); });
  }

  ngOnInit(): void { this.theme.set('blue'); }

  ngAfterViewChecked(): void { this.scrollBottom(); }

  private scrollBottom(): void {
    const el = this.msgContainer()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  selectConversation(id: string): void {
    this.conversations = this.conversations.map(c => ({
      ...c, active: c.id === id, unread: c.id === id ? false : c.unread
    }));
  }

  sendMessage(): void {
    if (!this.chatInput.trim() || this.chat.isLoading()) return;
    const text = this.chatInput.trim();
    this.chatInput = '';
    this.chat.addUserMessage(text);
    this.chat.isLoading.set(true);

    setTimeout(() => {
      this.chat.addAiMessage(
        `Analyse pour **"${text}"** :\n\nBasé sur le contexte boutique actuel (**12 visiteurs**, pluie +40% accessoires), voici ma recommandation ciblée.\n\n**Action prioritaire :** Proposer la protection écran premium sur chaque vente smartphone. Taux de conversion estimé : **+40%** en conditions météo défavorables.`,
        +(Math.random() * 0.1 + 0.82).toFixed(2)
      );
      this.chat.isLoading.set(false);
    }, 1600);
  }

  onEnter(e: Event): void {
    const ke = e as KeyboardEvent;
    if (!ke.shiftKey) { e.preventDefault(); this.sendMessage(); }
  }

  useQuick(q: string): void {
    this.chatInput = q;
    this.sendMessage();
  }

  get filteredConversations(): Conversation[] {
    if (!this.searchInput.trim()) return this.conversations;
    return this.conversations.filter(c =>
      c.title.toLowerCase().includes(this.searchInput.toLowerCase())
    );
  }
}