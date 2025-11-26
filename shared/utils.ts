import { GitHubFile } from '../src/domains/repository-analysis/domain';
import {
    MAX_GEMINI_FILE_SIZE, TRUNCATED_GEMINI_MESSAGE, FileContentSeparator,
    SourceCodeTemplate
} from './config';

export interface FetchFileResult {
    content: string;
    failedFiles: { path: string; error: string }[];
}

export const fetchFileContents = async (files: GitHubFile[]): Promise<FetchFileResult> => {
    const failedFiles: { path: string; error: string }[] = [];
    const fileContents = await Promise.all(
        files.map(async file => {
            if (!file.download_url) return '';
            try {
                const res = await fetch(file.download_url);
                if (!res.ok) {
                    failedFiles.push({ path: file.path, error: res.statusText });
                    return '';
                }
                const text = await res.text();
                const cappedText = text.length > MAX_GEMINI_FILE_SIZE ? text.substring(0, MAX_GEMINI_FILE_SIZE) + TRUNCATED_GEMINI_MESSAGE : text;
                return SourceCodeTemplate.replace('{0}', file.path).replace('{1}', cappedText);
            } catch (e) {
                failedFiles.push({ path: file.path, error: e instanceof Error ? e.message : String(e) });
                return '';
            }
        })
    );
    return {
        content: fileContents.filter(c => c).join(FileContentSeparator),
        failedFiles
    };
};
