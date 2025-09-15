import React, { FC, useState, useEffect } from 'react';
import { Panel } from '../../../../shared/ui/panel';
import { SlidersHorizontal, KeyRound, X } from 'lucide-react';
import { useSettings } from '../application/settings-context';
import {
    ICON_SIZE_SM, UI_COPY_SUCCESS_TIMEOUT_MS, LabelSettings, TitleCloseSettings,
    AriaLabelCloseSettings, LabelApiCredentials, TextApiKeyDescription, PlaceholderGeminiApiKey,
    LabelSaved, LabelSave, SaveStatusIdle, SaveStatusSaved
} from '../../../../shared/config';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: FC<SettingsPanelProps> = ({ onClose }) => {
  const { settings, setApiKey } = useSettings();
  const [localApiKey, setLocalApiKey] = useState(settings.apiKey || '');
  const [saveStatus, setSaveStatus] = useState<typeof SaveStatusIdle | typeof SaveStatusSaved>(SaveStatusIdle);

  useEffect(() => {
    setLocalApiKey(settings.apiKey || '');
  }, [settings.apiKey]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKey(localApiKey.trim() || null);
    setSaveStatus(SaveStatusSaved);
    setTimeout(() => setSaveStatus(SaveStatusIdle), UI_COPY_SUCCESS_TIMEOUT_MS);
  };

  const panelTitle = <><SlidersHorizontal size={ICON_SIZE_SM} /> {LabelSettings}</>;
  const panelActions = (
    <button
      className="panel-action-btn"
      onClick={onClose}
      title={TitleCloseSettings}
      aria-label={AriaLabelCloseSettings}
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
                    <KeyRound size={ICON_SIZE_SM} />
                    <span>{LabelApiCredentials}</span>
                </h3>
                <p className="settings-section-description">
                    {TextApiKeyDescription}
                </p>
                <form onSubmit={handleSave} className="input-group">
                    <input
                        type="password"
                        className="input settings-input"
                        placeholder={PlaceholderGeminiApiKey}
                        value={localApiKey}
                        onChange={(e) => setLocalApiKey(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="btn btn-sm btn-primary"
                        disabled={saveStatus === SaveStatusSaved || localApiKey === (settings.apiKey || '')}
                    >
                        {saveStatus === SaveStatusSaved ? LabelSaved : LabelSave}
                    </button>
                </form>
            </div>
        </div>
    </Panel>
  );
};
