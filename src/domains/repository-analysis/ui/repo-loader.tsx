import React, { FC } from 'react';
import { Play, RotateCw, Loader2 } from 'lucide-react';

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
      <input
        type="text"
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
        placeholder="Paste public GitHub URL..."
        aria-label="GitHub Repository URL"
        disabled={isRepoLoading}
      />
      <button type="submit" className="btn btn-xs btn-primary" disabled={isRepoLoading || !repoUrl.trim()}>
        {isRepoLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
        <span>Load</span>
      </button>
      <button
        type="button"
        className="btn btn-xs btn-outline"
        onClick={onReset}
        disabled={isRepoLoading || (!isRepoLoaded && !repoUrl)}
        aria-label="Reset application state"
      >
        <RotateCw size={12} />
        <span>Reset</span>
      </button>
    </form>
  );
};
