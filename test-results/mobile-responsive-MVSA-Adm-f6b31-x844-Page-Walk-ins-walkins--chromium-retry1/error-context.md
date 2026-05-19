# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile-responsive.spec.ts >> MVSA Admin Site Mobile Responsiveness & Touch Usability >> Device: iPhone 14 (390x844) >> Page: Walk-ins (/walkins)
- Location: tests\mobile-responsive.spec.ts:72:13

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('header')
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for locator('header')

```

```yaml
- main:
  - heading "MVSA ADMIN" [level=1]
  - paragraph: Secure Access Portal
  - text: Email Address
  - textbox "name@example.com"
  - text: Password
  - textbox "••••••••": "123456"
  - button "SIGN IN TO DASHBOARD"
  - paragraph: Mountain View Sports Arena © 2026 Unauthorized access is strictly prohibited.
- alert
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | // Configuration profiles for test devices
  4   | const devicesConfig = [
  5   |   {
  6   |     name: 'iPhone 14',
  7   |     width: 390,
  8   |     height: 844,
  9   |     isMobile: true,
  10  |     hasTouch: true,
  11  |     userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  12  |   },
  13  |   {
  14  |     name: 'Samsung Galaxy S23',
  15  |     width: 360,
  16  |     height: 780,
  17  |     isMobile: true,
  18  |     hasTouch: true,
  19  |     userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36',
  20  |   },
  21  |   {
  22  |     name: 'iPad',
  23  |     width: 768,
  24  |     height: 1024,
  25  |     isMobile: false,
  26  |     hasTouch: true,
  27  |     userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  28  |   }
  29  | ];
  30  | 
  31  | // Target pages in the admin app
  32  | const testPages = [
  33  |   { name: 'Login', path: '/login', authenticated: false },
  34  |   { name: 'Dashboard', path: '/', authenticated: true },
  35  |   { name: 'Bookings', path: '/bookings', authenticated: true },
  36  |   { name: 'Walk-ins', path: '/walkins', authenticated: true },
  37  |   { name: 'Expenses', path: '/expenses', authenticated: true },
  38  |   { name: 'Programs', path: '/programs', authenticated: true }
  39  | ];
  40  | 
  41  | // baseURL is configured in playwright.config.ts
  42  | 
  43  | test.describe('MVSA Admin Site Mobile Responsiveness & Touch Usability', () => {
  44  |   for (const device of devicesConfig) {
  45  |     test.describe(`Device: ${device.name} (${device.width}x${device.height})`, () => {
  46  |       // Apply custom viewport and device configurations for emulation
  47  |       test.use({
  48  |         viewport: { width: device.width, height: device.height },
  49  |         isMobile: device.isMobile,
  50  |         hasTouch: device.hasTouch,
  51  |         userAgent: device.userAgent,
  52  |       });
  53  | 
  54  |       // Automatically handle authentication for dashboard pages
  55  |       test.beforeEach(async ({ page }, testInfo) => {
  56  |         const isAuthTest = !testInfo.title.includes('Page: Login');
  57  |         if (isAuthTest) {
  58  |           // Navigate to login page
  59  |           await page.goto('/login', { waitUntil: 'domcontentloaded' });
  60  |           
  61  |           // Fill in credentials
  62  |           await page.locator('input[type="email"]').fill('murashmurash07@gmail.com');
  63  |           await page.locator('input[type="password"]').fill('123456');
  64  |           await page.getByRole('button', { name: /SIGN IN/i }).click();
  65  | 
  66  |           // Wait for the authenticated header layout to mount
> 67  |           await expect(page.locator('header')).toBeVisible({ timeout: 20000 });
      |                                                ^ Error: expect(locator).toBeVisible() failed
  68  |         }
  69  |       });
  70  | 
  71  |       for (const pageInfo of testPages) {
  72  |         test(`Page: ${pageInfo.name} (${pageInfo.path})`, async ({ page }) => {
  73  |           // Go to target page if it is not the login page (which we are already on or authenticated from)
  74  |           if (pageInfo.authenticated) {
  75  |             await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
  76  |           } else {
  77  |             await page.goto(pageInfo.path, { waitUntil: 'domcontentloaded' });
  78  |           }
  79  | 
  80  |           // Add brief wait for layouts to settle
  81  |           await page.waitForTimeout(500);
  82  | 
  83  |           // 1. Verify Viewport Meta Tag
  84  |           const viewportMeta = page.locator('meta[name="viewport"]');
  85  |           await expect(viewportMeta).toBeAttached();
  86  |           const content = await viewportMeta.getAttribute('content');
  87  |           expect(content).toContain('width=device-width');
  88  |           expect(content).toContain('initial-scale=1');
  89  | 
  90  |           // 2. Verify No Horizontal Scrollbar
  91  |           const hasHorizontalScrollbar = await page.evaluate(() => {
  92  |             return document.documentElement.scrollWidth > window.innerWidth;
  93  |           });
  94  |           expect(hasHorizontalScrollbar).toBe(false);
  95  | 
  96  |           // 3. Verify Text Readability (No text elements horizontal overflow)
  97  |           const overflowingTextElements = await page.evaluate(() => {
  98  |             const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, p'));
  99  |             return elements
  100 |               .map(el => {
  101 |                 const rect = el.getBoundingClientRect();
  102 |                 const isOverflowing = rect.right > window.innerWidth + 2 || rect.left < -2;
  103 |                 return isOverflowing ? `${el.tagName}: "${el.textContent?.trim().substring(0, 30)}..."` : null;
  104 |               })
  105 |               .filter(Boolean);
  106 |           });
  107 |           expect(overflowingTextElements).toEqual([]);
  108 | 
  109 |           // 4. Mobile Sidebar Transforms and Backdrop Checks (for viewports < 1024px)
  110 |           if (device.width < 1024 && pageInfo.authenticated) {
  111 |             const headerMenuBtn = page.locator('header button').first();
  112 |             await expect(headerMenuBtn).toBeVisible();
  113 | 
  114 |             const sidebar = page.locator('aside');
  115 |             
  116 |             // Initially Sidebar should be positioned off-screen (translateX = -100%)
  117 |             const initialSidebarBox = await sidebar.boundingBox();
  118 |             if (initialSidebarBox) {
  119 |               expect(initialSidebarBox.x).toBeLessThan(0);
  120 |             }
  121 | 
  122 |             // Wait for hydration/settling
  123 |             await page.waitForTimeout(1000);
  124 | 
  125 |             // Click menu button in header to open sidebar drawer
  126 |             await headerMenuBtn.click();
  127 |             await page.waitForTimeout(300); // Wait for transform transition
  128 | 
  129 |             // Sidebar should now be on-screen (translateX = 0)
  130 |             const openedSidebarBox = await sidebar.boundingBox();
  131 |             expect(openedSidebarBox?.x).toBe(0);
  132 | 
  133 |             // Backdrop should be visible
  134 |             const backdrop = page.locator('div.bg-charcoal\\/40');
  135 |             await expect(backdrop).toBeVisible();
  136 | 
  137 |             // Click backdrop to close sidebar drawer
  138 |             await backdrop.click({ force: true });
  139 |             await page.waitForTimeout(300); // Wait for transition
  140 |             await expect(backdrop).toBeHidden();
  141 |             
  142 |             // Sidebar is moved back off-screen
  143 |             const closedSidebarBox = await sidebar.boundingBox();
  144 |             if (closedSidebarBox) {
  145 |               expect(closedSidebarBox.x).toBeLessThan(0);
  146 |             }
  147 |           }
  148 | 
  149 |           // 5. Dashboard Stats Layout Stacking Checks
  150 |           if (pageInfo.path === '/' && pageInfo.authenticated) {
  151 |             // Check that dashboard metric stats cards are visible
  152 |             const statsCards = page.locator('div.bg-white.rounded-3xl.p-6'); // Stats cards selector
  153 |             if (await statsCards.count() > 1) {
  154 |               const firstCard = statsCards.nth(0);
  155 |               const secondCard = statsCards.nth(1);
  156 |               const box1 = await firstCard.boundingBox();
  157 |               const box2 = await secondCard.boundingBox();
  158 |               
  159 |               if (box1 && box2) {
  160 |                 if (device.width < 768) {
  161 |                   // On mobile viewports, cards should stack vertically
  162 |                   expect(box2.y).toBeGreaterThanOrEqual(box1.y + box1.height - 10);
  163 |                 }
  164 |               }
  165 |             }
  166 |           }
  167 | 
```