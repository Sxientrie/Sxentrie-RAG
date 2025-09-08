/**
 * @file shared/lib/get-language.ts
 * @version 0.1.0
 * @description A utility function to determine the programming language from a file path.
 *
 * @module Core.Library
 *
 * @summary This utility function takes a file path string and returns a language identifier compatible with syntax highlighters like Prism. It uses file extensions and specific filenames (like 'Dockerfile') to map to a language name. This is crucial for correctly rendering code blocks.
 *
 * @dependencies
 * - None
 *
 * @outputs
 * - Exports the `getLanguage` function.
 *
 * @changelog
 * - v0.1.0 (2025-09-08): File created and documented.
 */

export const getLanguage = (path: string): string => {
    const fileName = path.split('/').pop()?.toLowerCase() || '';
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (fileName === 'dockerfile') return 'dockerfile';
    if (fileName === 'go.mod') return 'gomod';

    switch(extension) {
        case 'js': return 'javascript';
        case 'ts': return 'typescript';
        case 'jsx': return 'jsx';
        case 'tsx': return 'tsx';
        case 'py': return 'python';
        case 'json': return 'json';
        case 'md': return 'markdown';
        case 'css': return 'css';
        case 'html': return 'html';
        case 'sh': return 'bash';
        case 'yml':
        case 'yaml': return 'yaml';
        case 'xml': return 'xml';
        case 'sql': return 'sql';
        case 'graphql': return 'graphql';
        case 'vue': return 'markup';
        case 'svelte': return 'markup';
        default: return 'text';
    }
};