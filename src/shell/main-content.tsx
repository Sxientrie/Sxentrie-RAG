import React, { FC, useCallback } from "react";
import { useRepository } from "../domains/repository-analysis/application/repository-context";
import { Panel } from "../../shared/ui/panel";
import { Download, RotateCw } from 'lucide-react';
import {
    ICON_SIZE_SM,
    MARKDOWN_FILE_EXTENSION, REPORT_FILE_MIMETYPE, ReportHeaderTemplate,
    ReportRepoUrlTemplate, ReportDateTemplate, ReportHorizontalRule, ReportConfigHeader, ReportScopeFileTemplate,
    ReportScopeRepo, ReportModeTemplate, ReportCustomDirectivesTemplate, ReportNoCustomDirectives,
    ReportOverviewHeader, ReportReviewHeader, ReportNoIssuesFound, ReportSummaryTableHeader,
    ReportSummaryTableRowTemplate, ReportDetailsHeader, ReportFindingHeaderTemplate, ReportDetailsTableHeader,
    ReportDetailsTableRowTemplate, ReportLineRangeTemplate, ReportNotApplicable,
    ReportCodeBlockTemplate, ReportFileNameTemplate, TitleShowDismissedFindingsTemplate, AriaLabelRestoreDismissed,
    TitleDownloadReport, AriaLabelDownloadReport
} from '../../shared/config';
import { AnalysisReportView } from "../domains/repository-analysis/ui/analysis-report-view";
import { getLanguage } from "../../shared/lib/get-language";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileViewer } from "../domains/repository-analysis/ui/file-viewer";
// Fix: Moved ANALYSIS_SCOPES import from shared/config to its correct location in the domain types.
import { ANALYSIS_TABS, ANALYSIS_SCOPES } from "../domains/repository-analysis/domain";

export const MainContent: FC = () => {
    const { state, dispatch, selectFileByPath, onError } = useRepository();
    const { analysisResults, activeTab, repoInfo, analysisConfig, selectedFile, dismissedFindings } = state;

    const handleDownloadReport = useCallback((): void => {
        if (!analysisResults || !repoInfo) return;
        const reportDate = new Date().toUTCString();
        const reportParts: string[] = [];
        const findings = analysisResults.review;
        reportParts.push(ReportHeaderTemplate.replace('{0}', repoInfo.repo));
        reportParts.push(ReportRepoUrlTemplate.replace('{0}', repoInfo.owner).replace('{1}', repoInfo.repo));
        reportParts.push(ReportDateTemplate.replace('{0}', reportDate));
        reportParts.push(ReportHorizontalRule);
        reportParts.push(ReportConfigHeader);
        if (analysisConfig.scope === ANALYSIS_SCOPES.FILE && selectedFile) {
          reportParts.push(ReportScopeFileTemplate.replace('{0}', selectedFile.path));
        } else {
          reportParts.push(ReportScopeRepo);
        }
        reportParts.push(ReportModeTemplate.replace('{0}', analysisConfig.mode.charAt(0).toUpperCase() + analysisConfig.mode.slice(1)));
        if (analysisConfig.customRules) {
          reportParts.push(ReportCustomDirectivesTemplate.replace('{0}', analysisConfig.customRules));
        } else {
          reportParts.push(ReportNoCustomDirectives);
        }
        reportParts.push(`\n${ReportHorizontalRule}`);
        reportParts.push(ReportOverviewHeader);
        reportParts.push(`${analysisResults.overview}\n\n${ReportHorizontalRule}\n`);
        reportParts.push(ReportReviewHeader);
        if (findings.length === 0) {
          reportParts.push(ReportNoIssuesFound);
        } else {
          const summaryTable = [
            ReportSummaryTableHeader,
            ...findings.map(f => ReportSummaryTableRowTemplate
                .replace('{0}', f.severity)
                .replace('{1}', f.finding.replace(/\|/g, '\\|')) // Sanitize pipe characters
                .replace('{2}', f.fileName)
            ).join('\n'),
          ].join('\n');
          reportParts.push(summaryTable);
          reportParts.push(`\n\n${ReportHorizontalRule}\n`);
          reportParts.push(ReportDetailsHeader);
          findings.forEach((finding, index) => {
            reportParts.push(ReportFindingHeaderTemplate.replace('{0}', String(index + 1)).replace('{1}', finding.finding));
            const detailsTable = [
              ReportDetailsTableHeader,
              ReportDetailsTableRowTemplate
                .replace('{0}', finding.severity)
                .replace('{1}', finding.fileName)
                .replace('{2}', finding.startLine ? ReportLineRangeTemplate.replace('{0}', String(finding.startLine)).replace('{1}', String(finding.endLine)) : ReportNotApplicable)
            ].join('\n');
            reportParts.push(detailsTable);
            reportParts.push('\n\n');
            finding.explanation.forEach(step => {
              if (step.type === 'text') {
                reportParts.push(`${step.content}\n\n`);
              } else if (step.type === 'code') {
                const language = getLanguage(finding.fileName);
                reportParts.push(ReportCodeBlockTemplate.replace('{0}', language).replace('{1}', step.content));
              }
            });
          });
        }
        const md = reportParts.join('');
        const blob = new Blob([md], { type: REPORT_FILE_MIMETYPE });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = ReportFileNameTemplate.replace('{0}', repoInfo.repo).replace('{1}', MARKDOWN_FILE_EXTENSION);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, [analysisResults, repoInfo, analysisConfig, selectedFile]);

      const dismissedCount = dismissedFindings.size;
      const tabs = [
        { title: 'Editor', content: <FileViewer onError={onError} /> },
        { title: ANALYSIS_TABS.OVERVIEW, content: (
            <div className="tab-content markdown-content" aria-live="polite">
                {analysisResults ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisResults.overview}</ReactMarkdown> : <div className="placeholder"><p>Run an analysis to see the project overview.</p></div>}
            </div>
        )},
        { title: ANALYSIS_TABS.REVIEW, content: (
            <div className="panel-content">
                {analysisResults ? <AnalysisReportView analysisResults={analysisResults} onFileSelect={selectFileByPath} /> : <div className="placeholder"><p>Run an analysis to see the technical review.</p></div>}
            </div>
        )}
      ];

      let visibleTabs = [tabs[0]];
      if (analysisResults) {
        visibleTabs.push(tabs[1], tabs[2]);
      }

      const activeTabIndex = Math.max(0, visibleTabs.findIndex(tab => tab.title === activeTab));
      
      const handleTabChange = (index: number) => {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: visibleTabs[index].title });
      };

      const TabActions = (
        <>
          {dismissedCount > 0 && (
            <button
              className="panel-action-btn"
              onClick={() => dispatch({ type: 'RESET_DISMISSED_FINDINGS' })}
              title={TitleShowDismissedFindingsTemplate.replace('{0}', String(dismissedCount))}
              aria-label={AriaLabelRestoreDismissed}
            >
              <RotateCw size={ICON_SIZE_SM} />
            </button>
          )}
          {analysisResults && repoInfo && (
            <button
              className="panel-action-btn"
              onClick={handleDownloadReport}
              disabled={!analysisResults || !repoInfo}
              title={TitleDownloadReport}
              aria-label={AriaLabelDownloadReport}
            >
              <Download size={ICON_SIZE_SM} />
            </button>
          )}
        </>
      );

      return (
        <Panel
            tabs={visibleTabs}
            activeTab={activeTabIndex}
            onTabChange={handleTabChange}
            actions={activeTab === ANALYSIS_TABS.REVIEW ? TabActions : null}
            className="main-content-panel"
        >
            {visibleTabs[activeTabIndex].content}
        </Panel>
      );
}