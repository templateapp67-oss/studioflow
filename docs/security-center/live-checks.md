# NOT VERIFIED — Read-only live evidence

Run under your existing authorized access. Return the narrow outputs listed below. Keep tokens, URLs with embedded credentials, tenant names and personal data out of the evidence. These are inspection commands and do not test live application targets.

## Vercel

From the already linked StudioFlow checkout, using your installed CLI:

```bash
vercel --version
vercel project inspect 'YOUR_PROJECT_NAME' --scope 'YOUR_TEAM_SLUG'
vercel inspect 'YOUR_KNOWN_PRODUCTION_DEPLOYMENT_URL' --scope 'YOUR_TEAM_SLUG'
vercel domains ls --scope 'YOUR_TEAM_SLUG'
vercel env ls production --scope 'YOUR_TEAM_SLUG'
```

Return the production deployment state and commit, linked repo and branch, production aliases, framework and runtime, and whether the expected environment variable **names** are present. Verify project domains and their configuration status in Project > Domains, function and networking settings, production deployment protection, and attached cron schedules. Return configured cron paths and schedules, whether private routing is provisioned, and the alert routing and operational owner. Do not use `env pull`, print variable values, or copy full logs.

[Official inspect reference](https://vercel.com/docs/cli/inspect)

## Supabase

Open the SQL Editor for the intended project and run `supabase-read-only.sql` as one batch. The migration ledger query requires the indicated table. If absent, remove that one query and record that the ledger was unavailable. Evaluate production policies against the exact approved revision. Review any policy predicate for literals before sharing. Return version identifiers, flags, selected ACLs, and the presence of the MFA pre-request hook. Do not export row contents.

If `cron.job` exists, run this separately. Cron commands can embed credentials, so the query only returns safe aggregates.

```sql
begin read only;
select active, count(*) from cron.job group by active;
rollback;
```

In Supabase Dashboard confirm which scheduler owns maintenance, the latest successful and failed execution, timezone, and where alerts go. Return booleans and timestamps. Apply no migrations. Verify real JWT, PostgREST and RLS behavior in an isolated project after approval.

[Supabase RLS reference](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Docker host and image

Run on the approved host with read-only operator access. Replace the container name with an existing container. Avoid unrestricted inspect output because it includes environment values and other metadata.

```bash
read -r -p 'Container name: ' check_container
docker container inspect --format 'image_id={{.Image}} image_configured={{.Config.Image}} user={{.Config.User}} privileged={{.HostConfig.Privileged}} readonly={{.HostConfig.ReadonlyRootfs}} pid_mode={{.HostConfig.PidMode}} ipc_mode={{.HostConfig.IpcMode}} network={{.HostConfig.NetworkMode}} cap_add={{json .HostConfig.CapAdd}} cap_drop={{json .HostConfig.CapDrop}} security={{json .HostConfig.SecurityOpt}} cpu_nanos={{.HostConfig.NanoCpus}} memory={{.HostConfig.Memory}} pids={{.HostConfig.PidsLimit}}' "$check_container"
docker container inspect --format '{{range .Mounts}}{{println .Type .Destination .RW}}{{end}}' "$check_container"
docker container inspect --format '{{json .NetworkSettings.Ports}}' "$check_container"
check_image_id="$(docker container inspect --format '{{.Image}}' "$check_container")"
docker image inspect --format 'id={{.Id}} digests={{json .RepoDigests}} revision={{index .Config.Labels "org.opencontainers.image.revision"}}' "$check_image_id"
```

Report whether any host mounts expose a Docker socket, private keys, host namespaces or writable sensitive paths. The mount source may use an arbitrary path. Have the operator inspect sources in private and share only flags. Confirm host firewall and resolver policy, rootless or isolated node setup, monitoring and collector configuration, and that an independent stop control exists. Return public digests, non-sensitive flags, and yes/no for egress enforcement and private API reachability. An image digest by itself does not establish tenant isolation.

[Docker inspect reference](https://docs.docker.com/reference/cli/docker/container/inspect/)

## Execution order and what to paste back

1. **Vercel:** Open the authorized team and confirm the linked project name and known production deployment ID in the dashboard. In a shell with your already authenticated CLI, run the Vercel commands above using those exact identifiers. Check Project > Domains for project-specific bindings. Copy the relevant values into the Vercel section of `redacted-results.md`. Do not share token-bearing command lines or environment values.
2. **Supabase:** Confirm the project and environment in the dashboard banner. In SQL Editor, run only `supabase-read-only.sql`. If a catalog or extension is missing, record it as unavailable instead of creating it. Paste migration versions, table policy/RLS flags, grants and booleans from the results. Use the counts-only scheduler query above if cron exists.
3. **Docker:** Use the authorized host console or your local SSH client. Inspect only existing containers. For the offline normalizer use the static checker and provenance procedure in `../RISK/host-and-provenance.md`. If there is no deployed candidate, mark it **NOT DEPLOYED**. Do not pull, run or change containers merely to produce evidence for this step.
4. Put results in `redacted-results.md`, review locally, and paste the redacted form back. Include UTC timestamp and distinguish production, staging and local. Send only provenance status and the public digest. With that evidence, I can compare deployed settings against the staging acceptance criteria without needing account credentials.
