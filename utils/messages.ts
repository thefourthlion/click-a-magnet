import type { DownloaderConfig } from './downloaders/types';

export type ToastKind = 'info' | 'success' | 'error';

export type Message =
  | { type: 'ADD_MAGNET'; magnet: string; downloaderId?: string }
  | { type: 'TEST_CONNECTION'; config: DownloaderConfig }
  | { type: 'SHOW_TOAST'; text: string; kind: ToastKind };

export type MessageResponse =
  | { ok: true; data?: string }
  | { ok: false; error: string };
