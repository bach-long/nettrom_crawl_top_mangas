const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const categories = [];

const getCategories = async () => {
  const response = await axios.get(`https://nettruyenco.vn/tim-truyen?status=-1&sort=10&page=1`);
  $ = await cheerio.load(response.data);
  $('#ctl00_divRight .ModuleContent > ul > li > a').each((_idx, el) => {
    categories.push($(el).text());
    //console.log(categories)
  })
}

const getResults = async () => {
  await getCategories();

  fs.writeFile('categories.json', JSON.stringify(categories.slice(1)), (err) => {
    if(err) {
        console.error(err); return;
    } else {
        console.log('created categories json file');
        console.log(categories.length);
    }
  });
}

getResults()
