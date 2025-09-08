/**
 * @file src/shared/hooks/use-media-query.ts
 * @version 0.1.0
 * @description A custom React hook to track the state of a CSS media query.
 *
 * @module Core.Hooks
 *
 * @summary This hook abstracts the `window.matchMedia` API, allowing components to reactively adapt to changes in viewport size or other media features. It returns a boolean indicating whether the provided media query currently matches.
 *
 * @dependencies
 * - react
 *
 * @outputs
 * - Exports the `useMediaQuery` hook.
 */
import { useState, useEffect } from 'react';

export const useMediaQuery = (query: string): boolean => {
  const getMatches = (query: string): boolean => {
    // Prevents SSR issues
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState<boolean>(getMatches(query));

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = () => setMatches(mediaQueryList.matches);
    
    // Listen for changes
    mediaQueryList.addEventListener('change', listener);
    
    // Initial check in case state got stale
    if (mediaQueryList.matches !== matches) {
        setMatches(mediaQueryList.matches);
    }

    return () => mediaQueryList.removeEventListener('change', listener);
  }, [query, matches]);

  return matches;
};
