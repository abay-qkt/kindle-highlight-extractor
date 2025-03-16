
// URL からクエリパラメータを取得する
const queryParams = new URLSearchParams(window.location.search);
const asin = queryParams.get('asin');

// 色情報と文字色の対応関係をオブジェクトで管理する (デフォルト設定)
let colorSettings = {
    pink: "red",
    blue: "blue",
    yellow: "yellow_background", //黄色はbackground
    orange: "orange_background",//オレンジはbackground
    default: "default"
};

// h2要素にする対象の色 (デフォルトは "")
let h2TargetColor = "";

// どの色がアクティブ（チェックされているか）を管理するオブジェクト
let activeColors = {};

// 色の設定を変更する関数
function changeColorSetting(colorName, textColor, hlArray) {
    colorSettings[colorName] = textColor;
    populateList(hlArray)

    // ストレージにカラー設定を保存
    chrome.storage.sync.set({ colorSettings: colorSettings });
}

// 初回読み込み時
window.addEventListener('DOMContentLoaded', (event) => {
    // ストレージからカラー設定をロード
    chrome.storage.sync.get(['colorSettings', 'h2TargetColor'], (result) => {
        if (result.colorSettings) {
            colorSettings = result.colorSettings;
            // プルダウンを更新
            document.getElementById("pinkColorSelect").value = colorSettings["pink"];
            document.getElementById("blueColorSelect").value = colorSettings["blue"];
            document.getElementById("yellowColorSelect").value = colorSettings["yellow"];
            document.getElementById("orangeColorSelect").value = colorSettings["orange"];
        }
        if (result.h2TargetColor) {
            h2TargetColor = result.h2TargetColor;
            // プルダウンを更新
            document.getElementById("h2TargetColorSelect").value = h2TargetColor;
        }
    });
});

function getBookTitle(doc) {
    // h3要素をすべて取得
    const h3Elements = doc.querySelectorAll('h3');

    // h3要素がない場合はエラーメッセージを返す
    if (!h3Elements || h3Elements.length === 0) {
        return "タイトル取得失敗";
    }

    // h3要素が一つ以上ある場合は、最初の要素のテキストコンテンツを返す
    return h3Elements[0].textContent.trim();
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
    table.innerHTML = ""; // テーブルをクリア

    data.forEach(rowData => {
        // フィルタリング：activeColorsに含まれる色のみ表示
        if (activeColors[rowData["color"]]) {
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
        }
    });
}

// 箇条書きリストに要素を追加する関数
function populateList(data) {
    let holePage = document.getElementById('holePage');
    holePage.innerHTML = ''; // 一旦中身を空にする

    let currentlist = document.createElement('ul');

    data.forEach((rowData) => {
        // h2要素にするかの判定
        let isTargeth2 = rowData["color"] === h2TargetColor; // 現在の行がh2対象色かどうか

        // テキスト要素の作成
        textElement = document.createElement('span');
        textElement.textContent = rowData["text"];

        if (isTargeth2) { // h2対象色の場合
            let h2Element = document.createElement('h2');
            h2Element.appendChild(textElement);
            holePage.appendChild(h2Element);
            if (rowData["note"]) {  // noteがある場合
                holePage.appendChild(rowData["note"])
            }

            // 新たなリスト要素を作成し、次のループで使う
            currentlist = document.createElement('ul');
        } else {  // 通常のリスト
            let listItem = document.createElement('li');
            listItem.appendChild(textElement);
            if (rowData["note"]) {  // noteがある場合字下げして追加
                let noteList = document.createElement('ul');
                let noteItem = document.createElement('li');
                noteItem.textContent = rowData["note"];
                noteList.appendChild(noteItem);
                listItem.appendChild(noteList);
            }
            currentlist.appendChild(listItem);

            // 設定に基づいて文字色を設定する
            if (colorSettings[rowData["color"]]) {
                textElement.style.color = colorSettings[rowData["color"]];
            } else {
                textElement.style.color = colorSettings.default;
            }
        }
        holePage.appendChild(currentlist);
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

// HTMLを上書きする関数
function rewriteHtml(hlArray, mode) {
    let buttonString;
    let selectArea;
    let contentString;

    //アクティブカラーの初期化
    activeColors = {
        pink: true,
        blue: true,
        yellow: true,
        orange: true,
        default: true
    };

    let sendButtonString = `<button id="sendNotionButton">Notionへ送信</button>`;

    if (mode === 'table') {
        buttonString = `
        <div id="buttonArea">
        <button id="changeViewButton">箇条書き表示へ</button>

        </div>
        <div id="colorFilterArea">
            <label><input type="checkbox" id="pinkFilter" checked>pink</label>
            <label><input type="checkbox" id="blueFilter" checked>blue</label>
            <label><input type="checkbox" id="yellowFilter" checked>yellow</label>
            <label><input type="checkbox" id="orangeFilter" checked>orange</label>
        </div>
        `;
        selectArea = ''; // テーブル表示時はプルダウンなし
        contentString = `
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
        `;
    } else if (mode === 'list') {
        buttonString = `
        <div id="buttonArea">
        <button id="changeViewButton">テーブル表示へ</button>
        ${sendButtonString}
        </div>
        `;
        selectArea = `        
        <div id="h2TargetColorArea">
            <div id="h2SelectContainer">
                <label for="h2TargetColorSelect">h2対象色:</label>
                <select id="h2TargetColorSelect">
                    <option value="" ${h2TargetColor === null ? "selected" : ""}></option>
                    <option value="pink" ${h2TargetColor === "pink" ? "selected" : ""}>pink</option>
                    <option value="blue" ${h2TargetColor === "blue" ? "selected" : ""}>blue</option>
                    <option value="yellow" ${h2TargetColor === "yellow" ? "selected" : ""}>yellow</option>
                    <option value="orange" ${h2TargetColor === "orange" ? "selected" : ""}>orange</option>
                </select>
            </div>
        </div>
        <div id="colorSettingArea">
            <label for="pinkColorSelect">pink:</label>
            <select id="pinkColorSelect">
                <option value="black">black</option>
                <option value="red" selected>red</option>
                <option value="blue">blue</option>
                <option value="orange">orange</option>
            </select>
            <label for="blueColorSelect">blue:</label>
            <select id="blueColorSelect">
                <option value="black">black</option>
                <option value="red">red</option>
                <option value="blue" selected>blue</option>
                <option value="orange">orange</option>
            </select>
            <label for="yellowColorSelect">yellow:</label>
            <select id="yellowColorSelect">
                <option value="black" selected>black</option>
                <option value="red">red</option>
                <option value="blue">blue</option>
                <option value="orange">orange</option>
            </select>
            <label for="orangeColorSelect">orange:</label>
            <select id="orangeColorSelect">
                <option value="black">black</option>
                <option value="red">red</option>
                <option value="blue">blue</option>
                <option value="orange" selected>orange</option>
            </select>
        </div>
        `;
        contentString = `<div id="holePage"></div>`;
    }

    let parentString = `
    <div id="parent">
        ${buttonString}
        ${selectArea}
        ${contentString}
    </div>
    `;
    document.body.innerHTML = parentString;
    if (mode === 'table') {
        populateTable(hlArray);
         // チェックボックスのイベントリスナーを設定する(表モードの時のみイベント設定)
        document.getElementById('pinkFilter').addEventListener('change', () => {
            activeColors['pink'] = !activeColors['pink'];
            populateTable(hlArray);
        });
        document.getElementById('blueFilter').addEventListener('change', () => {
            activeColors['blue'] = !activeColors['blue'];
            populateTable(hlArray);
        });
        document.getElementById('yellowFilter').addEventListener('change', () => {
            activeColors['yellow'] = !activeColors['yellow'];
            populateTable(hlArray);
        });
        document.getElementById('orangeFilter').addEventListener('change', () => {
            activeColors['orange'] = !activeColors['orange'];
            populateTable(hlArray);
        });
    } else if (mode === 'list') {
        populateList(hlArray);
    }
    document.getElementById("changeViewButton").addEventListener("click", function () {
        if (mode === 'table') {
            rewriteHtml(hlArray, 'list')
        } else {
            rewriteHtml(hlArray, 'table')
        }
    });

    // プルダウンメニューのイベントリスナーを設定する(リストモードの時のみイベント設定)
    if (mode === 'list') {
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

        // h2のカラー変更処理
        document.getElementById("h2TargetColorSelect").addEventListener("change", function () {
            h2TargetColor = this.value;
            populateList(hlArray);
            chrome.storage.sync.set({ h2TargetColor: h2TargetColor }); // ストレージに保存
        });

        // Notionへ送信ボタンのイベントリスナー
        document.getElementById('sendNotionButton').addEventListener('click', async () => {
            chrome.runtime.sendMessage({ action: 'sendToNotion', data: hlArray, format: 'list' });
        });
    }    
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

        rewriteHtml(hlArray, 'table')
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