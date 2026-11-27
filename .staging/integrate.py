from pathlib import Path
import json


def insert_after_line(path, predicate, marker, addition):
    target = Path(path)
    source = target.read_text()
    if marker in source:
        return
    lines = source.splitlines(keepends=True)
    matches = [i for i, line in enumerate(lines) if predicate(line)]
    if len(matches) != 1:
        raise SystemExit(f'Expected one insertion anchor in {path}; found {len(matches)}')
    index = matches[0]
    ending = '\r\n' if lines[index].endswith('\r\n') else '\n'
    lines.insert(index + 1, addition + ending)
    target.write_text(''.join(lines))


def insert_before_line(path, predicate, marker, addition):
    target = Path(path)
    source = target.read_text()
    if marker in source:
        return
    lines = source.splitlines(keepends=True)
    matches = [i for i, line in enumerate(lines) if predicate(line)]
    if len(matches) != 1:
        raise SystemExit(f'Expected one insertion anchor in {path}; found {len(matches)}')
    index = matches[0]
    ending = '\r\n' if lines[index].endswith('\r\n') else '\n'
    lines.insert(index, addition + ending)
    target.write_text(''.join(lines))


insert_after_line(
    'server.ts',
    lambda line: 'optionalVerifiedUser' in line and 'requireVerifiedUser' in line and 'supabaseAuth' in line,
    'makeSecurityCenterHandler',
    "import { makeSecurityCenterHandler } from './server/securityCenter.mjs';",
)
insert_before_line(
    'server.ts',
    lambda line: '// API Routes' in line,
    "const securityCenterHandler = makeSecurityCenterHandler();",
    "  // Security Center API remains disabled unless SECURITY_CENTER_ENABLED=true.\n"
    "  // Handler validates Supabase bearer session, AAL2 and tenant scope.\n"
    "  const securityCenterHandler = makeSecurityCenterHandler();\n"
    "  app.post('/api/security-center', asyncHandler(async (req, res) => {\n"
    "    await securityCenterHandler(req, res);\n"
    "  }));\n",
)
insert_after_line(
    'src/AppRouter.tsx',
    lambda line: 'resolveSiteSlug' in line and "from './lib/resolveSite'" in line,
    'StudioFlowSecurityCenterRoute',
    "import { StudioFlowSecurityCenterRoute } from './components/security/StudioFlowSecurityCenterRoute';",
)
insert_before_line(
    'src/AppRouter.tsx',
    lambda line: "publicPath === '/admin/demo-leads'" in line,
    "publicPath === '/owner/security-center'",
    "  if (publicPath === '/owner/security-center') return <StudioFlowSecurityCenterRoute mode=\"owner\" />;\n"
    "  if (publicPath === '/admin/security-center') return <StudioFlowSecurityCenterRoute mode=\"admin\" />;\n",
)
insert_before_line(
    'src/components/OwnerWorkspace.tsx',
    lambda line: line.strip() == '</aside>',
    'href="/owner/security-center"',
    "          {actorRole === 'owner' && (\n"
    "            <a href=\"/owner/security-center\" className=\"mt-4 flex items-center gap-2.5 rounded-xl border border-sky-800 bg-sky-950/50 px-3 py-2.5 text-xs font-bold text-sky-200 hover:bg-sky-900/70\">\n"
    "              <span className=\"material-symbols-outlined text-base\" aria-hidden=\"true\">shield</span>\n"
    "              Security Center\n"
    "            </a>\n"
    "          )}\n",
)
insert_before_line(
    'src/components/OwnerWorkspace.tsx',
    lambda line: '/* Main Content Area */' in line,
    'href="/owner/security-center" className="lg:hidden',
    "        {actorRole === 'owner' && (\n"
    "          <a href=\"/owner/security-center\" className=\"lg:hidden inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-bold text-sky-900\">\n"
    "            <span className=\"material-symbols-outlined text-base\" aria-hidden=\"true\">shield</span>\n"
    "            Security Center\n"
    "          </a>\n"
    "        )}\n",
)

package_file = Path('package.json')
package = json.loads(package_file.read_text())
package.setdefault('dependencies', {})['pg'] = '8.16.3'
package.setdefault('devDependencies', {})['@electric-sql/pglite'] = '0.6.0'
extra = 'node --test tests/securityCenter.test.mjs tests/dnsWatch.test.mjs tests/reportPdf.test.mjs tests/database.test.mjs'
current = package['scripts']['test']
if extra not in current:
    package['scripts']['test'] = current + ' && ' + extra
package_file.write_text(json.dumps(package, indent=2) + '\n')
