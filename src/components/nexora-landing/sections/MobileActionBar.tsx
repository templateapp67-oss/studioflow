import { useEffect, useState } from 'react';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { useDemoDialog } from '../../nexora-pricing/DemoProvider';
import { useLandingModel } from '../LandingContentProvider';

/**
 * Mobile conversion bar. It appears on small screens and steps aside once the
 * final call-to-action or the footer is on screen, so it never covers the
 * primary action it is meant to support.
 */
export function MobileActionBar() {
  const { cta } = useLandingModel();
  const [visible, setVisible] = useState(false);
  const { openDemo } = useDemoDialog();

  useEffect(() => {
    const targets = [document.getElementById('get-started'), document.querySelector('.sl-footer')].filter(
      (node): node is HTMLElement => Boolean(node),
    );
    if (!targets.length) return;
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.every((entry) => !entry.isIntersecting)),
      { threshold: 0.12 },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="sl-mobile-bar" aria-label="Quick actions" hidden={!visible}>
      <a className="sl-btn sl-btn--primary" href={cta.signup}>
        Get Started <ArrowRight size={15} aria-hidden="true" />
      </a>
      <button type="button" className="sl-btn sl-btn--secondary" onClick={() => openDemo()}>
        <MessageCircle size={15} aria-hidden="true" /> Book a Demo
      </button>
    </nav>
  );
}
