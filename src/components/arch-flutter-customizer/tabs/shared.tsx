import type { ReactNode } from 'react';

import type { ArchFlutterCustomizerConfig, CustomizerIssue, CustomizerTabId } from '../../../lib/archFlutterCustomizer';

/** Everything a tab needs: the draft config, a history-aware updater and the live issues. */
export interface TabProps {
  config: ArchFlutterCustomizerConfig;
  update: (updater: (config: ArchFlutterCustomizerConfig) => ArchFlutterCustomizerConfig) => void;
  issues: CustomizerIssue[];
}

export function issueFor(issues: CustomizerIssue[], tab: CustomizerTabId, field: string): string | undefined {
  return issues.find((issue) => issue.tab === tab && issue.field === field)?.message;
}

export function issuesForTab(issues: CustomizerIssue[], tab: CustomizerTabId): CustomizerIssue[] {
  return issues.filter((issue) => issue.tab === tab);
}

export function PanelHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="afc-panel-head">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

export function IssueList({ issues }: { issues: CustomizerIssue[] }) {
  if (issues.length === 0) return null;
  return (
    <div className="afc-notice" data-tone="error" role="alert">
      <b>Please fix {issues.length} {issues.length === 1 ? 'item' : 'items'} on this tab:</b>
      <ul className="afc-issue-list">
        {issues.map((issue) => (
          <li key={`${issue.tab}-${issue.field}-${issue.message}`}>
            <span aria-hidden="true">•</span>
            <span>
              {issue.field ? <b>{issue.field}: </b> : null}
              {issue.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
