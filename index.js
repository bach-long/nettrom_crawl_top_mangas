const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
// URL của trang web chứa danh sách các ảnh

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const axios_instance = axios.create({
  httpAgent: {
      keepAlive: true,
      maxSockets: Infinity,
  },
  headers: {
      'Accept-Encoding': 'gzip',
      'Cookie': '',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
  },
});


axios_instance.defaults.httpAgent.keepAlive = true;
axios_instance.defaults.httpAgent.maxSockets = Infinity;
axios_instance.defaults.headers.common['Accept-Encoding'] = 'gzip';
axios_instance.defaults.timeout = 30000;

const headers = {
  Referer: 'https://nettruyenco.vn/'
}

//console.log(axios_instance.defaults)

const downloadDirectory = 'manga_data'; // Thay đổi đường dẫn nếu cần

// Tạo thư mục nếu nó chưa tồn tại
if (!fs.existsSync(downloadDirectory)) {
  fs.mkdirSync(downloadDirectory);
}

const mangas = [];

const getData = async () => {
  try {
    for (let i = 1; i <= 5; i++) {
      let response
      try {
        response = await axios_instance.get(`https://nettruyenco.vn/tim-truyen?status=-1&sort=10&page=${i}`);
      } catch (error) {
        let cf_clearance = await new Promise((resolve) => {
          rl.question('Nhập cookie vào đây: ', (input) => {
            resolve(input.trim());
          });
        });

        axios_instance.defaults.headers['Cookie'] = `cf_clearance=${cf_clearance};`;
        console.log(axios_instance.defaults.headers.common);
        response = await axios_instance.get(`https://nettruyenco.vn/tim-truyen?status=-1&sort=10&page=${i}`);
      }
      if (response.status === 200) {
        const html = response.data;
        const $ = cheerio.load(html);

        const mangaPromises = [];

        $('div.image > a').each((_idx, manga) => {
          const info = {
            link: $(manga).attr('href'),
            name: $(manga).attr('title'),
            folder: `downloadDirectory/${$(manga).attr('href').split('/').slice(-1)[0]}`,
            thumbnail: $(manga).children().first().attr('src'),
            chapters: []
          };
          mangaPromises.push(getDetail(info));
        });

        await Promise.all(mangaPromises);
      }
    }
  } catch (error) {
    console.error(`Lỗi khi truy cập trang web: ${error.message}`);
  }
};

const getDetail = async (manga) => {
  try {
    let response
    try {
      response = await axios_instance.get(manga.link);
    } catch (error) {
      let cf_clearance = await new Promise((resolve) => {
        rl.question('Nhập cookie vào đây: ', (input) => {
          resolve(input.trim());
        });
      });
      console.log(cf_clearance);
      axios_instance.defaults.headers['Cookie'] = `cf_clearance=${cf_clearance};`;
      response = await axios_instance.get(manga.link);
    }
    const $ = cheerio.load(response.data);

    manga.describtion = $('.detail-content > p').first().text();
    manga.status = $('.status.row > .col-xs-8').first().text();
    manga.author = $('.author.row > .col-xs-8').first().text();
    manga.categories = []
    $('.kind.row > .col-xs-8 > a').each((_idx, el) => {
      manga.categories.push($(el).text());
    })

    $('.col-xs-5.chapter > a').each((_idx, el) => {
      manga.chapters.push({
        name: $(el).text(),
        link: $(el).attr('href')
      });
    });

    mangas.push(manga);
  } catch (error) {
    console.error(`Lỗi khi lấy chi tiết truyện: ${error.message}`);
  }
};

const getResults = async () => {
  await getData();

  //console.log(mangas[0]);
  // for(i = 0; i < mangas.length; ++i) {
  //   await extract_image(mangas[i])
  // }

  fs.writeFile('mangas.json', JSON.stringify(mangas), (err) => {
    if(err) {
        console.error(err); return;
    } else {
        console.log('created mangas json file');
        console.log(mangas.length);
    }
  });
  rl.close();
};

const extract_image = async (manga) => {
  console.log(manga.chapters.length)
  manga_folder = path.join(downloadDirectory, manga.link.split('/').slice(-1)[0]);
  if (!fs.existsSync(manga_folder)) {
      fs.mkdirSync(manga_folder);
  }

  for (let i = 1; i < manga.chapters.length; ++i) {
      const chapter = manga.chapters[i];
      const { data } = await axios_instance.get(chapter.link)
      $ = cheerio.load(data);
      const promises = [];
      $('.page-chapter > img').each((_idx, img) => {
          promises.push(downloadImage(_idx, chapter.link.split('/').slice(-2)[0], $(img).attr('src'), $(img).attr('data-sv2'), manga_folder))
      })
      await Promise.all(promises);
  }
}

const downloadImage = async (id, chapter, image, backup_image, manga_folder) => {
  try {
    let response
    try {
      response = await axios_instance.get(image, {
        responseType: 'arraybuffer',
        headers: headers, // Sử dụng header "Referer"
      });
    } catch (error) {
      console.log("Link lỗi, dùng link backup ...")
      response = await axios_instance.get(backup_image, {
        responseType: 'arraybuffer',
        headers: headers, // Sử dụng header "Referer"
      });
    }

    const fileName = `${chapter}_${id}.jpg`; // Đặt tên cho ảnh tải về
    const folder = path.join(manga_folder, chapter)
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
    const filePath = path.join(folder, fileName);
    fs.writeFileSync(filePath, Buffer.from(response.data));
    console.log(`Đã tải xuống và lưu vào ${filePath}`);
  } catch (error) {
    console.error(`Lỗi khi tải xuống ảnh: ${error.message} với đường link ${image}`);
  }
}

getResults()
