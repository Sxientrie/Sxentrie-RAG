import React, { FC } from 'react';
import { Play, RotateCw, Loader2 } from 'lucide-react';
import { ICON_SIZE_XS } from '../../../../shared/config';
interface RepoLoaderProps {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  onLoad: () => void;
  onReset: () => void;
  isRepoLoading: boolean;
  isRepoLoaded: boolean;
}
export const RepoLoader: FC<RepoLoaderProps> = ({
  repoUrl,
  setRepoUrl,
  onLoad,
  onReset,
  isRepoLoading,
  isRepoLoaded,
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
        {isRepoLoading ? <Loader2 size={ICON_SIZE_XS} className="animate-spin" /> : <Play size={ICON_SIZE_XS} />}
        <span>Load</span>
      </button>
      <button
        type="button"
        className="btn btn-xs btn-outline"
        onClick={onReset}
        disabled={isRepoLoading || (!isRepoLoaded && !repoUrl)}
        aria-label="Reset application state"
      >
        <RotateCw size={ICON_SIZE_XS} />
        <span>Reset</span>
      </button>
    </form>
  );
};
