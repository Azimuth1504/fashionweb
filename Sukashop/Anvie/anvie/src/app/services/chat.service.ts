import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SessionService } from './session.service';

export interface ChatMessage {
  messageId?: number;
  role: string;
  content: string;
  createdAt?: string;
  productId?: number | null;
}

export interface ChatSession {
  sessionId: number;
  agent: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  messages?: ChatMessage[];
}

export interface ChatRequest {
  sessionId?: number | null;
  agent: string;
  message: string;
  productId?: number | null;
  page?: string;
}

export interface ChatResponse {
  sessionId: number;
  reply: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private url = 'http://localhost:8080/api/chat';

  constructor(private http: HttpClient, private sessionService: SessionService) { }

  sendMessage(payload: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(this.url + '/messages', payload, {
      headers: this.getAuthHeaders()
    });
  }

  getLatestSession(agent: string): Observable<ChatSession> {
    return this.http.get<ChatSession>(this.url + '/sessions/latest?agent=' + agent, {
      headers: this.getAuthHeaders()
    });
  }

  getSessionMessages(sessionId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(this.url + '/sessions/' + sessionId + '/messages', {
      headers: this.getAuthHeaders()
    });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.sessionService.getToken();
    return new HttpHeaders({
      Authorization: 'Bearer ' + token
    });
  }
}
