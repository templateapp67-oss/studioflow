from pathlib import Path
import json


def replace_once(path, old, new):
    target = Path(path)
    source = target.read_text()
    if new in source:
        return
    if old not in source:
        raise SystemExit(f'Integration anchor missing: {path}: {old[:100]!r}')
    target.write_text(source.replace(old, new, 1))


replace_once(
    'server.ts',
    "import { optionalVerifiedUser, requireVerifiedUser } from './server/supabaseAuth';",
    "import { optionalVerifiedUser, requireVerifiedUser } from './server/supabaseAuth';\nimport { makeSecurityCenterHandler } from './server/securityCenter.mjs';",
)
replace_once(
    'server.ts',
    '  // API Routes\n  app.get("/api/health", (_req, res) => {',
    "  // Security Center API remains off unless SECURITY_CENTER_ENABLED=true.\n"
    "  // The handler independently validates Supabase auth, AAL2 and database scope.\n"
    "  const securityCenterHandler = makeSecurityCenterHandler();\n"
    "  app.post('/api/security-center', asyncHandler(async (req, res) => {\n"
    "    await securityCenterHandler(req, res);\n"
    "  }));\n\n"
    '  // API Routes\n  app.get("/api/health", (_req, res) => {',
)
replace_once(
    'src/AppRouter.tsx',
    "import { resolveSiteSlug } from './lib/resolveSite';",
    "import { resolveSiteSlug } from './lib/resolveSite';\nimport { StudioFlowSecurityCenterRoute } from './components/security/StudioFlowSecurityCenterRoute';",
)
replace_once(
    'src/AppRouter.tsx',
    "  if (publicPath === '/admin/demo-leads') return <NexoraDemoLeadsAdmin />;",
    "  if (publicPath === '/owner/security-center') return <StudioFlowSecurityCenterRoute mode=\"owner\" />;\n"
    "  if (publicPath === '/admin/security-center') return <StudioFlowSecurityCenterRoute mode=\"admin\" />;\n"
    "  if (publicPath === '/admin/demo-leads') return <NexoraDemoLeadsAdmin />;",
)
replace_once(
    'src/components/OwnerWorkspace.tsx',
    '          </details>\n        </aside>',
    '          </details>\n'
    "          {actorRole === 'owner' && (\n"
    '            <a href="/owner/security-center" className="mt-4 flex items-center gap-2.5 rounded-xl border border-sky-800 bg-sky-950/50 px-3 py-2.5 text-xs font-bold text-sky-200 hover:bg-sky-900/70">\n'
    '              <span className="material-symbols-outlined text-base" aria-hidden="true">shield</span>\n'
    '              Security Center\n'
    '            </a>\n'
    '          )}\n'
    '        </aside>',
)
replace_once(
    'src/components/OwnerWorkspace.tsx',
    '          </select>\n        </div>\n\n        {/* Main Content Area */}',
    '          </select>\n'
    '        </div>\n'
    "        {actorRole === 'owner' && (\n"
    '          <a href="/owner/security-center" className="lg:hidden inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs font-bold text-sky-900">\n'
    '            <span className="material-symbols-outlined text-base" aria-hidden="true">shield</span>\n'
    '            Security Center\n'
    '          </a>\n'
    '        )}\n\n'
    '        {/* Main Content Area */}',
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
