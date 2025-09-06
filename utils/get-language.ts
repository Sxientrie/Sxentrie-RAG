export const getLanguage = (path: string): string => {
    const extension = path.split('.').pop()?.toLowerCase();
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
        default: return 'text';
    }
};
