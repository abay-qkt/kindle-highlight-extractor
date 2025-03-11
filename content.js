// URL からクエリパラメータを取得する
const queryParams = new URLSearchParams(window.location.search);
const asin = queryParams.get('asin');

// 色情報と文字色の対応関係をオブジェクトで管理する (デフォルト設定)
let colorSettings = {
    pink: "red",
    blue: "blue",
    yellow: "black",
    orange: "orange",
    default: "black" // デフォルトは黒に変更
};

// 色の設定を変更する関数
function changeColorSetting(colorName, textColor, hlArray) {
    colorSettings[colorName] = textColor;
    populateList(hlArray)
}

function getHighLight(doc) {
    // 各ハイライトの情報を抽出
    let hl_array = [];

    let highlight_list = doc.getElementsByClassName("a-row a-spacing-base")
    for (let highlight of highlight_list) {
        let hl_dict = {}
        number_element = highlight.querySelector("#kp-annotation-location");
        if (number_element) { // この要素を持っていたらハイライトの要素とみなす。(初回レスポンスの最初の要素だけハイライトではなかった)
            text_element = highlight.querySelector("#highlight");
            if (text_element) {
                hl_dict["text"] = text_element.innerHTML;
            } else {
                hl_dict["text"] = "<表示不可>" // 画像をハイライトした場合id='highlight'の要素は出現しない
            }
            hl_dict["num"] = number_element.value;
            hl_dict["note"] = highlight.querySelector("#note").innerHTML;
            hl_dict["color"] = highlight.querySelectorAll('[id^="highlight\-"]')[0].classList[3].split("-")[3];
            hl_array.push(hl_dict);
        }
    }
    return hl_array
}

// テーブルに行を追加する関数
function populateTable(data) {
    let table = document.getElementById('myTable').getElementsByTagName('tbody')[0];
    data.forEach(rowData => {
        let row = table.insertRow();

        let cell_color = row.insertCell();
        let cell_num = row.insertCell();
        let cell_text = row.insertCell();
        let cell_note = row.insertCell();

        let num = rowData["num"];
        let customUrlScheme = `kindle://book?action=open&asin=${asin}&location=${num}`;
        let link = `<a href="${customUrlScheme}">${num}</a>`
        cell_num.innerHTML = link;

        cell_text.textContent = rowData["text"];
        cell_text.className = "text-content"; // 折り返し用のクラスを追加

        cell_note.textContent = rowData["note"];
        cell_note.className = "text-content"; // 折り返し用のクラスを追加

        cell_color.textContent = rowData["color"];
        cell_color.className = "text-content"; // 折り返し用のクラスを追加

        // 背景色を設定
        cell_color.style.backgroundColor = rowData["color"];
    });
}

// 箇条書きリストに要素を追加する関数
function populateList(data) {
    let list = document.getElementById('myList');
    list.innerHTML = ''; // リストをクリアする

    // リスト全体のスタイルを調整する
    list.style.listStyleType = "disc"; // デフォルトの箇条書きマークを表示
    list.style.textAlign = "left"; // 左寄せ
    list.style.paddingLeft = "20px"; // 左側に余白を追加して見やすくする

    data.forEach(rowData => {
        let listItem = document.createElement('li');
        let textElement = document.createElement('span');
        textElement.textContent = rowData["text"];

        // 設定に基づいて文字色を設定する
        if(colorSettings[rowData["color"]]){
          textElement.style.color = colorSettings[rowData["color"]];
        }else{
          textElement.style.color = colorSettings.default;
        }

        listItem.appendChild(textElement);

        if (rowData["note"]) {
            let noteList = document.createElement('ul'); // メモを箇条書きにするための <ul> 要素
            noteList.style.listStyleType = "circle"; // メモの箇条書きマークをcircleに変更
            noteList.style.marginLeft = "40px"; // インデントをさらに下げる
            noteList.style.marginTop = "5px"; // 上に少し余白を作る
            let noteArray = rowData["note"].split("。");
            noteArray.forEach(noteText => {
                if (noteText) {
                    let noteItem = document.createElement('li');
                    noteItem.textContent = noteText + "。";
                    noteList.appendChild(noteItem);
                }
            });

            listItem.appendChild(noteList);
        }

        listItem.style.marginBottom = "5px"; // マージンを小さくする
        listItem.style.padding = "10px";
        list.appendChild(listItem);
    });
}

// 次のtokenとcontentLimitStateを抽出し、URLを生成
function getNexUrl(doc) {
    let contentLimitState = doc.getElementsByClassName("kp-notebook-content-limit-state")[0].value
    let nextPageToken = doc.getElementsByClassName("kp-notebook-annotations-next-page-start")[0].value
    if (nextPageToken != '') {
        let nextUrl = `https://read.amazon.co.jp/notebook?asin=${asin}&token=${nextPageToken}&contentLimitState=${contentLimitState}`;
        return nextUrl;
    } else {
        return null
    }
}

// ロード画面
function setLoadingModal() {
    let loadingModal = `
    <div id="loading-modal" class="modal">
        <div class="modal-content">
            <div class="sk-cube-grid">
                <div class="sk-cube sk-cube1"></div>
                <div class="sk-cube sk-cube2"></div>
                <div class="sk-cube sk-cube3"></div>
                <div class="sk-cube sk-cube4"></div>
                <div class="sk-cube sk-cube5"></div>
                <div class="sk-cube sk-cube6"></div>
                <div class="sk-cube sk-cube7"></div>
                <div class="sk-cube sk-cube8"></div>
                <div class="sk-cube sk-cube9"></div>
            </div>
        </div>
    </div>
    `
    document.body.insertAdjacentHTML('afterbegin', loadingModal);
}
// HTMLをテーブルで上書き
function rewriteHtmlTable(hlArray) {
    let tblString = `
    <div id="parent">
        <button id="changeViewButton">箇条書き表示へ</button>
        <table id="myTable">
            <thead>
                <tr>
                    <th>Color</th>
                    <th>No.</th>
                    <th>Text</th>
                    <th>Memo</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        </table>
    </div>
    `
    document.body.innerHTML = tblString
    populateTable(hlArray)
    document.getElementById("changeViewButton").addEventListener("click", function () { rewriteHtmlList(hlArray) });
}

// HTMLを箇条書きで上書き
function rewriteHtmlList(hlArray) {
    let listString = `
    <div id="parent">
        <button id="changeViewButton">テーブル表示へ</button>
        <div id="colorSettingArea">
            <label for="pinkColorSelect">Pink:</label>
            <select id="pinkColorSelect">
                <option value="black">black</option>
                <option value="red" selected>red</option>
                <option value="blue">blue</option>
                <option value="orange">orange</option>
            </select>
            <label for="blueColorSelect">Blue:</label>
            <select id="blueColorSelect">
                <option value="black">black</option>
                <option value="red">red</option>
                <option value="blue" selected>blue</option>
                <option value="orange">orange</option>
            </select>
            <label for="yellowColorSelect">Yellow:</label>
            <select id="yellowColorSelect">
                <option value="black" selected>black</option>
                <option value="red">red</option>
                <option value="blue">blue</option>
                <option value="orange">orange</option>
            </select>
            <label for="orangeColorSelect">Orange:</label>
            <select id="orangeColorSelect">
                <option value="black">black</option>
                <option value="red">red</option>
                <option value="blue">blue</option>
                <option value="orange" selected>orange</option>
            </select>
        </div>
        <ul id="myList">
        </ul>
    </div>
    `;

    document.body.innerHTML = listString;
    populateList(hlArray);
    document.getElementById("changeViewButton").addEventListener("click", function () { rewriteHtmlTable(hlArray) });

    // プルダウンメニューのイベントリスナーを設定する
    document.getElementById("pinkColorSelect").addEventListener("change", function () {
        changeColorSetting("pink", this.value, hlArray);
    });
    document.getElementById("blueColorSelect").addEventListener("change", function () {
        changeColorSetting("blue", this.value, hlArray);
    });
    document.getElementById("yellowColorSelect").addEventListener("change", function () {
        changeColorSetting("yellow", this.value, hlArray);
    });
    document.getElementById("orangeColorSelect").addEventListener("change", function () {
        changeColorSetting("orange", this.value, hlArray);
    });
}

async function fetchSequentially(initialUrl, hlArray) {
    try {
        const parser = new DOMParser();

        let currentUrl = initialUrl;
        let count = 0;

        while (currentUrl && count < 20) {
            const response = await fetch(currentUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            let result = await response.text();
            let doc = parser.parseFromString(result, 'text/html');

            newHlArray = getHighLight(doc)
            hlArray = hlArray.concat(newHlArray)

            // 次のURLをresultから決定する。URLがない場合はループを終了する。
            currentUrl = getNexUrl(doc);
            count++;
        }

        rewriteHtmlTable(hlArray)
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

if (asin) { // パラメータとしたasinが与えられている場合のみ実行(メモとハイライトのページでは実行されないようにする)
    setLoadingModal();
    let hlArray = getHighLight(document);
    const initialUrl = getNexUrl(document)
    fetchSequentially(initialUrl, hlArray);
}
