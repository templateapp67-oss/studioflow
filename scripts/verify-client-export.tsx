import React from 'react';
import { act, create } from 'react-test-renderer';
import assert from 'node:assert/strict';
import { clientsCsv, clientColumns, downloadClientsCsv } from '../src/lib/clientExports';
import { SaaSDashboard } from '../src/components/SaaSDashboard';
import { LoyaltyManagement } from '../src/components/LoyaltyManagement';
import { INITIAL_SALON_PROFILE, INITIAL_CLIENTS } from '../src/mockData';
import { DEFAULT_LOYALTY_CONFIG } from '../src/loyaltyData';
import type { ClientRecord } from '../src/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as any).location = { origin: 'https://salon.test', href: 'https://salon.test/?site=salon', search: '' };

// 1. Test CSV Generation and Escaping
const testClients: ClientRecord[] = [
  {
    id: 'cli-1',
    name: 'Priya Sharma',
    phone: '+91 98765 43210',
    email: 'priya@example.com',
    totalVisits: 5,
    totalSpent: 12500,
    lastVisit: '2026-10-15',
    notes: 'Prefers herbal shampoo, organic facial',
    favoriteStylist: 'Ananya',
    points: 450,
    lifetimePoints: 1250,
    loyaltyTier: 'gold',
  },
  {
    id: 'cli-2',
    name: '=SUM(A1:A10)', // Formula injection test
    phone: '9876500000',
    email: 'formula@test.com',
    totalVisits: 1,
    totalSpent: 500,
    lastVisit: '2026-10-16',
    notes: 'Quote test "VIP customer"',
    favoriteStylist: 'Rahul',
    points: 50,
    lifetimePoints: 50,
    loyaltyTier: 'bronze',
  },
];

const csv = clientsCsv(testClients);
assert.ok(csv.startsWith('\ufeff'), 'CSV must start with UTF-8 BOM for Excel compatibility');
assert.ok(csv.includes('"Priya Sharma"'), 'Client name must be in CSV');
assert.ok(csv.includes("'\'+91 98765 43210\"") || csv.includes('"\'+91 98765 43210"'), 'Phone number starting with plus must be sanitized for spreadsheet safety');
assert.ok(csv.includes('"\'=SUM(A1:A10)"'), 'Formula injection must be sanitized with leading apostrophe');
assert.ok(csv.includes('""VIP customer""'), 'Double quotes must be escaped per RFC-4180');
for (const col of clientColumns) {
  assert.ok(csv.includes(`"${col}"`), `Column ${col} must be present in CSV headers`);
}

// 2. Test download trigger
let downloadedBlob: Blob | null = null;
let downloadedName = '';

(globalThis as any).document = {
  createElement: (tag: string) => {
    return {
      tagName: tag.toUpperCase(),
      set href(val: string) {},
      set download(val: string) { downloadedName = val; },
      click: () => {},
    };
  },
  body: {
    appendChild: () => {},
    removeChild: () => {},
  },
};

(globalThis as any).URL = {
  createObjectURL: (blob: Blob) => {
    downloadedBlob = blob;
    return 'blob:mock-url';
  },
  revokeObjectURL: () => {},
};

downloadClientsCsv(testClients, 'custom-salon-clients.csv');
assert.ok(downloadedBlob !== null, 'downloadClientsCsv must create a Blob');
assert.equal(downloadedName, 'custom-salon-clients.csv', 'filename must match');
assert.equal((downloadedBlob as any).type, 'text/csv;charset=utf-8;');

const getText = (node: any): string =>
  typeof node === 'string'
    ? node
    : typeof node === 'number'
    ? String(node)
    : Array.isArray(node)
    ? node.map(getText).join('')
    : node?.children
    ? Array.isArray(node.children)
      ? node.children.map(getText).join('')
      : getText(node.children)
    : '';

// 3. Test Button in SaaSDashboard (Client CRM tab)
let dashboard: any;
await act(async () => {
  dashboard = create(
    <SaaSDashboard
      profile={INITIAL_SALON_PROFILE}
      setProfile={() => {}}
      services={[]}
      setServices={() => {}}
      stylists={[]}
      setStylists={() => {}}
      appointments={[]}
      setAppointments={() => {}}
      clients={testClients}
      setClients={() => {}}
      initialTab="clients"
    />
  );
});

const exportBtn = dashboard.root
  .findAllByType('button')
  .find((b: any) => getText(b).includes('Export Clients CSV'));

assert.ok(exportBtn, 'Export Clients CSV button must exist on the clients tab in SaaSDashboard');

// Click export button in dashboard
downloadedBlob = null;
await act(async () => {
  exportBtn.props.onClick();
});
assert.ok(downloadedBlob !== null, 'Clicking Export Clients CSV in SaaSDashboard must trigger download');

await act(async () => {
  dashboard.unmount();
});

// 4. Test Button in LoyaltyManagement
let loyalty: any;
await act(async () => {
  loyalty = create(
    <LoyaltyManagement
      profile={INITIAL_SALON_PROFILE}
      clients={testClients}
      setClients={() => {}}
      loyaltyConfig={DEFAULT_LOYALTY_CONFIG}
      setLoyaltyConfig={() => {}}
    />
  );
});

const loyaltyExportBtn = loyalty.root
  .findAllByType('button')
  .find((b: any) => getText(b).includes('Export CSV'));

assert.ok(loyaltyExportBtn, 'Export CSV button must exist in LoyaltyManagement members view');

downloadedBlob = null;
await act(async () => {
  loyaltyExportBtn.props.onClick();
});
assert.ok(downloadedBlob !== null, 'Clicking Export CSV in LoyaltyManagement must trigger download');

await act(async () => {
  loyalty.unmount();
});

console.log('PASS: ClientRecord CSV export formatting, injection safety, SaaSDashboard button, and LoyaltyManagement button verified successfully.');
