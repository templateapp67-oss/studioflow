from contextlib import redirect_stdout
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from scripts import report_semgrep_ci


class SemgrepReporterTests(unittest.TestCase):
    def run_reporter(self, report, status, stderr="scanner diagnostic"):
        with tempfile.TemporaryDirectory() as directory:
            report_path = Path(directory) / "report.json"
            stderr_path = Path(directory) / "stderr.log"
            report_path.write_text(report if isinstance(report, str) else json.dumps(report), encoding="utf-8")
            stderr_path.write_text(stderr, encoding="utf-8")
            output = io.StringIO()
            args = ["report_semgrep_ci.py", str(report_path), str(stderr_path), str(status)]
            with patch.object(sys, "argv", args), redirect_stdout(output):
                exit_code = report_semgrep_ci.main()
            return exit_code, output.getvalue()

    def test_finding_is_annotated_and_command_characters_are_escaped(self):
        code, output = self.run_reporter({"results": [{
            "path": "src/example,:%.ts", "start": {"line": 42}, "check_id": "security.rule",
            "extra": {"message": "Bad % value\nsecond line"},
        }], "errors": []}, 1)
        self.assertEqual(code, 0)
        self.assertIn("::error title=Semgrep,file=src/example%2C%3A%25.ts,line=42::", output)
        self.assertIn("security.rule: Bad %25 value%0Asecond line", output)

    def test_failed_scan_without_findings_reports_scanner_errors(self):
        code, output = self.run_reporter({"results": [], "errors": [{"message": "invalid configuration"}]}, 2)
        self.assertEqual(code, 0)
        self.assertIn("::error title=Semgrep::", output)
        self.assertIn("invalid configuration", output)

    def test_malformed_report_includes_diagnostics_and_cannot_make_success_pass(self):
        code, output = self.run_reporter("not json", 2, stderr="registry unavailable")
        self.assertEqual(code, 0)
        self.assertIn("registry unavailable", output)
        code, _ = self.run_reporter("not json", 0)
        self.assertNotEqual(code, 0)

    def test_success_has_no_error_annotation(self):
        code, output = self.run_reporter({"results": [], "errors": []}, 0)
        self.assertEqual(code, 0)
        self.assertNotIn("::error", output)

    def test_many_findings_are_logged_but_annotations_are_bounded(self):
        findings = [{"path": "a.js", "start": {"line": i + 1}, "check_id": "rule", "extra": {"message": "issue"}}
                    for i in range(12)]
        code, output = self.run_reporter({"results": findings, "errors": []}, 1)
        self.assertEqual(code, 0)
        self.assertIn("Finding a.js:12", output)
        self.assertEqual(output.count("::error "), 10)
        self.assertIn("3 additional Semgrep finding(s)", output)


if __name__ == "__main__":
    unittest.main()
