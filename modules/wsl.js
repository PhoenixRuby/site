registerModal('wsl', {

  init() {
    /* ── inject CSS ── */
    const style = document.createElement('style');
    style.textContent = `
#wslModalBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s;z-index:300}
#wslModalBg.open{opacity:1;pointer-events:all}
.wsl-modal{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;width:min(820px, 96vw);max-height:90vh;overflow-y:auto;transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;gap:18px;scrollbar-width:thin;scrollbar-color:var(--muted) var(--surface)}
#wslModalBg.open .wsl-modal{transform:translateY(0) scale(1)}
:root{
  --wslbg:#fff;--wslbg2:#f5f5f3;--wslbg3:#ebebea;
  --wsltext:#1a1a18;--wsltext2:#5f5e5a;--wsltext3:#888780;--wsltext4:#4a7fa5;
  --wslborder:rgba(0,0,0,0.11);--wslborder2:rgba(0,0,0,0.2);
  --wslgreen:#1D9E75;--wslgreen-bg:#E1F5EE;
  --wslamber:#854F0B;--wslamber-bg:#FAEEDA;--wslamber-text:#633806;--wslamber-border:#EF9F27;
  --wslblue:#185FA5;--wslblue-bg:#E6F1FB;--wslblue-text:#0C447C;--wslblue-border:#85B7EB;
  --wslcode-bg:#fafafa;
  --wslradius:8px;--wslradius-lg:12px;
  --wslmono:'Courier New',monospace;
}
html[data-theme="dark"]{
  --wslbg:#1e1e1c;--wslbg2:#2a2a28;--wslbg3:#383836;
  --wsltext:#e8e6df;--wsltext2:#b4b2a9;--wsltext3:#ffffad;--wsltext4:#b5d4f4;
  --wslborder:rgba(255,255,255,0.09);--wslborder2:rgba(255,255,255,0.18);
  --wslgreen:#5DCAA5;--wslgreen-bg:#04342C;
  --wslamber:#EF9F27;--wslamber-bg:#2a1e08;--wslamber-text:#FAC775;--wslamber-border:#BA7517;
  --wslblue:#85B7EB;--wslblue-bg:#0a1929;--wslblue-text:#B5D4F4;--wslblue-border:#185FA5;
  --wslcode-bg:#1a1a1a;
}
@media(prefers-color-scheme:dark){html[data-theme="system"]{
  --wslbg:#1e1e1c;--wslbg2:#2a2a28;--wslbg3:#383836;
  --wsltext:#e8e6df;--wsltext2:#b4b2a9;--wsltext3:#ffffad;--wsltext4:#b5d4f4;
  --wslborder:rgba(255,255,255,0.09);--wslborder2:rgba(255,255,255,0.18);
  --wslgreen:#5DCAA5;--wslgreen-bg:#04342C;
  --wslamber:#EF9F27;--wslamber-bg:#2a1e08;--wslamber-text:#FAC775;--wslamber-border:#BA7517;
  --wslblue:#85B7EB;--wslblue-bg:#0a1929;--wslblue-text:#B5D4F4;--wslblue-border:#185FA5;
  --wslcode-bg:#1a1a1a;
}}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
.wrap{padding:16px;display:flex;flex-direction:column;gap:0}
.sep{display:flex;align-items:center;gap:8px;padding:14px 0 8px}
.sep span{font-size:11px;font-weight:500;color:var(--wsltext3);white-space:nowrap;letter-spacing:.05em}
.sep::before,.sep::after{content:'';flex:1;height:0.5px;background:var(--wslborder)}
.row{display:grid;grid-template-columns:minmax(0,1fr) 24px minmax(0,1fr);gap:0;align-items:start;margin-bottom:6px}
.row.main-only{display:block;margin-bottom:6px}
.arrow-col{display:flex;flex-direction:column;align-items:center;justify-content:center;padding-top:26px;gap:3px}
.arrow-col span{font-size:13px;color:var(--wslamber-border)}
.arrow-col small{font-size:9px;color:var(--wsltext3);writing-mode:vertical-rl;transform:rotate(180deg);line-height:1}
.cmd-card{background:var(--wslbg2);border-radius:var(--wslradius);border:0.5px solid var(--wslborder);overflow:hidden}
.cmd-card.pip{background:var(--wslamber-bg);border-color:var(--wslamber-border)}
.cmd-card.note{background:var(--wslblue-bg);border-color:var(--wslblue-border)}
.cmd-header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:7px 10px;border-bottom:0.5px solid var(--wslborder);align-items: center;}
.cmd-card.pip .cmd-header{border-bottom-color:var(--wslamber-border)}
.cmd-card.note .cmd-header{border-bottom-color:var(--wslblue-border)}
.cmd-header-left{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
.cmd-label{font-size:11.5px;font-weight:500;color:var(--wsltext);line-height:1.4;display: flex;gap: 8px;align-items: center;}
.cmd-card.pip .cmd-label{color:var(--wslamber-text)}
.cmd-card.note .cmd-label{color:var(--wslblue-text)}
.cmd-desc{font-size:10.5px;color:var(--wsltext4);line-height:1.4}
.cmd-card.pip .cmd-desc{color:var(--wslamber-text);opacity:.75}
.copy-btn{font-size:11px;padding:2px 8px;border-radius:var(--wslradius);border:0.5px solid var(--wslborder2);background:var(--wslbg);cursor:pointer;color:var(--wsltext);white-space:nowrap;flex-shrink:0;transition:background .15s,color .15s,border-color .15s}
.copy-btn:hover{background:var(--wslbg3)}
.copy-btn.copied{color:var(--wslgreen);border-color:var(--wslgreen);background:var(--wslgreen-bg)}
.cmd-body pre{margin:0}
.cmd-body pre code{
  display:block;padding:9px 12px;font-size:12px;line-height:1.65;border-radius:0;
  white-space:pre-wrap;word-break:break-all;
  background:var(--wslcode-bg) !important;
}
.cmd-body pre code.hljs{background:var(--wslcode-bg) !important}
.cmd-header-left{
  flex:1;
  min-width:0;
}
.dot { width: 11px; height: 11px; border-radius: 50%; }
.dot-r { background: #f87171; }
.dot-y { background: #fbbf24; }
.dot-g { background: #34d399; }
`;
    document.head.appendChild(style);

    /* ── inject HTML ── */
    const container = document.createElement('div');
    container.innerHTML = `
<div class="modal-bg" id="wslModalBg">
  <div class="wsl-modal">
      <h2>\u{1F4F1} WSL 指令清單
        <button class="close-btn" id="wslCloseBtn">✕</button>
      </h2>
    <div class="wrap" id="root"></div>
  </div>
</div>`;
    document.body.appendChild(container.firstElementChild);

    /* ── sections data ── */
    const sections = [
      {
        title: "安裝 GCP / Vertex AI CLI",
        rows: [
          {
            main: {
              label: "加入 Google Cloud CLI APT repository（讓 apt 可以安裝 gcloud 套件）",
              code: "curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg\n\necho \"deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main\" | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list"
            },
            pip: null
          },
          {
            main: {
              label: "更新套件並安裝 Google Cloud CLI（提供 gcloud 指令）",
              code: "sudo apt-get update && sudo apt-get install google-cloud-cli"
            },
            pip: null
          },
          {
            main: {
              label: "安裝 Vertex AI Python SDK（用於 Python 呼叫 Vertex AI API）",
              code: "pip install google-cloud-aiplatform"
            },
            pip: {label: "Python 基本依賴（建議先升級 pip）", code: "pip install --upgrade pip"}
          },
          {
            main: {
              label: "啟用 Vertex AI API（在 GCP project 上開啟 AI 服務）",
			  desc: "★★★ 但我們沒有權限可以指定專案，所以這一行不用執行 ★★★",
              code: "gcloud services enable aiplatform.googleapis.com --project=YOUR_PROJECT_ID"
            },
            pip: null
          }
        ]
      },
      {
        title: "資料庫連線 (postgre sql 是安裝在 windows 時)",
        rows: [
          {
            main: {
              label: "WSL2 採用 NAT 網路模式：WSL 是一個獨立的虛擬網路環境，透過 Windows Host 進行 NAT 轉發",
              code: "WSL 透過 Windows Host 共享對外網路，但 WSL 與 Windows 不共用 localhost，因此 WSL 無法直接用 127.0.0.1 存取 Windows 服務，通常需改用 Windows Host IP 或透過 port forwarding（如 socat / netsh）來建立連線。",
              note: true
            },
            pip: null
          },
          {
            main: { label: "取得 Windows IP", desc: "WSL 無法直接連 Windows 服務，需先取得 Host IP 才能做端口轉發", code: "WIN_IP=$(ip route show | grep default | awk '{print $3}')\necho $WIN_IP" },
            pip: { label: "安裝 socat（端口轉發工具）", desc: "socat 讓 WSL 內的程式能透過轉發連到 Windows 上的服務（如 PostgreSQL）", code: "sudo apt install socat" }
          },
          {
            main: { label: "建立 PostgreSQL 端口轉發", code: "sudo socat TCP-LISTEN:15432,fork TCP:$WIN_IP:5432 &", lang:"bash" },
            pip: null
          },
          {
            main: { label: "確認 socat 監聽 15432", code: "sudo ss -tlnp | grep 15432", lang:"bash" },
            pip: null
          }
        ]
      },
	  {
        title: "資料庫連線 (postgre sql 是安裝在 wsl docker image 時)",
        rows: [
          {
            main: {
              label: "postgresql.yaml",
			  desc: "不同版本的資料庫，最好設定不同的 volumes",
              code: "services:\n  postgres:\n    container_name: postgres\n    ports: \n      - \"5432:5432\"\n    image: \"postgres:17.7\"\n    volumes:\n      - postgres-data17:/var/lib/postgresql/data # persist data even if container shuts down\n    restart: always\n    environment:\n      - POSTGRES_USER=ecshopdb0101\n      - POSTGRES_PASSWORD=16151427\n      - POSTGRES_DB=postgres\n      - TZ=Asia/Taipei\n      \nvolumes:\n   postgres-data17: # docker volume create --name postgres-data17\n                 # remove => docker volume rm postgres-data17\n    external: true",
			  lang: "yaml"
            },
            pip: [
					{ label: "設定 volumes", desc: "建立 volumes", code: "docker volume create --name postgres-data17" },
					{ label: "查詢 volumes", desc: "列出所有 Volumes", code: "docker volume ls" },
					{ label: "查詢 volumes", desc: "--filter 過慮", code: "docker volume ls --filter name=postgres-data17" },
					{ label: "查詢 volumes", desc: "grep 過濾", code: "docker volume ls | grep postgres" },
					{ label: "設定 volumes", desc: "刪除 volumes 不確定名稱時先查詢", code: "docker volume rm postgres-data17" },
				]
          },
          {
            main: { label: "建立資料庫", desc: "建立資料庫", code: "docker compose -f postgresql.yml up -d", lang:"bash" },
            pip: null
          },
          {
            main: { label: "停用資料庫", desc:"有設volume時，資料會存在", code: "docker compose -f postgresql.yml down", lang:"bash" },
            pip: null
          },
		  {
            main: { 
				label: "ports 說明", 
				desc:"- 主機連接埠 : 容器連接埠", 
				code: "ports:\n  - \"5432:5432\"\n#    │    └─ 右邊是【容器內部】的 Port：PostgreSQL 服務在貨櫃內預設聽這個孔。\n#    └────── 左邊是【實體主機】的 Port：你從外面（如瀏覽器、DBeaver、Python）要連進去的孔。", 
				lang:"yaml",
				note: true
			},
            pip: null,
			
          }
        ]
      },
      {
        title: "GCP 登入 (為了呼叫 Vertax AI)",
        rows: [
          {
            main: { 
				label: "GCP 登入（不開瀏覽器）", 
				desc: "我們無法指定 project name 所以不能加 --wslproject=set-aichatbot-test",
				code: "gcloud auth application-default login --wslno-launch-browser", lang:"bash" },
            pip: null
          },
        ]
      },
      {
        title: "GCP 登入（Vertex AI 授權）",
        rows: [
          {
            main: {
              label: "初始化 GCP Application Default Login（WSL 無瀏覽器模式）→ 執行後會顯示一個 URL 讓你取得授權碼",
			  desc: "我們無法指定 project name 所以不能加 --project=set-aichatbot-test",
              code: "gcloud auth application-default login --no-launch-browser"
            },
            pip: null
          },
          {
            main: {
              label: "開啟瀏覽器登入 Google 帳號並完成 OAuth 授權（取得 Authorization Code 後回填 VS Code）",
              code: "# 操作流程：\n1. 複製 gcloud 提供的網址，貼到 Windows Chrome / Edge 開啟\n2. 登入 Google 帳號（需具備 GCP 專案存取權）\n3. 點擊「允許 (Allow)」授權 Google Cloud SDK\n4. 瀏覽器顯示 Authorization Code（例如 4/0Adq...）\n5. 複製該驗證碼\n6. 回到 VS Code / WSL 終端機貼上並按 Enter 完成登入",
              note: true
            },
            pip: null
          }
        ]
      },
      {
        title: "Milvus 升級至 v2.5+",
        rows: [
          {
            main: {
              label: "停止目前運行的 milvus-standalone 容器（避免升級過程衝突）",
              desc: "保留 etcd / minio 資料，只重建 standalone 容器",
              code: "docker stop milvus-standalone"
            },
            pip: null
          },
          {
            main: {
              label: "移除舊的 milvus-standalone 容器（不會刪除資料 volume）",
              code: "docker rm milvus-standalone"
            },
            pip: null
          },
		  {
            main: {
              label: "下載 Milvus v2.5.0 映像（確保使用新版本啟動）",
              desc: "下載 v2.5.0 映像，版本需 ≥ 2.5 才支援 create_database API",
              code: "wget https://raw.githubusercontent.com/milvus-io/milvus/v2.5.0/deployments/docker/standalone/docker-compose.yml -O docker-compose.yml \n docker compose up -d"
            },
            pip: null
          },
		  
		  
          {
            main: {
              label: "使用原本 docker run 指令重新啟動（已改為 v2.5.0）",
              desc: "將原指令的 image tag 改為 v2.5.0 後執行，掛載路徑與 port 不變",
              code: "docker run -d --name milvus-standalone \\\n  -e ETCD_ENDPOINTS=milvus-etcd:2379 \\\n  -e MINIO_ADDRESS=milvus-minio:9000 \\\n  -v /home/p10344791/volumes/milvus:/var/lib/milvus \\\n  --network milvus \\\n  -p 19530:19530 \\\n  -p 9091:9091 \\\n  milvusdb/milvus:v2.5.0 \\\n  milvus run standalone"
            },
            pip: null
          }
        ]
      },
      {
        title: "啟動 Milvus (向量資料庫)",
        rows: [
          {
            main: { label: "啟動所有 Milvus 服務", desc: "依序啟動 etcd（元資料）、minio（物件儲存）、standalone（主服務）", code: "docker start milvus-etcd milvus-minio milvus-standalone", lang:"bash" },
            pip: null
          },
          {
            main: { label: "確認狀態（三個都要顯示 Up healthy）", desc: "三個容器都要顯示 Up (healthy)，有任何 unhealthy 需重啟",code: "docker ps | grep milvus", lang:"bash" },
            pip: null
          },
        ]
      },
      {
        title: "專案啟動",
        rows: [
          {
            main: { label: "建立 Milvus 資料庫", desc: "在 Milvus 建立專案用的 database，首次執行才需要",code: "python -c \"from pymilvus import MilvusClient; c = MilvusClient('http://localhost:19530'); c.create_database('op_txt_cs'); print('done')\"", lang:"python" },
            pip: [
              { label: "pip 執行之前", desc: "安裝套件前要先進入 venv 虛擬環境",code: "source .venv/bin/activate", lang:"bash" },
			  { label: "pip 依賴（首次執行）", desc: "首次執行需安裝，含 pymilvus、gcloud SDK 等所有套件",code: "pip install -r requirements.txt", lang:"bash" },
              { label: "需要先安裝 pymilvus", desc: "安裝 Milvus 的 Python 套件", code: "pip install pymilvus", lang:"bash" },
			  { label: "離開 venv 虛擬環境", desc: "離開 venv 虛擬環境", code: "deactivate", lang:"bash" }
			  
            ]
          },
          {
            main: { label: "同步知識庫資料", desc: "將資料灌入 Milvus，建完 DB 後執行一次", code: "python -c \"from tasks import km_update; print(km_update())\"", lang:"python" },
            pip: { label: "GCP 登入", desc: "詳細參照上面的 GCP 登入 說明", code: "gcloud auth application-default login --no-launch-browser" }
          },
          {
            main: { label: "啟動主程式", desc: "啟動後端服務，確認 Milvus 與 PG 都已就緒再執行", code: "python main.py", lang:"bash" },
            pip: null
          },
        ]
      },
	  {
        title: "查看和管理 Milvus 2.5 版本的資料庫",
        rows: [
          {
            main: { label: "Attu", desc: "在 Milvus 建立專案用的 database，首次執行才需要",code: "docker run -d \\\n  --name attu \\\n  -p 8000:3000 \\\n  -e MILVUS_URL=172.17.0.1:19530 \\\n  zilliz/attu:latest", lang:"bash" }
          },
          {
            main: { label: "進入 Attu 介面", desc: "訪問地址", code: "http://localhost:8000", lang:"html" },
            pip: null
          }
        ]
      }
    ];

    /* ── render sections into #root ── */
    const root = document.getElementById('root');

    sections.forEach(sec => {
      const title = document.createElement('div');
      title.className = 'sep';
      title.innerHTML = `<span>${sec.title}</span>`;
      root.appendChild(title);

      sec.rows.forEach(row => {
        if (!row.pip) {
          const div = document.createElement('div');
          div.className = 'row main-only';
          div.appendChild(makeCard(row.main));
          root.appendChild(div);
        } else {
          const div = document.createElement('div');
          div.className = 'row';
          // left: main
          div.appendChild(makeCard(row.main));
          // middle: arrow
          const arrowCol = document.createElement('div');
          arrowCol.className = 'arrow-col';
          arrowCol.innerHTML = '<div style="font-size:14px;color:var(--wslamber)">→</div>';
          div.appendChild(arrowCol);

          // right: pip (supports single or multiple)
          const pipWrap = document.createElement('div');
          pipWrap.style.display = 'flex';
          pipWrap.style.flexDirection = 'column';
          pipWrap.style.gap = '6px';

          const pipList = Array.isArray(row.pip) ? row.pip : [row.pip];

          pipList.forEach(p => {
            pipWrap.appendChild(makeCard(p, 'pip'));
          });

          div.appendChild(pipWrap);

          root.appendChild(div);
        }
      });
    });

    function highlightWsl() {
      document.querySelectorAll('#wslModalBg pre code').forEach(function(block) {
        block.removeAttribute('data-highlighted');
        window.hljs.highlightElement(block);
      });
    }
    if (window.hljs) {
      highlightWsl();
    } else {
      var s = document.createElement('script');
      s.src = 'libs/highlight.11.9.0.min.js';
      s.onload = highlightWsl;
      document.head.appendChild(s);
    }
  },

  createTrigger(value, createSvgIcon) {
    const wslModalBg = document.getElementById('wslModalBg');

    if (!this._initialized) {
      const wslCloseBtn = document.getElementById('wslCloseBtn');
      wslCloseBtn.addEventListener('click', () => wslModalBg.classList.remove('open'));
      wslModalBg.addEventListener('click', e => { if (e.target === wslModalBg) wslModalBg.classList.remove('open'); });
      this._initialized = true;
    }

    const a = document.createElement('a');
    a.href = '#';
    a.addEventListener('click', (e) => {
      e.preventDefault();
      wslModalBg.classList.add('open');
    });

    const svg = createSvgIcon("wsl", value, CARD_ICONS.wsl);
    a.appendChild(svg);
    return a;
  }
});
