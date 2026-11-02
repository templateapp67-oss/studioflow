import { writeRenderedTemplates, renderAllTemplates } from './lib/renderTemplates';

const rendered = renderAllTemplates();
const dir = process.argv[2] || '.tmp-templates';
writeRenderedTemplates(dir, rendered);
for (const item of rendered) console.log(`${item.id.padEnd(18)} ${String(item.html.length).padStart(9)} bytes  ${item.title}`);
console.log(`\nRendered ${rendered.length} templates into ${dir}`);
