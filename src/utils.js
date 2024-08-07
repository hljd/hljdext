import * as XLSX from 'xlsx';
import HOBJECT from './HOBJect.js';

function extractIdentifier(url) {
  const regex = /\/alma\/(\d+)\/catalog/;
  const match = url.match(regex);
  if (match && match[1]) {
    return match[1];
  } else {
    return null;
  }
}

export function rowAsList(sheet, r) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const row = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ c: col, r: r });
    const cell = sheet[cellAddress];
    row.push(cell ? cell.v : null); // If cell is empty, push null
  }
  return row;
}

function similarities(array1, array2) {
  const set1 = new Set(array1);
  const set2 = new Set(array2);
  let commonCount = 0;
  set1.forEach(value => {
    if (set2.has(value)) {
      commonCount++;
    }
  });
  return commonCount;
}

function getColValues(sheet, columnName) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const columnNames = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
  const colIndex = columnNames.indexOf(columnName);

  if (colIndex === -1) {
    throw new Error(`Column ${columnName} not found.`);
  }

  const values = [];
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const cellAddress = XLSX.utils.encode_cell({ c: colIndex, r: row });
    const cell = sheet[cellAddress];
    values.push(cell ? cell.v : null);
  }

  return values;
}

function format_word(word) {
  let new_word = "";
  for (var i in word) {
    let letter = word[i];
    if (i != 0 && ((letter.toLowerCase() != letter.toUpperCase()) || ":/.,'!@#$%^&*()-_+=".includes(letter))) {
      letter = letter.toLowerCase();
      new_word += letter;
    } else {
      new_word += letter;
    }
  }
  return new_word;
}

function format_title(title) {
  var new_title = "";

  for (var word of title.split(" ")) {
    new_title += (format_word(word) + " ");
  }

  return new_title.trim();
}

function overrideCol(sheet, colIndex, columnName, values) {
  const range = XLSX.utils.decode_range(sheet['!ref']);

  const headerAddress = XLSX.utils.encode_cell({ c: colIndex, r: range.s.r });
  sheet[headerAddress] = { v: columnName, t: 's' };

  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const cellAddress = XLSX.utils.encode_cell({ c: colIndex, r: row });
    const valueIndex = row - range.s.r - 1; // Adjust index for 0-based array

    sheet[cellAddress] = { v: values[valueIndex] !== undefined ? values[valueIndex] : null, t: 's' };
  }

  sheet['!ref'] = XLSX.utils.encode_range(range);
}

export function moveColumnToFirst(sheet, colName) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const columnNames = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0];
  const colIndex = columnNames.indexOf(colName);
  const old_n = columnNames[0];
  const old_v = getColValues(sheet, old_n);

  if (colIndex === -1) {
    throw new Error(`Column ${colName} not found.`);
  }

  const firstColHeaderAddress = XLSX.utils.encode_cell({ c: 0, r: 0 });
  const targetColHeaderAddress = XLSX.utils.encode_cell({ c: colIndex, r: 0 });

  const firstColHeader = sheet[firstColHeaderAddress];
  sheet[firstColHeaderAddress] = sheet[targetColHeaderAddress];
  sheet[targetColHeaderAddress] = firstColHeader;

  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const firstCellAddress = XLSX.utils.encode_cell({ c: 0, r: row });
    const targetCellAddress = XLSX.utils.encode_cell({ c: colIndex, r: row });

    const firstCell = sheet[firstCellAddress];
    sheet[firstCellAddress] = sheet[targetCellAddress];
    sheet[targetCellAddress] = firstCell;
  }

  for (let col = colIndex; col > 0; col--) {
    for (let row = range.s.r; row <= range.e.r; row++) {
      const fromCellAddress = XLSX.utils.encode_cell({ c: col - 1, r: row }); 
      const toCellAddress = XLSX.utils.encode_cell({ c: col, r: row });

      sheet[toCellAddress] = sheet[fromCellAddress];
    }
  }

  for (let row = range.s.r; row <= range.e.r; row++) {
    const firstCellAddress = XLSX.utils.encode_cell({ c: 0, r: row });
    const targetCellAddress = XLSX.utils.encode_cell({ c: colIndex, r: row });

    sheet[firstCellAddress] = sheet[targetCellAddress];
    delete sheet[targetCellAddress];
  }

  sheet['!ref'] = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: range.e.c, r: range.e.r },
  });
  let values1 = getColValues(sheet, "HOLLIS Search");
  overrideCol(sheet, 0, "HOLLIS Search", values1);
  overrideCol(sheet, 1, old_n, old_v);
}

function notcols(a, b) {
  var c = [];
  for (var element of a) {
    if (b.includes(element) === false) {
      c.push(element);
    }
  }
  return c;
}

export function getCell(sheet, row, column) {
  const cell_address = XLSX.utils.encode_cell({ c: column, r: row });
  const cell = sheet[cell_address];
  if (cell) {
    return cell.v;
  }
  return null;
}

export function colIndex(sheet, columnName) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ c: col, r: range.s.r });
    const cell = sheet[cellAddress];
    if (cell && cell.v === columnName) {
      return col;
    }
  }
  return -1;
}

function collect_hollis_from_json(json){
  json = json.toString();
  // // // console.log("Testing utils json");
  // // // console.log(json, "  ",String(json));
  // // // console.log("Finding HOLLIS ID from ",json);
   
  const regex = /https:\/\/id\.lib\.harvard\.edu\/alma\/[0-9]+\/catalog/i;
  
  var match = json.match(regex);
  // // // console.log("Given JSON: ",json, " match ",match);
  if(match){
    // // // console.log("Found hollis: ",match);
    match = match[0];
    match = match.replace("/catalog","");
    match = match.replace("https://id.lib.harvard.edu/alma/","");
    return match;
  }else{
    return ["Yellow: None Found"];
  }
}

export function createColumn(name, sheet, values = []) {
  const range = XLSX.utils.decode_range(sheet['!ref']);
  const columnIndex = range.e.c + 1;

  const firstRowAddress = XLSX.utils.encode_cell({ c: columnIndex, r: range.s.r });
  sheet[firstRowAddress] = { v: name, t: 's' };

  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const cellAddress = XLSX.utils.encode_cell({ c: columnIndex, r: row });
    if (values.length >= row - range.s.r) {
      sheet[cellAddress] = { v: values[row - range.s.r - 1], t: 'n' };
    } else {
      sheet[cellAddress] = { v: 0, t: 'n' };
    }
  }

  sheet['!ref'] = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: columnIndex, r: range.e.r },
  });
}
function deGerman(str){
  const abbreviations = [
    "Gewebe", "Geb.", "Pp.", "Brosch.", "Tb.", "Taschenbuch", "Ldr.", "Leder",
    "Klappb.", "Schwdr.", "Schweinsleder", "Kstdr.", "Kalbsleder", "Kart.", "Kartoniert",
    "Pbd.", "Pappband", "Ill.", "Illustriert", "Halbleder", "Ganzld.", "Ganzleder",
    "OPp.", "Original-Pappe", "OKt.", "Original-Karton", "OLwd.", "Original-Leinen",
    "Obrosch.", "Original-Broschur", "OU.", "Original-Umschlag", "OS.", "Original-Schuber"
  ];
  const pattern = new RegExp(abbreviations.join("|"), "gi");
  return str.replace(pattern, "").replace(/\s{2,}/g, ' ').trim();
}

function check_json(json, isbn){
  let test_h = new HOBJECT(json);
  // console.log(`Checking if ${json} contains ${isbn}`);
  test_h.process(json);
  if (test_h.check_identifier('isbn', isbn) || test_h.asList().includes(isbn)) {
    return true;
  }else{
    return false;
  }
}
function present(array, json) {
  let jsonString = JSON.stringify(json);
  
  for (let element of array) {
      let elementString = JSON.stringify(element);

      if (elementString === jsonString) {
          return true;
      }
  }
  
  return false;
}
async function search_by_isbn(isbn) {
  isbn = String(isbn);

  if (isbn.includes("[ISSN]")) {
    isbn = isbn.replace("[ISSN]", "");
  }

  isbn = findISBNNumbers(isbn);
  const isbn_result_obs = [];

  for (const singleIsbn of isbn) {
    await delay(750);

    const urls = [
      `https://api.lib.harvard.edu/v2/items.json?identifier=${singleIsbn}`,
    ];

    for (const url of urls) {
      try {
        await delay(250);
        const response = await fetch(url);
        const jsonText = await response.text();
        const json = JSON.parse(jsonText);
        const nf = parseInt(json['pagination']['numFound'], 10);
        console.log(`Found ${nf} results! with ISBN: ${singleIsbn}`);
        if (nf > 0) {
          if(nf == 1){
            const jso = json['items']['mods'];
            console.log(jso);
            if(check_json(jso,singleIsbn)){
              if(!present(isbn_result_obs,jso)){
                isbn_result_obs.push(jso);
              }
            }
          }else{
            for (const jso of json['items']['mods']) {
              console.log(jso);
              let check = check_json(jso,singleIsbn);
              if(check){
                if(!present(isbn_result_obs,jso)){
                  isbn_result_obs.push(jso);
                }
              }
            }
          }
          
        }
      } catch (error) {
        console.error(`Error fetching data from URL: ${url}`, error);
      }
    }
  }
  console.log(`Search results for ${isbn}: ${isbn_result_obs}`);
  for(const json of isbn_result_obs){
    console.log("Result ",json);
  }

  return isbn_result_obs;
}
async function search_by_eisbn(eisbn) {
  eisbn = String(eisbn);

  if (eisbn.includes("[ISSN]")) {
    eisbn = eisbn.replace("[ISSN]", "");
  }

  eisbn = findISBNNumbers(eisbn);
  const eisbn_result_obs = [];

  for (const singleEIsbn of eisbn) {
    await delay(750);

    const urls = [
      `https://api.lib.harvard.edu/v2/items.json?identifier=${singleEIsbn}`,
    ];

    for (const url of urls) {
      try {
        await delay(250);
        const response = await fetch(url);
        const jsonText = await response.text();
        const json = JSON.parse(jsonText);
        const nf = parseInt(json['pagination']['numFound'], 10);
        console.log(`Found ${nf} results! with ISBN: ${singleEIsbn}`);
        if (nf > 0) {
          if(nf == 1){
            const jso = json['items']['mods'];
            console.log(jso);
            if(check_json(jso,singleEIsbn)){
              if(!present(eisbn_result_obs,jso)){
                eisbn_result_obs.push(jso);
              }
            }
          }else{
            for (const jso of json['items']['mods']) {
              console.log(jso);
              let check = check_json(jso,singleEIsbn);
              if(check){
                if(!present(eisbn_result_obs,jso)){
                  eisbn_result_obs.push(jso);
                }
              }
            }
          }
          
        }
      } catch (error) {
        console.error(`Error fetching data from URL: ${url}`, error);
      }
    }
  }
  console.log(`Search results for ${eisbn}: ${eisbn_result_obs}`);
  for(const json of eisbn_result_obs){
    console.log("Result ",json);
  }

  return eisbn_result_obs;
}
function findHollis(json){
  json = JSON.stringify(json);
  const regex = /https:\/\/id\.lib\.harvard\.edu\/alma\/[0-9]+\/catalog/i;
  let match = json.match(regex);
  if (match) {
      match = match[0];
      match = match.replace("/catalog", "");
      match = match.replace("https://id.lib.harvard.edu/alma/", "");
      return match;
  } else {
      return "Not Found.";
  }
}
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function findISBNNumbers(inputString) {
  let i = inputString.toString();
  let regex = /\b(?:ISBN|ISSN|EISBN)\b\S*\s*/gi;
  inputString = inputString.replace(regex, '');

  regex = /\(\s*\)|\[\s*\]/g;
  inputString = inputString.replace(regex, '');
  inputString = inputString.replace("-","");

  regex = /[.,;]\s*/g;
  inputString = inputString.replace(regex, '');
  inputString = inputString.replace(/\s+/g, ' ').trim();
  const isbns = inputString.split(' ');
  // // // console.log("ISBNs: ",isbns);
  isbns.push(i);
  var new_arr = [];
  for (var idx in isbns) {
    isbns[idx] = isbns[idx].replace(/-/g, "");
    const ct = deGerman(isbns[idx]);
    if(ct.length > 0){
      new_arr.push(ct);
    }
  }

  
  return new_arr;
}

function get_correct_one(isbn, title, author){
  let ret = "";
  return ret;
}

function getTitle(input) {
  let json;
  
  if (typeof input === 'string') {
      try {
          json = JSON.parse(input);
      } catch (e) {
          console.error("Invalid JSON string");
          return null;
      }
  } else if (typeof input === 'object' && input !== null) {
      json = input;
  } else {
      console.error("Input is not a valid JSON object or string");
      return null;
  }

  if (json && json.titleInfo && json.titleInfo.title) {
      return json.titleInfo.title;
  } else {
      console.error("Title not found in JSON");
      return null;
  }
}

export async function search_one_item(sheet, queries, r) {
    delay(1000*queries.length);//api length
    let isbn_column = colIndex(sheet, queries['dropdowns'][0]);

    let eisbn_column = colIndex(sheet, queries['dropdowns'][1]);

    // let remaining_columns = notcols(queries['allSelected'], queries['dropdowns']);

    // for (var i in remaining_columns) {
    //   remaining_columns[i] = colIndex(sheet, remaining_columns[i]);
    // }

    var values = [];
    var titles_found = []; 
    const range = XLSX.utils.decode_range(sheet['!ref']);
    let isbn_cell = getCell(sheet, r, isbn_column);
    // let title_cell = getCell(sheet, r, title_column);
    // let author_cell = getCell(sheet, r, author_column);
    let eisbn_cell = getCell(sheet, r, eisbn_column);
    // console.log("ISBN Cells: ",isbn_cell);
    var value = "";

    if (isbn_cell) {
      let isbn_res = await search_by_isbn(isbn_cell);
      // console.log("ISBN Search Result: ",isbn_res, " Of Length: ",isbn_res.length);
      if (isbn_res) {
        if(isbn_res.length == 1){
          let hollcode = findHollis(isbn_res[0]);
          value = "Red: Hollis ID No. " + hollcode;
          titles_found.push(getTitle(isbn_res[0]));
        }else if(isbn_res.length > 1){
          // let correct_Res = get_correct_one(isbn_cell,title_cell,author_cell, isbn_res);
          // let hollcode = correct_Res.hollisID;
          // let c = 0;
          // for (var obj of isbn_res){
          //   if(obj.check_identifier('isbn',isbn_cell)){
          //     c+=1;
          //   }
          // }
          
          titles_found.push("---");
            // // console.log("Many found");
          value = "Yellow: Multiple Matches Found. ";
        }
        // else if(isbn_res.length == 0){
        //   value = "Green: No matches found.";
        //   titles_found.push("---");
        //   // // console.log("checking workflow here");
        // }
        // // // console.log(isbn_res);
        
      }
    }if(value === ""){
      if (eisbn_cell) {
        let eisbn_res = await search_by_eisbn(eisbn_cell);
        // console.log("ISBN Search Result: ",isbn_res, " Of Length: ",isbn_res.length);
        if (eisbn_res) {
          if(eisbn_res.length == 1){
            let hollcode = findHollis(eisbn_res[0]);
            value = "Red: Hollis ID No. " + hollcode;
            titles_found.push(getTitle(eisbn_res[0]));
          }else if(eisbn_res.length > 1){
            // let correct_Res = get_correct_one(isbn_cell,title_cell,author_cell, isbn_res);
            // let hollcode = correct_Res.hollisID;
            // let c = 0;
            // for (var obj of isbn_res){
            //   if(obj.check_identifier('isbn',isbn_cell)){
            //     c+=1;
            //   }
            // }
            
            titles_found.push("---");
              // // console.log("Many found");
            value = "Yellow: Multiple Matches Found. ";
          }
          // else if(isbn_res.length == 0){
          //   value = "Green: No matches found.";
          //   titles_found.push("---");
          //   // // console.log("checking workflow here");
          // }
          // // // console.log(isbn_res);
          
        }
      }
    }


    // if (value === "") {
    //   if (title_cell) {
    //     title_cell = format_title(title_cell);
    //     let title_res = await search_by_title(title_cell);
    //     if (title_res) {
    //       if (title_res.length > 1) {
    //         value = "Yellow: Multiple Matches Detected.";
    //       } else {
    //         value = "Yellow: Hollis ID No. " + title_res[0].hollisID;
    //       }
    //     }
    //   }
    // }

    // if (value === "") {
    //   if (author_cell) {
    //     let author_res = await search_by_author(author_cell);
    //     if (author_res) {
    //       if (author_res.length > 1) {
    //         value = "Yellow: Multiple Matches Detected.";
    //       } else {
    //         value = "Yellow: Hollis ID No. " + author_res[0].hollisID;
    //       }
    //     }
    //   }
    // }

    // if (value === "") {
    //   var valid_res = [];
    //   for (var col of remaining_columns) {
    //     let query_cell = getCell(sheet, r, col);
    //     if (query_cell) {
    //       let query_res = await search_by_query(query_cell);
    //       if (query_res) {
    //         if (query_res.length === 1) {
    //           let g = query_res[0].asList();
    //           let threshold = 3;
    //           let row = rowAsList(sheet, r);
    //           if (similarities(row, g) >= threshold) {
    //             value = "Yellow: Possible Match Found with Hollis ID No." + query_res[0].hollisID;
    //             continue;
    //           }
    //         } else if (query_res.length > 1) {
    //           for (var res of query_res) {
    //             let g = res.asList();
    //             let threshold = 3;
    //             let row = rowAsList(sheet, r);
    //             if (similarities(row, g) >= threshold) {
    //               valid_res.push(res);
    //             }
    //           }
    //         }
    //       }
    //     }
    //   }
    //   if (valid_res.length === 1) {
    //     value = "Yellow: Possible Match Found with Hollis ID No." + valid_res[0].hollisID;
    //   } else if (valid_res.length > 1) {
    //     value = "Yellow: Multiple Potential Matches Found";
    //   }
    // }

    if (value === "") {
      value = "Green: No matches found.";
    }
    const valStr = isbn_cell + " " + eisbn_cell;
    // if(value.includes("Green")){
    //   // // // // console.log("No match found for "+valStr);
    // }
    // // // console.log("Value for  "+valStr+ ": "+value);
    
    return [value,titles_found];
}

// function openHollisSearch(query) {
//     // Step 1: Wait for 1 second
//     setTimeout(() => {
//         // Step 2: Construct the URL with the query
//         const url = `https://hollis.harvard.edu/primo-explore/search?query=any,contains,${query}&tab=books&search_scope=default_scope&vid=HVD2&lang=en_US&offset=0`;
        
//         // Step 3: Open the URL in a new tab
//         window.open(url, '_blank');
        
//         // Step 4: Wait for 2 seconds (not needed in this case, as the tab opens immediately)
//     }, 1000);
// }

async function search_by_author(author) {
  if (!author || author.trim() === "") {
    return null;
  }
  
  var all_json = [];
  const query = author.toString().replace(/ /g, "%20");
  const url_1 = `https://api.lib.harvard.edu/v2/items.json?identifier=${query}`;
  const url_2 = `https://api.lib.harvard.edu/v2/items.json?q=${query}`;

  for (var url of [url_2]) { // Yes, this is improper, but has option to add urls
    try {
      const response = await fetch(url);
      const jsonText = await response.text();
      let json = JSON.parse(jsonText);

      const nf = parseInt(json['pagination']['numFound'], 10);
      if (nf > 0) {
        if (nf === 1) {
          try {
            let jso = json['items']['mods'];
            let test_h = new HOBJECT(jso);
            test_h.process(jso);
            if (test_h.check_author(author)) {
              return [test_h];
            }
          } catch {
            let jk = 1;
          }
        } else if (nf > 1) {
          for (var jso of json['items']['mods']) {
            try {
              let test_h = new HOBJECT(jso);
              test_h.process(jso);
              jso = JSON.stringify(jso);
              test_h.hollisID = collect_hollis_from_json(jso);
              if (test_h.check_author(author)) {
                all_json.push(test_h);
              }
            } catch {
              let jk = 1;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error," with Author");
    }
  }
  return all_json.length ? all_json : null;
}

async function search_by_query(query) {
  if (!query || query.trim() === "") {
    return null;
  }

  var all_json = [];
  const url_1 = `https://api.lib.harvard.edu/v2/items.json?identifier=${query}`;
  const url_2 = `https://api.lib.harvard.edu/v2/items.json?q=${query}`;

  for (var url of [url_2]) { // Yes, this is improper, but has option to add urls
    try {
      const response = await fetch(url);
      const jsonText = await response.text();
      let json = JSON.parse(jsonText);

      const nf = parseInt(json['pagination']['numFound'], 10);
      if (nf > 0) {
        if (nf === 1) {
          let jso = json['items']['mods'];
          let test_h = new HOBJECT(jso);
          test_h.process(jso);
          jso = JSON.stringify(jso);
          test_h.hollisID = collect_hollis_from_json(jso);
          if (query in test_h.asList()) {
            all_json.push(test_h);
          }
        } else if (nf > 1) {
          for (var jso of json['items']['mods']) {
            let test_h = new HOBJECT(jso);
            test_h.process(jso);
            if (query in test_h.asList()) {
              all_json.push(test_h);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error," with query");
    }
  }
  return all_json.length ? all_json : null;
}

const stopwords = [
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
  'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
  'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
  'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
  'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'
];

function cleanSentence(sentence) {
  return sentence
    .toLowerCase()
    .split(' ')
    .filter(word => /^[a-z]+$/.test(word) && word.length > 3)
    .join(' ');
}


function splitSentence(sentence) {
  const words = sentence.split(' ');
  const n = words.length;

  const part1Length = Math.ceil(n / 3);
  const part2Length = Math.ceil((n - part1Length) / 2);
  const part3Length = n - part1Length - part2Length;

  const part1 = words.slice(0, part1Length).join(' ');
  const part2 = words.slice(part1Length, part1Length + part2Length).join(' ');
  const part3 = words.slice(part1Length + part2Length).join(' ');

  return [part1, part2, part3];
}

function best_amt(words, n) {
  if (n >= words.length) {
    return words;
  }
  var new_word_list = words.sort(
    function (a, b) {
      return b.length - a.length;
    }
  );
  return new_word_list.slice(0, n);
}

async function search_by_title(titl) {
  if (!titl || titl.trim() === "" || titl == "" || titl.length == 0) {
    return null;
  }

  var all_json = [];
  var title = cleanSentence(titl);

  if(title.length === 0 || title === ""){
    title = titl;
  }
  const url_1 = `https://api.lib.harvard.edu/v2/items.json?title=${title}`;
  const url_2 = `https://api.lib.harvard.edu/v2/items.json?q=${title}`;

  for (var url of [url_2]) { // Yes, this is improper, but has option to add urls
    try {
      const response = await fetch(url);
      const jsonText = await response.text();
      let json = JSON.parse(jsonText);

      const nf = parseInt(json['pagination']['numFound'], 10);
      if (nf > 0) {
        if (nf === 1) {
          let jso = json['items']['mods'];
          let test_h = new HOBJECT(jso);
          test_h.process(jso);
          jso = JSON.stringify(jso);
          test_h.hollisID = collect_hollis_from_json(jso);
          for (var obj_title of test_h.titles) {
            if (obj_title.split(" ")[0] === titl.split(" ")[0]) {
              all_json.push(test_h);
            }
            if (test_h.asList().includes(obj_title) ) {
              return [test_h];
            }
            if(jso.toString().includes(obj_title)){
              return collect_hollis_from_json(jso);
            }
          }
        } else if (nf > 1) {
          for (var jso of json['items']['mods']) {
            let test_h = new HOBJECT(jso);
            test_h.process(jso);
            jso = JSON.stringify(jso);
            test_h.hollisID = collect_hollis_from_json(jso);
            for (var obj_title of test_h.titles) {
              if (obj_title.split(" ")[0] === titl.split(" ")[0]) {
                all_json.push(test_h);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error," with Title");
    }
  }
  return all_json.length ? all_json : null;
}
