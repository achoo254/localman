/**
 * Export collection API docs as Markdown or standalone HTML.
 * Traverses collection tree (folders + requests) and generates documentation.
 */

import type { Collection, Folder, ApiRequest } from '../types/models';

/** Generate Markdown documentation for a collection */
export function exportCollectionAsMarkdown(
  collection: Collection,
  folders: Folder[],
  requests: ApiRequest[],
): string {
  const lines: string[] = [];

  lines.push(`# ${collection.name}`);
  if (collection.description) {
    lines.push('', collection.description);
  }
  lines.push('');

  // Group requests by folder
  const rootRequests = requests.filter(r => r.collection_id === collection.id && !r.folder_id);
  const collectionFolders = folders.filter(f => f.collection_id === collection.id);

  // Root-level requests
  for (const req of rootRequests) {
    lines.push(formatRequestMarkdown(req));
  }

  // Folder groups
  for (const folder of collectionFolders) {
    lines.push(`## ${folder.name}`, '');
    const folderRequests = requests.filter(r => r.folder_id === folder.id);
    for (const req of folderRequests) {
      lines.push(formatRequestMarkdown(req));
    }
  }

  return lines.join('\n');
}

function formatRequestMarkdown(req: ApiRequest): string {
  const lines: string[] = [];
  lines.push(`### ${req.method} ${req.name || req.url}`);
  lines.push('');

  if (req.url) {
    lines.push(`**URL:** \`${req.url}\``);
    lines.push('');
  }

  if (req.description) {
    lines.push(req.description);
    lines.push('');
  }

  // Headers
  const enabledHeaders = req.headers.filter(h => h.enabled && h.key);
  if (enabledHeaders.length > 0) {
    lines.push('**Headers:**');
    lines.push('| Key | Value |');
    lines.push('|-----|-------|');
    for (const h of enabledHeaders) {
      lines.push(`| ${escapePipe(h.key)} | ${escapePipe(h.value)} |`);
    }
    lines.push('');
  }

  // Params
  const enabledParams = req.params.filter(p => p.enabled && p.key);
  if (enabledParams.length > 0) {
    lines.push('**Parameters:**');
    lines.push('| Key | Value | Description |');
    lines.push('|-----|-------|-------------|');
    for (const p of enabledParams) {
      lines.push(`| ${escapePipe(p.key)} | ${escapePipe(p.value)} | ${escapePipe(p.description ?? '')} |`);
    }
    lines.push('');
  }

  // Auth
  if (req.auth.type !== 'none') {
    lines.push(`**Auth:** ${req.auth.type}`);
    lines.push('');
  }

  // Body
  if (req.body.type !== 'none' && req.body.raw) {
    const langMap: Record<string, string> = { json: 'json', xml: 'xml', html: 'html', javascript: 'javascript' };
    const fenceLang = langMap[req.body.type] ?? '';
    lines.push(`**Body** (\`${req.body.type}\`):`);
    lines.push(`\`\`\`${fenceLang}`);
    lines.push(req.body.raw);
    lines.push('```');
    lines.push('');
  }

  lines.push('---', '');
  return lines.join('\n');
}

/** Generate standalone HTML docs with inline dark-theme CSS */
export function exportCollectionAsHtml(
  collection: Collection,
  folders: Folder[],
  requests: ApiRequest[],
): string {
  const md = exportCollectionAsMarkdown(collection, folders, requests);
  // Simple markdown-to-HTML conversion for export (no runtime dependency)
  const html = simpleMarkdownToHtml(md);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(collection.name)} — API Docs</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d0f14; color: #c9d1d9; max-width: 900px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
  h1 { color: #e6edf3; border-bottom: 1px solid #21262d; padding-bottom: 0.5rem; }
  h2 { color: #c9d1d9; margin-top: 2rem; border-bottom: 1px solid #21262d; padding-bottom: 0.3rem; }
  h3 { color: #58a6ff; }
  code { background: #161b22; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  pre { background: #161b22; padding: 1rem; border-radius: 8px; overflow-x: auto; }
  pre code { padding: 0; background: none; }
  table { border-collapse: collapse; width: 100%; margin: 0.5rem 0 1rem; }
  th, td { border: 1px solid #30363d; padding: 6px 12px; text-align: left; }
  th { background: #161b22; }
  hr { border: none; border-top: 1px solid #21262d; margin: 1.5rem 0; }
  strong { color: #e6edf3; }
  a { color: #58a6ff; }
  @media print { body { background: #fff; color: #333; } h1, h2, h3, strong { color: #000; } code, pre { background: #f4f4f4; } th { background: #eee; } th, td { border-color: #ccc; } }
</style>
</head>
<body>
${html}
</body>
</html>`;
}

/** Escape pipe characters in markdown table cell values */
function escapePipe(s: string): string {
  return s.replace(/\|/g, '\\|');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Minimal markdown-to-HTML (headings, bold, code blocks, tables, hr, paragraphs) */
function simpleMarkdownToHtml(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inCodeBlock = false;
  let inTable = false;
  let isFirstTableRow = true;

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        out.push('</code></pre>');
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        out.push('<pre><code>');
      }
      continue;
    }

    if (inCodeBlock) {
      out.push(escapeHtml(line));
      continue;
    }

    if (line.startsWith('---')) {
      if (inTable) { out.push('</table>'); inTable = false; }
      out.push('<hr>');
      continue;
    }

    // Table rows
    if (line.startsWith('|')) {
      if (line.includes('---')) continue; // skip separator
      if (!inTable) { out.push('<table>'); inTable = true; isFirstTableRow = true; }
      const cells = line.split('|').filter(c => c.trim());
      const tag = isFirstTableRow ? 'th' : 'td';
      out.push('<tr>' + cells.map(c => `<${tag}>${inlineFormat(c.trim())}</${tag}>`).join('') + '</tr>');
      if (isFirstTableRow) isFirstTableRow = false;
      continue;
    }

    if (inTable) { out.push('</table>'); inTable = false; }

    if (line.startsWith('### ')) {
      out.push(`<h3>${inlineFormat(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ')) {
      out.push(`<h2>${inlineFormat(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      out.push(`<h1>${inlineFormat(line.slice(2))}</h1>`);
    } else if (line.trim()) {
      out.push(`<p>${inlineFormat(line)}</p>`);
    }
  }

  if (inTable) out.push('</table>');
  if (inCodeBlock) out.push('</code></pre>');

  return out.join('\n');
}

function inlineFormat(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}
