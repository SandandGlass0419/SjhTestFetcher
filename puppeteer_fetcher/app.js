import puppeteer from 'puppeteer';
import { config } from 'dotenv';
import './fetcher.js';

config({ quiet: true });
const userId = process.env.USER_ID;
const password = process.env.PASSWORD;

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

async function login(userId, password) {
    await page.goto('https://seoulsejong.sen.hs.kr', { waitUntil: 'networkidle2' });
    
    await page.evaluate(() => memberLoginForm());
    
    await page.waitForSelector('.member_login_box');

    await page.locator('#userId').fill(userId);
    await page.locator('#password').fill(password);
    await page.locator('.member_join').click();

    await page.waitForNetworkIdle({ waitUntil: 'networkidle2' });
}

await login(userId, password);


