import { useId } from 'react';

export function Lotus({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round"><path d="M32 49C13 38 16 20 32 11c16 9 19 27 0 38Z" /><path d="M32 49C18 45 8 32 12 22c13 1 20 12 20 27Zm0 0c14-4 24-17 20-27-13 1-20 12-20 27Z" /><path d="M32 49C18 53 7 45 5 34c10-3 21 3 27 15Zm0 0c14 4 25-4 27-15-10-3-21 3-27 15ZM32 49V23M20 56h24" /></g></svg>;
}
export function Mandala({ className = '' }: { className?: string }) {
  const id = useId();
  return <svg className={`mandala ${className}`} viewBox="0 0 600 600" fill="none" aria-hidden="true"><defs><path id={id} d="M300 290C250 235 245 135 300 48c55 87 50 187 0 242Zm0-28c-28-48-25-105 0-151 25 46 28 103 0 151Z" /></defs><g stroke="currentColor" strokeWidth=".8">{Array.from({ length: 16 }, (_, i) => <use key={i} href={`#${id}`} transform={`rotate(${i * 22.5} 300 300)`} />)}<circle cx="300" cy="300" r="252" /><circle cx="300" cy="300" r="265" strokeDasharray="2 8" /><circle cx="300" cy="300" r="82" /><circle cx="300" cy="300" r="65" /></g></svg>;
}
export function LeafDivider({ className = '' }: { className?: string }) {
  return <div className={`leaf-divider ${className}`} aria-hidden="true"><span /><svg viewBox="0 0 80 34" fill="none"><path d="M5 27C24 29 43 18 70 7M25 25C13 11 22 5 34 20M40 20C34 5 45 2 49 15M51 15C54 2 66 1 65 10M28 24c12 12 20 5 18-5M46 18c12 10 20 3 18-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg><span /></div>;
}
