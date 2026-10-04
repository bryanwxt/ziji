import { Check } from 'lucide-preact';
import type { PathKind, PathNode } from '../fun/path';
import { Label } from '../ui/Label';
import { InkIcon } from '../ui/icons/InkIcon';
import type { IconName } from '../ui/icons/icons';

const ICON: Record<PathKind, IconName | null> = { flashcards: null, choose: 'speech', writing: 'pen', components: 'fish', speaking: 'mic', wrapup: 'star', chest: 'gift' };
const NAME: Record<PathKind, string> = { flashcards: '认一认', choose: '选一选', writing: '写一写', components: '钓鱼', speaking: '朗读', wrapup: '用一用', chest: '宝箱' };

interface Props {
  nodes: PathNode[];
  started: boolean;
  onStart: () => void;
  speakingName?: string; // today's speaking activity: 朗读 or 看图说话 (they alternate)
}

export function TodayPath({ nodes, started, onStart, speakingName = '朗读' }: Props) {
  const name = (k: PathKind) => (k === 'speaking' ? speakingName : NAME[k]);
  const verb = started ? '继续' : '开始';

  return (
    <ol class="path" aria-label="今天的练习" style={`--stops:${nodes.length}`}>
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
            <span class="path__name"><Label zh={name(n.kind)} /></span>
          </li>
        );
      })}
    </ol>
  );
}
