const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const placeUrl =
  "https://www.google.com/maps/place/Victoria+Memorial/@22.5352976,88.331138,15z/data=!4m5!3m4!1s0x3a02771346ae015d:0xb540e4bce39763!8m2!3d22.5448082!4d88.3425578";

async function fillPlaceInfo(page) {
  const dataFromPage = await page.evaluate(() => {
    return {
      title: document.querySelector(".DUwDvf").textContent.trim(),
      rating: document.querySelector("div.F7nice").textContent.trim(),
      reviews: document.querySelector("span.F7nice").textContent.trim().split(" ")[0],
      price: document.querySelector(".mgr77e > span:last-child > span:nth-child(2)").textContent.trim(),
      type: document.querySelector(".skqShb > div:nth-child(2)")?.textContent.replaceAll("·", "").trim(),
      description: document.querySelector(".PYvSYb")?.textContent.replaceAll("·", "").trim(),
      serviceOptions: document.querySelector(".E0DTEd")?.textContent.replaceAll("·", "").trim(),
      address: document.querySelector("button[data-item-id='address']")?.textContent.trim(),
      hours: Array.from(document.querySelectorAll(".OqCZI tr")).map((el) => {
        return {
          [el.querySelector("td:first-child")?.textContent.trim()]: el.querySelector("td:nth-child(2)")?.getAttribute("aria-label"),
        };
      }),
      menuLink: document.querySelector("a.CsEnBe[aria-label='Menu']")?.getAttribute["href"], 
      website: document.querySelector("a.CsEnBe[data-tooltip='Open website']")?.getAttribute("href"), 
      phone: document.querySelector(".RcCsl > button[data-tooltip='Copy phone number']")?.textContent.trim(), 
      plusCode: document.querySelector(".RcCsl > button[data-tooltip='Copy plus code']")?.textContent.trim(), 
      popularTimes: {
        graphResults: Array.from(document.querySelectorAll(".C7xf8b > div")).reduce((acc, el, i) => {
          let day;
          switch (i) {
            case 0:
              day = "sunday";
              break;
            case 1:
              day = "monday";
              break;
            case 2:
              day = "tuesday";
              break;
            case 3:
              day = "wednesday";
              break;
            case 4:
              day = "thursday";
              break;
            case 5:
              day = "friday";
              break;
            case 6:
              day = "saturday";
              break;
          }
          return {
            ...acc,
            [day]: Array.from(el.querySelectorAll(`:nth-child(${i + 1}) [aria-label]`)).map((el) => {
              const timeString = el.getAttribute("aria-label");
              const timeStart = timeString.indexOf("at");
              const scoreEnd = timeString.indexOf("%");
              const time = timeString.slice(timeStart + 3, -1);
              const busynessScore = timeString.slice(0, scoreEnd + 1);
              return {
                time,
                busynessScore,
              };
            }),
          };
        }, {}),
        liveHash: document.querySelector(".UgBNB")?.textContent.trim(),
      },
      images: Array.from(document.querySelectorAll(".KoY8Lc")).map((el) => {
        return {
          title: el.textContent?.trim(),
          thumbnail: el.parentElement.querySelector("img")?.getAttribute("src"),
        };
      }),
      userReviews: {
        summary: Array.from(document.querySelectorAll(".tBizfc")).map((el) => {
          return {
            snippet: el.querySelector(" .OXD3gb > div")?.textContent.replaceAll('"', "").trim(),
          };
        }),
        mostRelevant: Array.from(document.querySelectorAll(".jftiEf")).map((el) => {
          return {
            username: el.querySelector(".d4r55")?.textContent.trim(),
            rating: parseFloat(el.querySelector(".kvMYJc")?.getAttribute("aria-label")),
            description: el.querySelector(".MyEned")?.textContent.trim(),
            images: Array.from(el.querySelectorAll(".KtCyie button")).length
              ? Array.from(el.querySelectorAll(".KtCyie button")).map((el) => {
                  return {
                    thumbnail: getComputedStyle(el).backgroundImage.slice(5, -2),
                  };
                })
              : undefined,
            date: el.querySelector(".rsqaWe")?.textContent.trim(),
          };
        }),
      },
      peopleAlsoSearch: Array.from(document.querySelectorAll(".Ymd7jc")).map((el) => {
        return {
          title: el.querySelector(".GgK1If")?.textContent.trim(),
          rating: el.querySelector(".MW4etd")?.textContent.trim(),
          reviews: el.querySelector(".UY7F9")?.textContent.trim().slice(1, -1),
          type: el.querySelector("div.Q5g20")?.textContent.trim(),
          thumbnail: el.querySelector(".W7kqEc")?.getAttribute("src"),
        };
      }),
    };
  });
  return dataFromPage;
}

async function getLocalPlaceInfo() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setDefaultNavigationTimeout(60000);
  await page.goto(placeUrl);
  await page.waitForNavigation();

  const placeInfo = await fillPlaceInfo(page);

  await page.click(".Dx2nRe");
  await page.waitForTimeout(2000);

  placeInfo.photosLink = page.url();

  const urlPattern = /!1s(?<id>[^!]+).+!3d(?<latitude>[^!]+)!4d(?<longitude>[^!]+)/gm; 
  placeInfo.dataId = [...placeUrl.matchAll(urlPattern)].map(({ groups }) => groups.id)[0];
  const latitude = [...placeUrl.matchAll(urlPattern)].map(({ groups }) => groups.latitude)[0];
  const longitude = [...placeUrl.matchAll(urlPattern)].map(({ groups }) => groups.longitude)[0];
  placeInfo.gpsCoordinates = {
    latitude,
    longitude,
  };
  placeInfo.placeUrl = placeUrl;
  await browser.close();

  return placeInfo;
}

getLocalPlaceInfo().then((result) => console.dir(result, { depth: null }));
