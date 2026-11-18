registerPlugin('card-totp', {
  icon: null,     // no toolbar button
  label: 'TOTP',
  mode: 'card',
  order: 999,
  open: null,     // no modal to open
  load() {
	this.init(); 
  },
  
  init(){
    // 2. Inject countdown circle HTML into document.body
    const countdownHTML = `<div class="countdown-container">
  <div class="countdown-circle">
    <div class="ripple-circle" id="rippleCircle"></div>
    <svg>
      <circle class="background-circle" cx="40" cy="40" r="36"></circle>
      <circle class="progress-circle" cx="40" cy="40" r="36"></circle>
    </svg>
    <div class="time-left" id="timeLeft">
      <div class="digit-slot" id="digitTens">
        <div class="digit-wrapper">
          <span class="digit-current">3</span>
          <span class="digit-next">3</span>
        </div>
      </div>
      <div class="digit-slot" id="digitOnes">
        <div class="digit-wrapper">
          <span class="digit-current">0</span>
          <span class="digit-next">9</span>
        </div>
      </div>
    </div>
  </div>
</div>`;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = countdownHTML;
    const countdownEl = wrapper.firstElementChild;
    countdownEl.style.display = 'none';
    document.body.insertBefore(countdownEl, document.body.firstChild);

    // 3. Set up all TOTP functions

    // TOTP globals
    const secretKeys = [];
    let countdownInterval = null;
    let countdownRunning = false;
    let updateCount = 0;
    let totpCounter = 0;

    function setHomeFavicon() {
      setModeFavicon('card');
    }

    if (window.viewMode === 'card') setHomeFavicon();

    // Favicon Refresh
    const refreshFaviconWithNumber = (progress, text, color = '#ffd100') => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');

      let link = document.querySelector('link[rel*="icon"]');
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.head.appendChild(link);
      }

      ctx.clearRect(0, 0, 32, 32);

      // 1. Draw background circle
      ctx.beginPath();
      ctx.arc(16, 16, 14, 0, Math.PI * 2);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 2. Draw progress arc
      ctx.beginPath();
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * progress);
      ctx.arc(16, 16, 14, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.stroke();

      // 3. Draw number
      const displayText = String(text);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (displayText.length > 1) {
        ctx.font = '900 16px "Arial", sans-serif';
      } else {
        ctx.font = '900 20px "Arial", sans-serif';
      }

      ctx.fillText(displayText, 16, 17);

      // 4. Update favicon
      link.href = canvas.toDataURL('image/png');
    };

    // Base32 decode
    function base32Decode(base32) {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
      let bits = '';
      let hex = '';

      base32 = base32.toUpperCase().replace(/=+$/, '');

      for (let i = 0; i < base32.length; i++) {
        const val = alphabet.indexOf(base32.charAt(i));
        if (val === -1) throw new Error('Invalid Base32 character');
        bits += val.toString(2).padStart(5, '0');
      }

      for (let i = 0; i + 8 <= bits.length; i += 8) {
        const chunk = bits.substr(i, 8);
        hex += parseInt(chunk, 2).toString(16).padStart(2, '0');
      }

      return new Uint8Array(hex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
    }

    // HMAC-SHA1
    async function hmacSHA1(key, message) {
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
      return new Uint8Array(signature);
    }

    // TOTP code generation
    async function generateTOTPCode(secret, timeStep = 30, digits = 6) {
      try {
        const key = base32Decode(secret);
        const epoch = Math.floor(Date.now() / 1000);
        const counter = Math.floor(epoch / timeStep);

        const counterBuffer = new ArrayBuffer(8);
        const counterView = new DataView(counterBuffer);
        counterView.setUint32(4, counter, false);

        const hmac = await hmacSHA1(key, new Uint8Array(counterBuffer));

        const offset = hmac[hmac.length - 1] & 0xf;
        const code = (
          ((hmac[offset] & 0x7f) << 24) |
          ((hmac[offset + 1] & 0xff) << 16) |
          ((hmac[offset + 2] & 0xff) << 8) |
          (hmac[offset + 3] & 0xff)
        ) % Math.pow(10, digits);

        return code.toString().padStart(digits, '0');
      } catch (error) {
        throw new Error('TOTP generation failed: ' + error.message);
      }
    }

    // Generate and display TOTP for a specific secret
    async function generateTOTP(secret, index) {
      try {
        await updateTOTP(secret, index);
      } catch (error) {
        const totpResult = document.getElementById(`totpResult-${index}`);
        if (totpResult) {
            totpResult.innerHTML = `<div class="error">${error.message}</div>`;
        }
      }
    }

    // Update TOTP display with flip animation
    async function updateTOTP(secret, index) {
      try {
        const code = await generateTOTPCode(secret);
        const totpResult = document.getElementById(`totpResult-${index}`);

        const currentCodeElement = totpResult.querySelector('.totp-code');
        if (currentCodeElement) {
          const currentCode = currentCodeElement.innerText.replace(/[\n\r]/g, '').trim();
          if (currentCode === code) {
            return;
          }
        }

        const currentUpdate = Date.now();

        const digits = code.split('');

        const digitElements = digits.map((digit, i) => {
          return `<span class="digit" data-update="${currentUpdate}" data-index="${i}"><span>${digit}</span></span>`;
        }).join('');

        totpResult.innerHTML = `
				<div class="totp-result" onclick="copyToClipboard('${code}', ${index})">
					<div class="totp-code" >${digitElements}</div>
					<div class="copy-tick" id="copyTick-${index}">
						<svg viewBox="0 0 24 24">
							<path d="M20.285 2l-11.285 11.567-5.286-5.011-3.714 3.716 9 8.728 15-15.285z"/>
						</svg>
					</div>
				</div>
			`;

        const digitSpans = totpResult.querySelectorAll('.digit');
        digitSpans.forEach((digitSpan, i) => {
          setTimeout(() => {
            if (digitSpan.getAttribute('data-update') == currentUpdate) {
              digitSpan.classList.add('flip');
            }
          }, i * 50);
        });

        setTimeout(() => {
          const flipElements = totpResult.querySelectorAll('.digit.flip');
          flipElements.forEach(el => {
            if (el.getAttribute('data-update') == currentUpdate) {
              el.classList.remove('flip');
            }
          });
        }, 500 + (digits.length - 1) * 50);

      } catch (error) {
        const totpResult = document.getElementById(`totpResult-${index}`);
        totpResult.innerHTML = `<div class="error">${error.message}</div>`;
      }
    }

    // Web Worker for timing
    const workerScript = `
let duration = 30;
function loop() {
    let timeLeft = duration - (Math.floor(Date.now() / 1000) % duration);
    postMessage(timeLeft);
    setTimeout(loop, 200);
}
loop();
`;

    const blob = new Blob([workerScript], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));

    // initTOTP
    function initTOTP() {
      secretKeys.forEach((secret, index) => {
        setTimeout(() => {
          generateTOTP(secret.key, index);
        }, index * 100);
      });
      startCountdown();
    }

    // Countdown timer
    function startCountdown() {
      const PERIOD = 30;
      const circle = document.querySelector('.progress-circle');
      const radius = parseFloat(circle.getAttribute('r'));
      const circumference = 2 * Math.PI * radius;
      circle.style.strokeDasharray = circumference;

      let periodStartTime = Math.floor(Date.now() / 1000 / PERIOD) * PERIOD;
      let lastPeriod = Math.floor(Date.now() / 1000 / PERIOD);
      let isResetting = false;
      let lastTimeLeft = -1;

      const resetCircle = () => {
        if (isResetting) return;
        isResetting = true;

        const ripple = document.getElementById('rippleCircle');
        ripple.classList.remove('animate');
        void ripple.offsetWidth;
        ripple.classList.add('animate');

        circle.style.transition = 'none';
        circle.style.strokeDashoffset = 0;
        circle.style.opacity = '0';

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            circle.style.transition = 'opacity 0.4s ease-in';
            circle.style.opacity = '1';

            setTimeout(() => {
              circle.style.transition = 'stroke-dashoffset 1s linear';
              isResetting = false;
            }, 450);
          });
        });
      };

      countdownRunning = true;
      const update = () => {
        if (!countdownRunning) return;
        const now = Math.floor(Date.now() / 1000);
        const currentPeriod = Math.floor(now / PERIOD);
        let timeLeft = PERIOD - (now - periodStartTime);

        if (timeLeft <= 0 || timeLeft > PERIOD) {
          periodStartTime = Math.floor(now / PERIOD) * PERIOD;
          timeLeft = PERIOD - (now - periodStartTime);
        }

        const progress = timeLeft / PERIOD;

        if (timeLeft !== lastTimeLeft) {
          updateDigit(timeLeft);
          lastTimeLeft = timeLeft;
        }

        if (currentPeriod !== lastPeriod) {
          resetCircle();
          secretKeys.forEach((secret, index) => {
            setTimeout(() => generateTOTP(secret.key, index), index * 50);
          });
          lastPeriod = currentPeriod;
          periodStartTime = currentPeriod * PERIOD;
        }

        if (!isResetting) {
          circle.style.strokeDashoffset = circumference * (1 - progress);
          if (window.viewMode === 'card') refreshFaviconWithNumber(progress, timeLeft);
        }

        requestAnimationFrame(update);
      };

      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          const now = Math.floor(Date.now() / 1000);
          circle.style.transition = 'none';
          periodStartTime = Math.floor(now / PERIOD) * PERIOD;
          lastPeriod = Math.floor(now / PERIOD);
          isResetting = false;

          lastTens = -1;
          lastOnes = -1;
          isAnimatingTens = false;
          isAnimatingOnes = false;

          const timeLeft = PERIOD - (now - periodStartTime);
          const progress = timeLeft / PERIOD;

          updateDigit(Math.max(1, timeLeft));

          circle.style.strokeDashoffset = circumference * (1 - progress);

          setTimeout(() => {
            circle.style.transition = 'stroke-dashoffset 0.8s linear';
          }, 40);

          secretKeys.forEach((secret, index) => {
            setTimeout(() => generateTOTP(secret.key, index), index * 50);
          });
        } else {
          circle.style.transition = 'none';
        }
      });

      update();
    }

    let lastTens = -1;
    let lastOnes = -1;
    let isAnimatingTens = false;
    let isAnimatingOnes = false;

    function updateDigitSlot(slotId, newChar, isAnimatingFlag, setFlag) {
      const slot = document.getElementById(slotId);
      const wrapper = slot.querySelector('.digit-wrapper');
      const current = wrapper.querySelector('.digit-current');
      const next = wrapper.querySelector('.digit-next');

      if (isAnimatingFlag) return;
      setFlag(true);

      next.textContent = newChar;
      next.style.transform = 'translateY(100%)';

      wrapper.classList.remove('animating');
      void wrapper.offsetWidth;
      wrapper.classList.add('animating');

      setTimeout(() => {
        current.textContent = newChar;
        current.style.transform = 'translateY(0)';
        next.style.transform = 'translateY(100%)';
        wrapper.classList.remove('animating');
        setFlag(false);
      }, 260);
    }

    function updateDigit(timeLeft) {
      const str = String(timeLeft).padStart(2, '0');
      const tens = str[0];
      const ones = str[1];

      if (tens !== lastTens) {
        updateDigitSlot('digitTens', tens, isAnimatingTens, v => isAnimatingTens = v);
        lastTens = tens;
      }
      if (ones !== lastOnes) {
        updateDigitSlot('digitOnes', ones, isAnimatingOnes, v => isAnimatingOnes = v);
        lastOnes = ones;
      }
    }

    // Copy to clipboard (TOTP)
    async function copyToClipboard(text, index) {
      try {
        await navigator.clipboard.writeText(text);

        const tick = document.getElementById(`copyTick-${index}`);
        if (tick) {
          tick.style.display = 'block';
          setTimeout(() => {
            tick.style.display = 'none';
          }, 2000);
        }
      } catch (err) {
        showToast('複製失敗，請手動複製驗證碼');
      }
    }

    // 4. Expose hooks for renderGrid
    window.totpSkipItem = function(it) {
      return !!it.totp;
    };

    window.totpRenderCard = function(container, block) {
      block.itemlist.forEach(group => {
        group.item.forEach(it => {
          if (it.totp && !it._hidden) {
            secretKeys.push({
              title: group.name ?? "未命名",
              key: it.totp
            });

            const totpDiv = document.createElement("div");
            totpDiv.className = "list-totp";

            const id = `totpResult-${totpCounter++}`;
            totpDiv.innerHTML = `<div id="${id}"></div>`;

            container.appendChild(totpDiv);
          }
        });
      });
    };

    function updateCountdownPosition() {
      var tb = document.getElementById('toolbar');
      if (tb) {
        var tbRect = tb.getBoundingClientRect();
        var tbPos = document.body.classList.contains('tb-right') ? 'right'
                  : document.body.classList.contains('tb-left') ? 'left' : '';
        if (tbPos === 'right') countdownEl.style.right = (tbRect.width + 12) + 'px';
        else countdownEl.style.right = '12px';
      } else {
        countdownEl.style.right = '60px';
      }
    }

    window.totpAfterRender = function() {
      if (secretKeys.length > 0) {
        countdownEl.style.display = '';
        updateCountdownPosition();
        initTOTP();
      } else {
        countdownEl.style.display = 'none';
        countdownRunning = false;
        if (window.viewMode === 'card') setHomeFavicon();
      }
    };

    // Expose a pre-render hook to clear secretKeys before each renderGrid cycle
    window.totpBeforeRender = function() {
      secretKeys.length = 0;
      totpCounter = 0;
    };

    // 5. Expose window.copyToClipboard for onclick in generated HTML
    window.copyToClipboard = copyToClipboard;

    // 6. Expose window.refreshFaviconWithNumber for favicon updates
    window.refreshFaviconWithNumber = refreshFaviconWithNumber;
  }
});
