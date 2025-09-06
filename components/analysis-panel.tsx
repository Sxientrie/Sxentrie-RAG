import React, { FC, useState, useEffect } from 'react';
import { Panel } from './panel';
import { AnalysisConfig, AnalysisResults, TechnicalReviewFinding, RepoInfo, ANALYSIS_SCOPES, ANALYSIS_TABS } from '../constants';
import { FlaskConical, ChevronUp, ChevronDown, FileCheck2, Download, TestTubeDiagonal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism/';
import { getLanguage } from '../utils/get-language';

const styleSheet = `
.analysis-panel .panel-content { gap: 0.75rem; }

.panel-action-btn {
    background: none; border: none; color: var(--muted-foreground);
    cursor: pointer; padding: 4px; border-radius: var(--radius);
    display: inline-flex; align-items: center; justify-content: center;
    transition: all 0.2s ease;
}
.panel-action-btn:hover:not(:disabled) {
    background-color: oklch(100% 0 0 / 0.1); color: var(--foreground);
}
.panel-action-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
}

.analysis-config-wrapper {
    transition: max-height 0.3s ease-in-out;
    overflow: hidden;
    max-height: 200px;
    flex-shrink: 0;
}
.analysis-config-wrapper.collapsed {
    max-height: 0;
}

.analysis-config { display: flex; flex-direction: column; gap: 1rem; }
.custom-rules textarea {
    width: 100%; min-height: 60px; background-color: var(--background); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--foreground); padding: 0.5rem; resize: vertical;
    font-family: var(--font-family-sans); font-size: 0.9rem;
}
.run-analysis-btn {
  padding: 0.4rem 1rem;
  border: none;
  border-radius: var(--radius);
  background-color: var(--primary);
  color: var(--primary-foreground);
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
  font-size: 0.9rem;
}
.run-analysis-btn:hover:not(:disabled) { background-color: oklch(70% 0.12 145); }
.run-analysis-btn:disabled { background-color: oklch(28% 0 0); cursor: not-allowed; color: oklch(48% 0 0);}

.placeholder-top {
    flex-grow: 1;
    height: auto;
    justify-content: flex-start;
    margin-top: 0.75rem;
    padding-top: 1rem;
}

.analysis-results {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    min-height: 0;
}
.analysis-results .tabs {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0.75rem;
    flex-shrink: 0;
}
.tabs-nav { display: flex; }

.analysis-results .tab-btn {
    padding: 0.5rem 1rem; border: none; background-color: transparent;
    color: var(--muted-foreground); cursor: pointer; position: relative; font-size: 0.9rem;
}
.analysis-results .tab-btn.active { color: var(--primary); }
.analysis-results .tab-btn.active::after {
    content: ''; position: absolute; bottom: -1px; left: 0; width: 100%;
    height: 2px; background-color: var(--primary);
}
.tab-content {
    animation: fadeIn 0.5s;
    flex-grow: 1;
    min-height: 0;
    overflow-y: auto;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.review-finding {
    border: 1px solid var(--border); border-radius: var(--radius);
    margin-bottom: 0.75rem; background-color: oklch(23% 0 0); overflow: hidden;
}
.review-finding-header {
    padding: 0.5rem 1rem; background-color: oklch(28% 0 0); font-family: var(--font-family-mono);
    border-bottom: 1px solid var(--border); font-size: 0.85rem;
}
.review-finding-body {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}
.review-finding-body.markdown-content p {
    margin: 0;
}
.review-finding-body > h4 {
    margin: 0;
    color: var(--foreground);
    font-weight: 500;
    font-size: 1rem;
}
.code-block-wrapper {
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid var(--border);
    background-color: var(--background);
}
`;

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
    setConfig: (config: AnalysisConfig) => void;
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
        let md = `# Sxentrie Analysis Report for ${repoInfo.repo}\n\n`;
        md += `**Repository:** https://github.com/${repoInfo.owner}/${repoInfo.repo}\n`;
        md += `**Report Generated:** ${reportDate}\n\n`;
        md += `## Analysis Configuration\n\n`;

        if (config.scope === ANALYSIS_SCOPES.FILE && selectedFile) {
            md += `*   **Scope:** Selected File (\`${selectedFile.path}\`)\n`;
        } else {
            md += `*   **Scope:** Entire Repository\n`;
        }
        if (config.customRules) {
            md += `*   **Custom Directives:** \n\`\`\`\n${config.customRules}\n\`\`\`\n`;
        } else {
            md += `*   **Custom Directives:** None\n`;
        }
        md += `\n---\n\n`;

        md += `## Project Overview\n\n${results.overview}\n\n---\n\n`;
        
        md += `## Technical Review\n\n`;
        if (results.review.length === 0) {
            md += `No specific technical issues were found based on the provided criteria.\n`;
        } else {
            results.review.forEach((finding, index) => {
                md += `### ${index + 1}. ${finding.finding}\n\n`;
                md += `**File:** \`${finding.fileName}\`\n\n`;
                finding.explanation.forEach(step => {
                    if (step.type === 'text') {
                        md += `${step.content}\n\n`;
                    } else if (step.type === 'code') {
                        const language = getLanguage(finding.fileName);
                        md += `\`\`\`${language}\n${step.content}\n\`\`\`\n\n`;
                    }
                });
                md += `\n`;
            });
        }

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
            >
                <ConfigCollapseIcon size={14} />
            </button>
        </>
    );


    return (
        <>
        <style>{styleSheet}</style>
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
                            onChange={(e) => setConfig({ ...config, customRules: e.target.value})}
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
                                        onChange={() => setConfig({ ...config, scope: ANALYSIS_SCOPES.ALL })}
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
                                        onChange={() => setConfig({ ...config, scope: ANALYSIS_SCOPES.FILE })}
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
        </>
    );
};
