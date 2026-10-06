"""Three open TTS engines behind one call: synth(text, speed) -> (float32 mono samples, sample rate)."""
import os
import sys

import numpy as np

KOKORO_UNIT = 600  # Kokoro's durations count 600-sample steps at 24 kHz
SEPARATORS = set('/ .,!?;:…—"“”()')


def syllable_bounds(phonemes, durations, unit=KOKORO_UNIT):
    """Where each syllable is, in samples, from Kokoro's Chinese phonemes (each syllable ends with its tone digit) and its
    durations (one per phoneme, after one for the start)."""
    pos = durations[0]
    out, start = [], None
    for ch, d in zip(phonemes, durations[1:]):
        if ch.isdigit():
            if start is not None:
                out.append((start * unit, (pos + d) * unit))
            start = None
        elif ch not in SEPARATORS and start is None:
            start = pos
        pos += d
    return out


class Kokoro:
    """Kokoro-82M. Voices: 'v1.1/zf_001' (the Chinese-tuned v1.1-zh) or 'v1.0/zf_xiaoxiao' (the original model)."""

    def __init__(self, voice):
        from kokoro import KModel, KPipeline
        version, self.voice = voice.split('/', 1)
        repo = 'hexgrad/Kokoro-82M-v1.1-zh' if version == 'v1.1' else 'hexgrad/Kokoro-82M'
        model = KModel(repo_id=repo).to('cpu').eval()
        self.pipe = KPipeline(lang_code='z', repo_id=repo, model=model)

    def synth(self, text, speed):
        parts = [np.asarray(r.audio, dtype=np.float32).reshape(-1) for r in self.pipe(text, voice=self.voice, speed=speed)]
        return np.concatenate(parts), 24000

    CARRIER = '就是{}。'

    def synth_cut(self, word, speed):
        """The word said at the end of a sentence (就是一起。) and cut back out: some words alone come out with bent tones
        (一起's 一 rising, parent 2026-10-06). The cut runs from the word's first syllable to 40 ms past its last."""
        r = next(iter(self.pipe(self.CARRIER.format(word), voice=self.voice, speed=speed)))
        a = np.asarray(r.audio, dtype=np.float32).reshape(-1)
        bounds = syllable_bounds(r.phonemes, r.pred_dur.tolist())
        n = sum(c.isdigit() for c in self.pipe.g2p(word)[0])  # its syllables: each ends in a tone digit
        if n == 0 or len(bounds) < n:
            raise ValueError(f'{word}: no syllables in {r.phonemes}')
        mine = bounds[-n:]  # the carrier's last n syllables are the word
        start, end = mine[0][0], min(a.size, mine[-1][1] + int(0.04 * 24000))
        clip = a[start:end].copy()
        fade = int(0.01 * 24000)
        clip[:fade] *= np.linspace(0, 1, fade)
        clip[-fade:] *= np.linspace(1, 0, fade)
        return clip, 24000


class Melo:
    """MeloTTS Chinese (mixed Chinese-English model). Voice: 'ZH'."""

    def __init__(self, voice='ZH'):
        from melo.api import TTS
        self.tts = TTS(language='ZH', device='cpu')
        self.speaker = self.tts.hps.data.spk2id[voice]

    def synth(self, text, speed):
        audio = self.tts.tts_to_file(text, self.speaker, None, speed=speed, quiet=True)
        return np.asarray(audio, dtype=np.float32).reshape(-1), self.tts.hps.data.sampling_rate


class CosyVoice:
    """CosyVoice 2 (0.5B), zero-shot from the repo's own prompt voice. Voice: 'default'."""

    def __init__(self, voice='default'):
        root = os.environ.get('COSYVOICE_ROOT', os.path.expanduser('~/cosyvoice'))
        sys.path[:0] = [root, os.path.join(root, 'third_party', 'Matcha-TTS')]
        from cosyvoice.cli.cosyvoice import CosyVoice2
        from cosyvoice.utils.file_utils import load_wav
        self.cv = CosyVoice2(os.path.join(root, 'pretrained_models', 'CosyVoice2-0.5B'), load_jit=False, load_trt=False, fp16=False)
        self.prompt = load_wav(os.path.join(root, 'asset', 'zero_shot_prompt.wav'), 16000)
        self.prompt_text = '希望你以后能够做的比我还好呦。'

    def synth(self, text, speed):
        outs = self.cv.inference_zero_shot(text, self.prompt_text, self.prompt, stream=False, speed=speed)
        return np.concatenate([o['tts_speech'].numpy().reshape(-1) for o in outs]), self.cv.sample_rate


def make_engine(name, voice):
    return {'kokoro': Kokoro, 'melo': Melo, 'cosyvoice': CosyVoice}[name](voice)
