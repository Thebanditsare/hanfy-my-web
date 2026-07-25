/* ═══════════════════════════════════════════════════════════════
   HANFY — 交互引擎
   Bootloader 引导 / 自定义光标 / 滚动揭示 / 字符拆分 /
   磁性元素 / Canvas 数据流 / 播放器
   ═══════════════════════════════════════════════════════════════ */
(() => {
    'use strict';

    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    const $  = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => [...c.querySelectorAll(s)];
    const lerp = (a, b, n) => a + (b - a) * n;

    /* ── Lucide 图标 ─────────────────────────────────────────── */
    const initIcons = () => {
        if (window.lucide) window.lucide.createIcons();
    };

    /* ── 字符拆分:把标题文字拆成单个字符 ────────────────────── */
    const splitChars = () => {
        $$('[data-split]').forEach(el => {
            const text = el.textContent;
            el.textContent = '';
            el.setAttribute('aria-hidden', 'true');
            [...text].forEach((ch, i) => {
                const span = document.createElement('span');
                span.className = 'ch';
                span.style.setProperty('--ci', i);
                span.textContent = ch === ' ' ? ' ' : ch;
                el.appendChild(span);
            });
        });
    };

    /* ── 滚动揭示 + 分区错峰 ────────────────────────────────── */
    const initReveal = () => {
        // 同一分区(section/footer)内的 reveal 按出现顺序递增延迟,形成阶梯
        const buckets = new Map();
        $$('.reveal').forEach(el => {
            const zone = el.closest('section, footer, .marquee') || el.parentElement;
            const n = buckets.get(zone) || 0;
            el.style.setProperty('--rd', `${Math.min(n * 0.09, 0.6)}s`);
            buckets.set(zone, n + 1);
        });

        const io = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('in-view');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

        $$('.reveal, [data-split]').forEach(el => io.observe(el));
    };

    /* ── 顶部导航:滚动状态 ─────────────────────────────────── */
    const initNav = () => {
        const nav = $('#site-nav');
        const onScroll = () => {
            nav.classList.toggle('scrolled', window.scrollY > 40);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    };

    /* ── 滚动进度条 ────────────────────────────────────────── */
    const initProgress = () => {
        const fill = $('#scroll-progress-fill');
        let ticking = false;
        const update = () => {
            const h = document.documentElement;
            const max = h.scrollHeight - h.clientHeight;
            fill.style.width = `${max > 0 ? (h.scrollTop / max) * 100 : 0}%`;
            ticking = false;
        };
        window.addEventListener('scroll', () => {
            if (!ticking) { requestAnimationFrame(update); ticking = true; }
        }, { passive: true });
        update();
    };

    /* ── 自定义光标(磁性跟手) ──────────────────────────────── */
    /* ── 水墨光标:笔锋圆点 + 水墨拖尾(青/朱撞色) ─────────────── */
    const initCursor = () => {
        if (TOUCH || REDUCED) return;
        const cursor = $('#cursor'), dot = $('#cursor-dot'), ring = $('#cursor-ring');

        // 笔锋:一个跟随的小点,即时指示落笔处
        let mx = innerWidth / 2, my = innerHeight / 2, px = mx, py = my;

        /* 水墨拖尾画布 */
        const cv = document.createElement('canvas');
        cv.className = 'ink-canvas';
        document.body.appendChild(cv);
        const ctx = cv.getContext('2d');
        let W, H;
        const sizeCanvas = () => {
            W = cv.width = innerWidth * devicePixelRatio;
            H = cv.height = innerHeight * devicePixelRatio;
            cv.style.width = innerWidth + 'px';
            cv.style.height = innerHeight + 'px';
        };
        sizeCanvas();
        addEventListener('resize', sizeCanvas);

        // 墨滴:位置/半径/透明度/扩散速度/墨色
        const drops = [];
        const MAXD = 90;
        // 墨色板:墨绿为主,青与朱砂撞色点睛
        const INKS = [
            [21, 36, 32],    // 墨
            [21, 36, 32],
            [15, 160, 147],  // 青
            [206, 74, 46],   // 朱砂(撞色)
        ];
        const pickInk = () => {
            const r = Math.random();
            if (r < 0.62) return INKS[0];           // 墨为主
            if (r < 0.86) return INKS[2];           // 青
            return INKS[3];                          // 朱砂,少而精
        };

        let lastX = mx, lastY = my;
        addEventListener('mousemove', e => {
            mx = e.clientX; my = e.clientY;
            const dx = mx - lastX, dy = my - lastY;
            const speed = Math.hypot(dx, dy);
            // 依据笔速落墨:快则大而疏(飞白),慢则小而密
            const steps = Math.max(1, Math.floor(speed / 6));
            for (let i = 0; i < steps; i++) {
                const t = i / steps;
                const x = lerp(lastX, mx, t), y = lerp(lastY, my, t);
                const jitter = Math.min(speed * 0.18, 8);
                const [r, g, b] = pickInk();
                drops.push({
                    x: (x + (Math.random() - 0.5) * jitter) * devicePixelRatio,
                    y: (y + (Math.random() - 0.5) * jitter) * devicePixelRatio,
                    r: (Math.random() * 3.2 + 1.6 + Math.min(speed * 0.08, 4)) * devicePixelRatio,
                    a: 0.66,
                    decay: 0.011 + Math.random() * 0.014,  // 变慢,拖尾更持久
                    grow: 0.16 + Math.random() * 0.18,     // 晕开更明显
                    r0: r, g0: g, b0: b
                });
            }
            if (drops.length > MAXD) drops.splice(0, drops.length - MAXD);
            lastX = mx; lastY = my;
        }, { passive: true });

        // 笔锋即时点 + 墨滴晕染
        (function loop() {
            px = lerp(px, mx, 0.35); py = lerp(py, my, 0.35);
            dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;

            ctx.clearRect(0, 0, W, H);
            for (let i = drops.length - 1; i >= 0; i--) {
                const d = drops[i];
                d.a -= d.decay; d.r += d.grow;
                if (d.a <= 0) { drops.splice(i, 1); continue; }
                // 多层叠加模拟水墨晕染的层次感
                ctx.beginPath();
                ctx.fillStyle = `rgba(${d.r0},${d.g0},${d.b0},${d.a * 0.5})`;
                ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath();
                ctx.fillStyle = `rgba(${d.r0},${d.g0},${d.b0},${d.a})`;
                ctx.arc(d.x, d.y, d.r * 0.6, 0, Math.PI * 2); ctx.fill();
            }
            requestAnimationFrame(loop);
        })();

        // hover 态:笔锋放大成一圈淡墨
        const bind = () => {
            $$('[data-cursor="hover"], a, button, summary').forEach(el => {
                if (el.dataset.cbound) return;
                el.dataset.cbound = '1';
                el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
                el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
            });
        };
        bind();
        addEventListener('mousedown', () => cursor.classList.add('is-down'));
        addEventListener('mouseup', () => cursor.classList.remove('is-down'));
    };

    /* ── 磁性元素:靠近时被吸附 ─────────────────────────────── */
    const initMagnetic = () => {
        if (TOUCH || REDUCED) return;
        $$('[data-magnetic]').forEach(el => {
            const strength = 20;
            el.addEventListener('mouseenter', () => {
                // 磁吸期间关掉 transition,让位移紧贴指针
                el.style.transition = 'none';
            });
            el.addEventListener('mousemove', e => {
                const r = el.getBoundingClientRect();
                const x = e.clientX - r.left - r.width / 2;
                const y = e.clientY - r.top - r.height / 2;
                el.style.transform = `translate(${(x / r.width) * strength}px, ${(y / r.height) * strength}px)`;
            });
            el.addEventListener('mouseleave', () => {
                // 离开时恢复 transition,平滑回弹到原位
                el.style.transition = 'transform .55s cubic-bezier(.22,1,.36,1)';
                el.style.transform = '';
                el.addEventListener('transitionend', () => { el.style.transition = ''; }, { once: true });
            });
        });
    };

    /* ── Bootloader 引导序列 ───────────────────────────────── */
    const initBoot = () => {
        const boot = $('#boot'), log = $('#boot-log'),
              fill = $('#boot-bar-fill'), pct = $('#boot-pct');
        const nav = $('#site-nav'), player = $('#player');

        const finish = () => {
            boot.classList.add('done');
            nav.classList.add('show');
            player.classList.add('show');
            document.body.style.overflow = '';
        };

        if (REDUCED) { finish(); return; }

        document.body.style.overflow = 'hidden';
        const lines = [
            '> hanfy.sys — 初始化引导程序…',
            '> 检测 Bootloader 锁状态 … <ok>已解锁</ok>',
            '> 校验 ROM 签名 … <ok>通过</ok>',
            '> 挂载 /system /vendor … <ok>完成</ok>',
            '> 注入 Magisk 模块 … <ok>完成</ok>',
            '> 启动完成,进入系统。'
        ];

        let li = 0, progress = 0;
        const typeNext = () => {
            if (li < lines.length) {
                const div = document.createElement('div');
                div.className = 'bl-line';
                div.innerHTML = lines[li].replace(/<ok>/g, '<span class="bl-ok">').replace(/<\/ok>/g, '</span>');
                log.appendChild(div);
                li++;
                setTimeout(typeNext, 150);
            }
        };
        typeNext();

        const tick = () => {
            progress = Math.min(progress + Math.random() * 16 + 6, 100);
            fill.style.width = progress + '%';
            pct.textContent = Math.floor(progress) + '%';
            if (progress < 100) setTimeout(tick, 130);
            else setTimeout(finish, 420);
        };
        setTimeout(tick, 120);
    };

    /* ── Canvas 数据流背景 ─────────────────────────────────── */
    const initCanvas = () => {
        if (REDUCED) return;
        const cv = $('#fx-canvas'), ctx = cv.getContext('2d');
        let W, H, parts = [], raf;

        const resize = () => {
            W = cv.width = innerWidth * devicePixelRatio;
            H = cv.height = innerHeight * devicePixelRatio;
            cv.style.width = innerWidth + 'px';
            cv.style.height = innerHeight + 'px';
        };
        resize();
        addEventListener('resize', resize);

        const COUNT = Math.max(26, Math.min(64, Math.floor(innerWidth / 26)));
        const spawn = () => ({
            x: Math.random() * W,
            y: Math.random() * H,
            vx: (Math.random() - 0.5) * 0.22 * devicePixelRatio,
            vy: (Math.random() - 0.5) * 0.22 * devicePixelRatio,
            r: (Math.random() * 1.4 + 0.5) * devicePixelRatio,
            a: Math.random() * 0.5 + 0.12
        });
        for (let i = 0; i < COUNT; i++) parts.push(spawn());

        const LINK = 130 * devicePixelRatio;
        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            // 连线
            for (let i = 0; i < parts.length; i++) {
                for (let j = i + 1; j < parts.length; j++) {
                    const a = parts[i], b = parts[j];
                    const dx = a.x - b.x, dy = a.y - b.y;
                    const d = Math.hypot(dx, dy);
                    if (d < LINK) {
                        ctx.strokeStyle = `rgba(15,160,147,${(1 - d / LINK) * 0.18})`;
                        ctx.lineWidth = devicePixelRatio * 0.6;
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
            }
            // 粒子
            parts.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > W) p.vx *= -1;
                if (p.y < 0 || p.y > H) p.vy *= -1;
                ctx.fillStyle = `rgba(15,160,147,${p.a})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            });
            raf = requestAnimationFrame(draw);
        };
        draw();

        // 页面不可见时暂停,省电
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) cancelAnimationFrame(raf);
            else draw();
        });
    };

    /* ── 平滑锚点 ────────────────────────────────────────────
       CSS 已用 scroll-behavior + scroll-padding-top 处理平滑与偏移,
       这里只在 reduced-motion 下强制瞬时跳转,避免双重补间。 ── */
    const initAnchors = () => {
        if (!REDUCED) return; // 非减弱模式交给原生 CSS
        $$('a[href^="#"]').forEach(a => {
            a.addEventListener('click', e => {
                const id = a.getAttribute('href');
                if (id.length < 2) return;
                const target = $(id);
                if (!target) return;
                e.preventDefault();
                target.scrollIntoView({ behavior: 'auto', block: 'start' });
            });
        });
    };

    /* ── 音乐播放器 ────────────────────────────────────────── */
    const initPlayer = () => {
        const audio = $('#bg-music'), wrap = $('#player'),
              btn = $('#player-toggle'), status = $('#player-status'),
              icPlay = $('#ic-play'), icPause = $('#ic-pause');

        const setUI = playing => {
            wrap.classList.toggle('playing', playing);
            icPlay.style.display = playing ? 'none' : '';
            icPause.style.display = playing ? '' : 'none';
            status.textContent = playing ? '播放中' : '已暂停';
        };

        btn.addEventListener('click', () => {
            if (audio.paused) {
                audio.play().then(() => setUI(true)).catch(() => {
                    status.textContent = '播放失败';
                });
            } else {
                audio.pause();
                setUI(false);
            }
        });
        audio.addEventListener('ended', () => setUI(false));
    };

    /* ── 启动 ──────────────────────────────────────────────── */
    const start = () => {
        initIcons();
        splitChars();
        initReveal();
        initNav();
        initProgress();
        initCursor();
        initMagnetic();
        initBoot();
        initCanvas();
        initAnchors();
        initPlayer();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
