import { Check } from 'lucide-preact';
import type { PathKind, PathNode } from '../fun/path';
import { Label } from '../ui/Label';
import { InkIcon } from '../ui/icons/InkIcon';
import type { IconName } from '../ui/icons/icons';

const ICON: Record<PathKind, IconName | null> = { flashcards: null, choose: 'speech', writing: 'pen', components: 'fish', speaking: 'mic', wrapup: 'star', newwords: null, practice: 'speech', chest: 'gift' };
const NAME: Record<PathKind, string> = { flashcards: '认一认', choose: '选一选', writing: '写一写', components: '钓鱼', speaking: '朗读', wrapup: '用一用', newwords: '认新字', practice: '练一练', chest: '宝箱' };

interface Props {
  nodes: PathNode[];
  started: boolean;
  onStart: () => void;
  speakingName?: string; // today's speaking activity: 朗读 or 看图说话 (they alternate)
  newwordsName?: string; // 认新词 when the lesson opens on a weekly list's word card (newwordsName)
}

/** 认新字's name today: 认新词 when its first card is a weekly list's word or pair card (weekly list spec §7.1). */
export function newwordsName(rec: { flashQueue: { wordId: string }[]; plan: { listCards?: Record<string, unknown> } } | undefined): string {
  const first = rec?.flashQueue[0]?.wordId;
  return first && rec?.plan.listCards?.[first] ? '认新词' : '认新字';
}

export function TodayPath({ nodes, started, onStart, speakingName = '朗读', newwordsName: wordsName = NAME.newwords }: Props) {
  const name = (k: PathKind) => (k === 'speaking' ? speakingName : k === 'newwords' ? wordsName : NAME[k]);
  const verb = started ? '继续' : '开始';

  return (
    <ol class="path" aria-label="今天的练习">
      {nodes.map((n, i) => {
        const isCurrent = n.state === 'current';
        const icon = n.state === 'done' ? (n.kind === 'chest' ? <InkIcon name="party" size={44} /> : <Check size={38} strokeWidth={3.5} />) : ICON[n.kind] ? <InkIcon name={ICON[n.kind]!} size={44} /> : '字';
        return (
          <li key={n.kind} class="path__row" style={`--side:${i % 2 === 0 ? -1 : 1}`}>
            {isCurrent && <div class="path__bubble"><Label zh={verb} /></div>}
            <button
              type="button"
              class={`path__node path__node--${n.state}`}
              aria-label={isCurrent ? `${verb}：${name(n.kind)}` : name(n.kind)}
              aria-current={isCurrent ? 'step' : undefined}
              onClick={isCurrent ? onStart : undefined}
            >
              <span class={`path__icon${icon === '字' ? ' path__icon--hanzi' : ''}`}>{icon}</span>
            </button>
            {/* the current stop's name starts it too: a child taps the word as often as the circle (sweep) */}
            <span class={`path__name${isCurrent ? ' path__name--current' : ''}`} onClick={isCurrent ? onStart : undefined}><Label zh={name(n.kind)} /></span>
          </li>
        );
      })}
    </ol>
  );
}
