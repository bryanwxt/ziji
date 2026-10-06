import { BookOpen, ChevronLeft, FileText, Gauge, Gift, Image, Info, LayoutDashboard, Mic, Save, ScanText, Settings, TrendingUp } from 'lucide-preact';
import { useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { SkillsPanel } from './SkillsPanel';
import { BackupPanel } from './BackupPanel';
import { Credits } from './Credits';
import { Dashboard } from './Dashboard';
import { ImportPanel } from './ImportPanel';
import { PassagesPanel } from './PassagesPanel';
import { PicturesPanel } from './PicturesPanel';
import { PinGate } from './PinGate';
import { ProgressTab } from './ProgressPanel';
import { RecordingsPanel } from './RecordingsPanel';
import { RewardsPanel } from './RewardsPanel';
import { SettingsPanel } from './SettingsPanel';
import { WordsPanel } from './WordsPanel';

export type ParentTab = 'dashboard' | 'progress' | 'skills' | 'words' | 'import' | 'passages' | 'recordings' | 'pictures' | 'rewards' | 'settings' | 'backup' | 'credits';

const TABS: [ParentTab, string, typeof Info][] = [
  ['dashboard', 'Overview', LayoutDashboard],
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
  const { go } = useApp();
  const [tab, setTab] = useState<ParentTab>('dashboard');
  return (
    <PinGate>
      <div class="screen screen--scroll parent">
        <header class="topbar">
          <button type="button" class="btn btn--ghost" onClick={() => go({ name: 'home' })}><ChevronLeft size={22} strokeWidth={3} /> Done</button>
          <nav class="tabs">
            {TABS.map(([id, label, Icon]) => (
              <button key={id} type="button" class={`tab ${tab === id ? 'is-active' : ''}`} onClick={() => setTab(id)}>
                <Icon size={18} strokeWidth={2.5} /> {label}
              </button>
            ))}
          </nav>
        </header>
        <main class="parent__body">
          {tab === 'dashboard' && <Dashboard onNavigate={setTab} />}
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
