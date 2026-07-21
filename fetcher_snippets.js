function getBoardListBody(count) {
	document.getElementById('customRecordCountPerPage').value = count;

  let body = null;
	const parser = new DOMParser();
  $.ajax({  // ajax statement from selectBoardDetailAjax.do, list_btn
    type:'POST'
    , url:'/dggb/module/board/selectBoardListAjax.do'
    , cache : false
    , async : false
    , data:$("#boardFrm").serialize()
    , success:function (data) {
        body = parser.parseFromString(data, "text/html").body;
      }
    , error:function (data) {
        console.warn(`Failed to retrieve ajax data from selectBoardListAjax! count: ${count}`);
      }
  });

  return body;
}

function getBoardListCount() {
  let boardList = getBoardListBody(0);
  
  let totalElement = boardList.getElementsByClassName('total')[0];
  if (!totalElement) { console.warn("Failed to get 'total' element!"); }

  let total = parseInt(totalElement.textContent.slice(2, -1));
  if (!total) { console.warn(`Failed to parse 'total' to int! textContent: ${totalElement.textContent}`); }

	return total;
}

function parseBoardList(boardList) {
  let anchors = [...boardList.getElementsByClassName('samu')];

  const regex = /fnView\(\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/; // expected form: fnView("bbsId", "nttId")

  let idList = anchors.map(e => {
    let onclickString = e.getAttribute('onclick') || '';
    let match = onclickString.match(regex);

    if (!match) {
      console.warn(`Failed to match list entry! (check if boardList is properly parsed) Tried: ${onclickString}`);
      console.log(boardList);
  }

    return {
      bbsId: match ? match[1] : null,
      nttId: match ? match[2] : null 
    };
	});

  if (idList.length == 0) {
    console.warn("List length is 0! check if logged in properly")
  }

  return idList;
}

function needsUpdate(latestNttId) {
  let boardList = getBoardListBody(1);
  let id = parseBoardList(boardList);

  return id[0].nttId != latestNttId;
}

function getBoardDetail(bbsId, nttId) {
  setIds(bbsId, nttId);

  let body = null;
  const parser = new DOMParser();
  $.ajax({
      type:'POST'
    , url:'/dggb/module/board/selectBoardDetailAjax.do'
    , cache : false
    , async : false
    , data:$("#boardFrm").serialize()
    , success:function (data) {
      body = parser.parseFromString(data, "text/html").body;
    }
    , error:function (data) {
      console.warn(`Failed to retrieve ajax data from selectBoardDetailAjax! bbsId: ${bbsId}, nttId: ${nttId}`);
    }
  });

  setIds('', ''); // reset ids

  return body;
}

function setIds(bbsId, nttId) { // keep ajax calls synchronous! else this might not work
  document.getElementById('bbsId').value = bbsId;
  document.getElementById('nttId').value = nttId;
}

function parseBoardDetailTitle(boardDetail) {
  let ths = [...boardDetail.getElementsByTagName('th')];
  const titleTh = ths.find(th => th.textContent.trim() === '제목');

  let text = null;
  if (titleTh) {
    let row = titleTh.closest('tr');
    let div = row.querySelector('td div');

    if (!div) { 
      console.warn ("Failed to get correct div data! (check if boardDetail is properlly parsed)");
      console.log(boardDetail);
    }
    text = div ? div.textContent.trim() : null;
  }

  return text;
}

function parseBoardDetailFiles(boardDetail) {
  let scripts = [...boardDetail.getElementsByTagName('script')];
  let target = scripts.find(e => e.textContent.includes('serverFileObj'));
  let scriptText = target ? target.textContent : '';

  // expected form (has to be in "name", "atchFileId", "fileSn" order):
  // serverFileObj["name"] = "filename.txt"
  // ...
  // serverFileObj["atchFileId"] = "FILE_01"
  // ...
  // serverFileObj["fileSn"] = "1"

  const regex = /serverFileObj\["name"\]\s*=\s*"([^"]*)";[\s\S]*?serverFileObj\["atchFileId"\]\s*=\s*"([^"]*)";\s*serverFileObj\["fileSn"\]\s*=\s*"([^"]*)";/g;

  let files = [];
  let match;
  while ((match = regex.exec(scriptText)) !== null) {  // length might not be as expected
    files.push({
      name: match[1],
      atchFileId: match[2],
      fileSn: match[3]
    });
  }

  return files;
}

function createDownloadURL(file) {
  return `https://seoulsejong.sen.hs.kr/dggb/cnvrFileDown.do?atchFileId=${file.atchFileId}:${file.fileSn}`;
}

function getFileDataFromIdList(idList) {
  return idList.map(id => {
    let detail = getBoardDetail(id.bbsId, id.nttId);

    return {
      nttId: id.nttId,
      title: parseBoardDetailTitle(detail),
      files: parseBoardDetailFiles(detail).map(f => { return {name: f.name, url: createDownloadURL(f)} })
    }
  });
}

function exportJSON(fileData, filename = "filedata.json") {
  let withMetaData = { 
    date: new Date().toISOString(),
    latestNttId: fileData[0].nttId,
    data: fileData
   }
  
  const json = JSON.stringify(withMetaData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');  // download
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

var count = getBoardListCount();
var boardList = getBoardListBody(count);

var idList = parseBoardList(boardList);

var fileData = getFileDataFromIdList(idList);
// console.log(fileData);
exportJSON(fileData);