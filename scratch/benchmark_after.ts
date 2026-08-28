import { encryptAdminSession } from '../lib/adminAuth';
import fs from 'fs';

async function benchmark() {
  const token = await encryptAdminSession({
    adminId: 'admin-super-perf',
    email: 'prathameshpvadde2004@gmail.com',
    name: 'Prathamesh Vadde',
    adminRole: 'SUPER_ADMIN',
  });

  const endpoints = [
    { name: 'Admin Dashboard Metrics', url: 'http://localhost:3001/api/admin/metrics' },
    { name: 'Admin Businesses List', url: 'http://localhost:3001/api/admin/businesses' },
    { name: 'Admin Categories List', url: 'http://localhost:3001/api/admin/categories' },
    { name: 'Admin Analytics (7d)', url: 'http://localhost:3001/api/admin/analytics?range=7d' },
    { name: 'Admin AI Control Settings', url: 'http://localhost:3001/api/admin/ai-control' },
    { name: 'Customer App Home (Port 3000)', url: 'http://localhost:3000/' },
  ];

  const results: Record<string, number> = {};

  for (const ep of endpoints) {
    const times: number[] = [];
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      try {
        const res = await fetch(ep.url, {
          headers: { Cookie: `admin_session_token=${token}` },
        });
        await res.text();
        times.push(Date.now() - start);
      } catch (err: any) {
        console.error('Error on', ep.name, err.message);
      }
    }
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / (times.length || 1));
    results[ep.name] = avg;
  }

  const jsonStr = JSON.stringify(results, null, 2);
  fs.writeFileSync('scratch/benchmark_after.json', jsonStr);
  fs.writeFileSync('../ai review system/scratch/benchmark_after.json', jsonStr);
  console.log('Saved post-optimization measurements to scratch/benchmark_after.json:\n', results);
}

benchmark().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });