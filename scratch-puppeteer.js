import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:5174/#preview', { waitUntil: 'networkidle2' });
  
  console.log("Page loaded. Body text:", await page.evaluate(() => document.body.innerText.slice(0, 100)));
  
  // Try clicking Start Camera
  const startBtn = await page.$x("//button[contains(text(), 'Start Camera')]");
  if (startBtn.length > 0) {
    console.log("Clicking Start Camera...");
    await startBtn[0].click();
    await new Promise(r => setTimeout(r, 1000));
    console.log("After click body:", await page.evaluate(() => document.body.innerText.slice(0, 100)));
  } else {
    console.log("Start Camera button not found!");
  }

  await browser.close();
})();
