"""Convert a reviewed DNS observation to a fixed report fragment offline."""
import json
import sys

MAX_PAYLOAD = 4096
REMEDIATION = {
    "dns_proof_present": "Keep the DNS TXT record until authorization expires.",
    "dns_proof_missing": "Restore the reviewed TXT record, then re-verify ownership.",
}


def main():
    raw = sys.stdin.buffer.read(MAX_PAYLOAD + 1)
    if len(raw) > MAX_PAYLOAD:
        raise ValueError("oversized")
    item = json.loads(raw)
    if not isinstance(item, dict) or set(item) != {"code"}:
        raise ValueError("unexpected fields")
    code = item["code"]
    if not isinstance(code, str) or code not in REMEDIATION:
        raise ValueError("unsupported code")
    print(json.dumps({"code": code, "remediation": REMEDIATION[code]}, ensure_ascii=True))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, UnicodeError, RecursionError):
        print("Invalid evidence input.", file=sys.stderr)
        raise SystemExit(2)
