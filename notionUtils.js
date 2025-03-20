// notionUtils.js

// ストレージからNotion設定をロードする関数
function loadNotionSetting() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['notionApiKey', 'notionDatabaseId'], (result) => {
            resolve({
                notionApiKey: result.notionApiKey || '',
                notionDatabaseId: result.notionDatabaseId || '',
            });
        });
    });
}

// ストレージからカラー設定とh2ターゲットカラーを取得する関数
function loadColorSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['colorSettings', 'h2TargetColor'], (result) => {
            resolve({
                colorSettings: result.colorSettings || {
                    pink: "red",
                    blue: "blue",
                    yellow: "yellow",
                    orange: "orange",
                    default: "default"
                },
                h2TargetColor: result.h2TargetColor || "",
            });
        });
    });
}

// リスト形式用のNotionページ作成用Body作成関数
function createNotionListPageBody(data, colorSettings, h2TargetColor) {
    const children = [];

    // h2のタイトル作成関数
    function createH2Block(text) {
        return {
            'object': 'block',
            'type': 'heading_2',
            'heading_2': {
                'rich_text': [{
                    'type': 'text',
                    'text': { 'content': text },
                }],
            }
        }
    }

    for (const rowData of data) {
        const notionColor = colorSettings[rowData.color] || "default";

        if (rowData.color === h2TargetColor) { // h2要素の場合
            children.push(createH2Block(rowData.text));

            if (rowData.note) { // noteも表示
                const noteRichText = [
                    {
                        'type': 'text',
                        'text': { 'content': rowData.note }
                    }
                ];
                children.push({
                    'object': 'block',
                    'type': 'paragraph',
                    'paragraph': {
                        'rich_text': noteRichText
                    },
                });
            }
        } else { // 通常のリスト要素の場合
            const richText = [
                {
                    'type': 'text',
                    'text': { 'content': rowData.text },
                    'annotations': { 'color': notionColor === "black" ? "default" : notionColor } // notionにblackはなくdefaultが黒に相当。
                }
            ];
            children.push({
                'object': 'block',
                'type': 'bulleted_list_item',
                'bulleted_list_item': {
                    'rich_text': richText,
                },
            });
            if (rowData.note) {
                const noteRichText = [
                    {
                        'type': 'text',
                        'text': { 'content': "メモ：" + rowData.note }
                    }
                ];
                children.push({
                    'object': 'block',
                    'type': 'bulleted_list_item',
                    'bulleted_list_item': {
                        'rich_text': noteRichText
                    },
                });
            }
        }
    }
    return children;
}

// Notion APIにデータを送信する関数
async function sendToNotion(data, format, title, asin) { // asin引数を追加
    const { notionApiKey, notionDatabaseId } = await loadNotionSetting();
    const { colorSettings, h2TargetColor } = await loadColorSettings();

    if (!notionApiKey || !notionDatabaseId) {
        alert('Notion API Key and Database ID are not set. Please go to the extension options.');
        return false; // エラー時はfalseを返す
    }

    const headers = {
        'Authorization': `Bearer ${notionApiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28', // 必要に応じて更新
    };

    const createPageUrl = 'https://api.notion.com/v1/pages';
    const appendBlockUrl = 'https://api.notion.com/v1/blocks/';

    try {
        if (format === 'table') {
            for (const rowData of data) {
                const body = createNotionTablePageBody(rowData, notionDatabaseId);
                const response = await fetch(createPageUrl, { method: 'POST', headers, body });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Notion API error: ${response.status} - ${JSON.stringify(errorData)}`);
                }
            }
        } else if (format === 'list') {
            // 最初にページを作成
            const initialPageBody = JSON.stringify({
                'parent': { 'database_id': notionDatabaseId },
                'properties': {
                    '名前': { 'title': [{ 'text': { 'content': title } }] }, // タイトルを動的に設定
                    'ASIN': { 'rich_text': [{ 'text': { 'content': asin } }] }, // ASINを追加
                },
                "cover": {
                    "type": "external",
                    "external": {
                        "url": `https://images-na.ssl-images-amazon.com/images/P/${asin}.09.LZZZZZZZ`
                    }
                },
                "icon": {
                    "type": "external",
                    "external": {
                        "url": `https://images-na.ssl-images-amazon.com/images/P/${asin}.09.THUMBZZZ`
                    }
                },
                'children': [], //一旦childrenを空にする。
            });
            const initialPageResponse = await fetch(createPageUrl, { method: 'POST', headers, body: initialPageBody });
            if (!initialPageResponse.ok) {
                const errorData = await initialPageResponse.json();
                throw new Error(`Notion API error: ${initialPageResponse.status} - ${JSON.stringify(errorData)}`);
            }
            const initialPageData = await initialPageResponse.json();
            const pageId = initialPageData.id;

            // 全体のchildrenを取得
            const allChildren = createNotionListPageBody(data, colorSettings, h2TargetColor);

            // リスト形式の場合、100個ずつに分割して送信
            const chunkSize = 100;
            for (let i = 0; i < allChildren.length; i += chunkSize) {
                const chunk = allChildren.slice(i, i + chunkSize);
                const body = JSON.stringify({ 'children': chunk });
                const response = await fetch(`${appendBlockUrl}${pageId}/children`, { method: 'PATCH', headers, body });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Notion API error: ${response.status} - ${JSON.stringify(errorData)}`);
                }
            }
        }
        return true; // 成功時はtrueを返す
    } catch (error) {
        console.error('Error sending to Notion:', error);
        return false; // エラー時はfalseを返す
    }
}

export { sendToNotion };
