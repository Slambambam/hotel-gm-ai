const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Only proxy requests to these domains
const ALLOWED_HOSTS = [
  'script.google.com',
  'script.googleusercontent.com',
  'accounts.google.com',
  'api.openweathermap.org'
];

function isAllowedUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    return ALLOWED_HOSTS.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
  } catch { return false; }
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, 'http://localhost:' + PORT);

  // CORS proxy: /proxy?url=...
  if (reqUrl.pathname === '/proxy') {
    const targetUrl = reqUrl.searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Missing url param' }));
    }

    if (!isAllowedUrl(targetUrl)) {
      res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      return res.end(JSON.stringify({ error: 'Domain not allowed' }));
    }

    function follow(fetchUrl, depth) {
      if (depth > 6) {
        res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Too many redirects' }));
      }
      // Allow redirects to google domains (GAS redirects through googleusercontent.com)
      if (depth > 0 && !isAllowedUrl(fetchUrl)) {
        res.writeHead(403, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: 'Redirect to disallowed domain' }));
      }
      https.get(fetchUrl, (pr) => {
        if (pr.statusCode >= 300 && pr.statusCode < 400 && pr.headers.location) {
          return follow(pr.headers.location, depth + 1);
        }
        let body = '';
        pr.on('data', c => body += c);
        pr.on('end', () => {
          res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          res.end(body);
        });
      }).on('error', e => {
        res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: e.message }));
      });
    }

    follow(targetUrl, 0);
    return;
  }

  // Static files — only serve from project directory
  let fp = reqUrl.pathname === '/' ? '/dashboard.html' : reqUrl.pathname;
  fp = path.join(__dirname, fp);
  const resolved = path.resolve(fp);
  if (!resolved.startsWith(path.resolve(__dirname))) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  const ext = path.extname(resolved);
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };

  try {
    const data = fs.readFileSync(resolved);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => console.log('Dashboard: http://localhost:' + PORT));
