import { Component, type ComponentChildren } from 'preact';
import { InkIcon } from '../ui/icons/InkIcon';
import { Label } from '../ui/Label';
import { logError } from './errorLog';

interface Props {
  children: ComponentChildren;
  /** starts the app afresh (a test passes its own) */
  restart?: () => void;
}

/** Interrupted sounds and the like: worth a log line, not worth stopping the lesson. */
const harmless = (err: unknown) =>
  (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'NotAllowedError')) ||
  /ResizeObserver loop/.test(String((err as Error | undefined)?.message ?? err));

/** After boot, any error (while drawing, in a tap, or a promise nobody caught) shows sleepy Truffle and one big
 *  restart button instead of a dead screen or an endless loading paw. Boot failures keep the parent's ErrorScreen. */
export class CrashGuard extends Component<Props, { crashed: boolean }> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(err: unknown) {
    logError(err);
  }

  private onRejection = (e: PromiseRejectionEvent) => this.fail(e.reason);
  private onError = (e: ErrorEvent) => this.fail(e.error ?? e.message);

  private fail(err: unknown) {
    logError(err);
    if (!harmless(err)) this.setState({ crashed: true });
  }

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.onRejection);
    window.addEventListener('error', this.onError);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.onRejection);
    window.removeEventListener('error', this.onError);
  }

  render() {
    if (!this.state.crashed) return this.props.children;
    const restart = this.props.restart ?? (() => location.reload());
    return (
      <div class="screen crash">
        <div class="center">
          <InkIcon name="sleepyCat" size={140} />
          <h1><Label zh="松露睡着了" /></h1>
          <p><Label zh="点一下，重新开始" /></p>
          <button type="button" class="btn btn--primary btn--big" aria-label="重新开始" onClick={restart}>
            <Label zh="重新开始" />
          </button>
        </div>
      </div>
    );
  }
}
