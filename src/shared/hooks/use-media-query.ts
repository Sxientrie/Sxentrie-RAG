import { useState, useEffect } from 'react';
export const useMediaQuery = (query: string): boolean => {
  const getMatches = (query: string): boolean => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  };
  const [matches, setMatches] = useState<boolean>(getMatches(query));
  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = () => setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener('change', listener);
    if (mediaQueryList.matches !== matches) {
        setMatches(mediaQueryList.matches);
    }
    return () => mediaQueryList.removeEventListener('change', listener);
  }, [query, matches]);
  return matches;
};
