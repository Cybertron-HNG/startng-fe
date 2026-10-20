import { Component, type ReactNode } from "react";

/** Catches a crash inside one feature's part of the page (an admin tab, a profile section), so the rest keeps working. */
export default class Boundary extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(`"${this.props.name}" crashed:`, error);
  }

  render() {
    return this.state.failed ? <p className="error" role="alert">“{this.props.name}” couldn't load. Reload the page, and if it keeps happening, tell its owner.</p> : this.props.children;
  }
}
