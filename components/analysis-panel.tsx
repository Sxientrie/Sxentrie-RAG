import React, { FC, useState, useEffect } from 'react';
import { Panel } from './panel';
import { AnalysisConfig, AnalysisResults, TechnicalReviewFinding, RepoInfo, ANALYSIS_SCOPES, ANALYSIS_TABS } from '../constants';
import { FlaskConical, ChevronUp, ChevronDown, FileCheck2, Download, TestTubeDiagonal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism/';
import { getLanguage } from '../utils/get-language';

const Finding: FC<{finding: TechnicalReviewFinding}> = ({ finding }) => {
    const language = getLanguage(finding.fileName);

    return (
        <div className="review-finding">
            <div className="review-finding-header">{finding.fileName}</div>
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

interface AnalysisPanelProps {
    results: AnalysisResults | null;
    config: AnalysisConfig;
    setConfig: (config: Partial<AnalysisConfig>) => void;
    isLoading: boolean;
    loadingMessage?: string;
    error: string | null;
    onRunAnalysis: () => void;
    isRepoLoaded: boolean;
    selectedFile: { path: string; content: string; url?: string; isImage?: boolean } | null;
    repoInfo: RepoInfo | null;
}

export const AnalysisPanel: FC<AnalysisPanelProps> = ({ results, config, setConfig, isLoading, loadingMessage, error, onRunAnalysis, isRepoLoaded, selectedFile, repoInfo }) => {
    const [activeTab, setActiveTab] = useState<ANALYSIS_TABS>(ANALYSIS_TABS.OVERVIEW);
    const [isConfigCollapsed, setIsConfigCollapsed] = useState(false);
    
    useEffect(() => {
        if(results) {
            setActiveTab(ANALYSIS_TABS.OVERVIEW);
        }
    }, [results]);

    const handleDownloadReport = (): void => {
        if (!results || !repoInfo) return;

        const reportDate = new Date().toUTCString();
        const reportParts: string[] = [];

        reportParts.push(`# Sxentrie Analysis Report for ${repoInfo.repo}\n\n`);
        reportParts.push(`**Repository:** https://github.com/${repoInfo.owner}/${repoInfo.repo}\n`);
        reportParts.push(`**Report Generated:** ${reportDate}\n\n`);
        reportParts.push(`## Analysis Configuration\n\n`);

        if (config.scope === ANALYSIS_SCOPES.FILE && selectedFile) {
            reportParts.push(`*   **Scope:** Selected File (\`${selectedFile.path}\`)\n`);
        } else {
            reportParts.push(`*   **Scope:** Entire Repository\n`);
        }
        if (config.customRules) {
            reportParts.push(`*   **Custom Directives:** \n\`\`\`\n${config.customRules}\n\`\`\`\n`);
        } else {
            reportParts.push(`*   **Custom Directives:** None\n`);
        }
        reportParts.push(`\n---\n\n`);

        reportParts.push(`## Project Overview\n\n${results.overview}\n\n---\n\n`);
        
        reportParts.push(`## Technical Review\n\n`);
        if (results.review.length === 0) {
            reportParts.push(`No specific technical issues were found based on the provided criteria.\n`);
        } else {
            results.review.forEach((finding, index) => {
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

    const isFileAnalysisDisabled = !selectedFile || selectedFile.isImage === true;
    const ConfigCollapseIcon = isConfigCollapsed ? ChevronDown : ChevronUp;

    const panelTitle = <><FlaskConical size={14} /> Analysis Engine</>;

    const panelActions = (
        <>
            {results && (
                 <button 
                    className="panel-action-btn" 
                    onClick={handleDownloadReport}
                    disabled={!results || !repoInfo}
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
                        <h4>Custom Directives</h4>
                        <textarea 
                            placeholder='Guide the analysis engine with specific instructions, e.g., "Focus on security vulnerabilities" or "Ignore styling issues and check for performance bottlenecks."'
                            value={config.customRules}
                            onChange={(e) => setConfig({ customRules: e.target.value})}
                            disabled={isLoading}
                        />
                    </div>
                    <div className="analysis-actions">
                        <div className="analysis-scope">
                            <div className="analysis-scope-radios">
                                <label htmlFor="scope-all">
                                    <input
                                        type="radio"
                                        id="scope-all"
                                        name="scope"
                                        value={ANALYSIS_SCOPES.ALL}
                                        checked={config.scope === ANALYSIS_SCOPES.ALL}
                                        onChange={() => setConfig({ scope: ANALYSIS_SCOPES.ALL })}
                                        disabled={isLoading}
                                    />
                                    <span className="custom-radio"></span>
                                    <span>Entire Repo</span>
                                </label>
                                <label htmlFor="scope-file" title={isFileAnalysisDisabled ? 'Select a text file to enable this option' : ''}>
                                <input
                                        type="radio"
                                        id="scope-file"
                                        name="scope"
                                        value={ANALYSIS_SCOPES.FILE}
                                        checked={config.scope === ANALYSIS_SCOPES.FILE}
                                        onChange={() => setConfig({ scope: ANALYSIS_SCOPES.FILE })}
                                        disabled={isLoading || isFileAnalysisDisabled}
                                    />
                                    <span className="custom-radio"></span>
                                    <span>Selected File</span>
                                </label>
                            </div>
                        </div>
                        <button 
                            className="run-analysis-btn" 
                            onClick={onRunAnalysis} 
                            disabled={isLoading || !isRepoLoaded}
                        >
                            {isLoading ? "Analyzing..." : "Run Analysis"}
                        </button>
                    </div>
                </div>
            </div>

            {isLoading && (
                <div className="placeholder">
                    <div className="loading-spinner"></div>
                    {loadingMessage || "Analyzing codebase... This may take a moment."}
                </div>
            )}
            {error && !isLoading && <div className="error-message">{error}</div>}

            {!isLoading && !results && !error && (
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

            {results && !isLoading && (
                <div className="analysis-results">
                    <div className="tabs">
                        <div className="tabs-nav">
                            <button className={`tab-btn ${activeTab === ANALYSIS_TABS.OVERVIEW ? 'active' : ''}`} onClick={() => setActiveTab(ANALYSIS_TABS.OVERVIEW)}>Project Overview</button>
                            <button className={`tab-btn ${activeTab === ANALYSIS_TABS.REVIEW ? 'active' : ''}`} onClick={() => setActiveTab(ANALYSIS_TABS.REVIEW)}>Technical Review ({results.review.length})</button>
                        </div>
                    </div>
                    {activeTab === ANALYSIS_TABS.OVERVIEW && (
                        <div className="tab-content markdown-content" aria-live="polite">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{results.overview}</ReactMarkdown>
                        </div>
                    )}
                    {activeTab === ANALYSIS_TABS.REVIEW && (
                        <div className="tab-content" aria-live="polite">
                            {results.review.length > 0 ? results.review.map((finding, i) => (
                                <Finding key={i} finding={finding} />
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