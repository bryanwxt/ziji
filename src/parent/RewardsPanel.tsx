import { useEffect, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { loadKnowledge } from '../app/knowledge';
import { goalProgress } from '../fun/rewards';
import { totalStars } from '../stats/stats';
import { allSessions, deleteReward, getKid, listRewards, saveReward } from '../store/repo';
import type { RewardGoal } from '../types';
import { newId } from '../lib/id';
import { InkIcon } from '../ui/icons/InkIcon';
import type { IconName } from '../ui/icons/icons';

/** The ink icons a goal can wear on Home (spec 2026-10-04 §3: a Chinese title with an ink icon). */
export const GOAL_ICONS: IconName[] = ['gift', 'star', 'car', 'food', 'party', 'heart', 'medal', 'paw', 'fish', 'tree', 'sun'];
/** What he sees must be Chinese: at least one character, and no Latin letters (digits and punctuation are fine). */
const isChineseTitle = (t: string) => /\p{Script=Han}/u.test(t) && !/[A-Za-z]/.test(t);
const NOT_CHINESE = 'Use Chinese characters — this is the title he sees on Home.';

export function RewardsPanel() {
  const { db, now } = useApp();
  const [goals, setGoals] = useState<RewardGoal[]>([]);
  const [stats, setStats] = useState({ stars: 0, known: 0 });
  const [title, setTitle] = useState('');
  const [zh, setZh] = useState('');
  const [icon, setIcon] = useState<IconName>('gift');
  const [fix, setFix] = useState<Record<string, { zh: string; icon: IconName }>>({}); // Chinese titles being added or changed
  const [zhError, setZhError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null); // the goal row whose title isn't Chinese (shown in that row)
  const [metric, setMetric] = useState<RewardGoal['metric']>('stars');
  const [target, setTarget] = useState('100');

  const load = async () => {
    const [g, sessions, know, kid] = await Promise.all([listRewards(db), allSessions(db), loadKnowledge(db), getKid(db)]);
    setGoals(g);
    setStats({ stars: totalStars(sessions, kid?.bonusStars ?? 0), known: know.known });
  };
  useEffect(() => {
    void load();
  }, []);

  const add = async () => {
    const n = Math.round(Number(target));
    if (!isChineseTitle(zh.trim())) { setZhError(NOT_CHINESE); return; }
    setZhError(null);
    if (!title.trim() || !(n >= 1)) return;
    await saveReward(db, { id: newId(), title: title.trim(), emoji: '', zh: zh.trim(), icon, metric, target: n, createdAt: now().getTime(), claimedAt: null });
    setTitle('');
    setZh('');
    await load();
  };
  const claim = async (g: RewardGoal) => {
    await saveReward(db, { ...g, claimedAt: now().getTime() });
    await load();
  };
  const editing = (g: RewardGoal) => fix[g.id] ?? (!g.zh ? { zh: '', icon: g.icon ?? 'gift' } : null); // an older goal asks until it has one
  const saveZh = async (g: RewardGoal) => {
    const e = editing(g);
    const t = (e?.zh ?? '').trim();
    if (!e || !isChineseTitle(t)) { setRowError(g.id); return; }
    setRowError(null);
    await saveReward(db, { ...g, zh: t, icon: e.icon });
    const { [g.id]: _done, ...rest } = fix;
    setFix(rest);
    await load();
  };
  const remove = async (g: RewardGoal) => {
    if (!confirm(`Delete the goal "${g.title}"?`)) return;
    await deleteReward(db, g.id);
    await load();
  };

  return (
    <>
      <section class="panel">
        <h2>Add a reward goal</h2>
        <p>Your child sees the next unclaimed goal on the home screen with a progress bar. Stars are never spent — goals are milestones.</p>
        <div class="field">
          <label for="rw-title">Reward</label>
          <input id="rw-title" value={title} placeholder="e.g. Ice cream outing" onInput={(e) => setTitle(e.currentTarget.value)} />
        </div>
        <div class="field">
          <label for="rw-zh">Shown to him (Chinese)</label>
          <input id="rw-zh" lang="zh" value={zh} placeholder="e.g. 冰淇淋" onInput={(e) => setZh(e.currentTarget.value)} />
        </div>
        {zhError && <p role="alert">{zhError}</p>}
        <div class="row" style={{ justifyContent: 'flex-start' }}>
          {GOAL_ICONS.map((n) => (
            <button key={n} type="button" class={`swatch ${n === icon ? 'is-on' : ''}`} style={{ width: '56px', height: '56px' }} aria-label={n} aria-pressed={n === icon} onClick={() => setIcon(n)}>
              <InkIcon name={n} size={34} />
            </button>
          ))}
        </div>
        <div class="row" style={{ justifyContent: 'flex-start' }}>
          <div class="field">
            <label for="rw-metric">Measure</label>
            <select id="rw-metric" value={metric} onChange={(e) => setMetric(e.currentTarget.value as RewardGoal['metric'])}>
              <option value="stars">Stars ⭐ (now {stats.stars})</option>
              <option value="known">Characters known (now {stats.known})</option>
            </select>
          </div>
          <div class="field">
            <label for="rw-target">Target</label>
            <input id="rw-target" inputMode="numeric" value={target} onInput={(e) => setTarget(e.currentTarget.value)} />
          </div>
        </div>
        <button type="button" class="btn btn--primary" onClick={() => void add()}>Add goal</button>
      </section>
      <section class="panel">
        <h2>Goals</h2>
        {goals.length === 0 ? (
          <p>No goals yet.</p>
        ) : (
          <table class="table">
            <tbody>
              {goals.map((g) => {
                const p = goalProgress(g, stats);
                return (
                  <tr key={g.id}>
                    <td>{g.icon ? <InkIcon name={g.icon} size={30} /> : <span style={{ fontSize: '28px' }}>{g.emoji}</span>}</td>
                    <td>
                      {g.title}
                      {(() => {
                        const e = g.claimedAt ? null : editing(g); // a goal already given asks for nothing
                        if (!e) return g.zh ? (
                          <div class="row" style={{ justifyContent: 'flex-start', gap: '6px' }}>
                            <span lang="zh">{g.zh}</span>
                            {!g.claimedAt && <button type="button" class="small-btn" aria-label={`Edit Chinese title for ${g.title}`} onClick={() => setFix({ ...fix, [g.id]: { zh: g.zh ?? '', icon: g.icon ?? 'gift' } })}>Edit</button>}
                          </div>
                        ) : null;
                        return (
                          <div class="row" style={{ justifyContent: 'flex-start', gap: '6px' }}>
                            <input aria-label={`Chinese title for ${g.title}`} lang="zh" placeholder="Shown to him in Chinese" value={e.zh} onInput={(ev) => setFix({ ...fix, [g.id]: { ...e, zh: ev.currentTarget.value } })} />
                            <select aria-label={`Icon for ${g.title}`} value={e.icon} onChange={(ev) => setFix({ ...fix, [g.id]: { ...e, icon: ev.currentTarget.value as IconName } })}>
                              {GOAL_ICONS.map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <button type="button" class="small-btn" aria-label={`Save Chinese title for ${g.title}`} onClick={() => void saveZh(g)}>Save</button>
                            {g.zh && (
                              <button type="button" class="small-btn" aria-label={`Cancel editing ${g.title}`} onClick={() => {
                                const { [g.id]: _drop, ...rest } = fix;
                                setFix(rest);
                                if (rowError === g.id) setRowError(null);
                              }}>Cancel</button>
                            )}
                            {rowError === g.id && <p role="alert" style={{ margin: 0 }}>{NOT_CHINESE}</p>}
                          </div>
                        );
                      })()}
                    </td>
                    <td>{p.value} / {g.target} {g.metric === 'stars' ? '⭐' : 'characters'}</td>
                    <td>
                      {g.claimedAt ? `Given ${new Date(g.claimedAt).toLocaleDateString()}`
                        : p.reached ? <button type="button" class="small-btn" onClick={() => void claim(g)}>Mark as given</button>
                        : 'In progress'}
                    </td>
                    <td><button type="button" class="small-btn" onClick={() => void remove(g)}>Delete</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
