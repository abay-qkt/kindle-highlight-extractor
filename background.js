// background.js
import { sendToNotion } from './notionUtils.js'; // 追加・修正

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
  });
});

// メッセージ受信
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'sendToNotion') {
      //loadNotionSettingはnotionUtils.jsに移動。
      await sendToNotion(request.data, request.format, request.title, request.asin); // titleとasinを渡す
  }
});