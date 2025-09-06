import React, { FC } from 'react';

const styleSheet = `
.repo-loader-form {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
  top: 5px;
}
.input-wrapper {
  position: relative;
}
.repo-loader-form input {
  width: 400px;
  padding: 0.35rem 0.75rem;
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--foreground);
  font-family: var(--font-family-mono);
  font-size: 0.9rem;
  transition: padding-right 0.2s ease;
}
.repo-loader-form input.loading {
  padding-right: 2.5rem;
}
.input-spinner {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: repo-loader-spin 0.8s linear infinite;
}
@keyframes repo-loader-spin {
  to { transform: translateY(-50%) rotate(360deg); }
}

.repo-loader-form input::placeholder {
  color: var(--muted-foreground);
  opacity: 0.7;
}
.repo-loader-form button {
  padding: 0.35rem 1.25rem;
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
.repo-loader-form button:hover:not(:disabled) { background-color: oklch(70% 0.12 145); }
.repo-loader-form button:disabled { background-color: oklch(28% 0 0); cursor: not-allowed; color: oklch(48% 0 0);}

.repo-loader-form .reset-btn {
  padding: 0.35rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background-color: transparent;
  color: var(--muted-foreground);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-size: 0.9rem;
}
.repo-loader-form .reset-btn:hover:not(:disabled) {
  border-color: var(--foreground);
  color: var(--foreground);
}
.repo-loader-form .reset-btn:disabled {
  border-color: var(--border);
  color: oklch(48% 0 0);
  cursor: not-allowed;
  opacity: 0.6;
}
`;

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
        <>
        <style>{styleSheet}</style>
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
        </>
    );
};
