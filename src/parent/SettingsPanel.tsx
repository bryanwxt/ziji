import { loadClipIndex, setClipIndex } from '../audio/clips';
import { useEffect, useRef, useState } from 'preact/hooks';
import { useApp } from '../app/AppContext';
import { schoolYear } from './progress';
import { SetupPin } from '../app/SetupPin';
import { setSfxEnabled } from '../audio/sfx';
import { chineseVoices, currentVoice, setPreferredVoice, setSpeechRate, speak, voiceQuality } from '../audio/speech';
import { ONESIES, type ZodiacId } from '../fun/costumes';
import { introLines } from '../langdu/intro';
import { AsrTest } from './AsrTest';
import { seedBuiltinWords, updateSettings } from '../store/repo';
import { builtinWords, type Course } from '../content';
import type { ActivityKind, OralInfo, Settings } from '../types';

const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  newwords: '认新字: new words, first',
  practice: '练一练: practice and revision (reading, 词语, sentences)',
  writing: '听写 writing',
  speaking: '朗读 reading aloud',
};

const clampInt = (value: string, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const introPreview = (oral: OralInfo) => {
  const l = introLines(oral);
  return `${l.hello}${l.body ?? ''}…… ${l.thanks}`;
};

export function SettingsPanel() {
  const { db, settings, refresh, go, now } = useApp();
  const [s, setS] = useState(settings);
  const [changingPin, setChangingPin] = useState(false);

  const save = async (patch: Partial<Settings>) => {
    const next = await updateSettings(db, patch);
    setS({ ...next, oral: oral.current }); // a save that comes back late keeps what he has typed since
    setSpeechRate(next.speechRate);
    setSfxEnabled(next.soundEffects);
    await refresh();
  };

  /** The course decides which 识写字 he writes: the built-in words are rewritten for it now, his progress kept (parent, 2026-10-06). */
  const setCourse = async (course: Course) => {
    await seedBuiltinWords(db, builtinWords(Date.now(), course), true);
    await save({ course, contentCourse: course });
  };

  // fields save as he types: merge into the latest details, not a stale render's copy
  const oral = useRef(s.oral);
  const saveOral = (patch: Partial<OralInfo>) => {
    oral.current = { ...oral.current, ...patch };
    setS((prev) => ({ ...prev, oral: oral.current }));
    return save({ oral: oral.current });
  };

  if (changingPin) return <SetupPin onDone={() => setChangingPin(false)} />;

  return (
    <section class="panel">
      <h2>Settings</h2>
      <div class="field">
        <label for="st-min">Session length in minutes (10–40)</label>
        <input id="st-min" type="number" min={10} max={40} step={5} value={s.sessionMinutes}
          onChange={(e) => void save({ sessionMinutes: clampInt(e.currentTarget.value, 10, 40, s.sessionMinutes) })} />
      </div>
      <div class="field">
        <label for="st-new">New words per day: the most (the app finds his number, from 3 up to this)</label>
        <input id="st-new" type="number" min={0} max={10} value={s.newPerDay}
          onChange={(e) => void save({ newPerDay: clampInt(e.currentTarget.value, 0, 10, s.newPerDay) })} />
      </div>
      <div class="field">
        <label for="st-course">Course</label>
        <select id="st-course" value={s.course ?? 'cl'} onChange={(e) => void setCourse(e.currentTarget.value as Course)}>
          <option value="cl">华文 (Chinese)</option>
          <option value="hcl">高级华文 (Higher Chinese)</option>
        </select>
        <p class="hint">Both read the same characters in the same order. 高级华文 writes more (435 by the end of P2, to 350), so 写一写 and 听写 practise its list.</p>
      </div>
      <div class="field">
        <label for="st-grade">School year</label>
        <select id="st-grade" value={String(schoolYear(s, now()))} onChange={(e) => void save({ grade: Number(e.currentTarget.value), gradeYear: now().getFullYear() })}>
          {[1, 2, 3, 4, 5, 6].map((g) => <option key={g} value={String(g)}>P{g}</option>)}
        </select>
        <p class="hint">Progress compares him with the MOE lists for his term (lists go up to P3).</p>
      </div>
      <div class="field">
        <label>
          <input type="checkbox" checked={!!s.recordedVoice} onChange={(e) => {
            const on = e.currentTarget.checked;
            if (on) void loadClipIndex(); else setClipIndex(null);
            void save({ recordedVoice: on });
          }} />{' '}
          Recorded voice (generated clips)
        </label>
        <p class="hint">Off: the iPad's own Mandarin voice below says everything (the silent switch mutes it). On: the generated clips, which play even on silent.</p>
      </div>
      <VoiceField value={s.voiceURI ?? null} onChange={(uri) => { setPreferredVoice(uri); void save({ voiceURI: uri }); }} />
      <fieldset class="field">
        <legend>Activities</legend>
        {(Object.keys(ACTIVITY_LABELS) as ActivityKind[]).filter((k) => k !== 'speaking' || s.langdu || s.story).map((k) => ( // parked 朗读 / 看图说话: no switch
          <label key={k}>
            <input type="checkbox" checked={s.activities[k]} onChange={(e) => void save({ activities: { ...s.activities, [k]: e.currentTarget.checked } })} />{' '}
            {ACTIVITY_LABELS[k]}
          </label>
        ))}
      </fieldset>
      <details class="field">
        <summary>Advanced: test speech recognition (for future auto-hints on misread characters)</summary>
        <AsrTest />
      </details>
      <div class="field">
        <label for="st-rate">Speech speed ({s.speechRate.toFixed(2)})</label>
        <div class="row" style={{ justifyContent: 'flex-start' }}>
          <input id="st-rate" type="range" min={0.5} max={1} step={0.05} value={s.speechRate} onChange={(e) => void save({ speechRate: Number(e.currentTarget.value) })} />
          <button type="button" class="small-btn" onClick={() => speak('你好，我们一起学汉字！')}>🔊 Test</button>
        </div>
      </div>
      <div class="field">
        <label for="st-zodiac">Zodiac (生肖) — the first treasure chest gives Truffle this onesie</label>
        <select id="st-zodiac" value={s.zodiac ?? ''} onChange={(e) => void save({ zodiac: (e.currentTarget.value || null) as ZodiacId | null })}>
          <option value="">Not set (dragon 龙)</option>
          {ONESIES.map((o) => (
            <option key={o.id} value={o.id}>{o.id[0]!.toUpperCase() + o.id.slice(1)} {o.zh}</option>
          ))}
        </select>
      </div>
      <fieldset class="field oral">
        <legend>Oral exam (口试) — used for the self-introduction warm-up; stays on this iPad</legend>
        {([['name', 'Chinese name', ''], ['age', 'Age', ''], ['school', 'School', 'XX小学'], ['className', 'Class', '二年级']] as const).map(([key, label, ph]) => (
          <div class="field" key={key}>
            <label for={`oral-${key}`}>{label}</label>
            <input id={`oral-${key}`} value={s.oral[key]} placeholder={ph} onInput={(e) => void saveOral({ [key]: e.currentTarget.value })} />
          </div>
        ))}
        <div class="field">
          <label for="oral-custom">Custom introduction (optional — replaces the standard one)</label>
          <textarea id="oral-custom" rows={2} value={s.oral.customIntro} onInput={(e) => void saveOral({ customIntro: e.currentTarget.value })} />
        </div>
        <p class="oral__preview">{introPreview(s.oral)}</p>
      </fieldset>
      <label>
        <input type="checkbox" checked={s.soundEffects} onChange={(e) => void save({ soundEffects: e.currentTarget.checked })} /> Sound effects
      </label>
      <div class="row" style={{ justifyContent: 'flex-start' }}>
        <div class="field">
          <label for="st-tr">Target: characters recognised</label>
          <input id="st-tr" type="number" min={1} value={s.targetRecognise} onChange={(e) => void save({ targetRecognise: clampInt(e.currentTarget.value, 1, 5000, s.targetRecognise) })} />
        </div>
        <div class="field">
          <label for="st-tw">Target: characters written</label>
          <input id="st-tw" type="number" min={1} value={s.targetWrite} onChange={(e) => void save({ targetWrite: clampInt(e.currentTarget.value, 1, 5000, s.targetWrite) })} />
        </div>
      </div>
      <div class="row" style={{ justifyContent: 'flex-start' }}>
        <button type="button" class="btn" onClick={() => go({ name: 'placement' })}>Re-run placement check</button>
        <button type="button" class="btn" onClick={() => setChangingPin(true)}>Change PIN</button>
      </div>
    </section>
  );
}

const QUALITY = ['Standard', 'Enhanced', 'Premium'];

/**
 * Which Mandarin voice speaks (parent, 2026-10-05: a downloaded Enhanced voice wasn't used). Lists the voices the iPad lets
 * the app use: one downloaded in Settings → Accessibility that isn't here, the iPad doesn't offer to web apps.
 */
function VoiceField({ value, onChange }: { value: string | null; onChange: (uri: string | null) => void }) {
  const [voices, setVoices] = useState(chineseVoices());
  const [using, setUsing] = useState(currentVoice()?.name ?? null);
  useEffect(() => {
    const update = () => { setVoices(chineseVoices()); setUsing(currentVoice()?.name ?? null); };
    update();
    if (typeof speechSynthesis === 'undefined' || !speechSynthesis) return;
    const synth = speechSynthesis;
    synth.addEventListener?.('voiceschanged', update);
    return () => synth.removeEventListener?.('voiceschanged', update);
  }, []);
  return (
    <div class="field">
      <label for="st-voice">Voice</label>
      <select id="st-voice" value={value ?? ''} onChange={(e) => { const uri = e.currentTarget.value || null; onChange(uri); setUsing(currentVoice()?.name ?? null); }}>
        <option value="">The clearest on this iPad (automatic)</option>
        {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{`${v.name} · ${QUALITY[voiceQuality(v)]} · ${v.lang}`}</option>)}
      </select>
      <p class="hint">Now speaking: {using ?? 'no Mandarin voice found'}. {voices.length} Mandarin voice{voices.length === 1 ? '' : 's'} available to the app.</p>
      <button type="button" class="btn btn--secondary" onClick={() => speak('你好！我是松露。我们一起学汉字吧！')}>Test the voice</button>
    </div>
  );
}
