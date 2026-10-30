export function downloadClientsCsv(clients: any[]): void {
  const headers = ['Name', 'Phone', 'Email', 'Total Visits', 'Total Spent', 'Loyalty Points'];
  const rows = (clients || []).map(c => [
    `"${c.name || ''}"`,
    `"${c.phone || ''}"`,
    `"${c.email || ''}"`,
    c.totalVisits || 0,
    c.totalSpent || 0,
    c.loyaltyPoints || 0
  ]);
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'salon_clients.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
