const https = require('https');
const options = {
  hostname: 'gitlabs.inet.vn',
  path: '/api/v4/projects/dattqh%2Flocalman/issues?state=opened',
  method: 'GET',
  headers: {
    'PRIVATE-TOKEN': 'glpat-REDACTED'
  }
};
const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const issues = JSON.parse(data);
      console.log(JSON.stringify(issues.map(i => ({ iid: i.iid, title: i.title, description: i.description?.substring(0, 50) }))));
    } catch(e) { console.error('E', e); }
  });
});
req.on('error', e => console.error(e));
req.end();
