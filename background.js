// background.js
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
  });
});

// Notion関連の変数を追加
let notionApiKey = '';
let notionDatabaseId = '';

//ストレージからデータ取得
function loadNotionSetting() {
  return new Promise((resolve) => {
      chrome.storage.sync.get(['notionApiKey', 'notionDatabaseId'], (result) => {
          notionApiKey = result.notionApiKey || '';
          notionDatabaseId = result.notionDatabaseId || '';
          resolve();
      });
  });
}

// Notion APIにデータを送信する関数
async function sendToNotion(data, format) {
  if (!notionApiKey || !notionDatabaseId) {
      alert('Notion API Key and Database ID are not set. Please go to the extension options.');
      return;
  }

  const headers = {
      'Authorization': `Bearer ${notionApiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28', // Update if necessary
  };

  const createPageUrl = 'https://api.notion.com/v1/pages';

  try {
      console.log("Headers:", headers);
      if (format === 'table') {
          for (const rowData of data) {
              const properties = {
                  '名前': { 'title': [{ 'text': { 'content': rowData.text } }] },
                  // 'Location': { 'number': Number(rowData.num) }, // Locationを数値型に変更
                  // 'Color': { 'select': { 'name': rowData.color } },
                  // 'Note': { 'rich_text': [{ 'text': { 'content': rowData.note } }] },
                  // Add any other properties here
              };
              const body = JSON.stringify({ // ここでbody変数を定義
                  'parent': { 'database_id': notionDatabaseId },
                  'properties': properties,
              });
              console.log("Body:", body); // ここに移動
              //fetch文をfor文の中に移動
              const response = await fetch(createPageUrl, { method: 'POST', headers:headers, body:body });
              if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(`Notion API error: ${response.status} - ${JSON.stringify(errorData)}`);
              }
          }
      } else if (format === 'list') {
          const children = [];
          const properties = {
            '名前': { 'title': [{ 'text': { 'content': "testtitle" } }] },
            // 'Location': { 'number': Number(rowData.num) }, // Locationを数値型に変更
            // 'Color': { 'select': { 'name': rowData.color } },
            // 'Note': { 'rich_text': [{ 'text': { 'content': rowData.note } }] },
            // Add any other properties here
        };
        let ii  =0
          for (const rowData of data) {
              children.push({
                  'object': 'block',
                  'type': 'bulleted_list_item',
                  'bulleted_list_item': {
                      'rich_text': [{
                          'type': 'text',
                          'text': { 'content': rowData.text }
                      }]
                  }
              });
              ii++;
              if(ii>80){
                break
              }
              // //メモがある場合は、サブの箇条書きとして作成
              // if (rowData.note) {
              //     const noteArray = rowData.note.split("。");
              //     let ii = 0
              //     let hoge = true;
              //     noteArray.forEach(noteText => {
              //         if (noteText && hoge) {
              //             children.push({
              //                 'object': 'block',
              //                 'type': 'bulleted_list_item',
              //                 'bulleted_list_item': {
              //                     'rich_text': [{
              //                         'type': 'text',
              //                         'text': { 'content': noteText + "。" }
              //                     }]
              //                 }
              //             });
              //             i++;
              //             if(ii>80){
              //               console.log("hohogehogeogehogehgoehgeo")
              //               hoge=false
              //             }
              //         }
              //     })
              // }
          }
          const body = JSON.stringify({
              'parent': { 'database_id': notionDatabaseId },
              'properties': properties,
              'children': children,
          });
          console.log("Body:", body); // ここに移動
           //fetch文は、for文の外
          const response = await fetch(createPageUrl, { method: 'POST', headers:headers, body: body });
          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`Notion API error: ${response.status} - ${JSON.stringify(errorData)}`);
          }
      }
      // alert('Successfully sent to Notion!');
  } catch (error) {
      console.error('Error sending to Notion:', error);
      // alert(`Error sending to Notion: ${error.message}`);
  }
}

// メッセージ受信
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'sendToNotion') {
      //loadNotionSettingを読み込む。
      await loadNotionSetting()
      await sendToNotion(request.data, request.format);
  }
});
