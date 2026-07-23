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
  });

  return body;
}

function getBoardListCount() {
  let boardList = getBoardListBody(0);
  if (!boardList) return null;

  let totalElement = boardList.getElementsByClassName('total')[0];
  if (!totalElement) return null;

  let total = parseInt(totalElement.textContent.slice(2, -1));
  if (!total) return null;

	return total;
}

function parseToIdList(boardListBody) {
  let anchors = [...boardListBody.getElementsByClassName('samu')];

  const regex = /fnView\(\s*'([^']*)'\s*,\s*'([^']*)'\s*\)/; // expected form: fnView("bbsId", "nttId")

  let idList = anchors.map(e => {
    let onclickString = e.getAttribute('onclick') || '';
    let match = onclickString.match(regex);

    return {
      bbsId: match ? match[1] : null,
      nttId: match ? match[2] : null 
    };
	});

  return idList;
}

function needsUpdate(latestNttId) {
  let boardListBody = getBoardListBody(1);
  if (!boardListBody) return true;

  let id = parseToIdList(boardListBody);
  if (id.length == 0) return true;

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
      title: detail ? parseBoardDetailTitle(detail) : null,
      files: detail ? parseBoardDetailFiles(detail).map(f => { return {name: f.name, url: createDownloadURL(f)} }) : null
    }
  });
}