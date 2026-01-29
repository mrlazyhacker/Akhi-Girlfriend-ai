
export interface Message {
  id: string;
  role: 'user' | 'akhi';
  text: string;
  timestamp: Date;
}

export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface TranscriptionPart {
  text: string;
  isFinal: boolean;
}
