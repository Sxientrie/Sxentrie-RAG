import React, { FC } from 'react';
import { ArrowRight, RotateCw, Loader2 } from 'lucide-react';
import { ICON_SIZE_XS } from '../../../../shared/config';
interface RepoLoaderProps {
  repoUrl: string;
  setRepoUrl: (url: string) => void;
  onLoad: () => void;
  onReset: () => void;
  isRepoLoading: boolean;
  isRepoLoaded: boolean;
  dispatch: React.Dispatch<any>;
}
export const RepoLoader: FC<RepoLoaderProps> = ({
  repoUrl,
  setRepoUrl,
  onLoad,
  onReset,
  isRepoLoading,
  isRepoLoaded,
  dispatch,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoad();
  };

  const handleMouseEnter = () => {
    dispatch({ type: 'SET_FOOTER_TOOLTIP', payload: 'Enter the full URL of a public GitHub repository.' });
  };

  const handleMouseLeave = () => {
    dispatch({ type: 'SET_FOOTER_TOOLTIP', payload: null });
  };

  return (
    <form className="repo-loader-form" onSubmit={handleSubmit}>
      <input
        type="text"
        className="input"
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
        placeholder="Paste public GitHub URL..."
        aria-label="GitHub Repository URL"
        disabled={isRepoLoading}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      <button type="submit" className="btn btn-xs btn-primary" disabled={isRepoLoading || !repoUrl.trim()}>
        {isRepoLoading ? <Loader2 size={ICON_SIZE_XS} className="animate-spin" /> : <ArrowRight size={ICON_SIZE_XS} />}
        <span>Load</span>
      </button>
      <button
        type="button"
        className="btn btn-xs btn-secondary"
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
