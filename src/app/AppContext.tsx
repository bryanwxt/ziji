import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { AppDb } from '../store/db';
import type { KidState, Settings } from '../types';

export type Route =
  | { name: 'home' }
  | { name: 'session'; free: boolean; extra?: boolean }
  | { name: 'placement' }
  | { name: 'parent' }
  | { name: 'stickers' }
  | { name: 'wardrobe' }
  | { name: 'setupPin' }
  | { name: 'petSetup' }
  | { name: 'langdu' }
  | { name: 'check'; listId: string } // 考考自己 on a weekly list's ready-by day (weekly list spec 2026-10-17 §8.1)
  | { name: 'story'; part: 'setup' | 'payoff'; chapter: number; then: Route }; // the Word Thief chapter around a lesson (3c)

export interface AppData {
  db: AppDb;
  settings: Settings;
  kid: KidState | null;
  voice: boolean;
  now: () => Date;
  go: (route: Route) => void;
  refresh: () => Promise<void>;
}

export const AppContext = createContext<AppData | null>(null);

export function useApp(): AppData {
  const app = useContext(AppContext);
  if (!app) throw new Error('useApp must be used inside AppContext');
  return app;
}
