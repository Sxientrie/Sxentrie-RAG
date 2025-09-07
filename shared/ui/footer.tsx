import React, { FC } from 'react';

export const Footer: FC = () => {
  return (
    <footer className="page-footer">
      <p>© {new Date().getFullYear()} Sxentrie. All Rights Reserved. | Built with React, Typescript, API's & lots of coffee.</p>
    </footer>
  );
};
