import React, { FC } from 'react';

interface RepoLoaderProps {
    repoUrl: string;
    setRepoUrl: (url: string) => void;
    onLoad: () => void;
    onReset: () => void;
    isRepoLoading: boolean;
    isRepoLoaded: boolean;
    loadingMessage: string;
}

export const RepoLoader: FC<RepoLoaderProps> = ({ 
    repoUrl, 
    setRepoUrl, 
    onLoad, 
    onReset,
    isRepoLoading, 
    isRepoLoaded,
    loadingMessage,
}) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLoad();
    };

    return (
        <form className="repo-loader-form" onSubmit={handleSubmit}>
            <div className="input-wrapper">
                <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="Paste public GitHub URL..."
                    aria-label="GitHub Repository URL"
                    disabled={isRepoLoading}
                    className={isRepoLoading ? 'loading' : ''}
                />
                {isRepoLoading && <div className="input-spinner" aria-label="Loading repository"></div>}
            </div>
            <button type="submit" disabled={isRepoLoading || !repoUrl.trim()}>
                {isRepoLoading ? "Loading..." : "Load"}
            </button>
            <button 
                type="button" 
                className="reset-btn" 
                onClick={onReset} 
                disabled={isRepoLoading || (!isRepoLoaded && !repoUrl)}
                aria-label="Reset application state"
            >
                Reset
            </button>
        </form>
    );
};