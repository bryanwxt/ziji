import { pinyin } from 'pinyin-pro';
import './pinyinFixes';

/** pinyin-pro's reading in context, with the app's fixes (pinyinFixes.ts): one syllable per Han character. */
export const sentenceReading = (text: string): string => pinyin(text, { type: 'array', nonZh: 'removed' }).join(' ');

/**
 * A sentence's pinyin, read in context with the app's fixes (教我 jiāo, 切菜 qiē, 好好 hǎo). Read at runtime: the snapshot
 * scripts/gen-pinyin.ts writes (sentencePinyin.json) is not shipped (review 2026-10-15: ~270 KB); contentGate.test.ts holds this
 * reading to it, so a pinyin-pro upgrade that reads a written sentence differently fails a test, not the child.
 */
export const storedPinyin = (zh: string): string => sentenceReading(zh.trim());
