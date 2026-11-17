import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const widget = read('src/components/NexoraTawkWidget.tsx');
const salonWebsite = read('src/components/CustomerSalonWebsite.tsx');
const edgeFunction = read('supabase/functions/studioflow-whatsapp-booking/index.ts');
const schema = JSON.parse(read('docs/integrations/nexora-tawk-openapi-compatible.json'));

assert.ok(widget.includes('setAttributes'), 'Tawk widget must attach tenant visitor attributes for human agents.');
assert.ok(widget.includes('setChatInputMessage'), 'Tawk widget must prefill an AI-visible tenant context message.');
assert.ok(widget.includes('NEXORA salon slug:'), 'The visible starter message must contain the exact tenant slug.');
assert.ok(widget.includes("'salon-slug'"), 'Tawk widget must pass the published tenant slug.');
assert.ok(widget.includes("'salon-name'"), 'Tawk widget must pass the public salon name.');
assert.ok(widget.includes("'salon-category'"), 'Tawk widget must pass the template category.');
assert.ok(
  salonWebsite.includes('props.live && props.readOnly && props.profile.subdomain?.trim()'),
  'Tenant chat must mount only on live, published salon websites.',
);
assert.ok(
  salonWebsite.includes('<NexoraTawkWidget salonContext='),
  'The shared Tawk widget must be mounted from the common template website renderer.',
);
assert.ok(
  salonWebsite.includes('<AureliaBeautyWebsite') && salonWebsite.includes('<KeshKraftWebsite'),
  'The common renderer must continue covering the dedicated template 15 and 16 website components.',
);
assert.ok(
  edgeFunction.includes("params.getAll('serviceIds')") && edgeFunction.includes("params.get('slug')"),
  'The Edge Function must support the query-parameter request format used by the Tawk schema.',
);
assert.ok(
  edgeFunction.includes("if (raw.trim())"),
  'Existing JSON-body API clients must remain supported.',
);
assert.equal(schema.openapi, '3.0.3');
assert.ok(schema.security?.some((item) => item.NexoraBearer), 'OpenAPI must declare the configured bearer/API-key security.');
assert.equal(schema.components?.securitySchemes?.NexoraBearer?.in, 'header');
assert.equal(schema.components?.securitySchemes?.NexoraBearer?.name, 'Authorization');

for (const path of ['/catalogue', '/availability']) {
  const operation = schema.paths?.[path]?.post;
  assert.ok(operation, `OpenAPI operation POST ${path} must exist.`);
  assert.ok(
    operation.parameters?.some((parameter) => parameter.name === 'slug' && parameter.in === 'query' && parameter.required),
    `POST ${path} must require the tenant slug as a query parameter.`,
  );
  assert.equal(operation.requestBody, undefined, `POST ${path} must not require a JSON request body in Tawk.`);
}
assert.equal(schema.paths['/test-booking'], undefined, 'The Tawk AI tool set must remain read-only while in test mode.');

console.log('NEXORA multi-tenant Tawk integration contract passed.');
