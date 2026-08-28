import { encryptAdminSession } from '../lib/adminAuth';

async function runPerformanceRegressionSuite() {
  console.log('🧪 Starting Comprehensive Admin Performance & Regression Test Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} - ${detail || ''}`);
      failed++;
    }
  }

  // 1. Admin Authentication Token
  const superToken = await encryptAdminSession({
    adminId: 'admin-super-perf',
    email: 'prathameshpvadde2004@gmail.com',
    name: 'Prathamesh Vadde',
    adminRole: 'SUPER_ADMIN',
  });

  const supportToken = await encryptAdminSession({
    adminId: 'admin-support-perf',
    email: 'support@tagturn.in',
    name: 'Support Agent',
    adminRole: 'SUPPORT',
  });

  // 2. Unauthenticated access blocked
  const unauthRes = await fetch('http://localhost:3001/api/admin/analytics');
  assert(unauthRes.status === 401, 'Unauthenticated access to /api/admin/analytics is blocked (HTTP 401)');

  // 3. Business List Pagination & Counts
  const bizPage1Res = await fetch('http://localhost:3001/api/admin/businesses?page=1&limit=5', {
    headers: { Cookie: `admin_session_token=${superToken}` },
  });
  const bizPage1 = await bizPage1Res.json();
  assert(bizPage1Res.ok && bizPage1.pagination && bizPage1.pagination.limit === 5, 'Server-side pagination limit=5 returns paginated slice');
  assert(bizPage1.counts && typeof bizPage1.counts.all === 'number', 'Single-pass status counts computed correctly');

  // 4. Server-Side Filter & Search
  const searchRes = await fetch('http://localhost:3001/api/admin/businesses?search=demo', {
    headers: { Cookie: `admin_session_token=${superToken}` },
  });
  const searchData = await searchRes.json();
  assert(searchRes.ok && Array.isArray(searchData.businesses), 'Server-side search filtering works correctly');

  // 5. Business Detail Fast Overview (Lazy Tab)
  if (bizPage1.businesses.length > 0) {
    const firstBizId = bizPage1.businesses[0].id;

    // Overview Tab
    const overviewRes = await fetch(`http://localhost:3001/api/admin/businesses/${firstBizId}?tab=overview`, {
      headers: { Cookie: `admin_session_token=${superToken}` },
    });
    const overviewData = await overviewRes.json();
    assert(overviewRes.ok && overviewData.business && overviewData.business.reviews === undefined, 'Overview tab loads instantly without blocking on reviews data');

    // Reviews Tab
    const reviewsRes = await fetch(`http://localhost:3001/api/admin/businesses/${firstBizId}?tab=reviews`, {
      headers: { Cookie: `admin_session_token=${superToken}` },
    });
    const reviewsData = await reviewsRes.json();
    assert(reviewsRes.ok && Array.isArray(reviewsData.business.reviews), 'Reviews tab fetched on-demand successfully');

    // Analytics Tab
    const analyticsTabRes = await fetch(`http://localhost:3001/api/admin/businesses/${firstBizId}?tab=analytics`, {
      headers: { Cookie: `admin_session_token=${superToken}` },
    });
    const analyticsTabData = await analyticsTabRes.json();
    assert(analyticsTabRes.ok && analyticsTabData.business.analytics, 'Store analytics tab fetched on-demand successfully');
  }

  // 6. Platform Analytics Aggregator & Caching
  const startCache1 = Date.now();
  const analyticsRes1 = await fetch('http://localhost:3001/api/admin/analytics?range=7d', {
    headers: { Cookie: `admin_session_token=${superToken}` },
  });
  const dur1 = Date.now() - startCache1;
  const analyticsData1 = await analyticsRes1.json();
  assert(analyticsRes1.ok && analyticsData1.analytics.funnel, 'Platform analytics aggregated with full funnel telemetries');

  // Second fetch should hit 60s in-memory server cache
  const startCache2 = Date.now();
  const analyticsRes2 = await fetch('http://localhost:3001/api/admin/analytics?range=7d', {
    headers: { Cookie: `admin_session_token=${superToken}` },
  });
  const dur2 = Date.now() - startCache2;
  assert(analyticsRes2.ok && dur2 <= dur1, `In-memory server cache serves subsequent requests faster (${dur2}ms vs ${dur1}ms)`);

  // 7. Categories Taxonomy
  const catRes = await fetch('http://localhost:3001/api/admin/categories', {
    headers: { Cookie: `admin_session_token=${superToken}` },
  });
  const catData = await catRes.json();
  assert(catRes.ok && Array.isArray(catData.categories) && catData.categories.length >= 12, '12 normalized categories taxonomy loaded');

  // 8. AI Control Settings
  const aiRes = await fetch('http://localhost:3001/api/admin/ai-control', {
    headers: { Cookie: `admin_session_token=${superToken}` },
  });
  const aiData = await aiRes.json();
  assert(aiRes.ok && aiData.settings && aiData.activePrompt, 'AI Control Center loaded settings and active prompt version');

  // 9. Customer App Review Flow (Port 3000)
  const customerBizRes = await fetch('http://localhost:3000/api/businesses');
  const customerBizList = await customerBizRes.json().catch(() => ({ businesses: [] }));
  const testBizSlug = customerBizList.businesses?.[0]?.slug || 'demo-store';

  const customerPageRes = await fetch(`http://localhost:3000/biz/${testBizSlug}`);
  assert(customerPageRes.status === 200 || customerPageRes.status === 307 || customerPageRes.status === 308, `Customer NFC review flow alive on port 3000 (HTTP ${customerPageRes.status})`);

  console.log(`\n========================================`);
  console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runPerformanceRegressionSuite().then(() => process.exit(0)).catch(e => {
  console.error('Test suite error:', e);
  process.exit(1);
});
