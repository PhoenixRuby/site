registerModal('chat', {

  init() {
    /* --- cross-module dependency: lastSecret from QR scanner --- */
    window.chatLastSecret = window.chatLastSecret || '';
    window.setLastSecret = function (s) { window.chatLastSecret = s; };

    /* ========== HTML ========== */
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
<dialog id="chatModalBg" class="app-dialog" aria-labelledby="chatModalTitle" aria-describedby="chatModalSubtitle">
    <div class="chat-modal">
      <header class="app-modal-header">
        <span class="app-modal-header-icon" aria-hidden="true">${resolveIcon('chat')}</span>
        <div class="app-modal-header-info">
          <h2 class="app-modal-header-title" id="chatModalTitle">裝置資訊設定</h2>
          <p class="app-modal-header-subtitle" id="chatModalSubtitle">選擇設定卡片，預覽請求內容並執行加密或解密。</p>
        </div>
        <button type="button" class="app-modal-header-close" id="chatCloseBtn" aria-label="關閉">✕</button>
      </header>
      <div class="app-dialog-body">
<div class="chat-profile-toolbar"><strong>設定卡片（右鍵可編輯、複製或刪除）</strong><button type="button" id="chatAddCard">＋ 新增設定</button></div>
<div id="chatProfileCards" class="chat-profile-cards"></div>
<div id="jsonFormMode" class="json-form-container">

  <div class="section">
    <div class="left-section">
        <div class="json-form">

            <div class="form-group">
                <span class="json-key">Base URL</span>
                <span class="json-colon">:</span>
                <input type="url" id="chatBaseUrl" class="form-input" placeholder="https://example.com/Login/AppLogin">
            </div>

            <div class="form-group">
                <span class="json-key">廠商代碼</span>
                <span class="json-colon">:</span>
                <input type="text" id="clientid" placeholder="Client ID" value="TEST"
                       class="form-input" >
            </div>


            <div class="form-group">
                <span class="json-key">"gid"</span>
                <span class="json-colon">:</span>
                <input type="text"
                       class="form-input"
                       id="gid"
                       value="GID71171171171171"
                       <!-- pattern="^GID[0-9]{14}$" -->
                       title="格式: GID + 14位數字">
                <span class="validation-message" id="gid-error"></span>
            </div>

            <div class="form-group">
                <span class="json-key">"version"</span>
                <span class="json-colon">:</span>
                <input type="text"
                       class="form-input"
                       id="version"
                       value="5.64.0(0)"
                       <!-- pattern="^[\\d]+\\.[\\d]+\\.[\\d]+\\([\\d]+\\)$" -->
                       title="格式: x.xx.x(x)">
                <span class="validation-message" id="version-error"></span>
            </div>

            <div class="form-group">
                <span class="json-key">"deviceType"</span>
                <span class="json-colon">:</span>
                <select class="form-input device-select" id="deviceType">
                    <option value="iOS">iOS</option>
                    <option value="Android">Android</option>
                    <option value="Web">Web</option>
                </select>
            </div>

            <div class="form-group">
                <span class="json-key">"os_version"</span>
                <span class="json-colon">:</span>
                <input type="text"
                       class="form-input"
                       id="os_version"
                       value="18.1.1"
                       <!-- pattern="^[\\d]+\\.[\\d]+\\.[\\d]+$" -->
                       title="格式: x.x.x">
                <span class="validation-message" id="os_version-error"></span>
            </div>

            <div class="form-group">
              <span class="json-key">"timestamp"</span>
              <span class="json-colon">:</span>
              <input
                id="timestamp"
                class="form-input"
                type="text"
                placeholder="yyyyMMddHHmmss（例如 20250813091530）"
                inputmode="numeric"
                autocomplete="off"
                minlength="14"
                maxlength="14"
                pattern="\\d{4}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])([01]\\d|2[0-3])([0-5]\\d)([0-5]\\d)"
                title="請輸入 14 位 yyyyMMddHHmmss（年4位、月01–12、日01–31、時00–23、分秒00–59）">
              <label for="chatAutoTimestamp" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap;font-size:12px;color:var(--text);cursor:pointer" title="勾選後，每次按加密都更新為當下時間">
                <input type="checkbox" id="chatAutoTimestamp" checked style="width:15px;height:15px;flex:none;accent-color:var(--accent)">
                自動時間
              </label>
              <span class="validation-message" id="timestamp-error"></span>
            </div>
            <div class="json-preview" id="jsonPreview"></div>
        </div>
    </div>
    <div class="right-section">
        <div class="json-form">


            <div class="form-group">
              <span class="json-key">密鑰 (32 字節)</span>
              <span class="json-colon">:</span>
              <input id="key" placeholder="輸入密鑰" value="12345678901234567890123456789012"
                class="form-input"
                type="text"
                autocomplete="off"
                minlength="32"
                maxlength="32">
            </div>
            <div class="form-group">
              <span class="json-key">nonce (12 字節)</span>
              <span class="json-colon">:</span>
              <input id="nonce" placeholder="留空將自動生成" value=""
                class="form-input"
                type="text"
                autocomplete="off"
                minlength="12"
                maxlength="12">
            </div>

            <div id="nonce-display">
                    <span id="valid-nonce"></span><span id="extra-nonce"></span>
                </div>
                <p id="nonce-hint"><span class="valid-text">前 12 字節是有效的。</span> <span class="extra-text">超出部分不會被使用。</span></p>
                <label for="ciphertext">密文:[ IV (12 bytes) ] [ 加密後的密文 bytes ] [ 可選的驗證標籤 bytes ]</label>
                <textarea id="ciphertext" class="form-input"></textarea>
          </div>
          <br/>
        <button onclick="encrypt()">加密</button>
        <button onclick="decrypt()">解密</button>
        <button onclick="clearGID()" class="clear-button">清除 GID</button>
        <button onclick="encrypt_open()" class="open-button">另開視窗</button>

        <div id="result"></div>
        <div id="urlparam"></div>
        <small style="color:var(--muted)">資料直接編輯並自動儲存於本機瀏覽器。自動產生的 timestamp 不會儲存。</small>
    </div>
  </div>

</div>

      </div>
      <footer class="app-dialog-footer chat-card-controls"></footer>
    </div>
</dialog>
`;
    const chatDialog = wrapper.firstElementChild;
    document.body.appendChild(chatDialog);

    /* Postman-like workspace: operation on top, profile cards below. */
    const modalRoot = chatDialog.querySelector('.chat-modal');
    const cardToolbar = modalRoot.querySelector('.chat-profile-toolbar');
    const cardStrip = document.getElementById('chatProfileCards');
    const originalForm = document.getElementById('jsonFormMode');
    const oldLeft = originalForm.querySelector('.left-section');
    const oldRight = originalForm.querySelector('.right-section');
    const postman = document.createElement('section');
    postman.className = 'chat-workspace';
    postman.innerHTML = `
      <div class="chat-request-bar">
        <span class="chat-method">GET</span>
        <input id="chatRequestUrl" class="form-input" type="text" readonly title="目前卡片的 Base URL" aria-label="Request URL">
      </div>
      <div id="chatSecondaryActions" class="chat-secondary-actions"><button type="button" id="chatRequestSend">加密</button></div>
      <div class="chat-tabs"><button type="button" class="chat-tab active" data-panel="body">Body</button><button type="button" class="chat-tab" data-panel="response">加密結果</button><button type="button" class="chat-tab" data-panel="decrypt">解密</button></div>
      <div id="chatBodyPanel" class="chat-panel"><div class="chat-panel-head">JSON Payload <span>application/json</span></div><pre id="chatBodyPreview"></pre></div>
      <div id="chatResponsePanel" class="chat-panel" hidden></div>
      <div id="chatDecryptPanel" class="chat-panel" hidden></div>
      <div id="chatActions" class="chat-actions"></div>
    `;
    cardToolbar.before(postman);
    const bodyPreview = document.getElementById('chatBodyPreview');
    const resultPanel = document.getElementById('chatResponsePanel');
    const decryptPanel = document.getElementById('chatDecryptPanel');
    const actions = document.getElementById('chatActions');
    const rightForm = oldRight.querySelector('.json-form');
    // Reuse the original crypto inputs and handlers, but not the editable profile fields.
    const nonceGroup = document.getElementById('nonce').closest('.form-group');
    // Original IV input and its character-by-character validator are moved to the editor.
    nonceGroup.style.display='none';
    const actionButtons = [...oldRight.querySelectorAll('button')];
    // Keep only the primary Encrypt action beside the GET URL.
    // The other three actions sit on a separate row above the tabs.
    const secondaryActions = document.getElementById('chatSecondaryActions');
    actionButtons.forEach(b => {
      const handler = b.getAttribute('onclick');
      if (handler === 'encrypt()') {
        b.remove(); // chatRequestSend is the sole Encrypt button.
      } else if (['decrypt()', 'clearGID()', 'encrypt_open()'].includes(handler)) {
        secondaryActions.appendChild(b);
      } else {
        actions.appendChild(b);
      }
    });
    resultPanel.append(document.getElementById('result'),document.getElementById('urlparam'));
    decryptPanel.append(document.querySelector('label[for="ciphertext"]'),document.getElementById('ciphertext'));
    originalForm.style.display='none'; // Keep original fields and validators as internal state.
    const requestUrl = document.getElementById('chatRequestUrl');
    const tabs = [...postman.querySelectorAll('.chat-tab')];
    function selectTab(name){
      tabs.forEach(b=>b.classList.toggle('active',b.dataset.panel===name));
      document.getElementById('chatBodyPanel').hidden=name!=='body';
      resultPanel.hidden=name!=='response';
      decryptPanel.hidden=name!=='decrypt';
    }
    tabs.forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.panel)));
    document.getElementById('chatRequestSend').addEventListener('click',()=>window.encrypt());
    // Keep decrypt input visible when switching to the decrypt tab.
    const originalDecrypt = actionButtons.find(b=>b.getAttribute('onclick')==='decrypt()');
    originalDecrypt?.addEventListener('click',()=>selectTab('decrypt'));
    document.getElementById('chatRequestSend').addEventListener('click',()=>selectTab('response'));
    // A separate edit dialog: no shared visible fields with the request workspace.
    const editorDialog = document.createElement('dialog');
    editorDialog.className = 'app-dialog chat-editor-dialog';
    editorDialog.setAttribute('aria-label', '編輯設定');
    editorDialog.setAttribute('aria-describedby', 'chatEditorSubtitle');
    editorDialog.innerHTML = `<div class="chat-editor">
      <header class="app-modal-header">
        <span class="app-modal-header-icon" aria-hidden="true">${resolveIcon('chat')}</span>
        <div class="app-modal-header-info">
          <div class="chat-editor-title app-modal-header-title" id="chatEditorTitle"><button type="button" class="chat-editor-title-edit" id="chatRenameTitle" aria-label="編輯設定名稱"><span data-icon="edit" aria-hidden="true"></span></button></div>
          <p class="app-modal-header-subtitle" id="chatEditorSubtitle">可直接修改上方的設定名稱，並調整此卡片的連線與裝置資訊。</p>
        </div>
        <button type="button" id="chatEditorClose" class="app-modal-header-close" aria-label="關閉">✕</button>
      </header>
      <div class="app-dialog-body"><div id="chatEditorFields" class="chat-editor-fields"></div></div>
      <footer class="app-dialog-footer"><button type="button" class="btn-reset" id="chatEditorCancel">取消</button><button type="button" class="btn-confirm" id="chatEditorSave">儲存設定</button></footer>
    </div>`;
    chatDialog.appendChild(editorDialog);
    const editorFields = document.getElementById('chatEditorFields');
    const editorKeys = [['label','設定名稱'],['url','Base URL'],['clientid','廠商代碼'],['key','金鑰'],['gid','GID'],['version','Version'],['deviceType','DeviceType'],['os_version','OS Version'],['timestamp','Timestamp'],['nonce','IV / nonce（12 字節，留空則隨機產生）']];
    let editingCardId=null;
    const editorInputs={};
    editorKeys.forEach(([key,label])=>{
      const wrap=document.createElement('label');wrap.className='chat-editor-field';wrap.dataset.field=key;
      const title=document.createElement('span');title.textContent=label;
      const el=key==='deviceType'?document.createElement('select'):document.createElement('input');
      if(key==='deviceType') ['iOS','Android','Web'].forEach(v=>{const opt=document.createElement('option');opt.value=v;opt.textContent=v;el.appendChild(opt);});
      else {el.type='text';el.autocomplete='off';}
      el.id='chatEditor_'+key;el.className='form-input';
      editorInputs[key]=el;wrap.append(title,el);editorFields.appendChild(wrap);
    });
    // The profile name itself is the editable dialog title, rather than a form row.
    const nameRow=editorInputs.label.closest('.chat-editor-field');
    editorInputs.label.setAttribute('aria-label','設定名稱');
    editorInputs.label.placeholder='輸入設定名稱';
    editorInputs.label.className = 'chat-editor-title-input';
    document.getElementById('chatRenameTitle').addEventListener('click', () => editorInputs.label.focus());
    document.getElementById('chatEditorTitle').prepend(editorInputs.label);
    nameRow.remove();
    // Reuse the original IV display and hint, retaining the original validation visuals.
    const editorJson=document.createElement('pre');editorJson.className='chat-editor-json';editorJson.id='chatEditorJson';editorFields.appendChild(editorJson);
    const ivPreview=document.createElement('div');ivPreview.className='chat-editor-iv';
    ivPreview.append(document.getElementById('nonce-display'),document.getElementById('nonce-hint'));
    editorFields.appendChild(ivPreview);
    editorInputs.nonce.addEventListener('input',()=>{
      document.getElementById('nonce').value=editorInputs.nonce.value;
      updateNonceDisplay();
    });
    const autoLabel=document.createElement('label');autoLabel.className='chat-editor-check';
    autoLabel.innerHTML='<input type="checkbox" id="chatEditorAuto"> 自動時間（加密時使用當下時間，不儲存時間值）';
    editorInputs.timestamp.closest('.chat-editor-field').appendChild(autoLabel);
    const editorAuto=document.getElementById('chatEditorAuto');
    function refreshEditorJson(){
      const body={gid:editorInputs.gid.value,version:editorInputs.version.value,deviceType:editorInputs.deviceType.value,os_version:editorInputs.os_version.value,timestamp:editorInputs.timestamp.value};
      document.getElementById('chatEditorJson').textContent=JSON.stringify(body,null,2);
    }
    editorKeys.forEach(([key])=>editorInputs[key].addEventListener(key==='deviceType'?'change':'input',refreshEditorJson));
    function closeEditor() {
      ModalManager.closeDialog(editorDialog);
      editingCardId = null;
      applyProfile();
    }
    document.getElementById('chatEditorClose').addEventListener('click',closeEditor);
    document.getElementById('chatEditorCancel').addEventListener('click',closeEditor);
    editorDialog.addEventListener('click', e => { if (e.target === editorDialog) closeEditor(); });
    function openCardEditor(p){
      editingCardId=p.id;
      editorKeys.forEach(([key])=>{editorInputs[key].value=p[key]||'';});
      editorAuto.checked=!!p.autoTimestamp;refreshEditorJson();
      document.getElementById('nonce').value=p.nonce||'';
      updateNonceDisplay();
      ModalManager.showDialog(editorDialog, closeEditor);
      editorInputs.label.focus();
    }
    // Actual save handler is installed after the profile store is initialized.

    // 初始化表單模式必須早於卡片套用與 JSON 預覽。
    let isFormMode = true;

    /* ========== Per-card complete configuration ========== */
    // 金鑰依使用者要求儲存在本機 localStorage；請勿在共用電腦使用正式金鑰。
    const CHAT_CONFIG_KEY = 'chat_full_profiles_v1';
    const LEGACY_ENV_KEY = 'chat_environment_profiles_v1';
    const CHAT_DEVICE_KEY = 'chat_device_config_v1';
    const CARD_FIELDS = ['url', 'clientid', 'key', 'gid', 'version', 'deviceType', 'os_version', 'timestamp', 'nonce'];
    const DEFAULT_CARD = {url:'https://localhost:44309/Login/AppLogin', clientid:'TEST', key:'', gid:'GID71171171171171', version:'5.64.0(0)', deviceType:'iOS', os_version:'18.1.1', timestamp:'', nonce:'', autoTimestamp:true};
    const uid = () => 'card_' + (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + Math.random().toString(36).slice(2));
    const clone = o => JSON.parse(JSON.stringify(o));
    function loadProfiles() {
      try {
        const saved = JSON.parse(localStorage.getItem(CHAT_CONFIG_KEY));
        if (saved && Array.isArray(saved.profiles) && saved.profiles.length) {
          const profiles = saved.profiles.map(p => ({...DEFAULT_CARD, ...p, timestamp:''}));
          return {profiles, selectedId:profiles.some(p=>p.id===saved.selectedId)?saved.selectedId:profiles[0].id};
        }
      } catch(e) { console.warn('卡片設定讀取失敗',e); }
      let oldDevice = {};
      try { oldDevice = JSON.parse(localStorage.getItem(CHAT_DEVICE_KEY)) || {}; } catch {}
      let oldEnv = null;
      try { oldEnv = JSON.parse(localStorage.getItem(LEGACY_ENV_KEY)); } catch {}
      const oldAuto = localStorage.getItem('chat_auto_timestamp') !== 'false';
      if (oldEnv && Array.isArray(oldEnv.profiles) && oldEnv.profiles.length) {
        const profiles = oldEnv.profiles.map(p => ({...DEFAULT_CARD,...oldDevice,...p, id:p.id||uid(), label:p.label||'未命名設定', timestamp:'', autoTimestamp:oldAuto}));
        return {profiles, selectedId:profiles.some(p=>p.id===oldEnv.selectedId)?oldEnv.selectedId:profiles[0].id};
      }
      const p = {...DEFAULT_CARD,...oldDevice,id:uid(),label:'預設設定',timestamp:'',autoTimestamp:oldAuto};
      return {profiles:[p],selectedId:p.id};
    }
    let environmentData = loadProfiles();
    window.addEventListener('chat-profiles-imported', () => { environmentData = loadProfiles(); renderCards(); applyProfile(); clearOutput(); });
    const selectedProfile = () => environmentData.profiles.find(p=>p.id===environmentData.selectedId) || environmentData.profiles[0];
    const cardsHolder = document.getElementById('chatProfileCards');
    const menu = document.createElement('div');
    menu.className = 'chat-context-menu card-ctx-menu'; menu.style.display = 'none';
    menu.addEventListener('click', e => e.stopPropagation());
    chatDialog.appendChild(menu);
    function closeMenu() {menu.style.display='none';}
    function closeChat() {
      if (editorDialog.open) closeEditor();
      closeMenu();
      ModalManager.closeDialog(chatDialog);
    }
    document.getElementById('chatCloseBtn').addEventListener('click', closeChat);
    chatDialog.addEventListener('click', e => { if (e.target === chatDialog) closeChat(); });
    this.open = () => ModalManager.showDialog(chatDialog, closeChat);
    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', e=>{if(e.key==='Escape')closeMenu();});
    function persistProfiles() {
      const saved = {...environmentData, profiles:environmentData.profiles.map(p=>({...p,timestamp:''}))};
      try {localStorage.setItem(CHAT_CONFIG_KEY,JSON.stringify(saved));}
      catch(e){alert('設定無法儲存：'+e.message);}
    }
    // 將金鑰移到左側，與其他卡片設定放在一起。
    const keyGroup = document.getElementById('key').closest('.form-group');
    // Encryption key stays in the internal form; edited only in the separate card dialog.
    const baseInput = document.getElementById('chatBaseUrl');
    const fieldMap = {nonce:document.getElementById('nonce'),url:baseInput,clientid:document.getElementById('clientid'),key:document.getElementById('key'),gid:document.getElementById('gid'),version:document.getElementById('version'),deviceType:document.getElementById('deviceType'),os_version:document.getElementById('os_version'),timestamp:document.getElementById('timestamp')};
    const autoCheck = document.getElementById('chatAutoTimestamp');
    let applying = false;
    function applyProfile() {
      const p=selectedProfile(); if(!p)return;
      applying=true;
      CARD_FIELDS.forEach(k=>{fieldMap[k].value=p[k]||'';});
      autoCheck.checked=!!p.autoTimestamp;
      applying=false;
      requestUrl.value=p.url||'';
      if(typeof updatePreview==='function')updatePreview();
      updateNonceDisplay();
    }
    // Visible controls for touch devices and users without a right mouse button.
    const cardControls = modalRoot.querySelector('.chat-card-controls');
    const cardSelectedName=document.createElement('span');cardSelectedName.style.marginRight='auto';
    const controlButtons=[['編輯',()=>editCard(environmentData.selectedId)],['複製',()=>copyCard(environmentData.selectedId)],['刪除',()=>deleteCard(environmentData.selectedId)]];
    cardControls.appendChild(cardSelectedName);
    controlButtons.forEach(([name,action])=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.addEventListener('click',action);cardControls.appendChild(b);});
    function renderCards() {
      cardSelectedName.textContent='目前選擇：'+(selectedProfile()?.label||'');
      cardsHolder.replaceChildren();
      environmentData.profiles.forEach(p=>{
        const btn=document.createElement('button');btn.type='button';btn.className='chat-profile-card'+(p.id===environmentData.selectedId?' active':'');
        btn.textContent=p.label;btn.title=p.label+'（右鍵：編輯／複製／刪除）';
        btn.addEventListener('click',()=>{environmentData.selectedId=p.id;persistProfiles();renderCards();applyProfile();clearOutput();selectTab('body');});
        // 雙擊卡片直接編輯；單擊仍維持選取及切回 Body。
        btn.addEventListener('dblclick',e=>{e.preventDefault();editCard(p.id);});
        btn.addEventListener('contextmenu',e=>{
          e.preventDefault();e.stopPropagation();menu.replaceChildren();
          const edit=document.createElement('button');edit.type='button';edit.textContent='編輯';edit.className='edit';
          edit.addEventListener('click',ev=>{ev.stopPropagation();closeMenu();editCard(p.id);});
          const copy=document.createElement('button');copy.type='button';copy.textContent='複製';
          copy.addEventListener('click',ev=>{ev.stopPropagation();closeMenu();copyCard(p.id);});
          const del=document.createElement('button');del.type='button';del.textContent='刪除';del.className='delete';
          del.addEventListener('click',ev=>{ev.stopPropagation();closeMenu();deleteCard(p.id);});
          menu.append(edit,copy,del);menu.style.display='block';
          const rect=menu.getBoundingClientRect();
          menu.style.left=Math.max(4,Math.min(e.clientX,innerWidth-rect.width-8))+'px';
          menu.style.top=Math.max(4,Math.min(e.clientY,innerHeight-rect.height-8))+'px';
        });
        cardsHolder.appendChild(btn);
      });
    }
    function editCard(id){
      const p=environmentData.profiles.find(x=>x.id===id);if(!p)return;
      openCardEditor(p);
    }
    document.getElementById('chatEditorSave').addEventListener('click',()=>{
      const p=environmentData.profiles.find(x=>x.id===editingCardId);if(!p)return;
      const values=Object.fromEntries(editorKeys.map(([key])=>[key,editorInputs[key].value.trim()]));
      if(!values.label||!/^https?:\/\/\S+$/i.test(values.url)||!values.clientid||!values.key){alert('名稱、http(s) Base URL、廠商代碼與金鑰不得空白。');return;}
      if(environmentData.profiles.some(x=>x.id!==p.id&&x.label===values.label)){alert('設定名稱不可重複');return;}
      // if(values.gid&&!/^GID\d{14}$/i.test(values.gid)){alert('GID 必須為 GID 加 14 位數字');return;}
      // if(!/^\d+\.\d+\.\d+\(\d+\)$/.test(values.version)){alert('Version 格式必須為 x.y.z(n)');return;}
      // if(!/^\d+(?:\.\d+){1,2}$/.test(values.os_version)){alert('OS Version 格式錯誤');return;}
      if(values.timestamp&&!isValidTimestamp14(values.timestamp)){alert('Timestamp 格式錯誤');return;}
      if(values.nonce && new TextEncoder().encode(values.nonce).length!==12){alert('IV / nonce 必須剛好 12 字節（UTF-8），或留空以隨機產生。');editorInputs.nonce.focus();return;}
      Object.assign(p,values,{autoTimestamp:editorAuto.checked});
      environmentData.selectedId=p.id;
      persistProfiles();renderCards();applyProfile();clearOutput();closeEditor();
    });
    function clearOutput(){document.getElementById('result').textContent='';document.getElementById('urlparam').textContent='';document.getElementById('ciphertext').value='';}
    function uniqueLabel(name){let i=1;while(environmentData.profiles.some(p=>p.label===name+' ('+i+')'))i++;return name+' ('+i+')';}
    function copyCard(id){
      const original=environmentData.profiles.find(p=>p.id===id);if(!original)return;
      const copy={...clone(original),id:uid(),label:uniqueLabel(original.label),timestamp:''};
      environmentData.profiles.push(copy);environmentData.selectedId=copy.id;persistProfiles();renderCards();applyProfile();clearOutput();
    }
    function deleteCard(id){
      const p=environmentData.profiles.find(x=>x.id===id);if(!p)return;
      if(environmentData.profiles.length===1){alert('至少需要保留一組設定');return;}
      if(!confirm('確定刪除「'+p.label+'」？'))return;
      environmentData.profiles=environmentData.profiles.filter(x=>x.id!==id);
      if(environmentData.selectedId===id)environmentData.selectedId=environmentData.profiles[0].id;
      persistProfiles();renderCards();applyProfile();clearOutput();
    }
    document.getElementById('chatAddCard').addEventListener('click',()=>{
      const p={...clone(DEFAULT_CARD),id:uid(),label:uniqueLabel('新設定')};
      environmentData.profiles.push(p);
      environmentData.selectedId=p.id;
      persistProfiles();renderCards();applyProfile();clearOutput();
      openCardEditor(p);
    });
    CARD_FIELDS.forEach(k=>{
      fieldMap[k].addEventListener('input',()=>{
        if(applying)return;
        const p=selectedProfile();if(!p)return;
        p[k]=fieldMap[k].value;
        // timestamp 的手動輸入值僅保留在當前頁面記憶體，絕不持久化。
        if(k!=='timestamp')persistProfiles();
      });
      if(k==='deviceType')fieldMap[k].addEventListener('change',()=>{selectedProfile().deviceType=fieldMap[k].value;persistProfiles();});
    });
    autoCheck.addEventListener('change',()=>{selectedProfile().autoTimestamp=autoCheck.checked;persistProfiles();});
    persistProfiles();renderCards();applyProfile();

    /* ========== JS Logic ========== */

    // 表單模式已於卡片初始化前宣告。

    // 嚴格格式（YYYYMMDDhhmmss）
    const ts14Regex = /^(?<y>\d{4})(?<M>0[1-9]|1[0-2])(?<d>0[1-9]|[12]\d|3[01])(?<H>[01]\d|2[0-3])(?<m>[0-5]\d)(?<s>[0-5]\d)$/;
    // 驗證規則
    const validators = {
      // 暫停驗證 gid、version、os_version；保留原規則供日後恢復。
      // gid:      { pattern: /^GID\d{14}$/i,            message: "格式錯誤：必須是 GID + 14 位數字" },
      // version:  { pattern: /^\d+\.\d+\.\d+\(\d+\)$/,  message: "格式錯誤：必須是 x.y.z(編號) 格式" },
      // os_version:{pattern:/^\d+(?:\.\d+){1,2}$/,      message: "格式錯誤：必須是 x.y 或 x.y.z 格式" },
      timestamp:{
        pattern: ts14Regex,
        message: "格式錯誤：必須是 yyyyMMddHHmmss（例如 20250813091530）"
      }
    };

    // 進一步檢核「日期是否真實存在」
    function isValidTimestamp14(s) {
      const m = ts14Regex.exec(String(s ?? '').trim());
      if (!m) return false;
      const y  = +m.groups.y,
            M  = +m.groups.M,
            d  = +m.groups.d,
            H  = +m.groups.H,
            mi = +m.groups.m,
            se = +m.groups.s;

      // 用 UTC 建立，避免時區溢位干擾，再逐一比對
      const dt = new Date(Date.UTC(y, M - 1, d, H, mi, se));
      return dt.getUTCFullYear() === y &&
             dt.getUTCMonth()    === M - 1 &&
             dt.getUTCDate()     === d &&
             dt.getUTCHours()    === H &&
             dt.getUTCMinutes()  === mi &&
             dt.getUTCSeconds()  === se;
    }

    // 可選：轉成 Unix 毫秒（若需要）
    function parseTimestamp14ToMs(s) {
      if (!isValidTimestamp14(s)) return null;
      const { y, M, d, H, m, s: S } = ts14Regex.exec(s).groups;
      return Date.UTC(+y, +M - 1, +d, +H, +m, +S); // milliseconds since epoch (UTC)
    }

    const tsInput = document.getElementById('timestamp');
    const tsErr = document.getElementById('timestamp-error');

    tsInput.addEventListener('input', () => {
      // 只允許數字
      tsInput.value = tsInput.value.replace(/\D+/g, '').slice(0,14);
      tsInput.setCustomValidity(''); tsErr.textContent = '';
    });

    tsInput.addEventListener('blur', () => {
      const ok = isValidTimestamp14(tsInput.value);
      if (!ok) {
        const msg = '請輸入有效的 yyyyMMddHHmmss（例如 20250813091530）';
        tsInput.setCustomValidity(msg);
        tsErr.textContent = msg;
      } else {
        tsInput.setCustomValidity('');
        tsErr.textContent = '';
      }
    });

    // Utility function to convert string to ArrayBuffer
    function str2ab(str) {
      const buf = new ArrayBuffer(str.length);
      const bufView = new Uint8Array(buf);
      for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
      }
      return buf;
    }

    // 切換輸入模式
    function toggleInputMode() {
      isFormMode = !isFormMode;
      const formMode = document.getElementById('jsonFormMode');
      const textMode = document.getElementById('plaintext');
      const toggleBtn = document.querySelector('.toggle-mode');

      if (isFormMode) {
        formMode.style.display = 'block';
        textMode.style.display = 'none';
        toggleBtn.textContent = '切換到原始文字模式';

        // ★ 嘗試解析文字模式內容並回填（解析不了就略過）
        try {
          const obj = JSON.parse(textMode.value);
          if (obj && typeof obj === 'object') fillFormFromJson(obj);
        } catch { /* 不可解析就不塞回 */ }

        // 更新預覽
        updatePreview();

      } else {
        formMode.style.display = 'none';
        textMode.style.display = 'block';
        toggleBtn.textContent = '切換到表單模式';
        // 同步表單數據到文字框
        textMode.value = getCurrentPlaintext();
      }
    }

    function fillFormFromJson(obj) {
      if (typeof obj.gid === 'string') document.getElementById('gid').value = obj.gid;
      if (typeof obj.version === 'string') document.getElementById('version').value = obj.version;
      if (typeof obj.os_version === 'string') document.getElementById('os_version').value = obj.os_version;

      if (typeof obj.deviceType === 'string') {
        const sel = document.getElementById('deviceType');
        const hasOption = Array.from(sel.options).some(o => o.value === obj.deviceType);
        if (hasOption) sel.value = obj.deviceType; // 只在有此選項時才回填
      }

      if (typeof obj.timestamp === 'number' || typeof obj.timestamp === 'string') {
        document.getElementById('timestamp').value = String(obj.timestamp);
      }
    }

    // 獲取當前明文
    function getCurrentPlaintext() {
      if (isFormMode) {
        if (!validateAll()) {
          return null; // 驗證失敗返回 null
        }
        const tsRaw = document.getElementById('timestamp').value.trim();
        const timestamp = /^\d+$/.test(tsRaw) ? Number(tsRaw) : tsRaw;

        return JSON.stringify({
          gid: document.getElementById('gid').value,
          version: document.getElementById('version').value,
          deviceType: document.getElementById('deviceType').value,
          os_version: document.getElementById('os_version').value,
          timestamp
        });
      } else {
        const raw = document.getElementById('plaintext').value.trim();
        try {
          return JSON.stringify(JSON.parse(raw)); // 單行、無多餘空白
        } catch {
          return raw
            .replace(/\r?\n/g, '')   // 移除換行
            .replace(/\t/g, '')      // 移除 tab
            .replace(/\s{2,}/g, ' ') // 多個空白壓成一個
            .trim();
        }
      }
    }

    // 更新 JSON 預覽
    function updatePreview() {
      if (!isFormMode) return;

      const gid = document.getElementById('gid').value;
      const version = document.getElementById('version').value;
      const deviceType = document.getElementById('deviceType').value;
      const os_version = document.getElementById('os_version').value;
      const tsRaw = document.getElementById('timestamp').value.trim();
      const timestamp = /^\d+$/.test(tsRaw) ? Number(tsRaw) : tsRaw;

      const jsonObj = { gid, version, deviceType, os_version, timestamp };
      const jsonString = JSON.stringify(jsonObj, null, 2);
      document.getElementById('jsonPreview').textContent = jsonString;
      bodyPreview.textContent=jsonString;
    }

    // 驗證單一欄位
    function validateField(fieldId) {
      const field = document.getElementById(fieldId);
      const errorElement = document.getElementById(fieldId + '-error');
      const validator = validators[fieldId];

      if (validator && !validator.pattern.test(field.value)) {
        field.classList.add('error');
        errorElement.textContent = validator.message;
        return false;
      } else {
        field.classList.remove('error');
        errorElement.textContent = '';
        return true;
      }
    }

    // 驗證所有欄位
    function validateAll() {
      if (!isFormMode) return true; // 文字模式不驗證

      let isValid = true;
      // 已停用的三個欄位不顯示舊版錯誤狀態。
      ['gid', 'version', 'os_version'].forEach(fieldId => {
        document.getElementById(fieldId)?.classList.remove('error');
        const error = document.getElementById(fieldId + '-error');
        if (error) error.textContent = '';
      });
      Object.keys(validators).forEach(fieldId => {
        if (!validateField(fieldId)) {
          isValid = false;
        }
      });
      return isValid;
    }

    // Adjust key length similar to C# implementation
    function adjustKey(key) {
      // Convert to UTF-8 bytes
      const encoder = new TextEncoder();
      let keyBytes = encoder.encode(key);

      // Truncate or pad to 16-32 bytes
      const minLength = 16;
      const maxLength = 32;
      const targetLength = Math.min(maxLength, Math.max(keyBytes.length, minLength));

      // Create a new array of the target length
      const adjustedKey = new Uint8Array(targetLength);

      // Copy existing key bytes
      adjustedKey.set(keyBytes.slice(0, targetLength));

      // If key is shorter, it's already padded with zeros
      return adjustedKey;
    }

    // 清除 GID 函數
    function clearGID() {
      const p=selectedProfile();if(!p)return;
      p.gid='';document.getElementById('gid').value='';
      persistProfiles();updatePreview();
      alert('此卡片的 GID 已清除，下次另開視窗時會重新生成。');
    }

    async function generateDeviceGID() {
      const p=selectedProfile();
      if(p && /^GID\d{14}$/i.test(p.gid))return p.gid;
      const bytes=new Uint8Array(7);crypto.getRandomValues(bytes);
      let num=0n;for(const b of bytes)num=(num*256n)+BigInt(b);
      const gid='GID'+(num%(10n**14n)).toString().padStart(14,'0');
      if(p){p.gid=gid;persistProfiles();}
      document.getElementById('gid').value=gid;
      updatePreview();return gid;
    }

    async function encrypt_open() {
      // 先開空白頁，避免 await 加密後被瀏覽器擋下彈窗。
      const tab=window.open('about:blank','_blank');
      if(!tab){alert('瀏覽器阻擋了新視窗，請允許彈出視窗。');return;}
      try {
        if(!document.getElementById('gid').value.trim())await generateDeviceGID();
        const ok=await encrypt();
        const url=document.getElementById('urlparam').textContent.trim();
        if(!ok || !url)throw new Error('加密或 URL 生成失敗');
        tab.location.href=url;
      }catch(error){tab.close();alert('執行錯誤：'+error.message);}
    }

    function getBaseUrl() {return selectedProfile()?.url || '';}

    async function encrypt() {
      try {
        // 只有勾選時，一般「加密」才自動更新時間戳；「另開視窗」仍維持原本的自動更新行為。
        if (document.getElementById('chatAutoTimestamp')?.checked) {
          document.getElementById('timestamp').value = nowTimestamp14();
          selectedProfile().timestamp = document.getElementById('timestamp').value;
          updatePreview();
        }
        // 獲取明文
        const plainText = getCurrentPlaintext();
        if (plainText === null) {
          alert('請先修正所有格式錯誤！');
          return;
        }

        const urlparam = document.getElementById('urlparam');
        const clientid = document.getElementById('clientid').value;
        const baseurl = getBaseUrl();

        const result = document.getElementById('result');
        const ciphertext = document.getElementById('ciphertext');
        let key = document.getElementById('key').value;
        const nonceInput = document.getElementById('nonce').value;

        if (!key) throw new Error('請先輸入金鑰');
        // Adjust key length
        const adjustedKey = adjustKey(key);
        // Prepare nonce
        let nonce;
        if (nonceInput) {
          const encoder = new TextEncoder();
          if (encoder.encode(nonceInput).length !== 12) throw new Error('IV / nonce 必須剛好 12 字節');
          nonce = encoder.encode(nonceInput);
        } else {
          // Generate random nonce
          nonce = crypto.getRandomValues(new Uint8Array(12));
        }
        // Convert plain text to ArrayBuffer
        const encoder = new TextEncoder();
        const data = encoder.encode(plainText);

        // Perform encryption
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          adjustedKey,
          { name: 'AES-GCM', length: adjustedKey.length * 8 },
          false,
          ['encrypt']
        );
        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: nonce },
          cryptoKey,
          data
        );
        // Combine nonce and encrypted data
        const combinedArray = new Uint8Array(nonce.length + encrypted.byteLength);
        combinedArray.set(nonce);
        combinedArray.set(new Uint8Array(encrypted), nonce.length);
        // 可選的驗證標籤
        const tag = encrypted.byteLength > 16 ? encrypted.slice(-16) : null;
        // 將 IV + 密文 + 驗證標籤展示給用戶
        const ivHex = Array.from(nonce).map(byte => byte.toString(16).padStart(2, '0')).join('');
        const encryptedHex = Array.from(new Uint8Array(encrypted)).map(byte => byte.toString(16).padStart(2, '0')).join('');
        const tagHex = tag ? Array.from(new Uint8Array(tag)).map(byte => byte.toString(16).padStart(2, '0')).join('') : '';

        // Convert to base64
        const base64Encrypted = btoa(String.fromCharCode.apply(null, combinedArray));

        document.getElementById('ciphertext').value = base64Encrypted;
        result.textContent = `加密結果: ${base64Encrypted}`;

        if (!/^https?:\/\//i.test(baseurl)) throw new Error('Base URL 必須為 http(s) 網址');
        urlparam.textContent = baseurl + (baseurl.includes('?')?'&':'?') + 'clientid=' + encodeURIComponent(clientid) + '&v=' + encodeURIComponent(base64Encrypted);
        return true;
      } catch (error) {
        result.textContent = `加密錯誤: ${error.message}`;
        return false;
      }
    }

    async function decrypt() {
      try {
        const result = document.getElementById('result');
        const cipherText = document.getElementById('ciphertext').value;
        let key = document.getElementById('key').value;
        { const el=document.getElementById('step-2-1-description'); if(el)el.textContent=cipherText; }
        if (!key) throw new Error('請先輸入金鑰');
        // Adjust key length
        const adjustedKey = adjustKey(key);
        // Decode base64
        const combinedArray = new Uint8Array(atob(cipherText).split('').map(char => char.charCodeAt(0)));
        // Extract nonce (first 12 bytes)
        const nonce = combinedArray.slice(0, 12);
        const encryptedData = combinedArray.slice(12);

        // 提取驗證標籤 (最後 16 字節)
        const authTag = combinedArray.slice(combinedArray.length - 16);

        const ivHex = Array.from(nonce).map(byte => byte.toString(16).padStart(2, '0')).join('');
        { const el=document.getElementById('step-2-2-description'); if(el)el.textContent=ivHex; }
        // 顯示驗證標籤
        const authTagHex = Array.from(authTag).map(byte => byte.toString(16).padStart(2, '0')).join('');
        { const el=document.getElementById('step-2-3-description'); if(el)el.textContent=authTagHex; }

        // 顯示加密資料
        const encryptedDataHex = Array.from(encryptedData).map(byte => byte.toString(16).padStart(2, '0')).join('');
        { const el=document.getElementById('step-2-4-description'); if(el)el.textContent=encryptedDataHex; }

        // Perform decryption
        const cryptoKey = await crypto.subtle.importKey(
          'raw',
          adjustedKey,
          { name: 'AES-GCM', length: adjustedKey.length * 8 },
          false,
          ['decrypt']
        );
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: nonce },
          cryptoKey,
          encryptedData
        );
        // Convert decrypted data to string
        const decoder = new TextDecoder();
        const decryptedText = decoder.decode(decrypted);

        { const el=document.getElementById('step-2-5-description'); if(el)el.textContent=decryptedText; }

        result.textContent = `解密結果: ${decryptedText}`;
      } catch (error) {
        result.textContent = `解密錯誤: ${error.message}`;
      }
    }

    function updateNonceDisplay() {
      const input = document.getElementById('nonce').value;
      const validPart = input.slice(0, 12);  // 取前 12 字元（有效部分）
      const extraPart = input.slice(12);     // 取超過的部分（無效）
      const missingCount = 12 - validPart.length; // 計算不足的字元數
      const validNonce = document.getElementById('valid-nonce');
      const extraNonce = document.getElementById('extra-nonce');
      // 清空舊的內容
      validNonce.innerHTML = '';
      extraNonce.innerHTML = '';
      // 顯示有效部分
      validPart.split('').forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        span.classList.add('char-box', 'valid-char');
        validNonce.appendChild(span);
      });
      // 顯示不足部分（紅色框）
      for (let i = 0; i < missingCount; i++) {
        const span = document.createElement('span');
        span.textContent = '_';  // 用下劃線表示缺失字元
        if (missingCount == 12) {
          span.classList.add('char-box', 'information-char');
        } else {
          span.classList.add('char-box', 'missing-char');
        }
        validNonce.appendChild(span);
      }
      // 顯示超出部分（灰色框）
      extraPart.split('').forEach(char => {
        const span = document.createElement('span');
        span.textContent = char;
        span.classList.add('char-box', 'extra-char');
        extraNonce.appendChild(span);
      });
      // 更新提示訊息
      const hint = document.getElementById('nonce-hint');
      if (missingCount == 12 ) {
        hint.innerHTML = `<span class="information-text">將採隨機自動生成進行填充</span>`;
      } else if (missingCount > 0) {
        hint.innerHTML = `<span class="missing-text">還差 ${missingCount} 個字節，請補足！</span>`;
      } else if (extraPart.length > 0) {
        hint.innerHTML = `<span class="valid-text">前 12 字節是有效的。</span> <span class="extra-text">超出部分 (${extraPart}) 不會被使用。</span>`;
      } else {
        hint.innerHTML = `<span class="valid-text">前 12 字節是有效的。</span> <span class="extra-text">沒有超出的部分。</span>`;
      }
    }

    // 初始化顯示
    updateNonceDisplay();

    // 監聽 input 變化
    document.getElementById('nonce').addEventListener('input', updateNonceDisplay);

    document.getElementById('gid').addEventListener('input', updatePreview);
    document.getElementById('version').addEventListener('input', updatePreview);
    document.getElementById('deviceType').addEventListener('input', updatePreview);
    document.getElementById('os_version').addEventListener('input', updatePreview);
    document.getElementById('timestamp').addEventListener('input', updatePreview);

    function nowTimestamp14(tz = 'Asia/Taipei') {
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit',
          hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
        }).formatToParts(new Date()).map(p => [p.type, p.value])
      );
      return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
    }

    // timestamp 每次開啟頁面重新取得；不持久化產生值。
    document.getElementById('timestamp').value='';
    if (selectedProfile()) selectedProfile().timestamp='';
    updatePreview();

    // 讓 #urlparam 一點就複製內容
    (function enableUrlParamCopy() {
      const el = document.getElementById('urlparam');
      if (!el) return;

      el.style.cursor = 'pointer';
      el.title = '點擊複製';

      el.addEventListener('click', async () => {
        const text = el.textContent.trim();
        if (!text) return;

        const showToast = (msg, ms = 1200) => {
          const old = el.textContent;
          el.textContent = msg;
          setTimeout(() => { el.textContent = old; }, ms);
        };

        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
          } else {
            // 後援：建立暫時 textarea 來複製
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'absolute';
            ta.style.left = '-9999px';
            chatDialog.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
          }
          showToast('✅ 已複製！');
        } catch (e) {
          showToast('❌ 複製失敗');
          console.error('Copy failed:', e);
        }
      });
    })();

    // Expose functions globally so onclick handlers in HTML work
    window.encrypt = encrypt;
    window.decrypt = decrypt;
    window.clearGID = clearGID;
    window.encrypt_open = encrypt_open;
    window.toggleInputMode = toggleInputMode;
  },
  createTrigger(value) {
    const link = document.createElement('a');
    link.href = '#';
    link.setAttribute('aria-haspopup', 'dialog');
    link.setAttribute('aria-label', '開啟 Chat');
    link.addEventListener('click', event => {
      event.preventDefault();
      this.open();
    });

    const icon = document.createElement('span');
    icon.className = 'copy-wrapper';
    icon.dataset.icon = 'chat';
    if (value) icon.dataset.copyContent = value;
    icon.innerHTML = resolveIcon('chat');
    link.appendChild(icon);
    return link;
  }
});
