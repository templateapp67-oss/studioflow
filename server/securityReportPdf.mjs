const FONT_SIZE = 10;
const MAX_COLUMNS = 87;
const PAGE_LINES = 48;

// Standard PDF fonts cover ASCII. Preserve unsupported characters visibly as
// code points and leave exact Unicode text available in the JSON attachment.
function printable(value) {
  return [...String(value ?? '')].map(char => {
    const code = char.codePointAt(0);
    if (code >= 32 && code <= 126) return char;
    if (/\s/u.test(char)) return ' ';
    return '[U+' + code.toString(16).toUpperCase().padStart(4, '0') + ']';
  }).join('');
}

function pdfLiteral(text) {
  return text.replace(/[\\()]/g, '\\$&');
}

function wrap(line) {
  const result = [];
  let rest = printable(line);
  while (rest.length > MAX_COLUMNS) {
    const at = rest.lastIndexOf(' ', MAX_COLUMNS);
    const width = at > 0 ? at : MAX_COLUMNS;
    result.push(rest.slice(0, width));
    rest = rest.slice(width).trimStart();
  }
  result.push(rest);
  return result;
}

export function buildSecurityReportPdf(report, kind) {
  if (!report || typeof report.id !== 'string' || !['platform','dns'].includes(kind)) {
    throw new TypeError('Invalid security report');
  }
  const headings = kind === 'platform' ? [
    'NEXORA Security Center | Platform case',
    'Case: ' + report.ticket,
    'Title: ' + report.title,
    'Category: ' + report.category + ' | Severity: ' + report.severity,
    'State: ' + report.state + ' | Revision: ' + report.version,
    'Updated (UTC): ' + report.updated_at,
    '',
    'Reviewed summary',
    String(report.summary ?? '').slice(0, 1500),
    '',
    'Workflow history',
    ...(Array.isArray(report.events) ? report.events.slice(0, 50).map(event =>
      'Version ' + event.version + ' | ' + event.state + ' | ' + event.at) : []),
  ] : [
    'NEXORA Security Center | DNS posture',
    'Reference: ' + report.id,
    'Hostname: ' + report.hostname,
    'Completed (UTC): ' + report.completed_at,
    'Check: ' + report.policy,
    'Observation: ' + report.code,
    '',
    'Remediation',
    report.remediation,
    '',
    'Scope: DNS ownership proof for the recorded hostname.',
  ];
  const lines = headings.flatMap(wrap);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>',
  ];
  const pages = [];
  const pageCount = Math.ceil(lines.length / PAGE_LINES);
  for (let offset = 0; offset < lines.length; offset += PAGE_LINES) {
    const pageNumber = pages.length + 1;
    const pageId = objects.length + 1;
    pages.push(pageId);
    const body = [...lines.slice(offset, offset + PAGE_LINES),'', 'Page ' + pageNumber + ' of ' + pageCount]
      .map(text => '(' + pdfLiteral(text) + ') Tj T*').join('\n');
    const stream = 'BT /F1 ' + FONT_SIZE + ' Tf 14 TL 36 800 Td\n' + body + '\nET\n';
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources ' +
      '<< /Font << /F1 3 0 R >> >> /Contents ' + (pageId + 1) + ' 0 R >>');
    objects.push('<< /Length ' + Buffer.byteLength(stream, 'ascii') + ' >>\nstream\n' + stream + 'endstream');
  }
  objects[1] = '<< /Type /Pages /Kids [' + pages.map(id => id + ' 0 R').join(' ') + '] /Count ' + pages.length + ' >>';
  let file = '%PDF-1.4\n';
  const offsets = [0];
  for (const [i, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(file, 'ascii'));
    file += (i+1) + ' 0 obj\n' + object + '\nendobj\n';
  }
  const xref = Buffer.byteLength(file, 'ascii');
  file += 'xref\n0 ' + offsets.length + '\n0000000000 65535 f \n' + offsets.slice(1)
    .map(offset => String(offset).padStart(10,'0') + ' 00000 n \n').join('');
  file += 'trailer\n<< /Size ' + offsets.length + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  return Buffer.from(file,'ascii');
}
