import os, sys, unittest
sys.path.insert(0, os.path.dirname(__file__))
from check import distance, flag, han_count, toneless

class CheckTest(unittest.TestCase):
    def test_toneless(self):
        self.assertEqual(toneless('nǐ hǎo'), ['ni', 'hao'])
        self.assertEqual(toneless('lǜ sè'), ['lv', 'se'])
        self.assertEqual(toneless('nǎ r'), ['na'])  # 儿化's r joins the syllable before

    def test_distance(self):
        self.assertEqual(distance(['a', 'b'], ['a', 'b']), 0)
        self.assertEqual(distance(['a', 'b', 'c'], ['a', 'c']), 1)
        self.assertEqual(distance([], ['a']), 1)

    def test_flag(self):
        self.assertFalse(flag('wǒ men yì qǐ', ['wo', 'men', 'yi', 'qi']))
        self.assertFalse(flag('wǒ men yì qǐ qù', ['wo', 'men', 'yi', 'qi', 'qu', 'ba']))  # one extra syllable: 1/5
        self.assertTrue(flag('wǒ men yì qǐ', ['wo', 'men']))  # half missing
        self.assertFalse(flag('', []))

    def test_han_count(self):
        self.assertEqual(han_count('我们，一起！'), 4)

if __name__ == '__main__':
    unittest.main()
