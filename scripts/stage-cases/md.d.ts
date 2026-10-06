// story chapters are bundled as text by the stage-case build (esbuild loader '.md': 'text')
declare module '*.md' {
  const text: string;
  export default text;
}
