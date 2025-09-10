import React, { FC, useState } from 'react';
import { Panel } from '../../../../shared/ui/panel';
import { SlidersHorizontal, KeyRound, Save, X } from 'lucide-react';
import {
    ICON_SIZE_SM, ICON_SIZE_MD, UI_COPY_SUCCESS_TIMEOUT_MS, ApiKeyStorageKey, SaveStatusIdle, SaveStatusSaved,
    LabelSettings, TitleCloseSettings, AriaLabelCloseSettings, LabelApiCredentials, TextApiKeyDescription,
    PlaceholderGeminiApiKey, LabelSaved, LabelSave
} from '../../../../shared/config';
interface SettingsPanelProps {
  onClose: () => void;
}
export const SettingsPanel: FC<SettingsPanelProps> = ({ onClose }) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(ApiKeyStorageKey) || '');
  const [saveStatus, setSaveStatus] = useState<typeof SaveStatusIdle | typeof SaveStatusSaved>(SaveStatusIdle);
  const handleSave = () => {
      localStorage.setItem(ApiKeyStorageKey, apiKey);
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
                    <KeyRound size={ICON_SIZE_MD} />
                    <span>{LabelApiCredentials}</span>
                </h3>
                <p className="settings-section-description">
                    {TextApiKeyDescription}
                </p>
                <div className="input-group">
                    <input
                        type="password"
                        className="settings-input"
                        placeholder={PlaceholderGeminiApiKey}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                    />
                    <button
                        className="btn btn-sm btn-primary"
                        onClick={handleSave}
                        disabled={!apiKey.trim()}
                    >
                       <Save size={ICON_SIZE_SM} />
                       {saveStatus === SaveStatusSaved ? LabelSaved : LabelSave}
                    </button>
                </div>
            </div>
        </div>
    </Panel>
  );
};
