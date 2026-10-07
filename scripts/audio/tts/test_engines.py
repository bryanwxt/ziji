import os, sys, unittest
sys.path.insert(0, os.path.dirname(__file__))
from engines import syllable_bounds
from synth import render


class Fake:
    def __init__(self):
        self.calls = []

    def synth(self, text, speed):
        self.calls.append(('say', text))
        return [0.0], 24000

    def synth_cut(self, word, speed):
        self.calls.append(('cut', word))
        return [0.0], 24000


class EnginesTest(unittest.TestCase):
    def test_syllable_bounds(self):
        # Kokoro's Chinese phonemes end each syllable with its tone digit; durations are in 600-sample units, one for the start
        self.assertEqual(syllable_bounds('ㄧ4ㄑㄧ3.', [14, 5, 5, 4, 6, 11, 5, 1]), [(14 * 600, 24 * 600), (24 * 600, 45 * 600)])
        self.assertEqual(syllable_bounds('ㄐㄧㄡ4/ㄕ5ㄧ4ㄑㄧ3.', [10, 1, 1, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 3, 1]),
                         [(10 * 600, 15 * 600), (16 * 600, 19 * 600), (19 * 600, 22 * 600), (22 * 600, 26 * 600)])

    def test_render_says_or_cuts(self):
        e = Fake()
        render(e, {'engineText': '东西。', 'kind': 'word'}, 1.0)
        render(e, {'engineText': '一起', 'kind': 'word', 'method': 'cut'}, 1.0)
        self.assertEqual(e.calls, [('say', '东西。'), ('cut', '一起')])

    def test_render_cut_needs_an_engine_that_can(self):
        class SayOnly:
            def synth(self, text, speed):
                return [0.0], 24000
        with self.assertRaises(ValueError):
            render(SayOnly(), {'engineText': '一起', 'kind': 'word', 'method': 'cut'}, 1.0)

    def test_render_cut_falls_back_to_say_text(self):
        class SayOnly:
            def __init__(self):
                self.said = []

            def synth(self, text, speed):
                self.said.append(text)
                return [0.0], 24000
        e = SayOnly()
        render(e, {'engineText': '鱼', 'sayText': '鱼。', 'kind': 'char', 'method': 'cut'}, 1.0)
        self.assertEqual(e.said, ['鱼。'])


if __name__ == '__main__':
    unittest.main()
