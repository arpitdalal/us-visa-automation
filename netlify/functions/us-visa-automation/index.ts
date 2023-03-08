import { config } from 'dotenv';
// import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import puppeteer, { Browser } from 'puppeteer-core';

import { Handler } from '@netlify/functions';
import chromium from '@sparticuz/chromium';

import { IUser } from '../../../models/user';

config();

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BROWSERLESS_API_KEY: string;
      NODEMAILER_HOST: string;
      NODEMAILER_PASSWORD: string;
      NODEMAILER_USER: string;
      CRON_JOB_API_KEY: string;
      MONGODB_URI: string;
    }
  }
}

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const transporter = nodemailer.createTransport(
  `smtps://${process.env.NODEMAILER_USER}:${process.env.NODEMAILER_PASSWORD}@${process.env.NODEMAILER_HOST}`
);
const cronJobApiBaseUrl = "https://api.cron-job.org/";

const getBrowser = async () => {
  if (IS_PRODUCTION) {
    // return puppeteer.connect({
    //   browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_API_KEY}`,
    // });
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
  }
  return puppeteer.launch({
    product: "chrome",
    headless: true,
    executablePath: "/usr/bin/google-chrome-stable",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--headless",
      "--disable-gpu",
      "--disable-dev-shm-usage",
    ],
    ignoreDefaultArgs: ["--disable-extensions"],
  });
};

// mongoose.connect(process.env.MONGODB_URI);
// const db = mongoose.connection;
// db.on("error", console.error.bind(console, "connection error: "));
// db.once("open", function () {
//   console.log("Connected successfully");
// });

const handler: Handler = async (event) => {
  // if (!event.queryStringParameters || !event.queryStringParameters.email) {
  //   return {
  //     statusCode: 400,
  //     body: "Error: Email is required",
  //   };
  // }

  // const email = event.queryStringParameters.email;

  // const user = await User.findOne({ email });
  // if (!user) {
  //   return {
  //     statusCode: 404,
  //     body: "Error: User with this email does not exist",
  //   };
  // }

  const user = {
    username: "yashpanwala1996@gmail.com",
    password: "Y@shPan1996",
    email: "arpitdalalm@gmail.com",
    jobId: "",
    date: "",
  };

  return await runJob(user);

  // return {
  //   statusCode: 200,
  //   body: "Done",
  // };
};

async function runJob(user: IUser) {
  console.log("Run Job");
  const { email, username, password, date, jobId } = user;
  let availableDates = await getAvailableDates(username, password);
  console.log("Available dates");

  if (availableDates.error || !availableDates.data) {
    return {
      statusCode: 400,
      body: availableDates.error.toString() || "Something went wrong",
    };
  }

  let { calgary, halifax, montreal, ottawa, quebec, toronto, vancouver } =
    availableDates.data;

  if (date) {
    const desiredDate = new Date(date);

    toronto.map((tempDate) => {
      if (!(new Date(tempDate) < desiredDate)) {
        toronto = [];
      }
    });
    vancouver.map((tempDate) => {
      if (!(new Date(tempDate) < desiredDate)) {
        vancouver = [];
      }
    });
    quebec.map((tempDate) => {
      if (!(new Date(tempDate) < desiredDate)) {
        quebec = [];
      }
    });
    ottawa.map((tempDate) => {
      if (!(new Date(tempDate) < desiredDate)) {
        ottawa = [];
      }
    });
    montreal.map((tempDate) => {
      if (!(new Date(tempDate) < desiredDate)) {
        montreal = [];
      }
    });
    halifax.map((tempDate) => {
      if (!(new Date(tempDate) < desiredDate)) {
        halifax = [];
      }
    });
    calgary.map((tempDate) => {
      if (!(new Date(tempDate) < desiredDate)) {
        calgary = [];
      }
    });
  }

  if (
    !(toronto.length > 0) &&
    !(vancouver.length > 0) &&
    !(ottawa.length > 0) &&
    !(quebec.length > 0) &&
    !(montreal.length > 0) &&
    !(halifax.length > 0) &&
    !(calgary.length > 0)
  ) {
    return {
      statusCode: 200,
      body: "No dates available",
    };
  }

  const message = createMessage(
    toronto,
    calgary,
    halifax,
    montreal,
    ottawa,
    quebec,
    vancouver
  );

  console.log("message created");

  return await sendEmail(message, email)
    .then(() => {
      console.log("send email done");
      return {
        statusCode: 200,
        body: "Notification sent",
      };
    })
    .catch((error) => {
      // SEND AN EMAIL ABOUT THE ERROR TO ARPITDALALM@GMAIL.COM
      const messageOptions = {
        from: "arpitdalalm@gmail.com",
        to: "arpitdalalm@gmail.com",
        subject: "ERROR MESSAGE FROM US VISA BOT",
        text: `Couldn't send the the notification to ${email}! \n\nERROR: ${error}!`,
      };
      transporter.sendMail(messageOptions, (err) => {
        if (err) {
          console.log(`Email error: ${err}`);
        }
      });
      return {
        statusCode: 400,
        body: `Error: ${error.toString()}`,
      };
    });
}

async function getAvailableDates(username: string, password: string) {
  let browser: Browser | null = null;

  try {
    browser = await getBrowser();
    console.log("browser", browser);
    const page = await browser.newPage();
    console.log("page", page);
    await page.goto("https://ais.usvisa-info.com/en-ca/niv/users/sign_in");
    console.log("goto");
    await page.waitForSelector("#user_email");
    await page.waitForSelector("#user_password");
    await page.waitForSelector("#policy_confirmed");
    await page.type("#user_email", username);
    await page.type("#user_password", password);
    await page.evaluate(() => {
      document?.querySelector<HTMLElement>("#policy_confirmed")?.click();
    });
    await page.evaluate(() => {
      document?.querySelector<HTMLElement>("input[type='submit']")?.click();
    });
    console.log("signin");
    await page.waitForSelector("[role='menuitem'] > .button.primary.small");
    await page.evaluate(() => {
      document
        ?.querySelector<HTMLElement>(
          "[role='menuitem'] > .button.primary.small"
        )
        ?.click();
    });
    await page.waitForSelector("#main");
    const url = page.url();
    const id = url.replace(/\D/g, "");
    console.log("got id");

    // Calgary
    await page.goto(
      `https://ais.usvisa-info.com/en-ca/niv/schedule/${id}/appointment/days/89.json?appointments[expedite]=false`
    );
    await page.waitForSelector("body > pre");
    const calData = (await page
      .$eval("body > pre", (e) => e.innerText)
      .catch((err) => {
        console.log(err);
      })) as string;
    const calJson = JSON.parse(calData);
    let calgary = calJson.map((item) => item.date) as string[];
    console.log("got calgary");

    // Halifax
    await page.goto(
      `https://ais.usvisa-info.com/en-ca/niv/schedule/${id}/appointment/days/90.json?appointments[expedite]=false`
    );
    await page.waitForSelector("body > pre");
    const halData = (await page
      .$eval("body > pre", (e) => e.innerText)
      .catch((err) => {
        console.log(err);
      })) as string;
    const halJson = JSON.parse(halData);
    let halifax = halJson.map((item) => item.date) as string[];
    console.log("got halifax");

    // Montreal
    await page.goto(
      `https://ais.usvisa-info.com/en-ca/niv/schedule/${id}/appointment/days/91.json?appointments[expedite]=false`
    );
    await page.waitForSelector("body > pre");
    const monData = (await page
      .$eval("body > pre", (e) => e.innerText)
      .catch((err) => {
        console.log(err);
      })) as string;
    const monJson = JSON.parse(monData);
    let montreal = monJson.map((item) => item.date) as string[];
    console.log("got montreal");

    // Ottawa
    await page.goto(
      `https://ais.usvisa-info.com/en-ca/niv/schedule/${id}/appointment/days/92.json?appointments[expedite]=false`
    );
    await page.waitForSelector("body > pre");
    const ottData = (await page
      .$eval("body > pre", (e) => e.innerText)
      .catch((err) => {
        console.log(err);
      })) as string;
    const ottJson = JSON.parse(ottData);
    let ottawa = ottJson.map((item) => item.date) as string[];
    console.log("got ottawa");

    // Quebec
    await page.goto(
      `https://ais.usvisa-info.com/en-ca/niv/schedule/${id}/appointment/days/93.json?appointments[expedite]=false`
    );
    await page.waitForSelector("body > pre");
    const queData = (await page
      .$eval("body > pre", (e) => e.innerText)
      .catch((err) => {
        console.log(err);
      })) as string;
    const queJson = JSON.parse(queData);
    let quebec = queJson.map((item) => item.date) as string[];
    console.log("got quebec");

    // Toronto
    await page.goto(
      `https://ais.usvisa-info.com/en-ca/niv/schedule/${id}/appointment/days/94.json?appointments[expedite]=false`
    );
    await page.waitForSelector("body > pre");
    const torData = (await page
      .$eval("body > pre", (e) => e.innerText)
      .catch((err) => {
        console.log(err);
      })) as string;
    const torJson = JSON.parse(torData);
    let toronto = torJson.map((item) => item.date) as string[];
    console.log("got toronto");

    // Vancouver
    await page.goto(
      `https://ais.usvisa-info.com/en-ca/niv/schedule/${id}/appointment/days/95.json?appointments[expedite]=false`
    );
    await page.waitForSelector("body > pre");
    const vanData = (await page
      .$eval("body > pre", (e) => e.innerText)
      .catch((err) => {
        console.log(err);
      })) as string;
    const vanJson = JSON.parse(vanData);
    let vancouver = vanJson.map((item) => item.date) as string[];
    console.log("got vancouver");

    return {
      data: {
        calgary,
        halifax,
        montreal,
        ottawa,
        quebec,
        toronto,
        vancouver,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function createMessage(
  toronto: string[],
  calgary: string[],
  halifax: string[],
  montreal: string[],
  ottawa: string[],
  quebec: string[],
  vancouver: string[]
) {
  let message = "<strong>📅 Available USA B1/B2 visa dates are: </strong>";
  if (toronto.length > 0) {
    message += `<br><br><strong>Toronto</strong><br>${toronto
      .toString()
      .replace(/,/g, ",<br>")}`;
  }
  if (calgary.length > 0) {
    message += `<br><br><strong>Calgary</strong><br>${calgary
      .toString()
      .replace(/,/g, ",<br>")}`;
  }
  if (halifax.length > 0) {
    message += `<br><br><strong>Halifax</strong><br>${halifax
      .toString()
      .replace(/,/g, ",<br>")}`;
  }
  if (montreal.length > 0) {
    message += `<br><br><strong>Montreal</strong><br>${montreal
      .toString()
      .replace(/,/g, ",<br>")}`;
  }
  if (ottawa.length > 0) {
    message += `<br><br><strong>Ottawa</strong><br>${ottawa
      .toString()
      .replace(/,/g, ",<br>")}`;
  }
  if (quebec.length > 0) {
    message += `<br><br><strong>Quebec</strong><br>${quebec
      .toString()
      .replace(/,/g, ",<br>")}`;
  }
  if (vancouver.length > 0) {
    message += `<br><br><strong>Vancouver</strong><br>${vancouver
      .toString()
      .replace(/,/g, ",<br>")}`;
  }
  return message;
}

function sendEmail(message: string, email: string) {
  return new Promise((resolve, reject) => {
    try {
      const messageOptions = {
        from: "arpitdalalm@gmail.com",
        to: email,
        subject: "Available USA B1/B2 visa dates",
        html: message,
      };
      transporter.sendMail(messageOptions, (err) => {
        if (err) {
          console.log(`Email error: ${err}`);
          reject(err);
        }
      });
      resolve("done!");
    } catch (error) {
      reject(error);
    }
  });
}

export { handler };
