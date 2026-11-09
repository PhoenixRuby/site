registerModal('cicd', {

  init() {
    /* ── Shared card styles (also used by wsl module) ── */
    if (!document.getElementById('shared-card-styles')) {
      const shared = document.createElement('style');
      shared.id = 'shared-card-styles';
      shared.textContent = `
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
      document.head.appendChild(shared);
    }

    /* ── CI/CD-specific styles ── */
    const style = document.createElement('style');
    style.id = 'cicd-modal-styles';
    style.textContent = `
#cicdModalBg{position:fixed;inset:0;backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s;z-index:300}
#cicdModalBg.open{opacity:1;pointer-events:all}
.cicd-modal{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;width:min(820px, 96vw);max-height:90vh;overflow-y:auto;transform:translateY(20px) scale(.97);transition:transform .35s cubic-bezier(.22,1,.36,1);display:flex;flex-direction:column;gap:18px;scrollbar-width:thin;scrollbar-color:var(--muted) var(--surface)}
#cicdModalBg.open .cicd-modal{transform:translateY(0) scale(1)}
`;
    document.head.appendChild(style);

    /* ── Modal HTML ── */
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
<div class="modal-bg" id="cicdModalBg">
  <div class="cicd-modal">
      <h2>\u{1F4F1} CI/CD 指令清單
        <button class="close-btn" id="cicdCloseBtn">✕</button>
      </h2>
    <div class="wrap" id="cicdroot"></div>
  </div>
</div>`;
    document.body.appendChild(wrapper.firstElementChild);

    /* ── Section data ── */
    const sections2 = [
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

    /* ── Render sections into #cicdroot ── */
    const cicdroot = document.getElementById('cicdroot');

    sections2.forEach(sec => {
      const title = document.createElement('div');
      title.className = 'sep';
      title.innerHTML = `<span>${sec.title}</span>`;
      cicdroot.appendChild(title);

      sec.rows.forEach(row => {
        if (!row.pip) {
          const div = document.createElement('div');
          div.className = 'row main-only';
          div.appendChild(makeCard(row.main));
          cicdroot.appendChild(div);
        } else {
          const div = document.createElement('div');
          div.className = 'row';
          // 左：main
          div.appendChild(makeCard(row.main));
          // 中：箭頭
          const arrowCol = document.createElement('div');
          arrowCol.className = 'arrow-col';
          arrowCol.innerHTML = '<div style="font-size:14px;color:var(--wslamber)">→</div>';
          div.appendChild(arrowCol);

          // 右：pip（支援單筆 or 多筆）
          const pipWrap = document.createElement('div');
          pipWrap.style.display = 'flex';
          pipWrap.style.flexDirection = 'column';
          pipWrap.style.gap = '6px';

          const pipList = Array.isArray(row.pip) ? row.pip : [row.pip];

          pipList.forEach(p => {
            pipWrap.appendChild(makeCard(p, 'pip'));
          });

          div.appendChild(pipWrap);

          cicdroot.appendChild(div);
        }
      });
    });

    function highlightCicd() {
      document.querySelectorAll('#cicdModalBg pre code').forEach(function(block) {
        block.removeAttribute('data-highlighted');
        window.hljs.highlightElement(block);
      });
    }
    if (window.hljs) {
      highlightCicd();
    } else {
      var s = document.createElement('script');
      s.src = 'libs/highlight.11.9.0.min.js';
      s.onload = highlightCicd;
      document.head.appendChild(s);
    }
  },

  createTrigger(value, createSvgIcon) {
    const cicdModalBg = document.getElementById('cicdModalBg');
    const cicdCloseBtn = document.getElementById('cicdCloseBtn');

    cicdCloseBtn.addEventListener('click', () => cicdModalBg.classList.remove('open'));
    cicdModalBg.addEventListener('click', e => {
      if (e.target === cicdModalBg) cicdModalBg.classList.remove('open');
    });

    const a = document.createElement('a');
    a.href = '#';
    a.addEventListener('click', (e) => {
      e.preventDefault();
      cicdModalBg.classList.add('open');
    });

    const svg = createSvgIcon("cicd", value, CARD_ICONS.cicd);
    a.appendChild(svg);
    return a;
  }
});
