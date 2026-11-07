import { CircleHelp, ShieldCheck } from 'lucide-react';

export function ResultsDisclosure() {
  return <section className="nl-section nl-results" id="results"><div className="nl-wrap nl-results-panel">
    <span className="nl-results-icon"><ShieldCheck size={22}/></span><div><span className="nl-kicker">NO SAMPLE ROI CLAIMS</span><h2>Evaluate the workflows—not invented results.</h2><p>No independently verified revenue-uplift, retention, or time-saved figures were supplied, so this landing page does not publish them. Review the actual tools and confirm plan access before subscribing.</p><a href="/pricing#comparison"><CircleHelp size={15}/> View confirmed plan inclusions</a></div>
  </div></section>;
}
