#!/usr/bin/env python3
"""Surface a failed Semgrep scan as actionable GitHub Actions annotations.

The scanner's exit status remains authoritative; this reporter does not decide
whether findings should fail the job. On scanner failure without a JSON report,
it includes the diagnostic output instead of silently hiding the cause.
"""

import json
from pathlib import Path
import sys


def escape_data(value):
    return str(value).replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")


def escape_property(value):
    return escape_data(value).replace(":", "%3A").replace(",", "%2C")


def annotation(message, path=None, line=None):
    properties = "title=Semgrep"
    if path and isinstance(line, int) and line > 0:
        properties += f",file={escape_property(path)},line={line}"
    print(f"::error {properties}::{escape_data(message)}")


def main():
    report_path, stderr_path, status_text = sys.argv[1:]
    status = int(status_text)
    try:
        report = json.loads(Path(report_path).read_text(encoding="utf-8"))
        findings = report["results"]
        if not isinstance(findings, list):
            raise ValueError("Semgrep results were not a list")
    except (OSError, ValueError, KeyError, TypeError) as error:
        try:
            diagnostics = Path(stderr_path).read_text(encoding="utf-8", errors="replace")[-12000:]
        except OSError:
            diagnostics = "No scanner diagnostics were captured."
        annotation(f"Could not read the Semgrep JSON report ({error}).\n{diagnostics}")
        # A malformed report must never turn a successful scan into a pass.
        return 1 if status == 0 else 0

    print(f"Semgrep reported {len(findings)} finding(s); scanner exit status: {status}.")
    for finding in findings:
        message = f"{finding.get('check_id', 'unknown rule')}: {finding.get('extra', {}).get('message', 'Finding')}"
        print(escape_data(f"Finding {finding.get('path', '')}:{finding.get('start', {}).get('line', '?')}: {message}"))
    if status == 0:
        return 0
    for finding in findings[:9]:
        annotation(
            f"{finding.get('check_id', 'unknown rule')}: {finding.get('extra', {}).get('message', 'Finding')}",
            finding.get("path"),
            finding.get("start", {}).get("line"),
        )
    if len(findings) > 9:
        annotation(f"{len(findings) - 9} additional Semgrep finding(s); see the scan log.")
    elif not findings:
        errors = [str(error.get("message", error)) for error in (report.get("errors") or [])]
        diagnostics = "\n".join(errors[-5:])
        if not diagnostics:
            try:
                diagnostics = Path(stderr_path).read_text(encoding="utf-8", errors="replace")[-12000:]
            except OSError:
                diagnostics = "No scanner diagnostics were captured."
        annotation(f"Semgrep exited with status {status} without reporting findings.\n{diagnostics}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
