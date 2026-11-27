# Host isolation, image identity and provenance

## Static checks on an authorized host

Run the checker against the offline normalizer container **only**, using the exact repository digest approved for its OS and architecture. It performs local Docker metadata reads. It reports booleans, never container environment values or mount paths.

```bash
python3 RISK/check-host-isolation.py 'EXISTING_CONTAINER_NAME' 'REGISTRY/REPO@sha256:EXACT_APPROVED_DIGEST'
docker info --format '{{json .SecurityOptions}}'
```

Exit 0 means the inspected fields matched the offline-worker policy. Exit 1 means a policy mismatch. Exit 2 means inspection was unavailable or invalid. Check the daemon is on a dedicated rootless host or an explicitly approved isolated host, and that operators cannot reach production credentials from that host. Review listener bindings, firewall egress policy, applicable seccomp and MAC enforcement, sandbox process identities, cgroup enforcement, log retention and the out-of-band stop procedure in the provider/host console. Return only control status and redacted evidence references.

## Behavioral checks only on a disposable staging host

1. Verify the resolved Compose config uses an approved digest and the host is dedicated to the staging workload. Do not run this on production.
2. With a reviewed fixture image sharing the exact offline Compose restrictions, verify hardening using only local synthetic fixtures. Confirm its effective UID/GID is 65532, mount and capability checks are denied, it cannot create files on the root filesystem, and its only network interface is loopback. A local dummy listener on the host is an optional staging fixture for proving lack of route. No external destination is needed.
3. Test clean shutdown, a deliberately stuck synthetic worker, supervisor time limit, stop and reap behavior, and errors when processing invalid or oversized synthetic input. Confirm no leftover container after supervised cleanup. Confirm independent host/firewall controls still work when the app is down.
4. Record the staging host profile, runtime and OS versions, image digest, pass/fail per control, operator, and evidence timestamp. Static metadata success alone is insufficient.

## Provenance gate

Inspect and verify an existing artifact. These commands do not run its image. Key and registry inputs must come from your approved release policy, not from the artifact being verified. For published multi-architecture artifacts, capture both the manifest index digest (if present) and selected platform-specific manifest digest. Match the host image and approval record.

```bash
IMAGE='REGISTRY/REPO@sha256:EXACT_APPROVED_DIGEST'
cosign verify --key 'APPROVED_SIGNER_PUBLIC_KEY_FILE' "$IMAGE" > verified-signature.json
cosign verify-attestation --key 'APPROVED_BUILDER_PUBLIC_KEY_FILE' --type 'APPROVED_PREDICATE_TYPE' "$IMAGE" > verified-attestation.json
syft "docker:$IMAGE" -o spdx-json=sbom.spdx.json
```

Use an identity- and issuer-pinned Cosign policy if your organization uses keyless signing. Inspect the verified attestation privately: check subject digest, source URL, exact commit, trusted build identity/workflow and pinned inputs, then match base image contents and SBOM package licenses. A valid signature from an unexpected identity or provenance for another commit fails the release gate. If the publisher supplies no compatible signature or attestation, mark that image unverified until your organization has approved a reproducible and attested build. [Docker image provenance guide](https://docs.docker.com/learn/content/prove-where-your-image-came-from/)

## PentAGI gate

No control-plane connector or worker launch path is included. Keep autonomous execution gated separately with an independent decision, private network and data plane, legal rights, and an approved operator process. The offline normalizer has no Docker socket, runtime credentials or network. Approval of the StudioFlow staging pilot provides no launch authority for PentAGI.
