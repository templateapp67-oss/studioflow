"""Read-only static policy check for the offline evidence normalizer."""
import argparse
import json
import re
import subprocess
import sys


def docker_json(*args):
    output = subprocess.check_output(["docker", *args], text=True, timeout=15,
                                     stderr=subprocess.DEVNULL)
    return [json.loads(line) for line in output.splitlines() if line.strip()]


def policy(fields, repo_digests, expected):
    (uid, privileged, readonly, network, namespace_pid, namespace_ipc,
     add_caps, drop_caps, security, mounts, ports, memory, nano_cpus, pids,
     device_bindings, device_requests) = fields
    return {
        "image_digest_matches": expected in (repo_digests or []),
        "non_root_numeric": bool(re.fullmatch(r"[1-9]\d*:[1-9]\d*", uid)),
        "not_privileged": privileged is False,
        "rootfs_read_only": readonly is True,
        "network_none": network == "none",
        "no_host_namespaces": namespace_pid != "host" and namespace_ipc != "host",
        "capabilities_dropped": not add_caps and "ALL" in (drop_caps or []),
        "no_new_privileges": any(item in ("no-new-privileges", "no-new-privileges:true")
                                 for item in (security or [])),
        "no_unconfined_profile": all("unconfined" not in item.lower() for item in (security or [])),
        "no_mounts": not mounts,
        "no_port_bindings": not ports,
        "no_devices": not device_bindings and not device_requests,
        "limits_enforced": 0 < memory <= 96 * 1024 * 1024 and
                           0 < nano_cpus <= 500_000_000 and 0 < pids <= 32,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("container")
    parser.add_argument("approved_image", help="Exact repository@sha256:digest recorded in approval")
    args = parser.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", args.container) or not re.fullmatch(
            r"[A-Za-z0-9][A-Za-z0-9._:/-]+@sha256:[a-f0-9]{64}", args.approved_image):
        parser.error("Provide a container name and a digest-qualified approved image.")
    # Inspect selected fields only. Never read the container's environment or mount paths.
    template = "\n".join("{{json " + field + "}}" for field in (
        ".Config.User", ".HostConfig.Privileged", ".HostConfig.ReadonlyRootfs", ".HostConfig.NetworkMode",
        ".HostConfig.PidMode", ".HostConfig.IpcMode", ".HostConfig.CapAdd", ".HostConfig.CapDrop",
        ".HostConfig.SecurityOpt", "(not (not .HostConfig.Binds))", ".HostConfig.PortBindings",
        ".HostConfig.Memory", ".HostConfig.NanoCpus", ".HostConfig.PidsLimit",
        "(not (not .HostConfig.Devices))", "(not (not .HostConfig.DeviceRequests))", ".Image", "(not (not .Mounts))", "(not (not .HostConfig.VolumesFrom))",
    ))
    try:
        raw = docker_json("container", "inspect", "--format", template, args.container)
        fields, image_id, mounts, volumes_from = raw[:16], raw[16], raw[17], raw[18]
        fields[9] = bool(fields[9] or mounts or volumes_from)
        if not re.fullmatch(r"sha256:[a-f0-9]{64}", image_id):
            raise ValueError("unexpected image ID")
        digests = docker_json("image", "inspect", "--format", "{{json .RepoDigests}}", image_id)[0]
        checks = policy(fields,digests,args.approved_image)
    except (OSError, ValueError, IndexError, TypeError, subprocess.SubprocessError):
        print(json.dumps({"status":"not_verified","reason":"unavailable_or_unsupported_inspect_output"}))
        return 2
    print(json.dumps(checks, indent=2))
    return 0 if all(checks.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
