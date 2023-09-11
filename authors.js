const fs = require('fs');
const getAuthors = async () => {
  const fileContent = fs.readFileSync('nettromus.json', 'utf8');
  //console.log(JSON.parse(fileContent));
  let data
  if (JSON.parse(fileContent) !== null) {
    data = JSON.parse(fileContent)
  } else {
    console.log('failed to load')
    return
  }

  let authors = []

  data.forEach((element) => {
    element.author.forEach((author) => {
      if (!authors.includes(author)) {
        authors.push(author);
      }
    })
  })

  fs.writeFile('authors.json', JSON.stringify(authors), (err) => {
    if (err) {
        console.error(err); return;
    } else {
        console.log('created authors.json file');
    }
});
}

getAuthors()
