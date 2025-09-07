
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