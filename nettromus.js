const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const http = require('http')
const HttpsProxyAgent = require('https-proxy-agent');
// URL của trang web chứa danh sách các ảnh

const httpsAgent = new HttpsProxyAgent.HttpsProxyAgent('http://127.0.0.1:8080');

const axios_instance = axios.create({
    httpAgent: new http.Agent({ keepAlive: true, maxSockets: Infinity }),
    //httpsAgent,
    headers: {
        'Accept-Encoding': 'gzip',
        'Cookie': '',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        'Referer': 'https://www.nettruyenus.com/'
    },
});

axios_instance.defaults.timeout = 30000;

const downloadDirectory = 'nettromus'; // Thay đổi đường dẫn nếu cần

// Tạo thư mục nếu nó chưa tồn tại
if (!fs.existsSync(downloadDirectory)) {
    fs.mkdirSync(downloadDirectory);
}

const mangas = [];

const getData = async () => {
    try {
        for (let i = 1; i <= 1; i++) {
            let response
            response = await axios_instance.get(`https://www.nettruyenus.com/tim-truyen?status=-1&sort=10&page=${i}`);

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

const getDataSpec = async (link) => {
    try {
        let response
        response = await axios_instance.get(link);
        const $ = cheerio.load(response.data);
        manga = {
            name: $('#item-detail > h1').first().text(),
            link: link,
            thumbnail: `https:${$('.col-xs-4.col-image > img').attr('src')}`,
            describtion: $('.detail-content > p').first().text(),
            status: $('.status.row > .col-xs-8').first().text(),
            author: $('.author.row > .col-xs-8').first().text().split(/, |; | - /),
            categories: [],
            chapters: [],
            folder: `${downloadDirectory}/${link.split('/').slice(-1)[0]}`.split('-').slice(0, -1).join('-'),
            other_names: $('.othername.row > .col-xs-8').length > 0 ? $('.othername.row > .col-xs-8').first().text().split(/, |; | - /) : []
        }
        $('.kind.row > .col-xs-8 > a').each((_idx, el) => {
            manga.categories.push($(el).text());
        })

        $('.col-xs-5.chapter > a').each((_idx, el) => {
            manga.chapters.push({
                folder: $(el).text().match(/(?<=Chapter )[+-]?([0-9]*[.])?[0-9]+/)[0],
                name: $(el).text(),
                link: $(el).attr('href')
            });
        });
        //console.log(manga)
        return manga
    } catch (error) {
        console.error(`Lỗi khi lấy chi tiết truyện: ${error.message}`);
        return
    }
}

const getDetail = async (manga) => {
    try {
        let response
        response = await axios_instance.get(manga.link);
        const $ = cheerio.load(response.data);
        if ($('.col-xs-5.chapter > a').length < 1200) {
            manga.description = $('.detail-content > p').first().text();
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
            console.log(manga);
        }
    } catch (error) {
        console.error(`Lỗi khi lấy chi tiết truyện: ${error.message}`);
    }
};

const getResults = async (link) => {
    console.log(`Lấy thông tin của: ${link}`);
    manga = await getDataSpec(link);
    //await extract_image(manga)

    // Phần này để lấy thông tin truyện
    let existingData = [];
    const filePath = 'nettromus.json';

    if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        //console.log(JSON.parse(fileContent));
        if (JSON.parse(fileContent) !== null) {
            existingData = JSON.parse(fileContent)
        };
    }

    existingData.push(manga);
    fs.writeFile(filePath, JSON.stringify(existingData), (err) => {
        if (err) {
            console.error(err); return;
        } else {
            console.log('created nettromus.json file');
        }
    });
};

const extract_image = async (manga) => {
    console.log(manga.chapters.length)
    manga_folder = path.join(downloadDirectory, manga.link.split('/').slice(-1)[0]).split('-').slice(0, -1).join('-');
    if (!fs.existsSync(manga_folder)) {
        fs.mkdirSync(manga_folder);
    }

    thumbnailLink = path.join(manga_folder, 'thumbnail.jpg');

    if (!fs.existsSync(thumbnailLink)) {
        try {
            response = await axios_instance.get(manga.thumbnail, {
                responseType: 'arraybuffer',
            });
            fs.writeFileSync(thumbnailLink, Buffer.from(response.data));
        } catch (error) {
            console.log(`Khong the lay thumbnail ${manga.thumbnail}`);
        }
        console.log(`Đã tải xuống và lưu vào ${thumbnail}`);
    }

    for (let i = 0; i < manga.chapters.length; ++i) {
        const chapter = manga.chapters[i];
        const chapterNumber = chapter.folder;

        const { data } = await axios_instance.get(chapter.link)
        $ = cheerio.load(data);
        const promises = [];
        $('.page-chapter > img').each((_idx, img) => {
            promises.push(downloadImage(_idx, chapterNumber, `https:${$(img).attr('data-original')}`, `https:${$(img).attr('data-cdn')}`, manga_folder))
        })
        await Promise.all(promises);
    }
}

const downloadImage = async (id, chapterNumber, image, backup_image, manga_folder) => {
    try {
        const fileName = `${id}.jpg`; // Đặt tên cho ảnh tải về
        const folder = path.join(manga_folder, chapterNumber)
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder);
        }
        const filePath = path.join(folder, fileName);
        let response
        if (!fs.existsSync(filePath)) {
            try {
                response = await axios_instance.get(image, {
                    responseType: 'arraybuffer',
                });
                fs.writeFileSync(filePath, Buffer.from(response.data));
            } catch (error) {
                console.log("Link lỗi, dùng link backup ...")
                response = await axios_instance.get(backup_image, {
                    responseType: 'arraybuffer',
                });
                fs.writeFileSync(filePath, Buffer.from(response.data));
            }
            console.log(`Đã tải xuống và lưu vào ${filePath}`);
        } else {
                console.log(`${filePath} đã tồn tại`);
        }
    } catch (error) {
        console.error(`Lỗi khi tải xuống ảnh: ${error.message} với đường link ${image}`);
    }
}

const LINKS1 = [
    "https://www.nettruyenus.com/truyen-tranh/doraemon-57230",
    "https://www.nettruyenus.com/truyen-tranh/thanh-guom-diet-quy-125230",
    "https://www.nettruyenus.com/truyen-tranh/lang-thanh-95992",
    "https://www.nettruyenus.com/truyen-tranh/shaman-phap-su-130550",
    "https://www.nettruyenus.com/truyen-tranh/chuyen-sinh-thanh-lieu-dot-bien-69854",
    "https://www.nettruyenus.com/truyen-tranh/youchien-wars-72122",
    "https://www.nettruyenus.com/truyen-tranh/return-survival-284161",
    "https://www.nettruyenus.com/truyen-tranh/cuoc-chien-am-thuc-45920",
    "https://www.nettruyenus.com/truyen-tranh/ta-lam-kieu-hung-tai-di-gioi-77404",
    "https://www.nettruyenus.com/truyen-tranh/mairimashita-iruma-kun-159850",
    "https://www.nettruyenus.com/truyen-tranh/ryuuma-no-gagou-279420",
    "https://www.nettruyenus.com/truyen-tranh/ke-phan-dien-duoc-gia-dinh-ton-sung-67871",
    "https://www.nettruyenus.com/truyen-tranh/bong-nhien-toi-tro-thanh-qua-den-635152",
    "https://www.nettruyenus.com/truyen-tranh/bi-ngo-cuong-sat-pumpkin-night-182510",
    "https://www.nettruyenus.com/truyen-tranh/dua-con-than-chet-331590",
    "https://www.nettruyenus.com/truyen-tranh/kishuku-gakkou-no-juliet-151520",
    "https://www.nettruyenus.com/truyen-tranh/chuyen-cua-hori-va-miyamura-43651",
    "https://www.nettruyenus.com/truyen-tranh/khi-bien-66300",
    "https://www.nettruyenus.com/truyen-tranh/dai-chien-nguoi-khong-lo-91710",
    "https://www.nettruyenus.com/truyen-tranh/anh-hung-onepunch-43890",
    "https://www.nettruyenus.com/truyen-tranh/chu-thuat-hoi-chien-189860",
    "https://www.nettruyenus.com/truyen-tranh/dao-hai-tac-91690",
    "https://www.nettruyenus.com/truyen-tranh/dandadan-403102",
    "https://www.nettruyenus.com/truyen-tranh/he-thong-super-god-550100",
    "https://www.nettruyenus.com/truyen-tranh/xuan-thu-ba-do-191700",
    "https://www.nettruyenus.com/truyen-tranh/cuoc-phieu-luu-bi-an-98080",
    "https://www.nettruyenus.com/truyen-tranh/uzumaki-boruto-129481",
    "https://www.nettruyenus.com/truyen-tranh/tham-tu-conan-46393",
    "https://www.nettruyenus.com/truyen-tranh/naruto-cuu-vi-ho-ly-119964",
    "https://www.nettruyenus.com/truyen-tranh/dragon-ball-bay-vien-ngoc-rong-35571",
    "https://www.nettruyenus.com/truyen-tranh/tom-lai-la-em-de-thuong-duoc-chua-186510",
    "https://www.nettruyenus.com/truyen-tranh/chien-luoc-tinh-yeu-trong-sang-636866",
    "https://www.nettruyenus.com/truyen-tranh/shibuya-kingyo-172410",
    "https://www.nettruyenus.com/truyen-tranh/that-nghiep-chuyen-sinh-lam-lai-het-suc-46601",
    "https://www.nettruyenus.com/truyen-tranh/khoa-chat-cua-nao-suzume-80582",
    "https://www.nettruyenus.com/truyen-tranh/cuoc-song-tra-on-cua-nang-rong-tohru-101240",
    "https://www.nettruyenus.com/truyen-tranh/sau-khi-duoc-tai-sinh-toi-bi-keo-vao-game-otome-voi-vai-tro-nu-ac-nhan-va-bi-gan-toan-flag-den-213740",
    "https://www.nettruyenus.com/truyen-tranh/noragami-41681",
    "https://www.nettruyenus.com/truyen-tranh/bi-thieu-rui-boi-ngon-lua-dia-nguc-hoi-sinh-voi-tu-cach-hoa-thuat-su-manh-nhat-393960",
    "https://www.nettruyenus.com/truyen-tranh/xuong-thu-cong-cua-nang-yeu-tinh-va-chang-tho-san-77375",
    "https://www.nettruyenus.com/truyen-tranh/tu-chuc-nghiep-yeu-nhat-tro-thanh-tho-ren-manh-nhat-383300",
    "https://www.nettruyenus.com/truyen-tranh/tien-dao-so-1-222050",
    "https://www.nettruyenus.com/truyen-tranh/double-click-83228",
    "https://www.nettruyenus.com/truyen-tranh/one-point-85114",
    "https://www.nettruyenus.com/truyen-tranh/ga-cau-thu-lac-loi-63490",
    "https://www.nettruyenus.com/truyen-tranh/doraemon-bong-chay-64240",
    "https://www.nettruyenus.com/truyen-tranh/magic-kaito-96000",
    "https://www.nettruyenus.com/truyen-tranh/nhat-ki-tuong-lai-32910",
    "https://www.nettruyenus.com/truyen-tranh/khi-tham-tu-con-dang-so-hon-ca-toi-pham-379670",
    "https://www.nettruyenus.com/truyen-tranh/ai-da-giet-con-tho-238270",
    "https://www.nettruyenus.com/truyen-tranh/bai-hoc-cuoc-song-hay-va-y-nghia-164670",
    "https://www.nettruyenus.com/truyen-tranh/phan-chieu-truyen-viet-nam-196080",
    "https://www.nettruyenus.com/truyen-tranh/than-dong-dat-viet-11080",
    "https://www.nettruyenus.com/truyen-tranh/tat-den-142710",
    "https://www.nettruyenus.com/truyen-tranh/truyen-thuyet-mien-dat-hua-37560",
    "https://www.nettruyenus.com/truyen-tranh/tinh-yeu-ngang-trai-46080",
    "https://www.nettruyenus.com/truyen-tranh/co-ban-gai-ma-minh-thich-lai-quen-mang-kinh-mat-roi-222280",
    "https://www.nettruyenus.com/truyen-tranh/berserk-39170",
    "https://www.nettruyenus.com/truyen-tranh/boku-no-kokoro-yabai-yatsu-219570",
    "https://www.nettruyenus.com/truyen-tranh/co-gai-thich-lan-grand-blue-120372",
    "https://www.nettruyenus.com/truyen-tranh/inu-yashiki-94710",
    "https://www.nettruyenus.com/truyen-tranh/gto-great-teacher-onizuka-37820",
    "https://www.nettruyenus.com/truyen-tranh/chainsaw-man-tho-san-quy-202651",
];

const LINKS = [
"https://www.nettruyenus.com/truyen-tranh/the-new-gate-99290",
"https://www.nettruyenus.com/truyen-tranh/ochikazuki-ni-naritai-80348",
"https://www.nettruyenus.com/truyen-tranh/kimi-wa-yakamashi-tojite-yo-kuchi-wo-90345",
"https://www.nettruyenus.com/truyen-tranh/gia-dinh-diep-vien-219223",
"https://www.nettruyenus.com/truyen-tranh/truy-tim-ngoc-rong-sieu-cap-99590",
"https://www.nettruyenus.com/truyen-tranh/chu-meo-ky-dieu-kyuu-chan-195580",
"https://www.nettruyenus.com/truyen-tranh/kingdom-vuong-gia-thien-ha-46610",
"https://www.nettruyenus.com/truyen-tranh/gintama-linh-hon-bac-44352",
"https://www.nettruyenus.com/truyen-tranh/clover-43390",
"https://www.nettruyenus.com/truyen-tranh/black-clover-phap-su-khong-phep-thuat-92851",
"https://www.nettruyenus.com/truyen-tranh/vua-bong-chuyen-137750",
"https://www.nettruyenus.com/truyen-tranh/vua-tro-choi-full-mau-175450",
"https://www.nettruyenus.com/truyen-tranh/thien-tai-bong-da-ashito-366060",
"https://www.nettruyenus.com/truyen-tranh/biet-doi-linh-cuu-hoa-109050",
"https://www.nettruyenus.com/truyen-tranh/doi-phuong-phai-to-tinh-truoc-115450",
"https://www.nettruyenus.com/truyen-tranh/drstone-hoi-sinh-the-gioi-158523",
"https://www.nettruyenus.com/truyen-tranh/nhat-quy-nhi-ma-thu-ba-takagi-42090",
"https://www.nettruyenus.com/truyen-tranh/vung-dat-ma-phap-5630",
"https://www.nettruyenus.com/truyen-tranh/new-game-68441",
];



(async () => {
    for (let i = 0; i < LINKS1.length; ++i) {
        await getResults(LINKS1[i])
    }
    //await getResults('https://www.nettruyenus.com/truyen-tranh/chu-thuat-hoi-chien-189860')
})()
