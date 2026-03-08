/**
 * Go net/http snippet generator.
 */

import type { PreparedRequest } from '../../types/response';
import { registerGenerator } from './snippet-generator-registry';
import { escapeDoubleQuoted } from './snippet-escape-utils';

function generateGoNative(req: PreparedRequest): string {
  const hasBody = !!req.body;
  const lines: string[] = ['package main', '', 'import (', '	"fmt"', '	"io"', '	"net/http"'];

  if (hasBody) lines.push('	"strings"');
  lines.push(')', '');
  lines.push('func main() {');

  if (hasBody) {
    // Use backtick raw string — escape backticks by splitting
    const safeBody = req.body!.replace(/`/g, '` + "`" + `');
    lines.push(`	body := strings.NewReader(\`${safeBody}\`)`);
    lines.push(`	req, err := http.NewRequest("${escapeDoubleQuoted(req.method)}", "${escapeDoubleQuoted(req.url)}", body)`);
  } else {
    lines.push(`	req, err := http.NewRequest("${escapeDoubleQuoted(req.method)}", "${escapeDoubleQuoted(req.url)}", nil)`);
  }

  lines.push('	if err != nil {', '		panic(err)', '	}');

  for (const [k, v] of Object.entries(req.headers)) {
    lines.push(`	req.Header.Set("${escapeDoubleQuoted(k)}", "${escapeDoubleQuoted(v)}")`);
  }

  lines.push('');
  lines.push('	resp, err := http.DefaultClient.Do(req)');
  lines.push('	if err != nil {', '		panic(err)', '	}');
  lines.push('	defer resp.Body.Close()');
  lines.push('');
  lines.push('	respBody, _ := io.ReadAll(resp.Body)');
  lines.push('	fmt.Println(string(respBody))');
  lines.push('}');

  return lines.join('\n');
}

registerGenerator('go-native', generateGoNative);
export { generateGoNative };
