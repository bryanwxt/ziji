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
  | { name: 'langdu' };

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
