const Guide = {
  init() {
    if (document.getElementById('wslModalBg')) return;
    const KEY=id=>'guide_'+id+'_v1';
    let currentGuide='wsl', store=null;
    const GUIDE_TITLES=Guide.titles;
    Object.assign(GUIDE_TITLES,{wsl:'WSL 操作手冊',cicd:'CI/CD 操作手冊'});
    const DEFAULT=[{"title":"安裝 GCP / Vertex AI CLI","rows":[{"main":{"label":"加入 Google Cloud CLI APT repository（讓 apt 可以安裝 gcloud 套件）","code":"curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg\n\necho \"deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main\" | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list"},"pip":null},{"main":{"label":"更新套件並安裝 Google Cloud CLI（提供 gcloud 指令）","code":"sudo apt-get update && sudo apt-get install google-cloud-cli"},"pip":null},{"main":{"label":"安裝 Vertex AI Python SDK（用於 Python 呼叫 Vertex AI API）","code":"pip install google-cloud-aiplatform"},"pip":{"label":"Python 基本依賴（建議先升級 pip）","code":"pip install --upgrade pip"}},{"main":{"label":"啟用 Vertex AI API（在 GCP project 上開啟 AI 服務）","desc":"★★★ 但我們沒有權限可以指定專案，所以這一行不用執行 ★★★","code":"gcloud services enable aiplatform.googleapis.com --project=YOUR_PROJECT_ID"},"pip":null}]},{"title":"資料庫連線 (postgre sql 是安裝在 windows 時)","rows":[{"main":{"label":"WSL2 採用 NAT 網路模式：WSL 是一個獨立的虛擬網路環境，透過 Windows Host 進行 NAT 轉發","code":"WSL 透過 Windows Host 共享對外網路，但 WSL 與 Windows 不共用 localhost，因此 WSL 無法直接用 127.0.0.1 存取 Windows 服務，通常需改用 Windows Host IP 或透過 port forwarding（如 socat / netsh）來建立連線。","note":true},"pip":null},{"main":{"label":"取得 Windows IP","desc":"WSL 無法直接連 Windows 服務，需先取得 Host IP 才能做端口轉發","code":"WIN_IP=$(ip route show | grep default | awk '{print $3}')\necho $WIN_IP"},"pip":{"label":"安裝 socat（端口轉發工具）","desc":"socat 讓 WSL 內的程式能透過轉發連到 Windows 上的服務（如 PostgreSQL）","code":"sudo apt install socat"}},{"main":{"label":"建立 PostgreSQL 端口轉發","code":"sudo socat TCP-LISTEN:15432,fork TCP:$WIN_IP:5432 &","lang":"bash"},"pip":null},{"main":{"label":"確認 socat 監聽 15432","code":"sudo ss -tlnp | grep 15432","lang":"bash"},"pip":null}]},{"title":"資料庫連線 (postgre sql 是安裝在 wsl docker image 時)","rows":[{"main":{"label":"postgresql.yaml","desc":"不同版本的資料庫，最好設定不同的 volumes","code":"services:\n  postgres:\n    container_name: postgres\n    ports: \n      - \"5432:5432\"\n    image: \"postgres:17.7\"\n    volumes:\n      - postgres-data17:/var/lib/postgresql/data # persist data even if container shuts down\n    restart: always\n    environment:\n      - POSTGRES_USER=ecshopdb0101\n      - POSTGRES_PASSWORD=16151427\n      - POSTGRES_DB=postgres\n      - TZ=Asia/Taipei\n      \nvolumes:\n   postgres-data17: # docker volume create --name postgres-data17\n                 # remove => docker volume rm postgres-data17\n    external: true","lang":"yaml"},"pip":[{"label":"設定 volumes","desc":"建立 volumes","code":"docker volume create --name postgres-data17"},{"label":"查詢 volumes","desc":"列出所有 Volumes","code":"docker volume ls"},{"label":"查詢 volumes","desc":"--filter 過慮","code":"docker volume ls --filter name=postgres-data17"},{"label":"查詢 volumes","desc":"grep 過濾","code":"docker volume ls | grep postgres"},{"label":"設定 volumes","desc":"刪除 volumes 不確定名稱時先查詢","code":"docker volume rm postgres-data17"}]},{"main":{"label":"建立資料庫","desc":"建立資料庫","code":"docker compose -f postgresql.yml up -d","lang":"bash"},"pip":null},{"main":{"label":"停用資料庫","desc":"有設volume時，資料會存在","code":"docker compose -f postgresql.yml down","lang":"bash"},"pip":null},{"main":{"label":"ports 說明","desc":"- 主機連接埠 : 容器連接埠","code":"ports:\n  - \"5432:5432\"\n#    │    └─ 右邊是【容器內部】的 Port：PostgreSQL 服務在貨櫃內預設聽這個孔。\n#    └────── 左邊是【實體主機】的 Port：你從外面（如瀏覽器、DBeaver、Python）要連進去的孔。","lang":"yaml","note":true},"pip":null}]},{"title":"GCP 登入 (為了呼叫 Vertax AI)","rows":[{"main":{"label":"GCP 登入（不開瀏覽器）","desc":"我們無法指定 project name 所以不能加 --wslproject=set-aichatbot-test","code":"gcloud auth application-default login --wslno-launch-browser","lang":"bash"},"pip":null}]},{"title":"GCP 登入（Vertex AI 授權）","rows":[{"main":{"label":"初始化 GCP Application Default Login（WSL 無瀏覽器模式）→ 執行後會顯示一個 URL 讓你取得授權碼","desc":"我們無法指定 project name 所以不能加 --project=set-aichatbot-test","code":"gcloud auth application-default login --no-launch-browser"},"pip":null},{"main":{"label":"開啟瀏覽器登入 Google 帳號並完成 OAuth 授權（取得 Authorization Code 後回填 VS Code）","code":"# 操作流程：\n1. 複製 gcloud 提供的網址，貼到 Windows Chrome / Edge 開啟\n2. 登入 Google 帳號（需具備 GCP 專案存取權）\n3. 點擊「允許 (Allow)」授權 Google Cloud SDK\n4. 瀏覽器顯示 Authorization Code（例如 4/0Adq...）\n5. 複製該驗證碼\n6. 回到 VS Code / WSL 終端機貼上並按 Enter 完成登入","note":true},"pip":null}]},{"title":"Milvus 升級至 v2.5+","rows":[{"main":{"label":"停止目前運行的 milvus-standalone 容器（避免升級過程衝突）","desc":"保留 etcd / minio 資料，只重建 standalone 容器","code":"docker stop milvus-standalone"},"pip":null},{"main":{"label":"移除舊的 milvus-standalone 容器（不會刪除資料 volume）","code":"docker rm milvus-standalone"},"pip":null},{"main":{"label":"下載 Milvus v2.5.0 映像（確保使用新版本啟動）","desc":"下載 v2.5.0 映像，版本需 ≥ 2.5 才支援 create_database API","code":"wget https://raw.githubusercontent.com/milvus-io/milvus/v2.5.0/deployments/docker/standalone/docker-compose.yml -O docker-compose.yml \n docker compose up -d"},"pip":null},{"main":{"label":"使用原本 docker run 指令重新啟動（已改為 v2.5.0）","desc":"將原指令的 image tag 改為 v2.5.0 後執行，掛載路徑與 port 不變","code":"docker run -d --name milvus-standalone \\\n  -e ETCD_ENDPOINTS=milvus-etcd:2379 \\\n  -e MINIO_ADDRESS=milvus-minio:9000 \\\n  -v /home/p10344791/volumes/milvus:/var/lib/milvus \\\n  --network milvus \\\n  -p 19530:19530 \\\n  -p 9091:9091 \\\n  milvusdb/milvus:v2.5.0 \\\n  milvus run standalone"},"pip":null}]},{"title":"啟動 Milvus (向量資料庫)","rows":[{"main":{"label":"啟動所有 Milvus 服務","desc":"依序啟動 etcd（元資料）、minio（物件儲存）、standalone（主服務）","code":"docker start milvus-etcd milvus-minio milvus-standalone","lang":"bash"},"pip":null},{"main":{"label":"確認狀態（三個都要顯示 Up healthy）","desc":"三個容器都要顯示 Up (healthy)，有任何 unhealthy 需重啟","code":"docker ps | grep milvus","lang":"bash"},"pip":null}]},{"title":"專案啟動","rows":[{"main":{"label":"建立 Milvus 資料庫","desc":"在 Milvus 建立專案用的 database，首次執行才需要","code":"python -c \"from pymilvus import MilvusClient; c = MilvusClient('http://localhost:19530'); c.create_database('op_txt_cs'); print('done')\"","lang":"python"},"pip":[{"label":"pip 執行之前","desc":"安裝套件前要先進入 venv 虛擬環境","code":"source .venv/bin/activate","lang":"bash"},{"label":"pip 依賴（首次執行）","desc":"首次執行需安裝，含 pymilvus、gcloud SDK 等所有套件","code":"pip install -r requirements.txt","lang":"bash"},{"label":"需要先安裝 pymilvus","desc":"安裝 Milvus 的 Python 套件","code":"pip install pymilvus","lang":"bash"},{"label":"離開 venv 虛擬環境","desc":"離開 venv 虛擬環境","code":"deactivate","lang":"bash"}]},{"main":{"label":"同步知識庫資料","desc":"將資料灌入 Milvus，建完 DB 後執行一次","code":"python -c \"from tasks import km_update; print(km_update())\"","lang":"python"},"pip":{"label":"GCP 登入","desc":"詳細參照上面的 GCP 登入 說明","code":"gcloud auth application-default login --no-launch-browser"}},{"main":{"label":"啟動主程式","desc":"啟動後端服務，確認 Milvus 與 PG 都已就緒再執行","code":"python main.py","lang":"bash"},"pip":null}]},{"title":"查看和管理 Milvus 2.5 版本的資料庫","rows":[{"main":{"label":"Attu","desc":"在 Milvus 建立專案用的 database，首次執行才需要","code":"docker run -d \\\n  --name attu \\\n  -p 8000:3000 \\\n  -e MILVUS_URL=172.17.0.1:19530 \\\n  zilliz/attu:latest","lang":"bash"}},{"main":{"label":"進入 Attu 介面","desc":"訪問地址","code":"http://localhost:8000","lang":"html"},"pip":null}]}];
    const CICD_DEFAULT=[
      {
        title: "CI/CD (UAT)",
        rows: [
          {
            main: {
              label: "登入gcp", desc: "本機 WSL",
              code: "gcloud auth login --no-launch-browser"
            },
            pip: null
          },
          {
            main: {
              label: "Build image", desc: "本機 WSL",
              code: "docker build --no-cache -f Dockerfile -t op-dp:latest ."
            },
            pip: null
          },
          {
            main: {
              label: "給Tag (前後tag都要記得改)", desc: "本機 WSL",
              code: "docker tag op-dp:latest asia-east1-docker.pkg.dev/set-aichatbot-test/set-aichatbot-test-artifact-1/op-dp:latest"
            },
            pip: {label: "給tag之後確認", code: "docker images | grep op-dp"}
          },
          {
            main: {
              label: "Push image", desc: "本機 WSL",
              code: "docker push asia-east1-docker.pkg.dev/set-aichatbot-test/set-aichatbot-test-artifact-1/op-dp:latest"
            },
            pip: {
              label: "改 api.yaml 的 tag 後 apply (改版號後apply)", desc: "UAT 管理機",
              code: "kubectl apply -f api.yaml"
            },
          }
        ]
      },
      {
        title: "CI/CD (PROD)",
        rows: [
          {
            main: {
              label: "登入gcp", desc: "本機 WSL",
              code: "gcloud auth login --no-launch-browser"
            },
            pip: null
          },
          {
            main: {
              label: "Build image", desc: "本機 WSL",
              code: "docker build --no-cache -f Dockerfile -t op-dp:latest ."
            },
            pip: null
          },
          {
            main: {
              label: "給Tag (前後tag都要記得改)", desc: "本機 WSL",
              code: "docker tag op-dp:latest asia-east1-docker.pkg.dev/set-aichatbot-prod/set-aichatbot-prod-artifact-1/op-dp:latest"
            },
            pip: {label: "給tag之後確認", code: "docker images | grep op-dp"}
          },
          {
            main: {
              label: "Push image", desc: "本機 WSL",
              code: "docker push asia-east1-docker.pkg.dev/set-aichatbot-prod/set-aichatbot-prod-artifact-1/op-dp:latest"
            },
            pip: {
              label: "改 api.yaml 的 tag 後 apply (改版號後apply)", desc: "Prod 管理機",
              code: "kubectl apply -f api.yaml"
            }
          }
        ]
      }
    ];
    const clone=x=>JSON.parse(JSON.stringify(x));
    const uid=()=>Math.random().toString(36).slice(2,11);
    const $=id=>document.getElementById(id);
    const safe=(s)=>String(s??'');
    function commandBlocks(command) {
      if(!command)return [];
      const result=[];
      if(command.desc)result.push({type:'note',variant:command.note?'info':'info',content:command.desc});
      if(command.code)result.push({type:command.note?'text':'code',language:command.lang||'bash',content:command.code,label:command.label||''});
      return result;
    }
    function migrate(sections,title) {
      return {version:2,title:title||'WSL 操作手冊',chapters:(sections||[]).map(section=>({
        id:uid(),title:section.title||'未命名章節',description:'',
        sections:[{id:uid(),title:'操作步驟',steps:(section.rows||[]).map(row=>({
          id:uid(),title:row.main?.label||'未命名步驟',description:'',
          blocks:[...commandBlocks(row.main),...(Array.isArray(row.pip)?row.pip:row.pip?[row.pip]:[]).flatMap(p=>[
            ...(p.label?[{type:'heading',content:p.label}]:[]),...commandBlocks(p)
          ])]
        }))}]
      }))};
    }
    function makeProfile(doc,label){return {id:uid(),label:label||'預設設定',document:doc};}
    function loadGuide(id){
      try{
        const saved=JSON.parse(localStorage.getItem(KEY(id)));
        if(saved?.profiles?.length){
          const profiles=saved.profiles.filter(p=>p&&p.document&&Array.isArray(p.document.chapters));
          if(profiles.length)return {version:3,profiles,selectedId:profiles.some(p=>p.id===saved.selectedId)?saved.selectedId:profiles[0].id};
        }
      }catch(e){console.warn('Guide 資料讀取失敗',e);}
      if(id==='wsl'){
        try{const old=JSON.parse(localStorage.getItem('wsl_runbook_v2'));
          if(old&&Array.isArray(old.chapters))return {version:3,profiles:[makeProfile(old,'預設設定')],selectedId:null};
        }catch(e){console.warn(e);}
        try{const old=JSON.parse(localStorage.getItem('wsl_profiles_v1'));
          if(old?.profiles?.length){const profiles=old.profiles.map(p=>makeProfile(migrate(p.sections,p.label),p.label));return {version:3,profiles,selectedId:profiles[0].id};}
        }catch(e){console.warn(e);}
        return {version:3,profiles:[makeProfile(migrate(DEFAULT,'WSL 操作手冊'),'預設設定')],selectedId:null};
      }
      if(id==='cicd'){
        try{const old=JSON.parse(localStorage.getItem('cicd_profiles_v1'));
          if(old?.profiles?.length){const profiles=old.profiles.map(p=>({id:p.id||uid(),label:p.label||'未命名設定',document:migrate(p.sections,p.label||'CI/CD 操作手冊')}));
            return {version:3,profiles,selectedId:profiles.some(p=>p.id===old.selectedId)?old.selectedId:profiles[0].id};}
        }catch(e){console.warn(e);}
        return {version:3,profiles:[makeProfile(migrate(CICD_DEFAULT,'CI/CD 操作手冊'),'預設設定')],selectedId:null};
      }
      return {version:3,profiles:[makeProfile({version:2,title:GUIDE_TITLES[id]||id,chapters:[]},'預設設定')],selectedId:null};
    }
    const selectedProfile=()=>store.profiles.find(p=>p.id===store.selectedId)||store.profiles[0];
    let data=null,snapshot=null,editing=false,expanded=0,activeId='',syncLock=false,raf=0,editSelection=null;
    const overlay=document.createElement('div');
    overlay.className='modal-bg';overlay.id='wslModalBg';
    overlay.innerHTML=`<div class="wsl-modal" role="dialog" aria-modal="true" aria-label="WSL 操作手冊">
      <header class="wsl-header"><div class="wsl-header-info"><strong id="wslHeaderTitle">WSL 操作手冊</strong><span id="wslDirtyBadge" class="wsl-dirty-badge" role="status" aria-live="polite" hidden>未存檔</span></div><div class="wsl-head-actions">
      <button id="guideImportHtml" type="button"><span data-svgicon="import"></span> 匯入 HTML</button><button id="guideExportHtml" type="button"><span data-svgicon="export"></span> 匯出 HTML</button><button id="wslEdit" type="button"><span data-svgicon="edit"></span> 編輯</button><button id="wslSave" type="button" hidden><span data-svgicon="save"></span> 儲存</button>
      <button id="wslCancel" type="button" hidden><span data-svgicon="cancel"></span> 取消</button><button id="wslClose" type="button" aria-label="關閉">✕</button></div></header>
      <div class="wsl-layout">
        <aside class="wsl-toc"><div class="guide-profile-head"><strong>設定</strong><button type="button" id="guideAddProfile" title="新增設定">＋</button></div><div id="guideProfiles" class="guide-profiles"></div><div class="guide-profile-actions"><button type="button" id="guideCopyProfile">複製</button><button type="button" id="guideRenameProfile">重新命名</button><button type="button" id="guideDeleteProfile">刪除</button></div><div class="wsl-toc-title">章節目錄</div><div id="wslNav"></div><div id="wslEditNav" hidden></div>
        </aside>
        <main class="wsl-content"><div id="wslScope" class="wsl-scope" hidden></div>
          <div id="wslRead" class="wsl-read"></div><div id="wslEditor" class="wsl-editor" hidden></div></main>
      </div></div>`;
    document.body.appendChild(overlay);
    const nav=$('wslNav'),read=$('wslRead'),editor=$('wslEditor'),scope=$('wslScope');
    const dirtyBadge=$('wslDirtyBadge');
    function updateDirtyBadge(){
      const dirty=editing&&snapshot!==null&&JSON.stringify(data)!==JSON.stringify(snapshot);
      dirtyBadge.hidden=!dirty;
      return dirty;
    }
    let dirtyQueued=false;
    function queueDirtyCheck(){
      if(dirtyQueued)return;
      dirtyQueued=true;
      queueMicrotask(()=>{dirtyQueued=false;updateDirtyBadge()});
    }
    // Check after input/change and after editor commands, including async deletes.
    overlay.addEventListener('input',queueDirtyCheck);
    overlay.addEventListener('change',queueDirtyCheck);
    overlay.addEventListener('click',e=>{if(editing&&e.target.closest('#wslEditor,#wslEditNav'))setTimeout(updateDirtyBadge,0)});
    overlay.addEventListener('drop',()=>setTimeout(updateDirtyBadge,0));
    const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
    function btn(text,fn,cls=''){const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;}
    function persist(){try{selectedProfile().document=data;localStorage.setItem(KEY(currentGuide),JSON.stringify(store));return true}catch(e){alert('儲存失敗：'+e.message);return false}}
    function anchor(id){return read.querySelector('[data-anchor="'+CSS.escape(id)+'"]')}
    function scrollToId(id){
      const target=anchor(id);if(!target)return;
      syncLock=true;target.scrollIntoView({behavior:'smooth',block:'start'});
      activeId=id;highlight();
      setTimeout(()=>{syncLock=false;syncScroll()},600);
    }
    function chapterLabel(i,ch){return '第'+(i+1)+'章　'+(ch.title||'未命名章節')}
    function renderNav(){
      nav.replaceChildren();
      data.chapters.forEach((ch,i)=>{
        const group=el('div','wsl-nav-chapter');
        const top=btn(chapterLabel(i,ch),()=>{expanded=expanded===i?-1:i;renderNav();scrollToId(ch.id)},'wsl-chap-btn');
        top.setAttribute('aria-expanded',String(expanded===i));top.dataset.nav=ch.id;
        group.appendChild(top);
        const body=el('div','wsl-chap-body');if(expanded===i)body.classList.add('open');
        const inner=el('div','wsl-chap-inner');
        (ch.sections||[]).forEach(sec=>{
          const s=btn(sec.title||'未命名小節',()=>scrollToId(sec.id),'wsl-nav-section');
          s.dataset.nav=sec.id;inner.appendChild(s);
          (sec.steps||[]).forEach((step,si)=>{
            const b=btn((si+1)+'. '+(step.title||'未命名步驟'),()=>scrollToId(step.id),'wsl-nav-step');
            b.dataset.nav=step.id;inner.appendChild(b);
          });
        });
        body.appendChild(inner);group.appendChild(body);nav.appendChild(group);
      });
      highlight();
    }
    let indicatorY=null;
    function highlight(){
      nav.querySelectorAll('[data-nav]').forEach(x=>{
        x.classList.toggle('active',x.dataset.nav===activeId);
      });
      let indicator=nav.querySelector('.wsl-active-rail');
      if(!indicator){indicator=el('div','wsl-active-rail');indicator.setAttribute('aria-hidden','true');nav.appendChild(indicator);}
      const selected=nav.querySelector('.wsl-chap-body.open .wsl-nav-step.active, .wsl-chap-body.open .wsl-nav-section.active');
      if(!selected){indicator.style.opacity='0';indicatorY=null;return;}
      const navRect=nav.getBoundingClientRect(),rect=selected.getBoundingClientRect();
      const y=rect.top-navRect.top+nav.scrollTop;
      indicator.style.height=Math.max(14,rect.height)+'px';
      if(indicatorY===null){indicator.style.transition='none';indicator.style.transform=`translateY(${y}px)`;indicator.offsetHeight;indicator.style.transition='';}
      else {indicator.style.transform=`translateY(${y}px)`;}
      indicator.style.opacity='1';indicatorY=y;
    }
    const codeLanguages={sh:'bash',shell:'bash',zsh:'bash',yml:'yaml',py:'python',ps1:'powershell',postgresql:'sql',js:'javascript',ts:'typescript'};
    function colorizeCode(code,language){
      const lang=codeLanguages[String(language||'').toLowerCase()]||String(language||'').toLowerCase();
      // Use the site's Highlight.js if it is installed; do not add a network dependency.
      if(window.hljs && typeof window.hljs.highlight==='function'){
        try{
          if(window.hljs.getLanguage?.(lang))return window.hljs.highlight(code,{language:lang,ignoreIllegals:true}).value;
        }catch(e){console.warn('WSL highlight fallback',e);}
      }
      const esc=t=>t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
      const patterns=[];
      if(['yaml','yml'].includes(lang)){
        patterns.push(['comment',/^#[^\n]*/],['string',/^(?:"(?:\\.|[^"\\])*"|'(?:''|[^'])*')/],['key',/^[\w.-]+(?=\s*:)/],['literal',/^(?:true|false|null|yes|no)\b/i],['number',/^-?\d+(?:\.\d+)?\b/]);
      }else if(['bash','shell','zsh','powershell'].includes(lang)){
        patterns.push(['comment',/^#[^\n]*/],['string',/^(?:"(?:\\.|[^"\\])*"|'[^']*')/],['variable',/^\$\{?[A-Za-z_][\w]*\}?/],['keyword',/^(?:sudo|docker|kubectl|gcloud|export|echo|if|then|fi|for|do|done|apt|pip|python|cd|ls|grep|cat|curl|wget)\b/],['number',/^\d+\b/]);
      }else if(['sql'].includes(lang)){
        patterns.push(['comment',/^--[^\n]*/],['string',/^'(?:''|[^'])*'/],['keyword',/^(?:select|from|where|join|left|right|inner|outer|on|and|or|insert|into|update|delete|create|table|alter|drop|values|as|order|by|group|limit|null|not|is|distinct)\b/i],['number',/^\d+(?:\.\d+)?\b/]);
      }else if(['python','javascript','typescript','json','dockerfile'].includes(lang)){
        patterns.push(['comment',/^(?:#[^\n]*|\/\/[^\n]*)/],['string',/^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/],['keyword',/^(?:def|class|import|from|return|if|else|elif|for|while|async|await|const|let|var|function|true|false|null|None|True|False|FROM|RUN|COPY|ENV|CMD|WORKDIR)\b/],['number',/^-?\d+(?:\.\d+)?\b/]);
      }
      if(!patterns.length)return esc(code);
      let html='',i=0;
      while(i<code.length){let found=false;const tail=code.slice(i);
        for(const [kind,re] of patterns){const m=re.exec(tail);if(m&&m[0]){html+='<span class="wsl-syn-'+kind+'">'+esc(m[0])+'</span>';i+=m[0].length;found=true;break;}}
        if(!found){html+=esc(code[i]);i++;}
      }
      return html;
    }
    function renderBlock(b){
      const box=el('div','wsl-block wsl-block-'+b.type);
      if(b.type==='code'){
        const cap=el('div','wsl-code-cap');
        cap.appendChild(el('span','',b.label||b.language||'指令'));
        cap.appendChild(btn('複製',async()=>{
          try{await navigator.clipboard.writeText(b.content||'');showCopy('已複製')}
          catch(e){showCopy('複製失敗')}
        },'wsl-copy'));
        box.appendChild(cap);
        const pre=el('pre');const code=el('code');code.className='language-'+(codeLanguages[String(b.language||'').toLowerCase()]||String(b.language||'text').toLowerCase());code.innerHTML=colorizeCode(safe(b.content),b.language);pre.appendChild(code);box.appendChild(pre);
      }else if(b.type==='checklist'){
        safe(b.content).split('\n').filter(x=>x.trim()).forEach(line=>{
          const label=el('label','wsl-check');const check=document.createElement('input');check.type='checkbox';
          label.append(check,document.createTextNode(line));box.appendChild(label);
        });
      }else if(b.type==='image'){
        const src=safe(b.content).trim();
        if(/^(https?:\/\/|data:image\/)/i.test(src)){const img=document.createElement('img');img.src=src;img.alt=b.label||'操作示意';img.loading='lazy';box.appendChild(img);}
        else box.appendChild(el('p','',src||'尚未設定圖片網址'));
      }else if(b.type==='table'){
        const lines=safe(b.content).split('\n').filter(Boolean).map(s=>s.split('|').map(x=>x.trim()));
        const table=el('table');lines.forEach((cells,i)=>{const tr=el('tr');cells.forEach(c=>tr.appendChild(el(i?'td':'th','',c)));table.appendChild(tr)});box.appendChild(table);
      }else if(b.type==='heading'){box.appendChild(el('h4','',b.content||''));}
      else {box.appendChild(el('div','wsl-text',b.content||''));}
      return box;
    }
    let toastTimeout;
    function showCopy(message){
      let t=$('wslToast');if(!t){t=el('div','wsl-toast');t.id='wslToast';overlay.appendChild(t)}
      t.textContent=message;t.hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>t.hidden=true,1500);
    }
    function renderRead(){
      read.replaceChildren();
      read.appendChild(el('h1','wsl-document-title',data.title||'WSL 操作手冊'));
      data.chapters.forEach((ch,i)=>{
        const chapter=el('section','wsl-run-chapter');chapter.dataset.anchor=ch.id;
        chapter.appendChild(el('h2','',chapterLabel(i,ch)));
        if(ch.description)chapter.appendChild(el('p','wsl-muted',ch.description));
        (ch.sections||[]).forEach(sec=>{
          const section=el('section','wsl-run-section');section.dataset.anchor=sec.id;
          section.appendChild(el('h3','',sec.title||'未命名小節'));
          (sec.steps||[]).forEach((step,si)=>{
            const card=el('article','wsl-run-step');card.dataset.anchor=step.id;
            const h=el('h4');h.appendChild(el('span','wsl-num',String(si+1)));h.appendChild(document.createTextNode(step.title||'未命名步驟'));card.appendChild(h);
            if(step.description)card.appendChild(el('p','wsl-muted',step.description));
            (step.blocks||[]).forEach(b=>card.appendChild(renderBlock(b)));
            section.appendChild(card);
          });chapter.appendChild(section);
        });read.appendChild(chapter);
      });
      syncScroll();
    }
    // Runbook 浮動階層標題：只在標題改變時打字，避免每次 scroll 都重播。
    const scopeTimers = [];
    let scopeLabels = [];
    function clearScopeTyping() {
      scopeTimers.forEach(t=>clearTimeout(t));
      scopeTimers.length=0;
    }
    function updateScope(path) {
      if(path.length===scopeLabels.length && path.every((v,i)=>v===scopeLabels[i]))return;
      clearScopeTyping();
      const previous=scopeLabels;
      scopeLabels=path.slice();
      scope.replaceChildren();
      const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      path.forEach((label,i)=>{
        const line=el('div','wsl-scope-line level-'+i);
        const span=el('span','wsl-scope-typed');
        span.setAttribute('aria-label',label);
        line.appendChild(span);scope.appendChild(line);
        if(reduced || previous[i]===label){span.textContent=label;return;}
        const chars=Array.from(label);
        let at=0;
        span.classList.add('typing');
        const tick=()=>{
          if(!overlay.classList.contains('open') || editing){
            span.textContent=label;span.classList.remove('typing');return;
          }
          at=Math.min(at+2,chars.length);
          span.textContent=chars.slice(0,at).join('');
          if(at<chars.length)scopeTimers.push(setTimeout(tick,28));
          else span.classList.remove('typing');
        };
        scopeTimers.push(setTimeout(tick,70+i*90));
      });
    }
    function syncScroll(){
      if(editing||syncLock)return;
      const viewport=read.closest('.wsl-content');
      const rect=viewport.getBoundingClientRect(),threshold=rect.top+95;
      const anchors=[...read.querySelectorAll('[data-anchor]')];
      let current=anchors[0];
      const atBottom=viewport.scrollHeight-viewport.scrollTop-viewport.clientHeight<=3;
      if(atBottom && anchors.length)current=anchors[anchors.length-1];
      if(!atBottom)for(const a of anchors){if(a.getBoundingClientRect().top<=threshold)current=a;else break;}
      if(!current)return;
      activeId=current.dataset.anchor;
      const chapter=data.chapters.findIndex(c=>c.id===activeId||c.sections?.some(s=>s.id===activeId||s.steps?.some(t=>t.id===activeId)));
      if(chapter>=0&&expanded!==chapter){expanded=chapter;renderNav()}
      highlight();
      const ch=data.chapters[chapter];if(!ch)return;
      let path=[chapterLabel(chapter,ch)];
      for(const s of ch.sections||[]){
        if(s.id===activeId){path.push(s.title);break}
        const step=s.steps?.find(x=>x.id===activeId);
        if(step){path.push(s.title,step.title);break}
      }
      updateScope(path);
      scope.hidden=viewport.scrollTop<90;
      const selected=nav.querySelector('.wsl-chap-body.open .wsl-nav-step.active, .wsl-chap-body.open .wsl-nav-section.active');
      if(selected){const box=nav.getBoundingClientRect(),r=selected.getBoundingClientRect();if(r.top<box.top+10||r.bottom>box.bottom-12)selected.scrollIntoView({block:'nearest'})}
    }
    const content=overlay.querySelector('.wsl-content');
    content.addEventListener('scroll',()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(syncScroll)});
    function textField(label,value,onChange,textarea=false){
      const wrap=el('label','wsl-field');wrap.appendChild(el('span','',label));
      const input=el(textarea?'textarea':'input');if(!textarea)input.type='text';else input.rows=3;
      input.value=value||'';input.addEventListener('input',()=>onChange(input.value));wrap.appendChild(input);return wrap;
    }
    function actionBar(parent,actions){
      const bar=el('div','wsl-actions');
      actions.forEach(([label,fn,cls])=>bar.appendChild(btn(label,fn,cls||'')));
      parent.appendChild(bar);return bar;
    }
    function move(arr,index,delta){const next=index+delta;if(next<0||next>=arr.length)return;arr.splice(next,0,arr.splice(index,1)[0]);renderEditor()}
    // Match the site's guard.js confirmation UI without using browser-native confirm().
    // The WSL-specific dialog lives above the WSL modal and does not alter guard.js.
    const confirmLayer=el('div','wsl-confirm-layer');
    confirmLayer.hidden=true;
    const confirmPanel=el('div','eg-confirm wsl-confirm-panel');
    confirmPanel.setAttribute('role','alertdialog');
    confirmPanel.setAttribute('aria-modal','true');
    const confirmMessage=el('div','eg-confirm-msg wsl-confirm-message');
    confirmMessage.id='wslConfirmMessage';
    confirmPanel.setAttribute('aria-labelledby','wslConfirmMessage');
    const confirmActions=el('div','eg-confirm-actions');
    const confirmCancel=btn('取消',()=>settleConfirm(false),'eg-cancel');
    const confirmAccept=btn('確定刪除',()=>settleConfirm(true),'eg-discard');
    confirmActions.append(confirmCancel,confirmAccept);
    confirmPanel.append(confirmMessage,confirmActions);
    confirmLayer.appendChild(confirmPanel);
    document.body.appendChild(confirmLayer);
    let confirmResolve=null,confirmFocus=null;
    function settleConfirm(accepted){
      if(!confirmResolve)return;
      const resolve=confirmResolve;confirmResolve=null;
      confirmLayer.hidden=true;
      resolve(accepted);
      if(confirmFocus?.isConnected)confirmFocus.focus();
      confirmFocus=null;
    }
    function askConfirm(message,actionLabel='確定刪除'){
      if(confirmResolve)return Promise.resolve(false);
      confirmFocus=document.activeElement;
      confirmMessage.textContent=message;
      confirmAccept.textContent=actionLabel;
      confirmLayer.hidden=false;
      confirmCancel.focus();
      return new Promise(resolve=>{confirmResolve=resolve});
    }
    confirmLayer.addEventListener('click',e=>{if(e.target===confirmLayer)settleConfirm(false)});
    confirmLayer.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();settleConfirm(false)}
      if(e.key==='Tab'){
        const target=e.shiftKey?confirmCancel:confirmAccept;
        if(document.activeElement===target){e.preventDefault();(e.shiftKey?confirmAccept:confirmCancel).focus()}
      }
    });
    async function remove(arr,index,what){
      if(!await askConfirm('確定刪除'+what+'？'))return;
      arr.splice(index,1);renderEditor();
    }
    function addBlock(arr,type='text'){
      arr.push({type,content:'',...(type==='code'?{language:'bash'}:{}),...(type==='note'?{variant:'info'}:{})});renderEditor();
    }
    function blockEditor(blocks,b,bi){
      const panel=el('div','wsl-edit-block');
      const head=el('div','wsl-edit-block-head');
      // Content type is chosen when creating the block; editing it must not erase fields.
      const typeNames={text:'文字說明',heading:'小標題',code:'指令碼',note:'提示訊息',checklist:'檢查清單',table:'表格',image:'圖片網址'};
      head.appendChild(el('span','wsl-block-type-label wsl-block-type-'+(b.type||'text'),typeNames[b.type]||b.type));
      actionBar(head,[['↑',()=>move(blocks,bi,-1)],['↓',()=>move(blocks,bi,1)],['刪除',()=>remove(blocks,bi,'內容區塊'),'danger']]);
      panel.appendChild(head);
      if(b.type==='code')panel.appendChild(textField('語言',b.language,v=>b.language=v));
      if(b.type==='note'){
        const field=el('label','wsl-field');field.appendChild(el('span','','提示類型'));
        const sel=el('select');['info','warn','danger','ok'].forEach(v=>{const o=el('option','',({info:'資訊',warn:'注意',danger:'危險',ok:'完成'})[v]);o.value=v;sel.appendChild(o)});
        sel.value=b.variant||'info';sel.addEventListener('change',()=>b.variant=sel.value);field.appendChild(sel);panel.appendChild(field);
      }
      const contentField=textField(({code:'指令內容',image:'圖片 URL',table:'表格內容（每列用 | 分隔欄位）',checklist:'檢查項目（每行一項）'})[b.type]||'內容',b.content,v=>b.content=v,true);
      if(b.type==='code'){const textarea=contentField.querySelector('textarea');textarea.rows=12;textarea.classList.add('wsl-code-editor');}
      panel.appendChild(contentField);
      return panel;
    }
    // Editor has a separate pipeline-style tree, leaving the reading TOC untouched.
    const editNav=$('wslEditNav');
    // UI-only collapse state; never changes the saved runbook JSON.
    const collapsedTreeIds=new Set();
    const isCollapsed=node=>collapsedTreeIds.has(node.id);
    function toggleTree(node){
      if(isCollapsed(node))collapsedTreeIds.delete(node.id);
      else collapsedTreeIds.add(node.id);
      renderEditTree();
    }
    const selectEdit=(kind,ci,si=-1,ti=-1)=>{editSelection={kind,ci,si,ti};renderEditor();};
    function dragReorder(container,index,targetIndex){
      if(index===targetIndex || index<0 || targetIndex<0 || targetIndex>=container.length)return;
      container.splice(targetIndex,0,container.splice(index,1)[0]);renderEditor();
    }
    // The browser does not expose dataTransfer.getData() reliably during dragover.
    // Keep the drag origin in memory and render a real insertion placeholder.
    let activeDrag=null, dropPlaceholder=null, dropSlot=null;
    function clearDragMarker(){
      if(dropPlaceholder){dropPlaceholder.remove();dropPlaceholder=null;}
      dropSlot=null;
      document.querySelectorAll('#wslModalBg .wsl-drop-before,#wslModalBg .wsl-drop-after')
        .forEach(x=>x.classList.remove('wsl-drop-before','wsl-drop-after'));
    }
    // Each tree row can be nested inside a section/step wrapper. Insert the
    // placeholder among the wrappers, not inside the row itself.
    // A tree node is an entire JSON object, including all of its descendants.
    // Steps may move between sections; sections may move between chapters.
    function treeArray(kind,ci,si){
      if(kind==='chapter')return data.chapters;
      const chapter=data.chapters[ci];
      if(!chapter)return null;
      if(kind==='section')return chapter.sections;
      return chapter.sections?.[si]?.steps || null;
    }
    function dropDestination(kind,ci,si,targetIndex){
      if(!activeDrag)return null;
      const source=activeDrag;
      if(source.type==='block'){
        if(kind!=='block')return null;
        return source.index===targetIndex?null:targetIndex;
      }
      if(source.type!=='tree'||source.kind!==kind)return null;
      const sourceArray=treeArray(kind,source.ci,source.si);
      const targetArray=treeArray(kind,ci,si);
      if(!sourceArray||!targetArray)return null;
      if(sourceArray===targetArray&&source.index===targetIndex)return null;
      return targetIndex;
    }
    function markDrop(target,event,index,container,onCommit,kind,ci,si){
      if(!activeDrag)return;
      const nextIndex=dropDestination(kind,ci,si,index);
      if(nextIndex===null){clearDragMarker();return;}
      const sameArray=activeDrag.type==='block' || treeArray(kind,activeDrag.ci,activeDrag.si)===container;
      const before=sameArray?activeDrag.index>index:event.clientY<target.getBoundingClientRect().top+target.getBoundingClientRect().height/2;
      const host=target.closest('.wsl-edit-tree-step, .wsl-edit-tree-section, .wsl-edit-tree-chapter') || target;
      const parent=host.parentNode;
      const reference=before?host:host.nextSibling;
      if(!dropPlaceholder){
        dropPlaceholder=el('div','wsl-drop-placeholder');
        dropPlaceholder.textContent='放置於此';
        dropPlaceholder.setAttribute('aria-hidden','true');
        dropPlaceholder.addEventListener('dragover',e=>{
          if(!activeDrag)return;
          e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='move';
        });
        dropPlaceholder.addEventListener('drop',e=>{
          if(!activeDrag||!dropSlot)return;
          e.preventDefault();e.stopPropagation();dropSlot.commit();
        });
      }
      dropSlot={commit:()=>onCommit(nextIndex,before)};
      if(dropPlaceholder.parentNode!==parent||dropPlaceholder.nextSibling!==reference){
        parent.insertBefore(dropPlaceholder,reference);
      }
    }
    function reorderFromDrag(kind,ci,si,targetIndex,before){
      const from=activeDrag;
      if(!from||from.type!=='tree'||from.kind!==kind)return;
      const sourceArray=treeArray(kind,from.ci,from.si);
      const targetArray=treeArray(kind,ci,si);
      if(!sourceArray||!targetArray)return;
      const original=sourceArray[from.index];
      if(!original)return;
      // For the same list, direction alone determines the new index.
      // For different lists, insert before/after the hovered item.
      let insertion=sourceArray===targetArray?targetIndex:(before?targetIndex:targetIndex+1);
      if(sourceArray===targetArray&&insertion===from.index)return;
      sourceArray.splice(from.index,1);
      insertion=Math.min(Math.max(insertion,0),targetArray.length);
      targetArray.splice(insertion,0,original);
      if(kind==='chapter')editSelection={kind,ci:insertion,si:-1,ti:-1};
      if(kind==='section')editSelection={kind,ci,si:insertion,ti:-1};
      if(kind==='step')editSelection={kind,ci,si,ti:insertion};
      activeDrag=null;clearDragMarker();renderEditor();
    }
    function compatibleTreeDrop(from,kind){
      return from?.type==='tree'&&from.kind===kind;
    }
    function treeEntry(parent,title,kind,ci,si,ti,arr,index){
      const line=el('div','wsl-edit-tree-item '+(editSelection?.kind===kind&&editSelection?.ci===ci&&editSelection?.si===si&&editSelection?.ti===ti?'active':''));
      line.draggable=false;
      line.dataset.kind=kind;
      const handle=btn('⠿',()=>{},'wsl-edit-tree-handle');
      handle.draggable=true;
      handle.title='拖曳移動整組'+({chapter:'章節',section:'小節',step:'步驟'}[kind]);
      handle.setAttribute('aria-label',handle.title);
      line.appendChild(handle);
      line.appendChild(btn(title,()=>selectEdit(kind,ci,si,ti),'wsl-edit-tree-select'));
      if(kind!=='step'){
        const node=kind==='chapter'?data.chapters[ci]:data.chapters[ci]?.sections?.[si];
        const toggle=btn(isCollapsed(node)?'▸':'▾',()=>toggleTree(node),'wsl-edit-tree-toggle');
        toggle.title=isCollapsed(node)?'展開子項目':'收合子項目';
        toggle.setAttribute('aria-label',toggle.title);
        toggle.setAttribute('aria-expanded',String(!isCollapsed(node)));
        line.appendChild(toggle);
      }
      handle.addEventListener('dragstart',e=>{
        e.dataTransfer.effectAllowed='move';
        e.dataTransfer.setData('application/x-wsl-tree','move');
        activeDrag={type:'tree',kind,ci,si,ti,index};
        clearDragMarker();line.classList.add('dragging');
      });
      handle.addEventListener('dragend',()=>{line.classList.remove('dragging');activeDrag=null;clearDragMarker()});
      line.addEventListener('dragover',e=>{
        if(!compatibleTreeDrop(activeDrag,kind))return;
        e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect='move';
        markDrop(line,e,index,arr,(to,before)=>reorderFromDrag(kind,ci,si,to,before),kind,ci,si);
      });
      line.addEventListener('drop',e=>{
        if(!compatibleTreeDrop(activeDrag,kind))return;
        e.preventDefault();e.stopPropagation();
        const to=dropDestination(kind,ci,si,index);
        if(to!==null){
          const same=treeArray(kind,activeDrag.ci,activeDrag.si)===arr;
          const before=same?activeDrag.index>index:e.clientY<line.getBoundingClientRect().top+line.getBoundingClientRect().height/2;
          reorderFromDrag(kind,ci,si,to,before);
        }
        else clearDragMarker();
      });
      parent.appendChild(line);
    }
    function renderEditTree(){
      editNav.replaceChildren();
      const controls=el('div','wsl-edit-tree-controls');
      controls.appendChild(btn('＋ 新增章節',()=>{
        data.chapters.push({id:uid(),title:'新章節',description:'',sections:[]});
        selectEdit('chapter',data.chapters.length-1);
      },'wsl-edit-tree-add'));
      controls.appendChild(btn('全部收合',()=>{
        data.chapters.forEach(ch=>{collapsedTreeIds.add(ch.id);(ch.sections||[]).forEach(sec=>collapsedTreeIds.add(sec.id));});
        renderEditTree();
      },'wsl-edit-tree-all'));
      controls.appendChild(btn('全部展開',()=>{collapsedTreeIds.clear();renderEditTree();},'wsl-edit-tree-all'));
      editNav.appendChild(controls);
      data.chapters.forEach((ch,ci)=>{
        const chapterGroup=el('div','wsl-edit-tree-chapter');
        treeEntry(chapterGroup,chapterLabel(ci,ch),'chapter',ci,-1,-1,data.chapters,ci);
        if(!isCollapsed(ch)) (ch.sections||[]).forEach((sec,si)=>{
          const sectionGroup=el('div','wsl-edit-tree-section');
          treeEntry(sectionGroup,sec.title||'未命名小節','section',ci,si,-1,ch.sections,si);
          if(!isCollapsed(sec)) (sec.steps||[]).forEach((step,ti)=>{
            const stepGroup=el('div','wsl-edit-tree-step');
            treeEntry(stepGroup,(ti+1)+'. '+(step.title||'未命名步驟'),'step',ci,si,ti,sec.steps,ti);
            sectionGroup.appendChild(stepGroup);
          });
          chapterGroup.appendChild(sectionGroup);
        });
        editNav.appendChild(chapterGroup);
      });
    }
    function renderEditor(){
      clearDragMarker();
      if(!editSelection || !data.chapters[editSelection.ci]){
        editSelection=data.chapters.length?{kind:'chapter',ci:0,si:-1,ti:-1}:null;
      }
      renderEditTree();editor.replaceChildren();queueDirtyCheck();
      if(!editSelection){editor.appendChild(textField('手冊名稱',data.title,v=>data.title=v));return}
      const {kind,ci,si,ti}=editSelection;
      const ch=data.chapters[ci],sec=ch.sections?.[si],step=sec?.steps?.[ti];
      const top=el('div','wsl-edit-panel-title');
      if(kind==='chapter'){
        const titleRow=el('div','wsl-edit-title-row');
        titleRow.appendChild(el('span','wsl-edit-title-number','第'+(ci+1)+'章'));
        const titleInput=el('input','wsl-edit-title-input');
        titleInput.type='text';titleInput.value=ch.title||'';
        titleInput.setAttribute('aria-label','章節名稱');
        titleInput.title='直接修改章節名稱';
        titleInput.addEventListener('input',()=>{ch.title=titleInput.value;renderEditTree()});
        titleRow.appendChild(titleInput);top.appendChild(titleRow);
      }else if(kind==='step'&&step){
        const titleInput=el('input','wsl-edit-title-input wsl-edit-step-title');
        titleInput.type='text';
        titleInput.value=step.title||'';
        titleInput.setAttribute('aria-label','步驟名稱');
        titleInput.title='直接修改步驟名稱';
        titleInput.addEventListener('input',()=>{step.title=titleInput.value;renderEditTree()});
        top.appendChild(titleInput);
      }else{
        top.appendChild(el('h2','',sec?.title||'小節'));
      }
      editor.appendChild(top);
      if(kind==='chapter'){
        editor.appendChild(textField('手冊名稱',data.title,v=>data.title=v));
        editor.appendChild(textField('章節摘要',ch.description,v=>ch.description=v,true));
        actionBar(editor,[['＋ 新增小節',()=>{ch.sections.push({id:uid(),title:'新小節',steps:[]});selectEdit('section',ci,ch.sections.length-1)}],['↑',()=>{move(data.chapters,ci,-1);selectEdit('chapter',Math.max(0,ci-1))}],['↓',()=>{move(data.chapters,ci,1);selectEdit('chapter',Math.min(data.chapters.length-1,ci+1))}],['刪除章節',async()=>{if(!await askConfirm('確定刪除整個章節及其內容？'))return;data.chapters.splice(ci,1);editSelection=null;renderEditor()},'danger']]);
      }else if(kind==='section'&&sec){
        editor.appendChild(textField('小節名稱',sec.title,v=>{sec.title=v;top.querySelector('h2').textContent=v;renderEditTree()}));
        actionBar(editor,[['＋ 新增步驟',()=>{sec.steps.push({id:uid(),title:'新步驟',description:'',blocks:[]});selectEdit('step',ci,si,sec.steps.length-1)}],['↑',()=>{move(ch.sections,si,-1);selectEdit('section',ci,Math.max(0,si-1))}],['↓',()=>{move(ch.sections,si,1);selectEdit('section',ci,Math.min(ch.sections.length-1,si+1))}],['刪除小節',async()=>{if(!await askConfirm('確定刪除小節及其步驟？'))return;ch.sections.splice(si,1);selectEdit('chapter',ci)},'danger']]);
      }else if(kind==='step'&&step){
        editor.appendChild(textField('步驟說明',step.description,v=>step.description=v,true));
        const blocks=el('div','wsl-edit-block-list');
        (step.blocks||[]).forEach((block,bi)=>{
          const blockPanel=blockEditor(step.blocks,block,bi);
          blockPanel.draggable=true;
          blockPanel.addEventListener('dragstart',e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-wsl-block','move');activeDrag={type:'block',index:bi};clearDragMarker();blockPanel.classList.add('dragging')});
          blockPanel.addEventListener('dragend',()=>{blockPanel.classList.remove('dragging');activeDrag=null;clearDragMarker()});
          blockPanel.addEventListener('dragover',e=>{if(activeDrag?.type!=='block')return;e.preventDefault();e.stopPropagation();markDrop(blockPanel,e,bi,step.blocks,to=>{
            const from=activeDrag?.index;if(from==null||from===to)return;
            step.blocks.splice(to,0,step.blocks.splice(from,1)[0]);
            activeDrag=null;clearDragMarker();renderEditor();
          },'block',ci,si)});
          blockPanel.addEventListener('drop',e=>{
            if(activeDrag?.type!=='block')return;
            e.preventDefault();e.stopPropagation();
            const from=activeDrag.index;
            const to=dropDestination('block',ci,si,bi);
            if(to!==null)step.blocks.splice(to,0,step.blocks.splice(from,1)[0]);
            activeDrag=null;clearDragMarker();renderEditor();
          });
          blocks.appendChild(blockPanel);
        });
        editor.appendChild(blocks);
        // Inline creation toolbar: one click creates a fixed-type content block.
        const createToolbar=el('div','wsl-create-toolbar');
        createToolbar.appendChild(el('span','wsl-create-label','新增內容'));
        const tools=[
          ['text','文字','M4 7h16 M4 12h16 M4 17h11'],
          ['heading','標題','M4 5v14 M14 5v14 M4 12h10 M19 8v11 M16 19h6'],
          ['code','指令碼','M8 8l-4 4 4 4 M16 8l4 4-4 4 M14 5l-4 14'],
          ['note','提示','M12 8v5 M12 17h.01 M10 3h4l8 17H2z'],
          ['checklist','清單','M3 6l2 2 4-4 M12 6h9 M3 16l2 2 4-4 M12 16h9'],
          ['table','表格','M3 4h18v16H3z M3 10h18 M3 15h18 M9 4v16'],
          ['image','圖片','M3 3h18v18H3z M8 9h.01 M3 17l5-5 4 4 3-3 6 6']
        ];
        tools.forEach(([type,label,path])=>{
          const button=btn('',()=>addBlock(step.blocks,type),'wsl-create-tool wsl-create-tool-'+type);
          button.type='button';button.title='新增'+label;button.setAttribute('aria-label','新增'+label);
          const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
          svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','17');svg.setAttribute('height','17');
          svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');
          svg.setAttribute('stroke-width','1.8');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
          const paths=document.createElementNS('http://www.w3.org/2000/svg','path');paths.setAttribute('d',path);svg.appendChild(paths);
          button.appendChild(svg);button.appendChild(el('span','',label));createToolbar.appendChild(button);
        });
        editor.appendChild(createToolbar);
        actionBar(editor,[['↑',()=>{move(sec.steps,ti,-1);selectEdit('step',ci,si,Math.max(0,ti-1))}],['↓',()=>{move(sec.steps,ti,1);selectEdit('step',ci,si,Math.min(sec.steps.length-1,ti+1))}],['刪除步驟',async()=>{if(!await askConfirm('確定刪除步驟？'))return;sec.steps.splice(ti,1);selectEdit('section',ci,si)},'danger']]);
      }
    }
    function renderProfiles(){
      const holder=$('guideProfiles');holder.replaceChildren();
      store.profiles.forEach(p=>{
        const item=btn(p.label,()=>switchProfile(p.id),'guide-profile'+(p.id===selectedProfile().id?' active':''));
        item.title='切換設定';holder.appendChild(item);
      });
      // 設定管理區僅在編輯模式顯示；由 syncMode 統一控制。
    }
    function switchProfile(id){
      if(editing||selectedProfile()?.id===id)return;
      store.selectedId=id;data=selectedProfile().document;expanded=0;activeId='';editSelection=null;
      persist();renderProfiles();syncMode();renderRead();renderNav();
    }
    function addProfile(){
      if(editing)return;
      const base=selectedProfile();const label='新設定 '+(store.profiles.length+1);
      const p=makeProfile({version:2,title:GUIDE_TITLES[currentGuide]||'操作手冊',chapters:[]},label);
      store.profiles.push(p);store.selectedId=p.id;data=p.document;persist();renderProfiles();syncMode();renderRead();renderNav();enterEdit();
    }
    function copyProfile(){
      if(editing)return;
      const p=selectedProfile();const copy=makeProfile(clone(data),p.label+' (複製)');
      store.profiles.push(copy);store.selectedId=copy.id;data=copy.document;
      persist();renderProfiles();syncMode();renderRead();renderNav();
    }
    function askProfileName(initial){
      return new Promise(resolve=>{
        const layer=el('div','wsl-confirm-layer');
        const panel=el('div','eg-confirm wsl-confirm-panel');
        panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
        panel.appendChild(el('div','eg-confirm-msg','設定名稱'));
        const input=el('input','guide-name-input');input.type='text';input.value=initial;
        panel.appendChild(input);
        const actions=el('div','eg-confirm-actions');
        const finish=value=>{layer.remove();resolve(value)};
        actions.appendChild(btn('取消',()=>finish(null),'eg-cancel'));
        actions.appendChild(btn('確定',()=>finish(input.value),'eg-discard'));
        panel.appendChild(actions);layer.appendChild(panel);document.body.appendChild(layer);
        layer.addEventListener('click',e=>{if(e.target===layer)finish(null)});
        layer.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();finish(null)}if(e.key==='Enter'){e.preventDefault();finish(input.value)}});
        input.focus();input.select();
      });
    }
    async function renameProfile(){
      if(editing)return;
      const p=selectedProfile();const name=await askProfileName(p.label);
      if(name===null)return;
      const trimmed=name.trim();if(!trimmed){showCopy('設定名稱不可空白');return;}
      p.label=trimmed;persist();renderProfiles();
    }
    async function deleteProfile(){
      if(editing||store.profiles.length<2){if(store.profiles.length<2)showCopy('至少保留一組設定');return;}
      if(!await askConfirm('確定刪除設定「'+selectedProfile().label+'」及其所有內容？'))return;
      store.profiles=store.profiles.filter(p=>p.id!==store.selectedId);
      store.selectedId=store.profiles[0].id;data=selectedProfile().document;
      persist();renderProfiles();syncMode();renderRead();renderNav();
    }
    $('guideAddProfile').addEventListener('click',addProfile);
    $('guideCopyProfile').addEventListener('click',copyProfile);
    $('guideRenameProfile').addEventListener('click',renameProfile);
    $('guideDeleteProfile').addEventListener('click',deleteProfile);
    function syncMode(){
      read.hidden=editing;editor.hidden=!editing;
      $('guideImportHtml').hidden=editing;$('guideExportHtml').hidden=editing;$('wslEdit').hidden=editing;$('wslSave').hidden=!editing;$('wslCancel').hidden=!editing;
      scope.hidden=true;
      if(editing){clearScopeTyping();scopeLabels=[];}
      $('wslHeaderTitle').textContent=data.title||'WSL 操作手冊';
      nav.hidden=editing;editNav.hidden=!editing;
      nav.closest('.wsl-toc').classList.toggle('editing',editing);renderProfiles();
      overlay.querySelector('.guide-profile-head').hidden=!editing;
      $('guideProfiles').hidden=!editing;
      overlay.querySelector('.guide-profile-actions').hidden=!editing;
      content.scrollTop=0;
      updateDirtyBadge();
    }
    function exportStaticHtml(){
      if(editing){showCopy('請先儲存或取消編輯後再匯出');return;}
      const profile=selectedProfile();
      const doc=clone(profile.document);
      //const escHtml=x=>safe(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
      const blockHtml=b=>{
        const v=AppUtils.escHtml(b.content||'');
        if(b.type==='code')return `<div class="code-card"><div class="code-head"><span>${AppUtils.escHtml(b.label||b.language||'指令')}</span><button type="button" class="copy">複製</button></div><pre><code class="language-${AppUtils.escHtml(b.language||'text')}">${colorizeCode(safe(b.content||''),b.language)}</code></pre></div>`;
        if(b.type==='heading')return `<h4>${v}</h4>`;
        if(b.type==='image'){
          const url=safe(b.content).trim();
          return /^(https?:\/\/|data:image\/)/i.test(url)?`<img class="guide-image" src="${AppUtils.escHtml(url)}" alt="${AppUtils.escHtml(b.label||'操作示意')}">`:`<p>${v}</p>`;
        }
        if(b.type==='table')return '<table>'+safe(b.content).split('\n').filter(Boolean).map((line,i)=>'<tr>'+line.split('|').map(cell=>`<${i?'td':'th'}>${AppUtils.escHtml(cell.trim())}</${i?'td':'th'}>`).join('')+'</tr>').join('')+'</table>';
        if(b.type==='checklist')return '<div class="checklist">'+safe(b.content).split('\n').filter(x=>x.trim()).map(x=>`<label><input type="checkbox"> ${AppUtils.escHtml(x)}</label>`).join('')+'</div>';
        return `<div class="note">${v}</div>`;
      };
      const toc=[];
      const body=(doc.chapters||[]).map((ch,ci)=>{
        const cid='chapter-'+ci;
        toc.push(`<a class="chapter-link" data-chapter="${ci}" href="#${cid}">${AppUtils.escHtml('第'+(ci+1)+'章 '+(ch.title||'未命名章節'))}</a>`);
        const sections=(ch.sections||[]).map((sec,si)=>{
          const sid=cid+'-section-'+si;
          toc.push(`<a class="sub" data-chapter="${ci}" href="#${sid}">${AppUtils.escHtml(sec.title||'未命名小節')}</a>`);
          (sec.steps||[]).forEach((step,ti)=>{
            toc.push(`<a class="step-link" data-chapter="${ci}" href="#${sid}-step-${ti}">${ti+1}. ${AppUtils.escHtml(step.title||'未命名步驟')}</a>`);
          });
          return `<section id="${sid}"><h3>${AppUtils.escHtml(sec.title||'未命名小節')}</h3>${(sec.steps||[]).map((step,ti)=>`<article class="step" id="${sid}-step-${ti}"><h4><span class="num">${ti+1}</span> ${AppUtils.escHtml(step.title||'未命名步驟')}</h4>${step.description?`<p class="muted">${AppUtils.escHtml(step.description)}</p>`:''}${(step.blocks||[]).map(blockHtml).join('')}</article>`).join('')}</section>`;
        }).join('');
        return `<section id="${cid}" class="chapter"><h2>第${ci+1}章　${AppUtils.escHtml(ch.title||'未命名章節')}</h2>${ch.description?`<p class="muted">${AppUtils.escHtml(ch.description)}</p>`:''}${sections}</section>`;
      }).join('');
      const title=AppUtils.escHtml(doc.title||GUIDE_TITLES[currentGuide]||currentGuide);
      const embeddedData=JSON.stringify({format:'guide-html',version:1,guideId:currentGuide,profileLabel:profile.label,document:doc}).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
      const html=`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
:root{color-scheme:dark light;font-family:system-ui,-apple-system,"Microsoft JhengHei",sans-serif;--bg:#17191e;--surface:#22252c;--text:#e8eaf0;--muted:#a8aeba;--line:#393e49;--accent:#67b7ff}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text)}header{height:62px;display:flex;align-items:center;justify-content:space-between;padding:0 24px;border-bottom:1px solid var(--line);background:var(--surface);position:sticky;top:0;z-index:2}header strong{font-size:17px}button{cursor:pointer;background:var(--surface);color:var(--text);border:1px solid var(--line);padding:7px 12px;border-radius:7px}.layout{display:grid;grid-template-columns:280px minmax(0,1fr);min-height:calc(100vh - 62px);min-width:0}aside{padding:22px 16px;border-right:1px solid var(--line);overflow:auto;position:sticky;top:62px;height:calc(100vh - 62px)}aside a{display:block;color:var(--text);text-decoration:none;padding:9px 12px;border-radius:6px}aside a:hover,aside a.active{background:var(--surface);color:var(--accent)}aside a[hidden]{display:none}aside .sub{padding-left:28px;font-size:13px;color:var(--muted)}aside .step-link{padding:6px 12px 6px 42px;font-size:12px;color:var(--muted);line-height:1.45;overflow-wrap:anywhere}main{max-width:1100px;width:100%;min-width:0;overflow-wrap:anywhere;padding:30px 40px;margin:0 auto}h1{font-size:27px}h2{font-size:23px;margin:38px 0 18px}h3{font-size:19px;margin:28px 0 16px}h4{font-size:16px}.chapter,section,article{scroll-margin-top:84px}aside .chapter-link{display:flex;align-items:flex-start;gap:9px;font-weight:600;margin-top:5px}aside .chapter-link::before{content:'›';display:inline-block;flex:0 0 12px;font-size:19px;line-height:18px;color:var(--muted);transition:transform .18s ease}aside .chapter-link.expanded::before{transform:rotate(90deg);color:var(--accent)}aside a.active{background:color-mix(in srgb,var(--accent) 12%,var(--surface));color:var(--accent);box-shadow:inset 3px 0 var(--accent)}aside .step-link.active{font-weight:600}aside a:focus-visible{outline:2px solid var(--accent);outline-offset:1px}.wsl-syn-comment,.hljs-comment{color:#7d91a7}.wsl-syn-string,.hljs-string{color:#b7df9a}.wsl-syn-keyword,.hljs-keyword{color:#8fc4ff;font-weight:600}.wsl-syn-variable,.hljs-variable{color:#e6c47d}.wsl-syn-number,.hljs-number{color:#e8b58d}.wsl-syn-key,.hljs-attr{color:#9cd5d1}.wsl-syn-literal,.hljs-literal{color:#d2a9f5}aside a[hidden]{display:none!important}.step{min-width:0;overflow:hidden;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin:16px 0}.num{display:inline-grid;place-items:center;background:var(--accent);color:#102132;border-radius:50%;width:25px;height:25px;margin-right:8px}.muted{color:var(--muted);white-space:pre-wrap}.note{white-space:pre-wrap;line-height:1.75;margin:12px 0}.code-card{border:1px solid var(--line);border-radius:9px;overflow:hidden;margin:12px 0}.code-head{display:flex;justify-content:space-between;align-items:center;background:#303540;padding:8px 12px;font-size:13px}pre{margin:0;overflow:auto;padding:16px;background:#12151a;color:#e3f1ff}code{font-family:Consolas,monospace;font-size:13px;line-height:1.65}table{border-collapse:collapse;width:100%;margin:12px 0}td,th{border:1px solid var(--line);padding:9px;text-align:left}.checklist label{display:block;margin:8px 0}.guide-image{max-width:100%;height:auto}body.light{--bg:#f5f7fa;--surface:#fff;--text:#252b34;--muted:#606975;--line:#d9dee7;--accent:#2875c4}body.light pre{background:#20242c;color:#e3f1ff}body.light .num{color:#fff}@media(max-width:720px){.layout{display:block}aside{position:relative;top:0;height:auto;max-height:240px;border-right:0;border-bottom:1px solid var(--line)}main{padding:18px}header{padding:0 12px}}

/* Exported Guide: code cards follow the selected light/dark theme. */
body{--code-head:#303540;--code-bg:#12151a;--code-text:#e3f1ff;--code-border:var(--line);--code-button-bg:#39414e;--code-button-text:#e8eaf0;--syn-comment:#94a6ba;--syn-string:#b7df9a;--syn-keyword:#8fc4ff;--syn-variable:#e6c47d;--syn-number:#e8b58d;--syn-key:#9cd5d1;--syn-literal:#d2a9f5}
body.light{color-scheme:light;--code-head:#edf2f8;--code-bg:#f8fafc;--code-text:#243244;--code-border:#cbd5e1;--code-button-bg:#fff;--code-button-text:#334155;--syn-comment:#64748b;--syn-string:#166534;--syn-keyword:#1d4ed8;--syn-variable:#92400e;--syn-number:#9a3412;--syn-key:#0f766e;--syn-literal:#7e22ce}
body:not(.light){color-scheme:dark}
.code-card{border-color:var(--code-border);background:var(--code-bg)}
.code-card .code-head{background:var(--code-head);color:var(--code-text);border-bottom:1px solid var(--code-border)}
.code-card pre,body.light .code-card pre{background:var(--code-bg);color:var(--code-text)}
.code-card pre code{background:transparent;color:inherit}
.code-card .copy{background:var(--code-button-bg);color:var(--code-button-text);border-color:var(--code-border)}
.code-card .copy:hover{border-color:var(--accent);color:var(--accent)}
.code-card .wsl-syn-comment,.code-card .hljs-comment{color:var(--syn-comment)}
.code-card .wsl-syn-string,.code-card .hljs-string{color:var(--syn-string)}
.code-card .wsl-syn-keyword,.code-card .hljs-keyword{color:var(--syn-keyword);font-weight:600}
.code-card .wsl-syn-variable,.code-card .hljs-variable{color:var(--syn-variable)}
.code-card .wsl-syn-number,.code-card .hljs-number{color:var(--syn-number)}
.code-card .wsl-syn-key,.code-card .hljs-attr{color:var(--syn-key)}
.code-card .wsl-syn-literal,.code-card .hljs-literal{color:var(--syn-literal)}
</style></head><body><header><strong>${title} · ${AppUtils.escHtml(profile.label)}</strong><button id="theme" type="button">切換明暗</button></header><div class="layout"><aside><strong>章節目錄</strong>${toc.join('')}</aside><main><h1>${title}</h1>${body}</main></div><script type="application/json" id="guide-editor-data">${embeddedData}</script><script>
document.querySelectorAll('.copy').forEach(b=>b.addEventListener('click',async()=>{const code=b.closest('.code-card').querySelector('code').textContent;try{await navigator.clipboard.writeText(code);b.textContent='已複製'}catch(e){const ta=document.createElement('textarea');ta.value=code;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();b.textContent='已複製'}setTimeout(()=>b.textContent='複製',1200)}));document.getElementById('theme').addEventListener('click',()=>document.body.classList.toggle('light'));
// Keep all chapters in the document so scrolling naturally continues into the next chapter.
const chapters=Array.from(document.querySelectorAll('main > section.chapter'));
const links=Array.from(document.querySelectorAll('aside a[data-chapter]'));
const sidebar=document.querySelector('aside');
let activeChapter=-1,activeAnchor='',manualUntil=0;
function setActive(index,id){
  if(index<0||index>=chapters.length)return;
  const changed=activeChapter!==index;
  const previousAnchor=activeAnchor;
  activeChapter=index;activeAnchor=id;
  links.forEach(a=>{
    const own=Number(a.dataset.chapter)===index;
    if(a.classList.contains('sub')||a.classList.contains('step-link')){
      a.hidden=!own;
      a.style.display=own?'block':'none';
    }
    if(a.classList.contains('chapter-link')){
      a.classList.toggle('expanded',own);
      a.setAttribute('aria-expanded',String(own));
    }
    a.classList.toggle('active',own&&a.getAttribute('href')==='#'+id);
  });
  if(changed || id!==previousAnchor){
    const selected=links.find(a=>a.getAttribute('href')==='#'+id)||links.find(a=>a.classList.contains('chapter-link')&&Number(a.dataset.chapter)===index);
    if(selected){
      const r=selected.getBoundingClientRect(),box=sidebar.getBoundingClientRect();
      if(r.top<box.top+15)sidebar.scrollTop-=box.top+15-r.top;else if(r.bottom>box.bottom-15)sidebar.scrollTop+=r.bottom-(box.bottom-15);
    }
  }
}
links.forEach(a=>a.addEventListener('click',e=>{
  e.preventDefault();
  const index=Number(a.dataset.chapter);
  const id=a.getAttribute('href').slice(1);
  const target=document.getElementById(id);
  if(!target)return;
  manualUntil=Date.now()+800;
  setActive(index,id);
  target.scrollIntoView({block:'start',behavior:'smooth'});
  history.replaceState(null,'','#'+id);
}));
let scheduled=false;
function syncNavigation(){
  scheduled=false;
  if(Date.now()<manualUntil)return;
  const anchors=Array.from(document.querySelectorAll('main .chapter,main .chapter > section,main .chapter article.step'));
  if(!anchors.length)return;
  let current=anchors[0];
  const bottom=window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-3;
  if(bottom)current=anchors[anchors.length-1];
  else for(const el of anchors){if(el.getBoundingClientRect().top<=120)current=el;else break;}
  const chapter=current.closest('.chapter');
  const index=chapters.indexOf(chapter);
  if(index>=0)setActive(index,current.id);
}
window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(syncNavigation)}},{passive:true});
window.addEventListener('resize',syncNavigation);
if(chapters.length){
  const target=location.hash?document.getElementById(location.hash.slice(1)):null;
  if(target&&target.closest('.chapter')){
    const index=chapters.indexOf(target.closest('.chapter'));
    setActive(index,target.id);
    requestAnimationFrame(()=>target.scrollIntoView({block:'start'}));
  }else setActive(0,chapters[0].id);
  requestAnimationFrame(syncNavigation);
}
<\/script></body></html>`;
      const blob=new Blob([html],{type:'text/html;charset=utf-8'});
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=url;link.download=(currentGuide+'_'+profile.label).replace(/[\\/:*?"<>|]/g,'_')+'.html';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }
    // Import only HTML generated with the embedded editable document payload.
    const htmlImportInput=document.createElement('input');
    htmlImportInput.type='file';htmlImportInput.accept='.html,.htm,text/html';htmlImportInput.hidden=true;
    overlay.appendChild(htmlImportInput);
    function validateImportedDocument(doc){
      if(!doc||typeof doc!=='object'||Array.isArray(doc)||typeof doc.title!=='string'||!Array.isArray(doc.chapters))throw new Error('手冊資料結構不正確');
      if(doc.chapters.length>2000)throw new Error('章節數量超出限制');
      const ids=new Set();
      const checkId=(node)=>{if(!node||typeof node.id!=='string'||!node.id||ids.has(node.id))throw new Error('章節／步驟識別碼不正確或重複');ids.add(node.id)};
      for(const ch of doc.chapters){
        checkId(ch);if(typeof ch.title!=='string'||!Array.isArray(ch.sections))throw new Error('章節資料不完整');
        for(const sec of ch.sections){
          checkId(sec);if(typeof sec.title!=='string'||!Array.isArray(sec.steps))throw new Error('小節資料不完整');
          for(const step of sec.steps){
            checkId(step);if(typeof step.title!=='string'||!Array.isArray(step.blocks))throw new Error('步驟資料不完整');
            for(const block of step.blocks){if(!block||typeof block.type!=='string'||typeof block.content!=='string')throw new Error('內容區塊格式不正確');}
          }
        }
      }
      return doc;
    }
    async function importStaticHtml(file){
      if(editing){showCopy('請先儲存或取消編輯');return;}
      if(!file)return;
      try{
        if(file.size>30*1024*1024)throw new Error('HTML 檔案超過 30 MB');
        const html=await file.text();
        const parsed=new DOMParser().parseFromString(html,'text/html');
        const payloadNode=parsed.getElementById('guide-editor-data');
        if(!payloadNode||payloadNode.tagName!=='SCRIPT'||payloadNode.getAttribute('type')!=='application/json')throw new Error('此 HTML 沒有可還原的編輯資料，請使用新版匯出的 HTML');
        const payload=JSON.parse(payloadNode.textContent);
        if(payload?.format!=='guide-html'||payload.version!==1)throw new Error('不支援的 HTML 編輯資料版本');
        const imported=validateImportedDocument(payload.document);
        const label=String(payload.profileLabel||file.name.replace(/\.html?$/i,'')||'匯入設定').trim().slice(0,120);
        const sameGuide=payload.guideId===currentGuide;
        const useReplace=await askConfirm('匯入「'+label+'」？按「覆蓋目前設定」將取代目前設定內容；按取消可改為新增設定。','覆蓋目前設定');
        if(useReplace){
          if(!sameGuide&&!await askConfirm('這份 HTML 來自其他手冊（'+String(payload.guideId||'未知')+'），仍要覆蓋目前手冊嗎？','仍要覆蓋'))return;
          const previous=data;
          selectedProfile().document=clone(imported);data=selectedProfile().document;
          if(!persist()){selectedProfile().document=previous;data=previous;return;}
        }else{
          if(!await askConfirm('要將「'+label+'」新增為一組設定嗎？現有設定不會被覆蓋。','新增設定'))return;
          const previousSelectedId=store.selectedId;
          const profile=makeProfile(clone(imported),label);
          store.profiles.push(profile);store.selectedId=profile.id;data=profile.document;
          if(!persist()){store.profiles.pop();store.selectedId=previousSelectedId;data=selectedProfile().document;return;}
        }
        expanded=0;activeId='';editSelection=null;collapsedTreeIds.clear();
        renderProfiles();syncMode();renderRead();renderNav();showCopy('HTML 匯入完成');
      }catch(error){alert('HTML 匯入失敗：'+error.message);}
    }
    $('guideImportHtml').addEventListener('click',()=>{if(!editing)htmlImportInput.click()});
    htmlImportInput.addEventListener('change',async()=>{const file=htmlImportInput.files?.[0];htmlImportInput.value='';await importStaticHtml(file)});
    $('guideExportHtml').addEventListener('click',exportStaticHtml);
    function enterEdit(){if(editing)return;snapshot=clone(data);editing=true;editSelection=null;collapsedTreeIds.clear();syncMode();renderEditor()}
    function save(){if(!persist())return;editing=false;snapshot=null;syncMode();renderRead();renderNav()}
    function cancel(){data=snapshot;selectedProfile().document=data;editing=false;snapshot=null;syncMode();renderRead();renderNav()}
    async function close(){if(!confirmLayer.hidden)return;clearScopeTyping();scopeLabels=[];if(updateDirtyBadge()&& !await askConfirm('編輯尚未儲存，確定放棄修改並關閉？','捨棄變更'))return;if(editing)cancel();overlay.classList.remove('open')}
    $('wslEdit').addEventListener('click',enterEdit);
    $('wslSave').addEventListener('click',save);
    $('wslCancel').addEventListener('click',cancel);
    $('wslClose').addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('open'))close()});
    function openGuide(id){
      if(!/^[a-z][a-z0-9_-]{0,63}$/i.test(id))throw new Error('Invalid Guide ID');
      if(editing){
        if(updateDirtyBadge()){ showCopy('請先儲存或取消目前的編輯，再切換手冊'); return; }
        cancel();
      }
      currentGuide=id;store=loadGuide(id);
      if(!store.selectedId||!store.profiles.some(p=>p.id===store.selectedId))store.selectedId=store.profiles[0].id;
      data=selectedProfile().document;expanded=0;activeId='';editSelection=null;collapsedTreeIds.clear();
      overlay.querySelector('.wsl-modal').setAttribute('aria-label',GUIDE_TITLES[id]||id);
      renderProfiles();syncMode();renderRead();renderNav();
      overlay.classList.add('open');syncScroll();
    }
    this.open=openGuide;
    this.close=close;
    this.export=()=>clone(store);
    this.getBackup=(id)=>clone(loadGuide(id));
    window.openGuide=openGuide;
  }
};
// A single editor handles all Guide IDs. The card supplies the ID at open time.
registerModal('guide', {
  init(){ Guide.init(); },
  open(id){ Guide.init(); Guide.open(id); },
  getBackup(id){ Guide.init(); return Guide.getBackup(id); }
});
window.registerGuide = function(config) {
  const id = config?.id;
  if (!/^[a-z][a-z0-9_-]{0,63}$/i.test(id)) throw new Error('Invalid Guide ID');
  // Optional display name only. No separate JS module is registered or loaded.
  if (config.title) Guide.titles[id] = config.title;
  return id;
};
Guide.titles = {};
