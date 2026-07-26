const fs = require('node:fs/promises');
const path = require('node:path');
const { By, until } = require('selenium-webdriver');

function xpathLiteral(value) {
  if (!value.includes("'")) {
    return `'${value}'`;
  }
  if (!value.includes('"')) {
    return `"${value}"`;
  }
  return `concat('${value.replace(/'/g, `',"'",'`)}')`;
}

class BasePage {
  constructor(driver, baseUrl) {
    this.driver = driver;
    this.baseUrl = baseUrl;
  }

  buildUrl(route) {
    if (route === '/') {
      return this.baseUrl;
    }
    return new URL(route.replace(/^\//, ''), this.baseUrl).toString();
  }

  async open(route) {
    const target = this.buildUrl(route);
    await this.driver.get(target);
    await this.driver.wait(async () => {
      const state = await this.driver.executeScript('return document.readyState');
      return state === 'complete' || state === 'interactive';
    }, 30000);
  }

  async waitForText(text, timeout = 15000) {
    const locator = By.xpath(`//*[contains(normalize-space(.), ${xpathLiteral(text)})]`);
    const element = await this.driver.wait(until.elementLocated(locator), timeout);
    await this.driver.wait(until.elementIsVisible(element), timeout);
    return element;
  }

  async hasText(text) {
    const elements = await this.driver.findElements(By.xpath(`//*[contains(normalize-space(.), ${xpathLiteral(text)})]`));
    return elements.length > 0;
  }

  async clickText(text) {
    const element = await this.waitForText(text);
    await element.click();
  }

  async currentPath() {
    return new URL(await this.driver.getCurrentUrl()).pathname;
  }

  async takeScreenshot(filePath) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const screenshot = await this.driver.takeScreenshot();
    await fs.writeFile(filePath, screenshot, 'base64');
  }
}

class HomePage extends BasePage {
  async verify() {
    await this.waitForText('LEXAI');
    await this.waitForText('Smart counsel for every document.');
    await this.waitForText('DraftCounsel');
    await this.waitForText('Upload PDF');
    return true;
  }
}

class UploadPage extends BasePage {
  async verify() {
    await this.waitForText('Analyse Document');
    await this.waitForText('DOCUMENT ANALYSIS');
    await this.waitForText('Browse Files');
    return true;
  }
}

class VaultPage extends BasePage {
  async verify() {
    await this.waitForText('LexVault');
    await this.waitForText('Secure document vault for legal professionals');
    await this.waitForText('Sign In');
    await this.waitForText('Create Account');
    return true;
  }
}

class MootPage extends BasePage {
  async verify() {
    await this.waitForText('LexAI Moot');
    await this.waitForText('AI Moot Court Simulator');
    await this.waitForText('Upload Document');
    return true;
  }
}

class ExplorePage extends BasePage {
  async verify() {
    await this.waitForText('Explore');
    await this.waitForText('File-based routing');
    await this.waitForText('Android, iOS, and web support');
    return true;
  }
}

module.exports = {
  BasePage,
  HomePage,
  UploadPage,
  VaultPage,
  MootPage,
  ExplorePage,
};
