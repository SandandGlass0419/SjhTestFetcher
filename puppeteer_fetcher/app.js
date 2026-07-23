import puppeteer, { Keyboard } from 'puppeteer';
import { config } from 'dotenv';

// config .env
config({ quiet: true });
const userId = process.env.USER_ID;
const password = process.env.PASSWORD;

// config puppeteer
const browser = await puppeteer.launch();
const page = await browser.newPage();

const mainPageURL = 'https://seoulsejong.sen.hs.kr';
const loginURL = 'https://seoulsejong.sen.hs.kr/dggb/cmm/actionLogin.do';   // you can't go directly using this url. must use memberLoginForm() in mainpage.
const testBankURL = 'https://seoulsejong.sen.hs.kr/41012/subMenu.do';

async function main() {
    await page.evaluate(() => console.log("aeou"));

    await goto(mainPageURL);

    if (!await login(userId, password)) {
        throw new Error('Failed to login! Recheck credentials please!');
    }

    await goto(testBankURL);

    await injectFetcher();

    let count = await getBoardListCount();
    // await needsUpdate('27314400');
    let fileData = await fetchFileData(5);

    let json = fileData ? exportJSON(fileData) : '';

    console.log(json);
}

async function goto(url) {
    await page.goto(url, { waitUntil: 'networkidle2' });
}

async function login(userId, password) {
    // navigate to login page and wait to load
    await page.evaluate(() => memberLoginForm());    
    await page.waitForSelector('.member_login_box');

    // enter login info and confirm
    await page.locator('#userId').fill(userId);
    await page.locator('#password').fill(password);
    await page.locator('.member_join').click();

    await page.waitForNavigation();

    return page.url != loginURL; // url when failed login
}

// injected script won't work if reloaded/site changes
async function injectFetcher() {
    await page.addScriptTag({ path: './fetcher.js' });
}

// use after injectFetcher()
async function getBoardListCount() {
    return await page.evaluate(() => getBoardListCount());
}

async function needsUpdate(latestNttId) {
    return await page.evaluate(latestNttId => needsUpdate(latestNttId), latestNttId);
}

async function fetchFileData(count) {
    return await page.evaluate(count => {
        let boardList = getBoardListBody(count);
        if (!boardList) return null;

        let idList = parseToIdList(boardList);
        if (!idList) return null;

        return getFileDataFromIdList(idList);
    }, count);
}

function exportJSON(fileData) {
    let withMetaData = { 
        date: new Date().toISOString(),
        latestNttId: fileData.length > 0 ? fileData[0].nttId : '',
        data: fileData
    }
  
    return JSON.stringify(withMetaData, null, 2);
}

await main();
await browser.close();