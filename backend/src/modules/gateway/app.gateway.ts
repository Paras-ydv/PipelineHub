import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { isOriginAllowed } from '../../main';

@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      if (isOriginAllowed(origin)) return callback(null, true);
      callback(new Error(`WS CORS: origin "${origin}" not allowed`));
    },
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private clients = new Map<string, Socket>();

  handleConnection(client: Socket) {
    this.clients.set(client.id, client);
    client.emit('connected', { message: 'Connected to PipelineHub' });
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client.id);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, room: string) {
    client.join(room);
  }

  emit(event: string, data: any) {
    this.server.emit(event, data);
  }

  emitToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  jobUpdate(data: any) { this.emit('job:update', data); }
  jobCreated(data: any) { this.emit('job:created', data); }
  workerUpdate(data: any) { this.emit('worker:update', data); }
  logAppend(jobId: string, data: any) { this.emit(`log:${jobId}`, data); }
  queueUpdate(data: any) { this.emit('queue:update', data); }
  webhookReceived(data: any) { this.emit('webhook:received', data); }
  deploymentUpdate(data: any) { this.emit('deployment:update', data); }
  metricsUpdate(data: any) { this.emit('metrics:update', data); }
}
