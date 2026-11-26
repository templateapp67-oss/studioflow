import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useDemoDialog } from './DemoProvider';

export function CtaButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  const { openDemo } = useDemoDialog();
  return <button type="button" {...props} onClick={event => { props.onClick?.(event); if (!event.defaultPrevented) openDemo(); }}>{children}</button>;
}
