import { parseQueryFromUrl, buildUrlWithParams } from './url-params';

describe('url-params', () => {
  it('parses query string to key-value pairs', () => {
    const pairs = parseQueryFromUrl('https://api.example.com?foo=1&bar=hello');
    expect(pairs).toHaveLength(2);
    expect(pairs.find(p => p.key === 'foo')?.value).toBe('1');
    expect(pairs.find(p => p.key === 'bar')?.value).toBe('hello');
  });

  it('builds URL from params', () => {
    const base = 'https://api.example.com/path';
    const params = [
      { id: '1', key: 'a', value: '1', enabled: true },
      { id: '2', key: 'b', value: '2', enabled: true },
      { id: '3', key: 'c', value: 'x', enabled: false },
    ];
    const url = buildUrlWithParams(base, params);
    expect(url).toContain('a=1');
    expect(url).toContain('b=2');
    expect(url).not.toContain('c=');
  });
});
