import type { OralInfo } from '../types';
export function introLines(oral: OralInfo): { hello: string; body: string | null; thanks: string } {
  const custom = oral.customIntro.trim();
  const ready = [oral.name, oral.age, oral.school, oral.className].every((v) => v.trim());
  const body = custom || (ready ? `我叫${oral.name.trim()}。我今年${oral.age.trim()}岁。我在${oral.school.trim()}读${oral.className.trim()}。` : null);
  return { hello: '老师好！', body, thanks: '谢谢老师！' };
}
