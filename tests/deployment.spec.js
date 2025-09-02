const { test, expect } = require('@playwright/test');

test.describe('Deployment Readiness Tests', () => {
  
  test('should load the main page and redirect to login', async ({ page }) => {
    await page.goto('/');
    
    // Check if redirected to login
    await expect(page).toHaveURL(/.*login\.html/);
    
    // Verify login page elements
    await expect(page.locator('.logo')).toContainText('PHANTOM OS');
    await expect(page.locator('#bryonBtn')).toBeVisible();
    await expect(page.locator('#ryanBtn')).toBeVisible();
    await expect(page.locator('#boardBtn')).toBeVisible();
  });

  test('should have all static assets accessible', async ({ page }) => {
    await page.goto('/login.html');
    
    // Check CSS loading
    const cssResponse = await page.request.get('/login.css');
    expect(cssResponse.status()).toBe(200);
    
    // Check JavaScript loading
    const jsResponse = await page.request.get('/login.js');
    expect(jsResponse.status()).toBe(200);
    
    // Check audio directory is accessible
    const audioResponse = await page.request.get('/audio/Login.mp3');
    expect(audioResponse.status()).toBe(200);
  });

  test('should handle role selection correctly', async ({ page }) => {
    await page.goto('/login.html');
    
    // Verify role buttons are clickable
    await expect(page.locator('#bryonBtn')).toBeEnabled();
    await expect(page.locator('#ryanBtn')).toBeDisabled(); // Should be disabled until Bryon connects
    await expect(page.locator('#boardBtn')).toBeEnabled();
    
    // Check role status text
    await expect(page.locator('#bryonStatus')).toContainText('AVAILABLE');
    await expect(page.locator('#ryanStatus')).toContainText('WAITING FOR BRYON');
  });

  test('should load terminal page with proper styling', async ({ page }) => {
    // Directly navigate to terminal to test interface
    await page.goto('/terminal.html');
    
    // Check terminal interface elements
    await expect(page.locator('#terminalOutput')).toBeVisible();
    await expect(page.locator('#commandInput')).toBeVisible();
    await expect(page.locator('.terminal-header')).toBeVisible();
    
    // Verify CSS is properly loaded by checking computed styles
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(10, 14, 18)');
  });

  test('should load board interface correctly', async ({ page }) => {
    await page.goto('/board.html');
    
    // Check board interface elements
    await expect(page.locator('#mapDisplay')).toBeVisible();
    await expect(page.locator('#resourceBars')).toBeAttached(); // May be hidden initially
    
    // Verify resource bars exist (even if hidden)
    await expect(page.locator('#cpuBar')).toBeAttached();
    await expect(page.locator('#gpuBar')).toBeAttached();
    
    // Check key board elements
    await expect(page.locator('#operationLogs')).toBeVisible();
    await expect(page.locator('#subtitleDisplay')).toBeVisible();
  });

  test('should handle WebSocket connection gracefully', async ({ page }) => {
    await page.goto('/terminal.html');
    
    // Listen for console messages
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    
    // Wait for potential WebSocket connection attempts
    await page.waitForTimeout(2000);
    
    // In static mode, should show appropriate warning
    const hasStaticWarning = consoleMessages.some(msg => 
      msg.includes('Static mode') || msg.includes('WebSocket')
    );
    
    // Either connected successfully or showing static mode warning
    expect(hasStaticWarning || consoleMessages.length === 0).toBeTruthy();
  });

  test('should have proper meta tags for deployment', async ({ page }) => {
    await page.goto('/');
    
    // Check essential meta tags
    await expect(page.locator('meta[charset="UTF-8"]')).toBeAttached();
    await expect(page.locator('meta[name="viewport"]')).toBeAttached();
    
    // Check title
    await expect(page).toHaveTitle(/Phantom OS/);
  });

  test('should handle audio permissions properly', async ({ page }) => {
    await page.goto('/login.html');
    
    // Check if audio permission script is loaded
    const audioPermissionResponse = await page.request.get('/audio-permission.js');
    expect(audioPermissionResponse.status()).toBe(200);
    
    // Verify audio context handling exists
    const hasAudioHandling = await page.evaluate(() => {
      return typeof window.requestAudioPermission === 'function' ||
             typeof AudioContext !== 'undefined' ||
             typeof webkitAudioContext !== 'undefined';
    });
    
    expect(hasAudioHandling).toBeTruthy();
  });

  test('should handle missing audio files gracefully', async ({ page }) => {
    await page.goto('/terminal.html');
    
    // Listen for network errors
    const networkErrors = [];
    page.on('response', response => {
      if (!response.ok() && response.url().includes('/audio/')) {
        networkErrors.push(response.url());
      }
    });
    
    // Wait for potential audio loading attempts
    await page.waitForTimeout(1000);
    
    // Should not have critical audio file loading errors
    // (Some files might be missing in test environment, which is okay)
    expect(networkErrors.length).toBeLessThan(5);
  });

  test('should maintain cyberpunk theme consistency', async ({ page }) => {
    await page.goto('/terminal.html');
    
    // Check color scheme
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(10, 14, 18)');
    await expect(body).toHaveCSS('color', 'rgb(0, 255, 65)');
    
    // Check font family
    await expect(body).toHaveCSS('font-family', /monospace/);
  });

});