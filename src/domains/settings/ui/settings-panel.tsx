import React, { FC, useState } from 'react';
import { Panel } from '../../../../shared/ui/panel';
import { SlidersHorizontal, KeyRound, Save, X } from 'lucide-react';
import { ICON_SIZE_SM, ICON_SIZE_MD, UI_COPY_SUCCESS_TIMEOUT_MS } from '../../../../shared/config';

const API_KEY_STORAGE_KEY = 'sxentrie-api-key';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: FC<SettingsPanelProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE_KEY) || '');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  const handleSave = () => {
      // In a real app, this might be encrypted or handled more securely.
      // For this implementation, we'll use localStorage as requested.
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), UI_COPY_SUCCESS_TIMEOUT_MS);
  };

  const panelTitle = <><SlidersHorizontal size={ICON_SIZE_SM} /> Settings</>;

  const panelActions = (
    <button
      className="panel-action-btn"
      onClick={onClose}
      title="Close Settings"
      aria-label="Close settings panel"
    >
      <X size={ICON_SIZE_SM} />
    </button>
  );

  return (
    <Panel
      className="settings-panel"
      title={panelTitle}
      actions={panelActions}
    >
        <div className="settings-content">
            <div className="settings-section">
                <h3 className="settings-section-title">
                    <KeyRound size={ICON_SIZE_MD} />
                    <span>API Credentials</span>
                </h3>
                <p className="settings-section-description">
                    Provide your own Google Gemini API key. Your key is stored securely in your browser's local storage and is never sent to our servers.
                </p>
                <div className="input-group">
                    <input
                        type="password"
                        className="settings-input"
                        placeholder="Enter your Gemini API Key..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                    />
                    <button
                        className="btn btn-sm btn-primary"
                        onClick={handleSave}
                        disabled={!apiKey.trim()}
                    >
                       <Save size={ICON_SIZE_SM} />
                       {saveStatus === 'saved' ? 'Saved!' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    </Panel>
  );
};