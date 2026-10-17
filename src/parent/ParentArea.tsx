import { BookOpen, ChevronLeft, ChevronDown, Gift, Info, Settings, Sun, TrendingUp } from 'lucide-preact';
import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { SkillsPanel } from './SkillsPanel';
import { BackupPanel } from './BackupPanel';
import { Credits } from './Credits';
import { Dashboard } from './Dashboard';
import { ExtraLessonButton } from './ExtraLessonButton';
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
import { TalkSection } from './TalkSection';
import { WeekPanel } from './WeekPanel';
import { WeekSummaryPanel } from './WeekSummaryPanel';
import { WordsPanel } from './WordsPanel';

/** The parent area's five tabs (parent, 2026-10-15: thirteen scrolled sideways on a phone). */
export type ParentTab = 'today' | 'progress' | 'content' | 'rewards' | 'settings';
/** The five parts of Content, picked by its segmented control; 本周词语 first (weekly list spec 2026-10-17 §3.1). */
export type ContentPart = 'week' | 'words' | 'import' | 'passages' | 'pictures';
/** A place a shortcut can go: each of the old tabs, now a section of one of the five. */
export type ParentPlace = 'dashboard' | 'talk' | 'listen' | 'recordings' | 'summary' | 'school' | 'skills' | 'memory' | ContentPart | 'rewards' | 'settings' | 'backup' | 'credits';

export const HOME: Record<ParentPlace, ParentTab> = {
  dashboard: 'today', talk: 'today', listen: 'today', recordings: 'today',
  summary: 'progress', school: 'progress', skills: 'progress', memory: 'progress',
  week: 'content', words: 'content', import: 'content', passages: 'content', pictures: 'content',
  rewards: 'rewards',
  settings: 'settings', backup: 'settings', credits: 'settings',
};
/** A place's element: its section, scrolled to when a shortcut goes there. */
export const placeId = (p: ParentPlace) => `parent-${p}`;

const TABS: [ParentTab, string, string, typeof Info][] = [
  ['today', '今天', 'Today', Sun],
  ['progress', '进度', 'Progress', TrendingUp],
  ['content', '内容', 'Content', BookOpen],
  ['rewards', '奖励', 'Rewards', Gift],
  ['settings', '设置', 'Settings', Settings],
];

const PARTS: [ContentPart, string][] = [
  ['week', 'This week'],
  ['words', 'Words'],
  ['import', 'From a worksheet'],
  ['passages', 'Reading texts'],
  ['pictures', 'Pictures'],
];
let lastPart: ContentPart = 'week'; // Content opens where the parent left it, for this session

export function ParentArea() {
  const { db, go } = useApp();
  const [tab, setTab] = useState<ParentTab>('today');
  const [part, setPartState] = useState<ContentPart>(lastPart);
  const setPart = (p: ContentPart) => { lastPart = p; setPartState(p); };
  const [allRecordings, setAllRecordings] = useState(false);
  const [goTo, setGoTo] = useState<ParentPlace | null>(null); // a shortcut's section, scrolled to once its tab shows
  const [waiting, setWaiting] = useState<number | null>(null); // takes to review: the badge on Today
  const countWaiting = async () => setWaiting(waitingTakes(await listRecordings(db)).length);
  useEffect(() => {
    void countWaiting();
  }, []);
  useEffect(() => {
    if (!goTo) return;
    document.getElementById(placeId(goTo))?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
    setGoTo(null);
  }, [goTo, tab, part, allRecordings]);
  const navigate = (p: ParentPlace) => {
    setTab(HOME[p]);
    if (HOME[p] === 'content') setPart(p as ContentPart);
    if (p === 'recordings') setAllRecordings(true);
    setGoTo(p);
  };
  return (
    <PinGate>
      <div class="screen screen--scroll parent">
        <header class="topbar">
          <button type="button" class="btn btn--ghost" onClick={() => go({ name: 'home' })}><ChevronLeft size={22} strokeWidth={3} /> Done</button>
          <nav class="tabs parent__tabs" role="tablist" aria-label="Parent area">
            {TABS.map(([id, zh, en, Icon]) => (
              <button key={id} type="button" role="tab" id={`parent-tab-${id}`} aria-selected={tab === id} aria-controls="parent-panel"
                class={`tab ${tab === id ? 'is-active' : ''}`} onClick={() => setTab(id)}>
                <Icon class="tab__icon" size={18} strokeWidth={2.5} aria-hidden="true" />
                <span class="tab__zh" lang="zh-CN">{zh}</span> <span class="tab__en">{en}</span>
                {id === 'today' && !!waiting && <span class="tab__badge" aria-label={`${waiting} waiting`}>{waiting}</span>}
              </button>
            ))}
          </nav>
        </header>
        <main class="parent__body" role="tabpanel" id="parent-panel" aria-labelledby={`parent-tab-${tab}`}>
          {tab === 'today' && (
            <>
              <div id={placeId('dashboard')} class="parent__section">
                <Dashboard onNavigate={navigate} waiting={waiting ?? undefined} talk={<div id={placeId('talk')}><TalkSection onNavigate={navigate} /></div>} />
                <ExtraLessonButton />
              </div>
              <div id={placeId('listen')} class="parent__section"><ListenPanel onReviewed={() => void countWaiting()} /></div>
              <div id={placeId('recordings')} class="parent__section">
                <button type="button" class="btn btn--ghost parent__more" aria-expanded={allRecordings} aria-controls="parent-recordings-panel" onClick={() => setAllRecordings((o) => !o)}>
                  <ChevronDown class={allRecordings ? 'is-open' : ''} size={20} strokeWidth={3} aria-hidden="true" /> All recordings
                </button>
                {allRecordings && <div id="parent-recordings-panel"><RecordingsPanel /></div>}
              </div>
            </>
          )}
          {tab === 'progress' && (
            <>
              <div id={placeId('summary')} class="parent__section"><WeekSummaryPanel onNavigate={navigate} /></div>
              <SkillsPanel school={<ProgressTab />} />
            </>
          )}
          {tab === 'content' && (
            <>
              <div class="segmented" role="tablist" aria-label="Content">
                {PARTS.map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={part === id} class={`segmented__opt ${part === id ? 'is-active' : ''}`} onClick={() => setPart(id)}>{label}</button>
                ))}
              </div>
              <div id={placeId(part)} class="parent__section">
                {part === 'week' && <WeekPanel />}
                {part === 'words' && <WordsPanel />}
                {part === 'import' && <ImportPanel />}
                {part === 'passages' && <PassagesPanel />}
                {part === 'pictures' && <PicturesPanel />}
              </div>
            </>
          )}
          {tab === 'rewards' && <div id={placeId('rewards')} class="parent__section"><RewardsPanel /></div>}
          {tab === 'settings' && (
            <>
              <div id={placeId('settings')} class="parent__section"><SettingsPanel /></div>
              <div id={placeId('backup')} class="parent__section">
                <h2 class="parent__section-title">Backup &amp; restore</h2>
                <BackupPanel />
              </div>
              <div id={placeId('credits')} class="parent__section"><Credits /></div>
            </>
          )}
        </main>
      </div>
    </PinGate>
  );
}
