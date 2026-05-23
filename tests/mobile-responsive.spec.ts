import { test, expect } from '@playwright/test';

// Configuration profiles for test devices
const devicesConfig = [
  {
    name: 'iPhone 14',
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  },
  {
    name: 'Samsung Galaxy S23',
    width: 360,
    height: 780,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Mobile Safari/537.36',
  },
  {
    name: 'iPad',
    width: 768,
    height: 1024,
    isMobile: false,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
  }
];

// Target pages in the admin app
const testPages = [
  { name: 'Login', path: '/login', authenticated: false },
  { name: 'Dashboard', path: '/', authenticated: true },
  { name: 'Bookings', path: '/bookings', authenticated: true },
  { name: 'Walk-ins', path: '/walkins', authenticated: true },
  { name: 'Expenses', path: '/expenses', authenticated: true },
  { name: 'Programs', path: '/programs', authenticated: true }
];

// baseURL is configured in playwright.config.ts

test.describe('MVSA Admin Site Mobile Responsiveness & Touch Usability', () => {
  for (const device of devicesConfig) {
    test.describe(`Device: ${device.name} (${device.width}x${device.height})`, () => {
      // Apply custom viewport and device configurations for emulation
      test.use({
        viewport: { width: device.width, height: device.height },
        isMobile: device.isMobile,
        hasTouch: device.hasTouch,
        userAgent: device.userAgent,
      });

      // Automatically handle authentication for dashboard pages
      test.beforeEach(async ({ page }, testInfo) => {
        page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
        page.on('pageerror', err => console.error(`[BROWSER UNHANDLED ERROR] ${err.message}`));

        const isAuthTest = !testInfo.title.includes('Page: Login');
        if (isAuthTest) {
          // Navigate to login page
          await page.goto('/login', { waitUntil: 'domcontentloaded' });
          
          // Fill in credentials
          await page.locator('input[type="email"]').fill('murashmurash07@gmail.com');
          await page.locator('input[type="password"]').fill('123456');
          await page.getByRole('button', { name: /SIGN IN/i }).click();

          // Wait for the authenticated header layout to mount
          await expect(page.locator('header').first()).toBeVisible({ timeout: 20000 });
        }
      });

      for (const pageInfo of testPages) {
        test(`Page: ${pageInfo.name} (${pageInfo.path})`, async ({ page }) => {
          const currentUrl = page.url();
          const targetUrlPath = pageInfo.path;
          
          // Go to target page if we're not already on it
          if (pageInfo.authenticated) {
            const hasUrlMatch = currentUrl.endsWith(targetUrlPath) || 
                               (targetUrlPath === '/' && (currentUrl.endsWith(':3001') || currentUrl.endsWith(':3001/')));
            if (!hasUrlMatch) {
              await page.goto(targetUrlPath, { waitUntil: 'domcontentloaded' });
            }
          } else {
            await page.goto(targetUrlPath, { waitUntil: 'domcontentloaded' });
          }
 
          // Add brief wait for layouts to settle
          await page.waitForTimeout(500);

          // 1. Verify Viewport Meta Tag
          const viewportMeta = page.locator('meta[name="viewport"]');
          await expect(viewportMeta).toBeAttached();
          const content = await viewportMeta.getAttribute('content');
          expect(content).toContain('width=device-width');
          expect(content).toContain('initial-scale=1');

          // 2. Verify No Horizontal Scrollbar
          const hasHorizontalScrollbar = await page.evaluate(() => {
            return document.documentElement.scrollWidth > window.innerWidth;
          });
          expect(hasHorizontalScrollbar).toBe(false);

          // 3. Verify Text Readability (No text elements horizontal overflow)
          const overflowingTextElements = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, p'));
            return elements
              .map(el => {
                const rect = el.getBoundingClientRect();
                const isOverflowing = rect.right > window.innerWidth + 2 || rect.left < -2;
                return isOverflowing ? `${el.tagName}: "${el.textContent?.trim().substring(0, 30)}..."` : null;
              })
              .filter(Boolean);
          });
          expect(overflowingTextElements).toEqual([]);

          // 4. Mobile Sidebar Transforms and Backdrop Checks (for viewports < 1024px)
          if (device.width < 1024 && pageInfo.authenticated) {
            const headerMenuBtn = page.locator('header button').first();
            await expect(headerMenuBtn).toBeVisible();

            const sidebar = page.locator('aside');
            
            // Initially Sidebar should be positioned off-screen (translateX = -100%)
            const initialSidebarBox = await sidebar.boundingBox();
            if (initialSidebarBox) {
              expect(initialSidebarBox.x).toBeLessThan(0);
            }

            // Wait for hydration/settling
            await page.waitForTimeout(1000);

            // Click menu button in header to open sidebar drawer
            await headerMenuBtn.click();
            await page.waitForTimeout(300); // Wait for transform transition

            // Sidebar should now be on-screen (translateX = 0)
            const openedSidebarBox = await sidebar.boundingBox();
            expect(openedSidebarBox?.x).toBe(0);

            // Backdrop should be visible
            const backdrop = page.locator('div.bg-charcoal\\/40');
            await expect(backdrop).toBeVisible();

            // Click backdrop to close sidebar drawer
            await backdrop.click({ force: true });
            await page.waitForTimeout(300); // Wait for transition
            await expect(backdrop).toBeHidden();
            
            // Sidebar is moved back off-screen
            const closedSidebarBox = await sidebar.boundingBox();
            if (closedSidebarBox) {
              expect(closedSidebarBox.x).toBeLessThan(0);
            }
          }

          // 5. Dashboard Stats Layout Stacking Checks
          if (pageInfo.path === '/' && pageInfo.authenticated) {
            // Check that dashboard metric stats cards are visible
            const statsCards = page.locator('div.bg-white.rounded-3xl.p-6'); // Stats cards selector
            if (await statsCards.count() > 1) {
              const firstCard = statsCards.nth(0);
              const secondCard = statsCards.nth(1);
              const box1 = await firstCard.boundingBox();
              const box2 = await secondCard.boundingBox();
              
              if (box1 && box2) {
                if (device.width < 768) {
                  // On mobile viewports, cards should stack vertically
                  expect(box2.y).toBeGreaterThanOrEqual(box1.y + box1.height - 10);
                }
              }
            }
          }

          // 6. Touch Target Dimensions (buttons, links, select actions >= 44x44px)
          const smallTouchTargets = await page.evaluate(() => {
            const targets = Array.from(document.querySelectorAll('button, a, input, select'));
            return targets
              .map(el => {
                const rect = el.getBoundingClientRect();
                return {
                  tag: el.tagName,
                  classes: el.className,
                  text: el.textContent?.trim().substring(0, 15) || el.getAttribute('aria-label') || '',
                  width: rect.width,
                  height: rect.height
                };
              })
              .filter(t => t.width > 0 && t.height > 0 && (t.width < 44 || t.height < 44))
              .filter(t => {
                // Ignore small inline icons, table sorting filters or inline pagination indicators if any
                if (t.text === '' && t.width < 32) return false;
                if (t.classes.includes('inline') || t.classes.includes('text-xs')) return false;
                return true;
              });
          });
          if (smallTouchTargets.length > 0) {
            console.log(`[Device: ${device.name} - Page: ${pageInfo.name}] Touch target size warnings:`, smallTouchTargets);
          }

          // 7. Touch Target Spacing spacing >= 8px
          const touchSpacingViolations = await page.evaluate(() => {
            const targets = Array.from(document.querySelectorAll('button, a, input, select'));
            const violations = [];
            
            for (let i = 0; i < targets.length; i++) {
              const rectA = targets[i].getBoundingClientRect();
              if (rectA.width === 0 || rectA.height === 0) continue;
              
              for (let j = i + 1; j < targets.length; j++) {
                const rectB = targets[j].getBoundingClientRect();
                if (rectB.width === 0 || rectB.height === 0) continue;
                
                const isHorizontalOverlap = rectA.left < rectB.right && rectA.right > rectB.left;
                const isVerticalOverlap = rectA.top < rectB.bottom && rectA.bottom > rectB.top;
                
                let distance = -1;
                if (isHorizontalOverlap && !isVerticalOverlap) {
                  distance = Math.min(Math.abs(rectA.bottom - rectB.top), Math.abs(rectB.bottom - rectA.top));
                } else if (isVerticalOverlap && !isHorizontalOverlap) {
                  distance = Math.min(Math.abs(rectA.right - rectB.left), Math.abs(rectB.right - rectA.left));
                } else if (!isHorizontalOverlap && !isVerticalOverlap) {
                  const dx = Math.min(Math.abs(rectA.right - rectB.left), Math.abs(rectB.right - rectA.left));
                  const dy = Math.min(Math.abs(rectA.bottom - rectB.top), Math.abs(rectB.bottom - rectA.top));
                  distance = Math.sqrt(dx * dx + dy * dy);
                }
                
                if (distance > 0 && distance < 8) {
                  const parentA = targets[i].parentElement;
                  const parentB = targets[j].parentElement;
                  
                  // Ignore segmented switch controls, list tags or side by side modal action groups that legitimately share borders
                  if (parentA === parentB && parentA?.classList.contains('flex') && 
                      (parentA?.classList.contains('glass') || parentA?.classList.contains('rounded-xl') || parentA?.classList.contains('gap-0'))) {
                    continue;
                  }
                  
                  violations.push({
                    elA: `${targets[i].tagName} ("${targets[i].textContent?.trim().substring(0, 10)}")`,
                    elB: `${targets[j].tagName} ("${targets[j].textContent?.trim().substring(0, 10)}")`,
                    distance: Math.round(distance * 100) / 100
                  });
                }
              }
            }
            return violations;
          });
          if (touchSpacingViolations.length > 0) {
            console.log(`[Device: ${device.name} - Page: ${pageInfo.name}] Touch spacing warnings:`, touchSpacingViolations);
          }
        });
      }
    });
  }
});
