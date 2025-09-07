import React, { FC } from 'react';

export const AppLoader: FC = () => {
  return (
    <div className="full-page-centered">
      <div className="loading-spinner"></div>
      <h2>Initializing Sxentrie...</h2>
    </div>
  );
};
