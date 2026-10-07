"""Open TTS engines behind one call: synth(text, speed) -> (float32 mono samples, sample rate)."""
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


# The zero-shot engines all copy one voice: CosyVoice's own sample prompt (a clear adult woman, standard Mandarin), which
# setup.sh puts at $TTS_REF_WAV, so the audition compares the engines and not their reference voices.
REF_TEXT = '希望你以后能够做的比我还好呦。'


def ref_wav():
    return os.environ.get('TTS_REF_WAV', os.path.expanduser('~/tts-ref/prompt.wav'))


class CosyVoice:
    """CosyVoice 2 / Fun-CosyVoice 3 (0.5B, FunAudioLLM/CosyVoice, Apache-2.0), zero-shot from the shared prompt voice, on CPU.
    Voice: 'ref'."""
    VERSION = 2

    def __init__(self, voice='ref'):
        root = os.environ.get('COSYVOICE_ROOT', os.path.expanduser('~/cosyvoice'))
        sys.path[:0] = [root, os.path.join(root, 'third_party', 'Matcha-TTS')]
        from cosyvoice.cli import cosyvoice as cli
        if self.VERSION == 3:
            self.cv = cli.CosyVoice3(os.path.join(root, 'pretrained_models', 'Fun-CosyVoice3-0.5B'), fp16=False)
            prompt_text = 'You are a helpful assistant.<|endofprompt|>' + REF_TEXT
        else:
            self.cv = cli.CosyVoice2(os.path.join(root, 'pretrained_models', 'CosyVoice2-0.5B'), load_jit=False, load_trt=False, fp16=False)
            prompt_text = REF_TEXT
        assert self.cv.add_zero_shot_spk(prompt_text, ref_wav(), 'ref') is True

    def synth(self, text, speed):
        outs = self.cv.inference_zero_shot(text, '', '', zero_shot_spk_id='ref', stream=False, speed=speed)
        return np.concatenate([o['tts_speech'].numpy().reshape(-1) for o in outs]), self.cv.sample_rate


class CosyVoice3(CosyVoice):
    VERSION = 3


class IndexTTS:
    """IndexTTS 2 / 2.5 (index-tts/index-tts, bilibili model licence), zero-shot from the shared prompt voice, on CPU.
    Voice: 'ref'."""
    VERSION = '2'

    def __init__(self, voice='ref'):
        root = os.environ.get('INDEXTTS_ROOT', os.path.expanduser('~/index-tts'))
        sys.path.insert(0, root)
        os.environ.setdefault('USE_MODELSCOPE', 'false')  # Hugging Face: fast from a GitHub runner
        ckpt = os.path.join(root, 'checkpoints_2' if self.VERSION == '2' else 'checkpoints')
        if self.VERSION == '2':
            from indextts.infer_v2 import IndexTTS2
            self.tts = IndexTTS2(cfg_path=os.path.join(ckpt, 'config.yaml'), model_dir=ckpt, use_fp16=False, device='cpu',
                                 use_cuda_kernel=False, use_deepspeed=False, use_qwen_emo=False)
        else:
            from indextts.infer_v2_5 import IndexTTS2
            self.tts = IndexTTS2(cfg_path=os.path.join(ckpt, 'config.yaml'), model_dir=ckpt, use_bf16=False, device='cpu')

    def synth(self, text, speed):
        import soundfile as sf
        import tempfile
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, 'out.wav')
            extra = {} if self.VERSION == '2' else {'lang': 'ZH'}
            self.tts.infer(spk_audio_prompt=ref_wav(), text=text, output_path=out, verbose=False, **extra)
            audio, rate = sf.read(out, dtype='float32')
        return audio.reshape(-1) if audio.ndim == 1 else audio.mean(axis=1), rate


class IndexTTS25(IndexTTS):
    VERSION = '2.5'


class Spark:
    """Spark-TTS 0.5B (SparkAudio/Spark-TTS: code Apache-2.0, weights CC BY-NC-SA 4.0), on CPU. Voices: 'ref' (copies the
    shared prompt voice) or 'female' (its own made-up woman's voice, moderate pitch and pace: made once from a fixed seed, then
    copied for every item so it stays one voice)."""

    def __init__(self, voice='ref'):
        import tempfile
        import torch
        root = os.environ.get('SPARK_ROOT', os.path.expanduser('~/spark-tts'))
        sys.path.insert(0, root)
        from cli.SparkTTS import SparkTTS
        self.torch = torch
        self.tts = SparkTTS(os.path.join(root, 'pretrained_models', 'Spark-TTS-0.5B'), torch.device('cpu'))
        self.prompt, self.prompt_text = ref_wav(), REF_TEXT
        if voice == 'female':
            import soundfile as sf
            torch.manual_seed(20261008)
            line = '小朋友们好，今天我们一起来认识几个新的汉字。'
            wav = self.tts.inference(line, gender='female', pitch='moderate', speed='moderate')
            self.prompt = os.path.join(tempfile.mkdtemp(), 'female.wav')
            sf.write(self.prompt, np.asarray(wav, dtype=np.float32).reshape(-1), self.tts.sample_rate)
            self.prompt_text = line

    def synth(self, text, speed):
        self.torch.manual_seed(0)
        wav = self.tts.inference(text, prompt_speech_path=self.prompt, prompt_text=self.prompt_text)
        return np.asarray(wav, dtype=np.float32).reshape(-1), self.tts.sample_rate


ENGINES = {'kokoro': Kokoro, 'melo': Melo, 'cosyvoice2': CosyVoice, 'cosyvoice3': CosyVoice3,
           'indextts2': IndexTTS, 'indextts25': IndexTTS25, 'spark': Spark}


def make_engine(name, voice):
    return ENGINES[name](voice)
