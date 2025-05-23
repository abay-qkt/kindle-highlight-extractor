
// URL からクエリパラメータを取得する
const queryParams = new URLSearchParams(window.location.search);
const asin = queryParams.get('asin');
let bookTitle = "タイトル";

// 色情報と文字色の対応関係をオブジェクトで管理する (デフォルト設定)
let colorSettings = {
    pink: "red",
    blue: "blue",
    yellow: "black", 
    orange: "orange", 
    default: "default"
};

// h2要素にする対象の色 (デフォルトは "")
let h2TargetColor = "";
// 太字にする対象の色
let boldTargetColor = "";
// 斜体にする対象の色
let italicTargetColor = "";

// どの色がアクティブ（チェックされているか）を管理するオブジェクト
let activeColors = {};

const FILTER_COLOR_NAMES = ['pink', 'blue', 'yellow', 'orange'];
// 色の設定を変更する関数
function changeColorSetting(colorName, textColor, hlArray) {
    colorSettings[colorName] = textColor;
    populateList(hlArray)

    // ストレージにカラー設定を保存
    chrome.storage.sync.set({ colorSettings: colorSettings });
}

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

        let textContent = rowData["text"];
        if (rowData["color"] === boldTargetColor && boldTargetColor !== "") {
            textContent = `<strong>${textContent}</strong>`;
        }
        if (rowData["color"] === italicTargetColor && italicTargetColor !== "") {
            textContent = `<em>${textContent}</em>`;
        }

        const textElement = document.createElement('span');
        textElement.innerHTML = textContent; // textContentをinnerHTMLとして設定

        if (isTargeth2) { // h2対象色の場合
            let h2Element = document.createElement('h2');
            h2Element.appendChild(textElement);
            holePage.appendChild(h2Element);
            if (rowData["note"]) {  // noteがある場合
                let noteSpan = document.createElement('span');
                let noteContent = rowData["note"];

                if (rowData["color"] === boldTargetColor && boldTargetColor !== "") {
                    noteContent = `<strong>${noteContent}</strong>`;
                }
                if (rowData["color"] === italicTargetColor && italicTargetColor !== "") {
                    noteContent = `<em>${noteContent}</em>`;
                }
                noteSpan.innerHTML = noteContent;
                holePage.appendChild(noteSpan);
            }
            // 新たなリスト要素を作成し、次のループで使う
            currentlist = document.createElement('ul');
        } else {  // 通常のリスト
            let listItem = document.createElement('li');
            listItem.appendChild(textElement); // textElementをlistItemに追加

            if (rowData["note"]) {  // noteがある場合字下げして追加
                let noteList = document.createElement('ul');
                let noteItem = document.createElement('li');
                let noteTextSpan = document.createElement('span');
                let noteText = rowData["note"];

                if (rowData["color"] === boldTargetColor && boldTargetColor !== "") {
                    noteText = `<strong>${noteText}</strong>`;
                }
                if (rowData["color"] === italicTargetColor && italicTargetColor !== "") {
                    noteText = `<em>${noteText}</em>`;
                }
                noteTextSpan.innerHTML = noteText;

                // Apply color to note text span as well
                noteTextSpan.style.color = colorSettings[rowData["color"]] ? colorSettings[rowData["color"]] : colorSettings.default;

                noteItem.appendChild(noteTextSpan);
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

// チェックボックスGUIの有効/無効を切り替える関数
function setCheckboxGuiEnabled(enabled) {
    const checkboxes = document.querySelectorAll('#colorFilterArea input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.disabled = !enabled;
    });
    const filterArea = document.getElementById('colorFilterArea');
    if (filterArea) {
        filterArea.style.opacity = enabled ? '1' : '0.5';
        // filterArea.style.pointerEvents = enabled ? 'auto' : 'none'; // 必要に応じて
    }
}

let lastDoubleClickedColor = null; // テーブルモードのダブルクリック状態管理用

// HTMLを上書きする関数
function rewriteHtml(hlArray, mode) {
    let baseButtonAreaHtml = `<div id="buttonArea">`; // ボタンや主要なコントロールを配置するエリア
    let viewSpecificControls = ''; // モードによって変わるコントロール（チェックボックス、ラジオボタン、セレクトボックスなど）
    let contentString;

    // アクティブカラーの初期化 (テーブルモードのデフォルト状態)
    activeColors = {
        pink: true,
        blue: true,
        yellow: true,
        orange: true,
        default: true // 'default' 色のアイテムも初期状態では表示対象
    };
     
    // ストレージからカラー設定をロード
    chrome.storage.sync.get(['colorSettings', 'h2TargetColor', 'boldTargetColor', 'italicTargetColor'], (result) => {
        if (result.colorSettings) {
            colorSettings = result.colorSettings;
            // プルダウンを更新
            if (document.getElementById("pinkColorSelect")) {
                document.getElementById("pinkColorSelect").value = colorSettings["pink"];
                document.getElementById("blueColorSelect").value = colorSettings["blue"];
                document.getElementById("yellowColorSelect").value = colorSettings["yellow"];
                document.getElementById("orangeColorSelect").value = colorSettings["orange"];
            }
        }
        if (result.h2TargetColor) {
            h2TargetColor = result.h2TargetColor;
            // プルダウンを更新
            if (document.getElementById("h2TargetColorSelect"))
                document.getElementById("h2TargetColorSelect").value = h2TargetColor;
        }
        if (result.boldTargetColor) {
            boldTargetColor = result.boldTargetColor;
            if (document.getElementById("boldTargetColorSelect"))
                document.getElementById("boldTargetColorSelect").value = boldTargetColor;
        }
        if (result.italicTargetColor) {
            italicTargetColor = result.italicTargetColor;
            if (document.getElementById("italicTargetColorSelect"))
                document.getElementById("italicTargetColorSelect").value = italicTargetColor;
        }
    });

    let sendButtonString = `<button id="sendNotionButton">Notionへ送信</button>`;

    if (mode === 'table') {
        lastDoubleClickedColor = null; // テーブル表示切り替え時にダブルクリック状態をリセット
        baseButtonAreaHtml += `<button id="changeViewButton">箇条書き表示へ</button>`;
        // sendButtonString はテーブルモードでは表示しない

        const colorFilterCheckboxesHtml = `
        <div id="colorFilterArea" style="margin-bottom: 10px; text-align: center;">
            ${FILTER_COLOR_NAMES.map(color =>
                `<label style="margin-right: 5px;"><input type="checkbox" id="${color}Filter" data-color="${color}" checked>${color}</label>`
            ).join('')}
        </div>`;

        const radioFiltersHtml = `
        <div id="radioFilterArea" style="margin-bottom: 10px; text-align: center;">
            <label><input type="radio" name="filterMode" value="checkbox" checked> Checkbox Mode</label>
            ${FILTER_COLOR_NAMES.map(color =>
                `<label style="margin-left: 10px;"><input type="radio" name="filterMode" value="${color}"> ${color.charAt(0).toUpperCase() + color.slice(1)} Only</label>`
            ).join('')}
        </div>`;
        viewSpecificControls = colorFilterCheckboxesHtml + radioFiltersHtml;

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
        baseButtonAreaHtml += `<button id="changeViewButton">テーブル表示へ</button>${sendButtonString}`;

        let listModeSelects = `
        <div id="styleTargetColorContainer" style="display: flex; align-items: flex-end; justify-content: center; margin-bottom: 10px;">
            <div id="h2TargetColorArea" style="margin-right: 15px;">
                <div id="h2SelectContainer">
                    <label for="h2TargetColorSelect">h2対象色:</label>
                    <select id="h2TargetColorSelect">
                        <option value="" ${h2TargetColor === "" ? "selected" : ""}></option>
                        <option value="pink" ${h2TargetColor === "pink" ? "selected" : ""}>pink</option>
                        <option value="blue" ${h2TargetColor === "blue" ? "selected" : ""}>blue</option>
                        <option value="yellow" ${h2TargetColor === "yellow" ? "selected" : ""}>yellow</option>
                        <option value="orange" ${h2TargetColor === "orange" ? "selected" : ""}>orange</option>
                    </select>
                </div>
            </div>
            <div id="boldTargetColorArea" style="margin-right: 15px;">
                <div id="boldSelectContainer">
                    <label for="boldTargetColorSelect">太字対象色:</label>
                    <select id="boldTargetColorSelect">
                        <option value="" ${boldTargetColor === "" ? "selected" : ""}></option>
                        <option value="pink" ${boldTargetColor === "pink" ? "selected" : ""}>pink</option>
                        <option value="blue" ${boldTargetColor === "blue" ? "selected" : ""}>blue</option>
                        <option value="yellow" ${boldTargetColor === "yellow" ? "selected" : ""}>yellow</option>
                        <option value="orange" ${boldTargetColor === "orange" ? "selected" : ""}>orange</option>
                    </select>
                </div>
            </div>
            <div id="italicTargetColorArea">
                <div id="italicSelectContainer">
                    <label for="italicTargetColorSelect">斜体対象色:</label>
                    <select id="italicTargetColorSelect">
                        <option value="" ${italicTargetColor === "" ? "selected" : ""}></option>
                        <option value="pink" ${italicTargetColor === "pink" ? "selected" : ""}>pink</option>
                        <option value="blue" ${italicTargetColor === "blue" ? "selected" : ""}>blue</option>
                        <option value="yellow" ${italicTargetColor === "yellow" ? "selected" : ""}>yellow</option>
                        <option value="orange" ${italicTargetColor === "orange" ? "selected" : ""}>orange</option>
                    </select>
                </div>
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
        viewSpecificControls = listModeSelects;
        contentString = `<div id="holePage"></div>`;
    }
    baseButtonAreaHtml += `</div>`; // ボタンエリアの終了

    let parentString = `
    <div id="parent">
        ${baseButtonAreaHtml}
        ${viewSpecificControls}
        ${contentString}
    </div>
    `;
    document.body.innerHTML = parentString;

    if (mode === 'table') {
        populateTable(hlArray);
        setCheckboxGuiEnabled(true); // 初期状態はCheckbox ModeなのでGUI有効

        // Radio button listeners
        const radioButtons = document.querySelectorAll('input[name="filterMode"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', (event) => {
                const selectedMode = event.target.value;
                if (selectedMode === 'checkbox') {
                    setCheckboxGuiEnabled(true);
                    // Restore activeColors based on current checkbox states
                    FILTER_COLOR_NAMES.forEach(colorName => {
                        const cb = document.getElementById(`${colorName}Filter`);
                        if (cb) activeColors[colorName] = cb.checked;
                    });
                    activeColors.default = true; // Checkbox mode might show 'default' colored items
                    lastDoubleClickedColor = null; // Reset dblclick state
                } else { // A specific color is selected (e.g., "pink")
                    setCheckboxGuiEnabled(false);
                    FILTER_COLOR_NAMES.forEach(colorName => {
                        activeColors[colorName] = (colorName === selectedMode);
                    });
                    activeColors.default = false; // Single color mode should not show 'default' items
                }
                populateTable(hlArray);
            });
        });

        // Checkbox listeners (change and dblclick)
        FILTER_COLOR_NAMES.forEach(colorName => {
            const checkbox = document.getElementById(`${colorName}Filter`);
            if (checkbox) {
                checkbox.addEventListener('change', () => {
                    if (checkbox.disabled) return; // GUIが無効なら何もしない
                    activeColors[colorName] = checkbox.checked;
                    // If all checkboxes are unchecked, should 'default' still be true?
                    // This depends on desired behavior. For now, 'default' is handled by radio buttons.
                    populateTable(hlArray);
                });

                checkbox.addEventListener('dblclick', (event) => {
                    if (checkbox.disabled) return; // GUIが無効なら何もしない
                    event.preventDefault();

                    if (lastDoubleClickedColor === colorName) {
                        // 2回目のダブルクリック: 全てを選択状態にする
                        FILTER_COLOR_NAMES.forEach(c => {
                            const cb = document.getElementById(`${c}Filter`);
                            if (cb) {
                                cb.checked = true;
                                activeColors[c] = true;
                            }
                        });
                        activeColors.default = true; // 全選択なので default も表示対象に戻す
                        lastDoubleClickedColor = null; // 状態をリセット
                    } else {
                        // 1回目のダブルクリック: この色だけを選択状態にする
                        FILTER_COLOR_NAMES.forEach(c => {
                            const cb = document.getElementById(`${c}Filter`);
                            if (cb) {
                                const isTargetColor = (c === colorName);
                                cb.checked = isTargetColor;
                                activeColors[c] = isTargetColor;
                            }
                        });
                        activeColors.default = false; // 単一色選択なので default は非表示
                        lastDoubleClickedColor = colorName; // 現在の色を記録
                    }
                    populateTable(hlArray);
                });
            }
        });
    } else if (mode === 'list') {
        populateList(hlArray);
    }

    // --- 共通のイベントリスナー ---
    document.getElementById("changeViewButton").addEventListener("click", function () {
        if (mode === 'table') { // 現在のモードがテーブルモードなら
            rewriteHtml(hlArray, 'list')  // リストモードに切り替える
        } else {
            rewriteHtml(hlArray, 'table')
        }
    });

    if (mode === 'list') { // --- リストモード専用のイベントリスナー ---
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

        // Bold color change
        document.getElementById("boldTargetColorSelect").addEventListener("change", function () {
            boldTargetColor = this.value;
            populateList(hlArray);
            chrome.storage.sync.set({ boldTargetColor: boldTargetColor });
        });

        // Italic color change
        document.getElementById("italicTargetColorSelect").addEventListener("change", function () {
            italicTargetColor = this.value;
            populateList(hlArray);
            chrome.storage.sync.set({ italicTargetColor: italicTargetColor });
        });

        // Notionへ送信ボタンのイベントリスナー
        document.getElementById('sendNotionButton').addEventListener('click', async () => {
            // メッセージにタイトルとASINを追加して送信
            chrome.runtime.sendMessage({ action: 'sendToNotion', data: hlArray, format: 'list', title: bookTitle, asin: asin });
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

            newHlArray = getHighLight(doc);
            hlArray = hlArray.concat(newHlArray);

            // 次のURLをresultから決定する。URLがない場合はループを終了する。
            currentUrl = getNexUrl(doc);
            count++;
        }

        rewriteHtml(hlArray, 'table')
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

// 送信完了のポップアップを表示する関数
function showSuccessPopup() {
    const popup = document.createElement('div');
    popup.id = 'success-popup';
    popup.textContent = 'Notionへの送信が完了しました！';
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: #4CAF50;
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
    `;
    document.body.appendChild(popup);

    // ポップアップを表示
    setTimeout(() => {
        popup.style.opacity = '1';
    }, 10);

    // 3秒後にポップアップを非表示にして削除
    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(popup);
        }, 500);
    }, 3000);
}

if (asin) { // パラメータとしたasinが与えられている場合のみ実行(メモとハイライトのページでは実行されないようにする)
    setLoadingModal();
    bookTitle = getBookTitle(document);  // タイトル取得
    let hlArray = getHighLight(document);
    const initialUrl = getNexUrl(document);
    fetchSequentially(initialUrl, hlArray);
} else {
    let right_space = document.getElementsByClassName("a-column a-span3 a-text-right a-spacing-top-mini a-span-last")[0];
    let jump_button = document.createElement("button"); // ボタン要素を作成
    jump_button.textContent = "拡張ページへジャンプ";
    jump_button.style.margin = "5px";
    // クリックイベントをつける
    jump_button.addEventListener("click", () => {
        let selected_asin = document.getElementById('kp-notebook-annotations-asin').value;
        window.open(`https://read.amazon.co.jp/notebook?asin=${selected_asin}&contentLimitState=&`, "_blank");
    });
    right_space.appendChild(jump_button);  // 要素に追加
}

// メッセージ受信
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'notionSendComplete') {
        showSuccessPopup();
    }
});