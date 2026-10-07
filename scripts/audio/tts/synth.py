#!/usr/bin/env python3
"""Turn clip jobs into AAC files with one engine (spec 2026-10-06 §4).

python scripts/audio/tts/synth.py --jobs JOBS.json --out DIR --engine kokoro --voice v1.1/zf_001 \
    [--speed-word 1.0] [--speed-sentence 1.0] [--check]

Writes DIR/<id>.m4a per job and DIR/results.json. One job failing is recorded and the run goes on; an engine that can't
start fails the run.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile
import time

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(__file__))
from check import flag, han_count  # noqa: E402
from engines import ENGINES, make_engine  # noqa: E402


def tidy(audio, rate):
    """Trim silence (30 ms kept before, 80 ms after), normalise to -1 dBFS, pad 50 ms each side."""
    audio = np.asarray(audio, dtype=np.float32).reshape(-1)
    loud = np.flatnonzero(np.abs(audio) > 0.01)
    if loud.size:
        audio = audio[max(0, loud[0] - int(0.03 * rate)): loud[-1] + int(0.08 * rate)]
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    if peak > 0:
        audio = audio * (0.89 / peak)
    pad = np.zeros(int(0.05 * rate), dtype=np.float32)
    return np.concatenate([pad, audio, pad])


def render(engine, job, speed):
    """(audio, rate) for one job: said as given, or (method 'cut') said at the end of a sentence and cut back out. An
    engine that can't cut says the job's sayText instead, when it has one (the audition's)."""
    if job.get('method') == 'cut':
        if not hasattr(engine, 'synth_cut') and job.get('sayText'):
            return engine.synth(job['sayText'], speed)
        if not hasattr(engine, 'synth_cut'):
            raise ValueError(f"{job['engineText']}: this engine can't cut a word from a sentence")
        return engine.synth_cut(job['engineText'], speed)
    return engine.synth(job['engineText'], speed)


def to_aac(wav, out):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-ac', '1', '-ar', '24000', '-c:a', 'aac', '-b:a', '40k', out], check=True)


def save(out, results):
    with open(os.path.join(out, 'results.json'), 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--jobs', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--engine', required=True, choices=sorted(ENGINES))
    ap.add_argument('--voice', required=True)
    ap.add_argument('--speed-word', type=float, default=1.0)
    ap.add_argument('--speed-sentence', type=float, default=1.0)
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()

    with open(args.jobs, encoding='utf-8') as f:
        jobs = json.load(f)
    os.makedirs(args.out, exist_ok=True)
    engine = make_engine(args.engine, args.voice)
    asr = None
    if args.check:
        from check import Asr
        asr = Asr()

    results = []
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'clip.wav')
        for i, job in enumerate(jobs):
            speed = args.speed_word if job['kind'] in ('char', 'word') else args.speed_sentence
            t0 = time.time()
            try:
                audio, rate = render(engine, job, speed)
                sf.write(wav, tidy(audio, rate), rate)
                to_aac(wav, os.path.join(args.out, f"{job['id']}.m4a"))
                r = {'id': job['id'], 'ok': True, 'seconds': round(time.time() - t0, 2)}
                if asr and han_count(job['text']) >= 3:
                    heard = asr.transcribe(wav)
                    r['heard'] = heard
                    r['flagged'] = flag(job['expected'], asr.syllables(heard))
            except Exception as e:  # one bad line never stops the run
                r = {'id': job['id'], 'ok': False, 'error': f'{type(e).__name__}: {e}'[:300]}
            results.append(r)
            if i % 100 == 0 or len(jobs) < 100:
                print(f"{i}/{len(jobs)} {r['id']} {'ok' if r['ok'] else r['error']} {r.get('seconds', '')}", flush=True)
                save(args.out, results)  # a run cut short (a slow engine timing out) keeps what it made

    save(args.out, results)
    print(f"done: {sum(r['ok'] for r in results)}/{len(results)} ok", flush=True)


if __name__ == '__main__':
    main()
