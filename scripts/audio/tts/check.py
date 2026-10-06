"""Is a clip what its text says? An ASR pass compared syllable by syllable, toneless (spec 2026-10-06 §4).

ASR can't hear tones reliably, so this catches mumbled, dropped or wrong syllables; 多音字 readings are handled before
synthesis (engineText) and by the parent's spot-listen list.
"""
import re
import unicodedata

FLAG_AT = 0.34  # more than a third of the syllables wrong: the parent listens


def han_count(text):
    return sum(1 for c in text if '一' <= c <= '鿿')


def toneless(pinyin_text):
    s = unicodedata.normalize('NFD', pinyin_text.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn' or c == '̈')  # keep ü's dots, drop tone marks
    s = unicodedata.normalize('NFC', s).replace('ü', 'v')
    return [w for w in re.split(r'[^a-zv]+', s) if w and w != 'r']


def distance(a, b):
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        cur = [i]
        for j, y in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x != y)))
        prev = cur
    return prev[-1]


def flag(expected_pinyin, heard_syllables):
    want = toneless(expected_pinyin)
    if not want:
        return False
    return distance(want, heard_syllables) / len(want) > FLAG_AT


class Asr:
    """faster-whisper small, CPU int8: about real time on a runner, plenty for a check."""

    def __init__(self, size='small'):
        from faster_whisper import WhisperModel
        self.model = WhisperModel(size, device='cpu', compute_type='int8')

    def transcribe(self, wav_path):
        segments, _ = self.model.transcribe(wav_path, language='zh', beam_size=1, initial_prompt='以下是普通话的句子。')
        return ''.join(s.text for s in segments).strip()

    @staticmethod
    def syllables(text):
        from pypinyin import Style, lazy_pinyin
        return [p.replace('ü', 'v') for p in lazy_pinyin(text, style=Style.NORMAL, errors='ignore') if p]
