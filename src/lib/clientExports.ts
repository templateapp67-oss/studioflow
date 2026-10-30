import type { ClientRecord } from '../types';

export const clientColumns = [
  'ID',
  'Name',
  'Phone',
  'Email',
  'Total Visits',
  'Total Spent (INR)',
  'Last Visit',
  'Favorite Stylist',
  'Loyalty Tier',
  'Points Balance',
  'Lifetime Points',
  'Notes',
];

const csvCell = (value: string | number | undefined | null): string => {
  const str = value === undefined || value === null ? '' : String(value);
  return '"' + (/^[\s]*[=+\-@\t\r]/.test(str) ? "'" + str : str).replaceAll('"', '""') + '"';
};

export function clientRows(clients: ClientRecord[]): (string | number)[][] {
  return clients.map((c) => [
    c.id || '',
    c.name || '',
    c.phone || '',
    c.email || '',
    c.totalVisits ?? 0,
    c.totalSpent ?? 0,
    c.lastVisit || '',
    c.favoriteStylist || '',
    c.loyaltyTier || 'bronze',
    c.points ?? 0,
    c.lifetimePoints ?? (c.points ?? 0),
    c.notes || '',
  ]);
}

export function clientsCsv(clients: ClientRecord[]): string {
  return (
    '\ufeff' +
    [clientColumns, ...clientRows(clients)]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n')
  );
}

export function downloadClientsCsv(clients: ClientRecord[], filename = 'clients.csv'): void {
  const csvContent = clientsCsv(clients);
  if (typeof document === 'undefined') return;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
