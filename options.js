document.addEventListener('DOMContentLoaded', () => {
    const notionApiKeyInput = document.getElementById('notionApiKey');
    const notionDatabaseIdInput = document.getElementById('notionDatabaseId');
    const saveButton = document.getElementById('saveButton');
    const messageDiv = document.getElementById('message');
  
    // Load saved options
    chrome.storage.sync.get(['notionApiKey', 'notionDatabaseId'], (result) => {
      notionApiKeyInput.value = result.notionApiKey || '';
      notionDatabaseIdInput.value = result.notionDatabaseId || '';
    });
  
    // Save options
    saveButton.addEventListener('click', () => {
      const notionApiKey = notionApiKeyInput.value.trim();
      const notionDatabaseId = notionDatabaseIdInput.value.trim();
  
      if (!notionApiKey) {
        messageDiv.textContent = 'Error: Notion API Key is required.';
        messageDiv.style.color = 'red';
        return;
      }
  
      if (!notionDatabaseId) {
        messageDiv.textContent = 'Error: Notion Database ID is required.';
        messageDiv.style.color = 'red';
        return;
      }
  
      chrome.storage.sync.set({ notionApiKey, notionDatabaseId }, () => {
        messageDiv.textContent = 'Options saved.';
        messageDiv.style.color = 'black';
        setTimeout(() => {
          messageDiv.textContent = '';
        }, 2000);
      });
    });
  });
  