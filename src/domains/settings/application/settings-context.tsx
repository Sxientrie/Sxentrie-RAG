import React, { createContext, useState, useContext, FC, ReactNode, useCallback } from 'react';
import { SETTINGS_STORAGE_KEY } from '../../../../shared/config';

interface SettingsState {
  apiKey: string | null;
}

interface SettingsContextType {
  settings: SettingsState;
  setApiKey: (key: string | null) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const getInitialState = (): SettingsState => {
  try {
    const item = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (item) {
      const parsed = JSON.parse(item);
      return { apiKey: parsed.apiKey || null };
    }
  } catch (error) {
    console.error('Failed to parse settings from local storage:', error);
  }
  return { apiKey: null };
};

export const SettingsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SettingsState>(getInitialState);

  const setApiKey = useCallback((key: string | null) => {
    const newSettings = { ...settings, apiKey: key };
    setSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings to local storage:', error);
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, setApiKey }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
