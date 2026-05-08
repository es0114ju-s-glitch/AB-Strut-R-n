const http = require('http');
const querystring = require('querystring');

function doPost(host, port, path, data, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const postData = querystring.stringify(data);

    const opts = {
      hostname: host,
      port: port,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(opts, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects > 0) {
        const loc = new URL(res.headers.location, `http://${host}:${port}`);
        // follow redirect (only handle same-host GETs)
        if (res.headers['set-cookie']) {
          // ignore cookies for now
        }
        // perform GET
        http.get({ hostname: loc.hostname, port: loc.port, path: loc.pathname + loc.search }, (r2) => {
          let body = '';
          r2.on('data', c => body += c.toString());
          r2.on('end', () => resolve({ statusCode: r2.statusCode, body, finalUrl: loc.toString() }));
          r2.on('error', reject);
        }).on('error', reject);
        return;
      }

      let body = '';
      res.on('data', chunk => body += chunk.toString());
      res.on('end', () => resolve({ statusCode: res.statusCode, body, finalUrl: `http://${host}:${port}${path}` }));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

(async () => {
  try {
    const res = await doPost('localhost', 3000, '/cart/add', { productId: '1', size: '57mm', quantity: '5000' });
    console.log('STATUS', res.statusCode);
    console.log('FINAL URL', res.finalUrl);
    console.log('BODY START:\n', res.body.slice(0,1500));
  } catch (e) {
    console.error('ERR', e);
  }
})();
