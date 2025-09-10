import re
import sys
import os

def remove_js_ts_comments(content):
    # This regex now handles single quotes, double quotes, and backticks for template literals.
    pattern = re.compile(
        r'(\'(?:\\.|[^\\\'])*\'|"(?:\\.|[^\\"])*"|`(?:\\.|[^`])*`)|(/\*[\s\S]*?\*/)|(//.*)',
        re.MULTILINE
    )

    def replacer(match):
        if match.group(1):  # It's a string.
            return match.group(1)
        else:  # It's a comment.
            return ''

    return re.sub(pattern, replacer, content)

def remove_html_comments(content):
    return re.sub(r'<!--[\s\S]*?-->', '', content)

def remove_css_comments(content):
    return re.sub(r'/\*[\s\S]*?\*/', '', content)

def remove_yml_comments(content):
    pattern = re.compile(r'(\'(?:\\.|[^\\\'])*\'|"(?:\\.|[^\\"])*")|(#.*$)', re.MULTILINE)

    def replacer(match):
        if match.group(1):
            return match.group(1)
        if match.group(2):
            return ''
        return ''

    return re.sub(pattern, replacer, content)

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Could not read {filepath}: {e}", file=sys.stderr)
        return

    _, extension = os.path.splitext(filepath)

    if extension in ['.ts', '.tsx']:
        new_content = remove_js_ts_comments(content)
    elif extension == '.html':
        new_content = remove_html_comments(content)
    elif extension == '.css':
        new_content = remove_css_comments(content)
    elif extension == '.yml':
        new_content = remove_yml_comments(content)
    else:
        return

    lines = [line for line in new_content.splitlines() if line.strip()]
    if lines:
        final_content = '\n'.join(lines) + '\n'
    else:
        final_content = ''

    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(final_content)
    except Exception as e:
        print(f"Could not write to {filepath}: {e}", file=sys.stderr)

def main():
    target_extensions = ['.ts', '.tsx', '.yml', '.html', '.css']
    for root, dirs, files in os.walk('.'):
        if '.git' in dirs:
            dirs.remove('.git')

        for file in files:
            if any(file.endswith(ext) for ext in target_extensions):
                filepath = os.path.join(root, file)
                process_file(filepath)

if __name__ == '__main__':
    main()
