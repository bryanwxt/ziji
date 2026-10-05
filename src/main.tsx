import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { armAudioWake } from './audio/sfx';
import { initPwa } from './pwa';
import './styles.css';

initPwa(registerSW);
armAudioWake();
render(<App />, document.getElementById('app')!);
