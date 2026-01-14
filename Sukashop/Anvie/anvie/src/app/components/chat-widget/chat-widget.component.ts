import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ChatMessage, ChatRequest, ChatService } from 'src/app/services/chat.service';
import { SessionService } from 'src/app/services/session.service';

@Component({
  selector: 'app-chat-widget',
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css']
})
export class ChatWidgetComponent implements OnInit {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef<HTMLDivElement>;

  selectedAgent = 'chat';
  messages: ChatMessage[] = [];
  isOpen = false;
  isLoading = false;
  inputMessage = '';
  sessionId: number | null = null;
  currentPage = '';
  productId: number | null = null;

  constructor(
    private chatService: ChatService,
    private sessionService: SessionService,
    private router: Router,
    private toastr: ToastrService
  ) { }

  get isLoggedIn(): boolean {
    return this.sessionService.getUser() != null;
  }

  ngOnInit(): void {
    this.updatePageContext(this.router.url);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.updatePageContext(event.urlAfterRedirects || event.url);
      }
    });
  }

  toggleOpen(): void {
    if (!this.isLoggedIn) {
      return;
    }
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.loadLatestSession();
    }
  }

  close(): void {
    this.isOpen = false;
  }

  sendMessage(): void {
    const content = this.inputMessage.trim();
    if (!content || this.isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      role: 'USER',
      content: content,
      createdAt: new Date().toISOString()
    };

    this.messages = [...this.messages, userMessage];
    this.inputMessage = '';
    this.isLoading = true;
    this.scrollToBottom();

    const payload: ChatRequest = {
      sessionId: this.sessionId,
      agent: this.selectedAgent,
      message: content,
      productId: this.productId,
      page: this.currentPage
    };

    this.chatService.sendMessage(payload).subscribe({
      next: response => {
        this.sessionId = response.sessionId;
        this.messages = [
          ...this.messages,
          {
            role: 'ASSISTANT',
            content: response.reply,
            createdAt: response.createdAt || new Date().toISOString()
          }
        ];
        this.scrollToBottom();
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Không thể gửi tin nhắn, vui lòng thử lại.', 'Hệ thống');
        this.isLoading = false;
      }
    });
  }

  private loadLatestSession(): void {
    this.chatService.getLatestSession(this.selectedAgent).subscribe({
      next: session => {
        if (session && session.sessionId) {
          this.sessionId = session.sessionId;
          this.messages = session.messages || [];
        } else {
          this.resetMessages();
        }
        this.scrollToBottom();
      },
      error: () => {
        this.resetMessages();
      }
    });
  }

  private resetMessages(): void {
    this.sessionId = null;
    this.messages = [
      {
        role: 'ASSISTANT',
        content: 'Xin chào! Mình có thể tư vấn sản phẩm hoặc hướng dẫn bạn dùng website.',
        createdAt: new Date().toISOString()
      }
    ];
  }

  private updatePageContext(url: string): void {
    this.currentPage = url || '';
    this.productId = null;

    const match = this.currentPage.match(/product-detail\/(\d+)/);
    if (match && match[1]) {
      this.productId = Number(match[1]);
    }
  }

  private scrollToBottom(): void {
    if (!this.messagesContainer) {
      return;
    }
    setTimeout(() => {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }, 0);
  }
}
