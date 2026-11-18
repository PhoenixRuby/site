(function (global, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD 模組定義
        define(factory);
    } else if (typeof exports === 'object') {
        // CommonJS 模組定義
        module.exports = factory(require, exports, module);
    } else {
        // 瀏覽器全域定義
        global.CountUp = factory();
    }
})(this, function (require, exports, module) {

    // CountUp 主要構造函數
    var CountUp = function (target, startVal, endVal, decimals, duration, options) {
        var self = this;

        // 版本號
        self.version = function () {
            return "1.9.3";
        };

        // 預設選項
        self.options = {
            useEasing: true,     // 使用緩動函數
            useGrouping: true,   // 使用千分位分隔
            separator: ",",      // 千分位分隔符
            decimal: ".",        // 小數點符號
            easingFn: easeOutExpo, // 預設緩動函數
            formattingFn: formatNumber, // 數字格式化函數
            prefix: "",          // 前綴
            suffix: "",          // 後綴
            numerals: [],        // 自定義數字映射
            maxDisplay: null,    // 顯示上限；例如 99，超過時顯示 99+（預設停用）
            delay: 0             // start() 延遲啟動時間，單位毫秒（預設立即啟動）
        };

        // 合併用戶配置的選項
        if (options && typeof options === 'object') {
            for (var key in self.options) {
                if (options.hasOwnProperty(key) && options[key] !== null) {
                    self.options[key] = options[key];
                }
            }
        }

        // 如果分隔符為空，禁用分組
        if (self.options.separator === '') {
            self.options.useGrouping = false;
        } else {
            self.options.separator = '' + self.options.separator;
        }

        // 格式化數字的函數
        function formatNumber(num) {
            var neg = (num < 0),
                x, x1, x2, x3, i, len;
            var limit = self.options.maxDisplay;
            var hasLimit = limit !== null && limit !== undefined && limit !== '' &&
                isFinite(Number(limit)) && Number(limit) >= 0;
            var overflow = hasLimit && num > Number(limit);

            num = Math.abs(overflow ? Number(limit) : num).toFixed(self.decimals);
            num += '';

            x = num.split('.');
            x1 = x[0];
            x2 = x.length > 1 ? self.options.decimal + x[1] : '';

            if (self.options.useGrouping) {
                x3 = '';
                for (i = 0, len = x1.length; i < len; ++i) {
                    if (i !== 0 && i % 3 === 0) {
                        x3 = self.options.separator + x3;
                    }
                    x3 = x1[len - i - 1] + x3;
                }
                x1 = x3;
            }

            // 應用自定義數字映射
            if (self.options.numerals.length) {
                x1 = x1.replace(/[0-9]/g, function (w) {
                    return self.options.numerals[+w];
                });
                x2 = x2.replace(/[0-9]/g, function (w) {
                    return self.options.numerals[+w];
                });
            }

            return (neg ? '-' : '') + self.options.prefix + x1 + x2 + (overflow ? '+' : '') + self.options.suffix;
        }

        // 緩動函數
        function easeOutExpo(t, b, c, d) {
            return c * (-Math.pow(2, -10 * t / d) + 1) * 1024 / 1023 + b;
        }

        // 檢查是否為有效數字
        function ensureNumber(n) {
            return (typeof n === 'number' && !isNaN(n));
        }

        // 處理 requestAnimationFrame 的兼容性
        var lastTime = 0;
        var vendors = ['webkit', 'moz', 'ms', 'o'];
        for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
            window.cancelAnimationFrame =
                window[vendors[x] + 'CancelAnimationFrame'] ||
                window[vendors[x] + 'CancelRequestAnimationFrame'];
        }
        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = function (callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function () {
                    callback(currTime + timeToCall);
                }, timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };
        }
        if (!window.cancelAnimationFrame) {
            window.cancelAnimationFrame = function (id) {
                clearTimeout(id);
            };
        }

        // 初始化函數
        self.initialize = function () {
            if (self.initialized) return true;

            self.error = '';
            self.d = (typeof target === 'string') ?
                document.getElementById(target) : target;

            if (!self.d) {
                self.error = "[CountUp] target is null or undefined";
                return false;
            }

            self.startVal = Number(startVal);
            self.endVal = Number(endVal);

            if (ensureNumber(self.startVal) && ensureNumber(self.endVal)) {
                self.decimals = Math.max(0, decimals || 0);
                self.dec = Math.pow(10, self.decimals);
                self.duration = Number(duration) * 1000 || 2000;
                self.countDown = (self.startVal > self.endVal);
                self.frameVal = self.startVal;
                self.initialized = true;
                return true;
            } else {
                self.error = "[CountUp] startVal (" + startVal + ") or endVal (" +
                    endVal + ") is not a number";
                return false;
            }
        };

        // 更新顯示值
        self.printValue = function (value) {
            var result = self.options.formattingFn(value);

            if (self.d.tagName === 'INPUT') {
                this.d.value = result;
            } else if (self.d.tagName === 'text' || self.d.tagName === 'tspan') {
                this.d.textContent = result;
            } else {
                this.d.innerHTML = result;
            }
        };

        // 計數動畫函數
        self.count = function (timestamp) {
            if (!self.startTime) self.startTime = timestamp;
            self.timestamp = timestamp;
            var progress = timestamp - self.startTime;
            self.remaining = self.duration - progress;

            // 使用緩動函數計算當前值
            if (self.options.useEasing) {
                if (self.countDown) {
                    self.frameVal = self.startVal -
                        self.options.easingFn(progress, 0, self.startVal - self.endVal, self.duration);
                } else {
                    self.frameVal = self.options.easingFn(progress, self.startVal,
                        self.endVal - self.startVal, self.duration);
                }
            } else {
                if (self.countDown) {
                    self.frameVal = self.startVal -
                        ((self.startVal - self.endVal) * (progress / self.duration));
                } else {
                    self.frameVal = self.startVal +
                        (self.endVal - self.startVal) * (progress / self.duration);
                }
            }

            // 確保不超過終值
            if (self.countDown) {
                self.frameVal = (self.frameVal < self.endVal) ? self.endVal : self.frameVal;
            } else {
                self.frameVal = (self.frameVal > self.endVal) ? self.endVal : self.frameVal;
            }

            // 四捨五入到指定小數位
            self.frameVal = Math.round(self.frameVal * self.dec) / self.dec;

            // 更新顯示
            self.printValue(self.frameVal);

            // 檢查是否完成
            if (progress < self.duration) {
                self.rAF = requestAnimationFrame(self.count);
            } else if (self.callback) {
                self.callback();
            }
        };

        // 開始計數：delay 只作用於 start()，不改變動畫 duration。
        self.start = function (callback) {
            if (self.initialize()) {
                self.callback = callback;
                clearTimeout(self.delayTimer);
                cancelAnimationFrame(self.rAF);
                delete self.startTime;
                var delay = Number(self.options.delay);
                if (!isFinite(delay) || delay < 0) delay = 0;
                if (delay > 0) {
                    self.delayTimer = setTimeout(function () {
						self.printValue(self.startVal);
                        self.delayTimer = null;
                        self.rAF = requestAnimationFrame(self.count);
                    }, delay);
                } else {
					self.printValue(self.startVal);
                    self.delayTimer = null;
                    self.rAF = requestAnimationFrame(self.count);
                }
            }
        };

        // 暫停/繼續
        self.pauseResume = function () {
            if (self.delayTimer != null) {
                clearTimeout(self.delayTimer);
                self.delayTimer = null;
                self.paused = true;
                return;
            }
            if (!self.paused) {
                self.paused = true;
                cancelAnimationFrame(self.rAF);
            } else {
                self.paused = false;
                delete self.startTime;
                self.duration = self.remaining;
                self.startVal = self.frameVal;
                requestAnimationFrame(self.count);
            }
        };

        // 重置
        self.reset = function () {
            clearTimeout(self.delayTimer);
            self.delayTimer = null;
            cancelAnimationFrame(self.rAF);
            self.paused = false;
            delete self.startTime;
            self.initialized = false;
            if (self.initialize()) {
                cancelAnimationFrame(self.rAF);
                self.printValue(self.startVal);
            }
        };

        // 更新終值
        self.update = function (newEndVal) {
            if (self.initialize()) {
                newEndVal = Number(newEndVal);
                if (!ensureNumber(newEndVal)) {
                    self.error = "[CountUp] update() - new endVal is not a number: " + newEndVal;
                    return;
                }
                self.error = "";
                if (newEndVal !== self.frameVal) {
                    clearTimeout(self.delayTimer);
                    self.delayTimer = null;
                    cancelAnimationFrame(self.rAF);
                    self.paused = false;
                    delete self.startTime;
                    self.startVal = self.frameVal;
                    self.endVal = newEndVal;
                    self.countDown = (self.startVal > self.endVal);
                    self.rAF = requestAnimationFrame(self.count);
                }
            }
        };

        // 初始化並顯示起始值
        //if (self.initialize()) {
        //    self.printValue(self.startVal);
        //}
    };

    return CountUp;
});