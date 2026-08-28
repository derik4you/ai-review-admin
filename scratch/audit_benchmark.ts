import { encryptAdminSession } from '../lib/adminAuth';
import fs from 'fs';

function calcStats(times: number[]) {
  if (times.length === 0) return { avg: 0, median: 0, min: 0, max: 0 };
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / sorted.length);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  return { avg, median, min: sorted[0], max: sorted[sorted.length - 1] };
}

async function runAuditBenchmark() {
  console.log('📊 Starting Performance Audit Benchmark (3 Cold + 5 Warm Requests)...');

  const token = await encryptAdminSession({
    adminId: 'admin-super-audit',
    email: 'prathameshpvadde2004@gmail.com',
    name: 'Prathamesh Vadde',
    adminRole: 'SUPER_ADMIN',
  });

  const endpoints = [
    { name: 'Admin Dashboard Metrics', url: 'http://localhost:3001/api/admin/metrics' },
    { name: 'Admin Businesses List (?page=1&limit=25)', url: 'http://localhost:3001/api/admin/businesses?page=1&limit=25' },
    { name: 'Admin Categories List', url: 'http://localhost:3001/api/admin/categories' },
    { name: 'Admin Analytics (7d)', url: 'http://localhost:3001/api/admin/analytics?range=7d' },
    { name: 'Admin AI Control Settings', url: 'http://localhost:3001/api/admin/ai-control' },
  ];

  const report: Record<string, any> = {};

  for (const ep of endpoints) {
    const coldTimes: number[] = [];
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      try {
        const fullUrl = ep.url + (ep.url.includes('?') ? '&' : '?') + 'nocache=' + Date.now() + '_' + i;
        const res = await fetch(fullUrl, {
          headers: { Cookie: 'admin_session_token=' + token },
        });
        await res.text();
        coldTimes.push(Date.now() - start);
      } catch (err: any) {
        console.error('Error on cold fetch:', ep.name, err.message);
      }
    }

    const warmTimes: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      try {
        const res = await fetch(ep.url, {
          headers: { Cookie: 'admin_session_token=' + token },
        });
        await res.text();
        warmTimes.push(Date.now() - start);
      } catch (err: any) {
        console.error('Error on warm fetch:', ep.name, err.message);
      }
    }

    report[ep.name] = {
      cold: calcStats(coldTimes),
      warm: calcStats(warmTimes),
      rawColdMs: coldTimes,
      rawWarmMs: warmTimes,
    };
  }

  const jsonStr = JSON.stringify(report, null, 2);
  fs.writeFileSync('scratch/audit_benchmark_results.json', jsonStr);
  fs.writeFileSync('../ai review system/scratch/audit_benchmark_results.json', jsonStr);
  console.log('Saved benchmark results to scratch/audit_benchmark_results.json:');
  console.log(jsonStr);
}

runAuditBenchmark().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
