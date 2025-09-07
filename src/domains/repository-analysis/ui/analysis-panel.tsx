import React, { FC, useState, useEffect } from 'react';
import { Panel } from '../../../../shared/ui/panel';
import { AnalysisConfig, AnalysisResults, TechnicalReviewFinding, RepoInfo, ANALYSIS_SCOPES, ANALYSIS_TABS, GEMINI_MODELS } from '../domain';
import { FlaskConical, ChevronUp, ChevronDown, FileCheck2, Download, TestTubeDiagonal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism/';
import { getLanguage } from '../../../../shared/lib/get-language';
import { useRepository } from '../application/repository-context';
import { useAnalysisRunner } from '../application/use-analysis-runner';

interface FindingProps {
    finding: TechnicalReviewFinding;
    onFileSelect: (path: string) => void;
}

const Finding: FC<FindingProps> = ({ finding, onFileSelect }) => {
    const language = getLanguage(finding.fileName);

    return (
        <div className="review-finding">
            <div className="review-finding-header">
                <button className="clickable-filepath" onClick={() => onFileSelect(finding.fileName)}>
                    {finding.fileName}
                </button>
            </div>
            <div className="review-finding-body markdown-content">
                <h4>{finding.finding}</h4>
                {finding.explanation.map((step, index) => {
                    if (step.type === 'text') {
                        return <ReactMarkdown key={index} remarkPlugins={[remarkGfm]}>{step.content}</ReactMarkdown>;
                    }
                    if (step.type === 'code') {
                        return (
                             <div className="code-block-wrapper" key={index}>
                                <SyntaxHighlighter 
                                    language={language} 
                                    style={coldarkDark} 
                                    customStyle={{ margin: 0, padding: '0.75rem 1rem', backgroundColor: 'transparent' }}
                                >
                                    {step.content}
                                </SyntaxHighlighter>
                            </div>
                        );
                    }
                    return null;
                })}
            </div>
        </div>
    );
};

export const AnalysisPanel: FC = () => {
    const { 
        state: { selectedFile, repoInfo, analysisResults, analysisConfig, isAnalysisLoading, analysisProgressMessage, error }, 
        dispatch, 
        selectFileByPath 
    } = useRepository();
    const { runAnalysis } = useAnalysisRunner();

    const [activeTab, setActiveTab] = useState<ANALYSIS_TABS>(ANALYSIS_TABS.OVERVIEW);
    const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
    
    const isRepoLoaded = !!repoInfo;

    useEffect(() => {
        if(analysisResults) {
            setActiveTab(ANALYSIS_TABS.OVERVIEW);
        }
    }, [analysisResults]);

    const handleDownloadReport = (): void => {
        if (!analysisResults || !repoInfo) return;

        const reportDate = new Date().toUTCString();
        const reportParts: string[] = [];

        reportParts.push(`# Sxentrie Analysis Report for ${repoInfo.repo}\n\n`);
        reportParts.push(`**Repository:** https://github.com/${repoInfo.owner}/${repoInfo.repo}\n`);
        reportParts.push(`**Report Generated:** ${reportDate}\n\n`);
        reportParts.push(`## Analysis Configuration\n\n`);

        if (analysisConfig.scope === ANALYSIS_SCOPES.FILE && selectedFile) {
            reportParts.push(`*   **Scope:** Selected File (\`${selectedFile.path}\`)\n`);
        } else {
            reportParts.push(`*   **Scope:** Entire Repository\n`);
        }
        if (analysisConfig.customRules) {
            reportParts.push(`*   **Custom Directives:** \n\`\`\`\n${analysisConfig.customRules}\n\`\`\`\n`);
        } else {
            reportParts.push(`*   **Custom Directives:** None\n`);
        }
        reportParts.push(`\n---\n\n`);

        reportParts.push(`## Project Overview\n\n${analysisResults.overview}\n\n---\n\n`);
        
        reportParts.push(`## Technical Review\n\n`);
        if (analysisResults.review.length === 0) {
            reportParts.push(`No specific technical issues were found based on the provided criteria.\n`);
        } else {
            analysisResults.review.forEach((finding, index) => {
                reportParts.push(`### ${index + 1}. ${finding.finding}\n\n`);
                reportParts.push(`**File:** \`${finding.fileName}\`\n\n`);
                finding.explanation.forEach(step => {
                    if (step.type === 'text') {
                        reportParts.push(`${step.content}\n\n`);
                    } else if (step.type === 'code') {
                        const language = getLanguage(finding.fileName);
                        reportParts.push(`\`\`\`${language}\n${step.content}\n\`\`\`\n\n`);
                    }
                });
                reportParts.push(`\n`);
            });
        }
        
        const md = reportParts.join('');
        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${repoInfo.repo}-analysis-report.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const setConfig = (cfg: Partial<AnalysisConfig>) => dispatch({ type: 'SET_ANALYSIS_CONFIG', payload: cfg });

    const isFileAnalysisDisabled = !selectedFile || selectedFile.isImage === true;
    const ConfigCollapseIcon = isConfigCollapsed ? ChevronDown : ChevronUp;

    const panelTitle = <><FlaskConical size={14} /> Analysis Engine</>;

    const panelActions = (
        <>
            {analysisResults && (
                 <button 
                    className="panel-action-btn" 
                    onClick={handleDownloadReport}
                    disabled={!analysisResults || !repoInfo}
                    title="Download analysis as Markdown file"
                    aria-label="Download analysis report"
                >
                    <Download size={14} />
                </button>
            )}
            <button 
                className="panel-toggle-btn" 
                onClick={() => setIsConfigCollapsed(prev => !prev)}
                title={isConfigCollapsed ? "Show configuration" : "Hide configuration"}
                aria-label={isConfigCollapsed ? "Show configuration" : "Hide configuration"}
                aria-expanded={!isConfigCollapsed}
            >
                <ConfigCollapseIcon size={14} />
            </button>
        </>
    );


    return (
        <Panel
            className="analysis-panel"
            title={panelTitle}
            actions={panelActions}
        >
            <div className={`analysis-config-wrapper ${isConfigCollapsed ? 'collapsed' : ''}`}>
                <div className="analysis-config">
                    <div className="custom-rules">
                        <textarea 
                            placeholder='Guide the analysis engine with specific instructions, e.g., "Focus on security vulnerabilities" or "Ignore styling issues and check for performance bottlenecks."'
                            value={analysisConfig.customRules}
                            onChange={(e) => setConfig({ customRules: e.target.value})}
                            disabled={isAnalysisLoading}
                        />
                    </div>
                    <div className="analysis-actions">
                         <div className="radio-group">
                            <label htmlFor="scope-all">
                                <input
                                    type="radio"
                                    id="scope-all"
                                    name="scope"
                                    value={ANALYSIS_SCOPES.ALL}
                                    checked={analysisConfig.scope === ANALYSIS_SCOPES.ALL}
                                    onChange={() => setConfig({ scope: ANALYSIS_SCOPES.ALL })}
                                    disabled={isAnalysisLoading}
                                />
                                <span className="custom-radio"></span>
                                <div className="radio-label-content">
                                    <span className="radio-label-title">Entire Repo</span>
                                </div>
                            </label>
                            <label htmlFor="scope-file" title={isFileAnalysisDisabled ? 'Select a text file to enable this option' : ''}>
                            <input
                                    type="radio"
                                    id="scope-file"
                                    name="scope"
                                    value={ANALYSIS_SCOPES.FILE}
                                    checked={analysisConfig.scope === ANALYSIS_SCOPES.FILE}
                                    onChange={() => setConfig({ scope: ANALYSIS_SCOPES.FILE })}
                                    disabled={isAnalysisLoading || isFileAnalysisDisabled}
                                />
                                <span className="custom-radio"></span>
                                <div className="radio-label-content">
                                    <span className="radio-label-title">Selected File</span>
                                </div>
                            </label>
                        </div>
                        <button 
                            className="run-analysis-btn" 
                            onClick={runAnalysis} 
                            disabled={isAnalysisLoading || !isRepoLoaded}
                        >
                            {isAnalysisLoading ? "Analyzing..." : "Run Analysis"}
                        </button>
                    </div>
                </div>
            </div>

            {isAnalysisLoading && (
                 <div className="thinking-progress">
                    <p key={analysisProgressMessage} className="thinking-text">
                        {analysisProgressMessage || "Initializing analysis..."}
                    </p>
                </div>
            )}
            {error && !isAnalysisLoading && <div className="error-message">{error}</div>}

            {!isAnalysisLoading && !analysisResults && !error && (
                 <div className="placeholder placeholder-top">
                    {isRepoLoaded ? (
                        <>
                            <TestTubeDiagonal size={48} strokeWidth={1} />
                            <p style={{maxWidth: '80%'}}>Your analysis results will appear here.</p>
                            <p style={{fontSize: '0.85rem', color: 'var(--muted-foreground)', maxWidth: '80%'}}>
                                Configure your analysis scope, add custom directives if you like, and click "Run Analysis" to begin.
                            </p>
                        </>
                    ) : (
                        <p>Load a repository to enable the Analysis Engine.</p>
                    )}
                </div>
            )}

            {analysisResults && !isAnalysisLoading && (
                <div className="analysis-results">
                    <div className="tabs">
                        <div className="tabs-nav">
                            <button className={`tab-btn ${activeTab === ANALYSIS_TABS.OVERVIEW ? 'active' : ''}`} onClick={() => setActiveTab(ANALYSIS_TABS.OVERVIEW)}>Project Overview</button>
                            <button className={`tab-btn ${activeTab === ANALYSIS_TABS.REVIEW ? 'active' : ''}`} onClick={() => setActiveTab(ANALYSIS_TABS.REVIEW)}>Technical Review ({analysisResults.review.length})</button>
                        </div>
                    </div>
                    {activeTab === ANALYSIS_TABS.OVERVIEW && (
                        <div className="tab-content markdown-content" aria-live="polite">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisResults.overview}</ReactMarkdown>
                        </div>
                    )}
                    {activeTab === ANALYSIS_TABS.REVIEW && (
                        <div className="tab-content" aria-live="polite">
                            {analysisResults.review.length > 0 ? analysisResults.review.map((finding, i) => (
                                <Finding key={`${finding.fileName}-${i}`} finding={finding} onFileSelect={selectFileByPath} />
                            )) : (
                                <div className="placeholder">
                                    <FileCheck2 size={48} strokeWidth={1} />
                                    No specific technical issues found based on the criteria.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </Panel>
    );
};
