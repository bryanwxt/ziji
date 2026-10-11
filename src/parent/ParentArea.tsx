import { BookOpen, ChevronLeft, Ear, FileText, Gauge, Gift, Image, Info, LayoutDashboard, Mic, Save, ScanText, Settings, TrendingUp } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { SkillsPanel } from './SkillsPanel';
import { BackupPanel } from './BackupPanel';
import { Credits } from './Credits';
import { Dashboard } from './Dashboard';
import { ImportPanel } from './ImportPanel';
import { ListenPanel } from './ListenPanel';
import { waitingTakes } from '../session/say';
import { listRecordings } from '../store/repo';
import { PassagesPanel } from './PassagesPanel';
import { PicturesPanel } from './PicturesPanel';
import { PinGate } from './PinGate';
import { ProgressTab } from './ProgressPanel';
import { RecordingsPanel } from './RecordingsPanel';
import { RewardsPanel } from './RewardsPanel';
import { SettingsPanel } from './SettingsPanel';
import { WordsPanel } from './WordsPanel';

export type ParentTab = 'dashboard' | 'listen' | 'progress' | 'skills' | 'words' | 'import' | 'passages' | 'recordings' | 'pictures' | 'rewards' | 'settings' | 'backup' | 'credits';

const TABS: [ParentTab, string, typeof Info][] = [
  ['dashboard', 'Overview', LayoutDashboard],
  ['listen', 'Listen & confirm', Ear], // his Say takes (spec 2026-10-11 §6)
  ['progress', 'Progress', TrendingUp],
  ['skills', 'Skills', Gauge],
  ['words', 'Words', BookOpen],
  ['import', 'From a worksheet', ScanText],
  ['passages', 'Reading texts', FileText],
  ['recordings', 'Recordings', Mic],
  ['pictures', 'Pictures', Image],
  ['rewards', 'Rewards', Gift],
  ['settings', 'Settings', Settings],
  ['backup', 'Backup', Save],
  ['credits', 'Credits', Info],
];

export function ParentArea() {
  const { db, go } = useApp();
  const [tab, setTab] = useState<ParentTab>('dashboard');
  const [waiting, setWaiting] = useState(0); // takes to review: the badge on Listen & confirm
  const countWaiting = async () => setWaiting(waitingTakes(await listRecordings(db)).length);
  useEffect(() => {
    void countWaiting();
  }, []);
  return (
    <PinGate>
      <div class="screen screen--scroll parent">
        <header class="topbar">
          <button type="button" class="btn btn--ghost" onClick={() => go({ name: 'home' })}><ChevronLeft size={22} strokeWidth={3} /> Done</button>
          <nav class="tabs">
            {TABS.map(([id, label, Icon]) => (
              <button key={id} type="button" class={`tab ${tab === id ? 'is-active' : ''}`} onClick={() => setTab(id)}>
                <Icon size={18} strokeWidth={2.5} /> {label}
                {id === 'listen' && waiting > 0 && <span class="tab__badge" aria-label={`${waiting} waiting`}>{waiting}</span>}
              </button>
            ))}
          </nav>
        </header>
        <main class="parent__body">
          {tab === 'dashboard' && <Dashboard onNavigate={setTab} />}
          {tab === 'listen' && <ListenPanel onReviewed={() => void countWaiting()} />}
          {tab === 'progress' && <ProgressTab />}
          {tab === 'skills' && <SkillsPanel />}
          {tab === 'words' && <WordsPanel />}
          {tab === 'import' && <ImportPanel />}
          {tab === 'passages' && <PassagesPanel />}
          {tab === 'recordings' && <RecordingsPanel />}
          {tab === 'pictures' && <PicturesPanel />}
          {tab === 'rewards' && <RewardsPanel />}
          {tab === 'settings' && <SettingsPanel />}
          {tab === 'backup' && <BackupPanel />}
          {tab === 'credits' && <Credits />}
        </main>
      </div>
    </PinGate>
  );
}
