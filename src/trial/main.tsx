import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/literata/latin-400.css';
import '@fontsource/literata/latin-700.css';
import { render } from 'preact';
import '../styles.css';
import './trial.css';
import { StoryTrial } from './StoryTrial';

render(<StoryTrial />, document.getElementById('app')!);
