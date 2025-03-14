import { Injectable, OnModuleInit } from '@nestjs/common';
import * as WebSocket from 'ws';

@Injectable()
export class WarudoService implements OnModuleInit {
  private webSocket: WebSocket;
  private reconnectInterval = 1000;
  private isReconnecting = false;

  onModuleInit() {
    this.connectWebSocket();
  }

  private connectWebSocket() {
    this.webSocket = new WebSocket('ws://127.0.0.1:19190');

    this.webSocket.on('open', () => {
      console.log('WebSocket connection opened.');
      this.isReconnecting = false;
    });

    this.webSocket.on('close', (code, reason) => {
      console.warn(`WebSocket closed: ${code} - ${reason}`);
      console.log('Attempting to reconnect...');
      this.attemptReconnect();
    });

    this.webSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
      console.log('Attempting to reconnect due to error...');
      this.attemptReconnect();
    });
  }

  private attemptReconnect() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;

    console.log(`Reconnecting in ${this.reconnectInterval / 1000} seconds...`);
    setTimeout(() => {
      console.log('Reconnecting to WebSocket...');
      this.connectWebSocket();
    }, this.reconnectInterval);
  }

  sendMessageToWarudo(message: string) {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      console.log('WebSocket is open. Sending message:', message);
      this.webSocket.send(message, (err) => {
        if (err) {
          console.error('Error sending message to Warudo:', err);
        }
      });
    } else {
      console.error('WebSocket is not open. Cannot send message.');
    }
  }
}
