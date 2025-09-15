import { FC } from "react";
import { RepositoryProvider } from '../domains/repository-analysis/application/repository-context';
import { AuthProvider } from '../domains/accounts/application/auth-context';
import { GitHubCallbackHandler } from '../domains/accounts/ui/github-callback-handler';
import { AUTH_CALLBACK_PATH } from '../../shared/config';
import { SettingsProvider } from "../domains/settings/application/settings-context";
import { useAppShell } from "./useAppShell";
import { AppLayout } from "./AppLayout";

export const App: FC = () => {
    if (window.location.pathname === AUTH_CALLBACK_PATH) {
        return <GitHubCallbackHandler />;
    }

    const appShellProps = useAppShell();

    return (
      <AuthProvider>
        <SettingsProvider>
            <RepositoryProvider
                repoInfo={appShellProps.repoInfo}
                fileTree={appShellProps.fileTree}
                onError={appShellProps.handleRepositoryError}
                openSettingsPanel={appShellProps.handleOpenSettings}
            >
                <AppLayout {...appShellProps} />
            </RepositoryProvider>
        </SettingsProvider>
      </AuthProvider>
    );
};