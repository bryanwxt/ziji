import { useCallback, useEffect, useState } from 'preact/hooks';
import { AppContext, type AppData, type Route } from './app/AppContext';
import { CrashGuard } from './app/CrashGuard';
import { ErrorScreen } from './app/ErrorScreen';
import { HomeScreen } from './app/HomeScreen';
import { PetSetup } from './app/PetSetup';
import { PlacementScreen } from './app/PlacementScreen';
import { LangduScreen } from './app/LangduScreen';
import { SessionScreen } from './app/SessionScreen';
import { SetupPin } from './app/SetupPin';
import { CollectionScreen } from './app/CollectionScreen';
import { Wardrobe } from './app/Wardrobe';
import { bootstrap, firstRoute, type Booted } from './bootstrap';
import { ParentArea } from './parent/ParentArea';
import { DB_NAME } from './store/db';
import { withViewTransition } from './ui/motion';
import { allWords, getKid, getSettings } from './store/repo';
import { hanChars } from './content';
import { prefetchStrokes } from './content/strokes';
import { InkIcon } from './ui/icons/InkIcon';
import { RotateHint } from './ui/RotateHint';

export function App({ dbName = DB_NAME, now = () => new Date() }: { dbName?: string; now?: () => Date }) {
  const [booted, setBooted] = useState<Booted | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>({ name: 'home' });

  useEffect(() => {
    bootstrap(dbName).then(
      (b) => {
        setBooted(b);
        setRoute(firstRoute(b));
      },
      (e) => setError(String(e)),
    );
  }, [dbName]);

  const db = booted?.db;
  const refresh = useCallback(async () => {
    if (!db) return;
    const [settings, kid] = await Promise.all([getSettings(db), getKid(db)]);
    setBooted((b) => (b ? { ...b, settings, kid } : b));
  }, [db]);

  // Warm the stroke-data cache so 听写 works offline later.
  useEffect(() => {
    if (!db || import.meta.env.MODE === 'test' || !navigator.onLine) return;
    void allWords(db).then((ws) => prefetchStrokes(ws.filter((w) => !w.paused).flatMap((w) => hanChars(w.text))));
  }, [db]);

  if (error) return <ErrorScreen message={error} dbName={dbName} />;
  if (!booted) return <div class="screen loading"><InkIcon name="paw" size={88} label="加载中" /></div>;

  const app: AppData = { ...booted, now, go: (r) => withViewTransition(() => setRoute(r)), refresh };
  return (
    <AppContext.Provider value={app}>
      <CrashGuard>
        <Screen route={route} />
      </CrashGuard>
      {route.name !== 'parent' && <RotateHint kid={booted.kid} />}
    </AppContext.Provider>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'setupPin':
      return <SetupPin />;
    case 'petSetup':
      return <PetSetup />;
    case 'placement':
      return <PlacementScreen />;
    case 'session':
      return <SessionScreen key={String(route.free)} free={route.free} />;
    case 'parent':
      return <ParentArea />;
    case 'stickers':
      return <CollectionScreen />;
    case 'wardrobe':
      return <Wardrobe />;
    case 'langdu':
      return <LangduScreen />;
    case 'home':
      return <HomeScreen />;
  }
}
