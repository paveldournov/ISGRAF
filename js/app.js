// js/app.js

const MAX_FUNCS = 10;
const NUM_SLOTS = 255;

class App {
    constructor() {
        this.engine   = new MathEngine();
        this.renderer = new Renderer();

        this.canvas       = document.getElementById('screen');
        this.funcListEl   = document.getElementById('func-list');
        this.funcInput    = document.getElementById('func-input');
        this.funcTypeEl   = document.getElementById('func-type');
        this.funcAddBtn   = document.getElementById('func-add-btn');
        this.rangeDisplay = document.getElementById('range-display');
        this.coordsEl     = document.getElementById('coords-overlay');
        this.toastEl      = document.getElementById('toast');

        this.renderer.init(this.canvas);
        attachKeyboard(this.canvas);

        this.funcs   = [];
        this.tekFunc = 0;
        this.kolFunc = 0;
        this.derivOf = new Array(MAX_FUNCS + 1).fill(0);

        this.slots = Array.from({ length: NUM_SLOTS + 1 }, () =>
            ({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 }));
        this.tekSlot = 1;

        this.xMin = -10; this.xMax = 10;
        this.yMin = -10; this.yMax = 10;

        this.gridVisible    = false;
        this._interacting   = false;
        this._lastMouseCoords = null;

        this._setupSidebar();
        this._setupToolbar();
        this._setupCanvasEvents();
        this._setupResizer();

        window.addEventListener('resize', () => {
            this.renderer.resize();
            this._replot();
        });

        this._addFunction('sin(x) / x', false);
        this._addFunction('sin(x + cos(x))', false);
        this._replot();
        this.funcInput.focus();
    }

    // ── Colors ─────────────────────────────────────────────────────────────────

    _funcColor(idx) {
        const palette = [
            '#55FF55','#FF5555','#55FFFF','#FF55FF',
            '#FFFF55','#FF9944','#AA88FF','#AAAAAA',
            '#44DDAA','#FF66AA',
        ];
        return palette[(idx - 1) % palette.length];
    }

    // ── Plot ───────────────────────────────────────────────────────────────────

    _applyRange() {
        this.renderer.setRange(this.xMin, this.xMax, this.yMin, this.yMax);
    }

    _replot() {
        this._applyRange();
        this.renderer.drawFrame();
        this.renderer.clearPlot();
        this.renderer.drawAxes();
        if (this.gridVisible) this.renderer.drawGrid();
        for (let i = 1; i <= this.kolFunc; i++) {
            if (!this.funcs[i-1]?.visible) continue;
            const evalFn = this._makeEvalFn(i, this.funcs[i-1]?.isPolar);
            this.renderer.plotFunction(evalFn, this._funcColor(i), this.funcs[i-1]?.isPolar);
        }
        this._updateRangeDisplay();
        if (this._lastMouseCoords)
            this.coordsEl.textContent =
                `X=${this._lastMouseCoords.wx.toFixed(4)}  Y=${this._lastMouseCoords.wy.toFixed(4)}`;
    }

    _updateRangeDisplay() {
        const f = n => n.toFixed(2);
        this.rangeDisplay.innerHTML =
            `X: [${f(this.xMin)}, ${f(this.xMax)}]<br>` +
            `Y: [${f(this.yMin)}, ${f(this.yMax)}]<br>` +
            `View: ${this.tekSlot}`;
    }

    _makeEvalFn(n, isPolar) {
        const engine = this.engine;
        if (isPolar) {
            return (theta) => { engine.setVar('F', theta); return engine.evaluate(n); };
        } else {
            return (x) => { engine.setVar('X', x); return engine.evaluate(n); };
        }
    }

    // ── Sidebar ────────────────────────────────────────────────────────────────

    _setupSidebar() {
        this.funcInput.addEventListener('keydown', e => {
            if (e.key === 'Enter')  { e.preventDefault(); this._commitAdd(); }
            if (e.key === 'Escape') { this.funcInput.value = ''; this.canvas.focus(); }
        });
        this.funcAddBtn.addEventListener('click', () => this._commitAdd());
        this._renderSidebar();
    }

    _commitAdd() {
        const formula = this.funcInput.value.trim();
        if (!formula) return;
        const isPolar = this.funcTypeEl.value === 'polar';
        if (this._addFunction(formula, isPolar)) {
            this.funcInput.value = '';
            this.funcInput.focus();
        }
    }

    _addFunction(formula, isPolar) {
        if (this.kolFunc >= MAX_FUNCS) { this._showToast('Maximum 10 functions'); return false; }
        const n = this.kolFunc + 1;
        const err = this.engine.parse(formula, n);
        if (err) { this._showToast('Parse error: ' + this.engine.errorMsg(err)); return false; }
        this.kolFunc++;
        this.tekFunc = n;
        this.funcs[n - 1] = {
            label: this.engine.toString(n).slice(0, 28) || formula.slice(0, 28),
            isPolar,
            derivIdx: 0,
            visible: true,
        };
        this._renderSidebar();
        this._replot();
        return true;
    }

    _editFunction(idx, newFormula) {
        if (!newFormula.trim()) return false;
        const isPolar = this.funcs[idx - 1]?.isPolar;
        const err = this.engine.parse(newFormula, idx);
        if (err) { this._showToast('Parse error: ' + this.engine.errorMsg(err)); return false; }
        this.funcs[idx - 1].label = this.engine.toString(idx).slice(0, 28) || newFormula.slice(0, 28);
        this._renderSidebar();
        this._replot();
        return true;
    }

    _deleteFunction(idx) {
        this.engine.shiftDown(idx, this.kolFunc);
        this.funcs.splice(idx - 1, 1);
        this.kolFunc--;
        if (this.tekFunc > idx) this.tekFunc--;
        else if (this.tekFunc === idx) this.tekFunc = Math.min(idx, this.kolFunc) || 0;
        for (let i = 1; i <= MAX_FUNCS; i++) {
            if (this.derivOf[i] === idx) this.derivOf[i] = 0;
            else if (this.derivOf[i] > idx) this.derivOf[i]--;
        }
        this._renderSidebar();
        this._replot();
    }

    _toggleFunction(idx) {
        this.funcs[idx - 1].visible = !this.funcs[idx - 1].visible;
        this._renderSidebar();
        this._replot();
    }

    _setActive(idx) {
        this.tekFunc = idx;
        this._renderSidebar();
    }

    _renderSidebar() {
        this.funcListEl.innerHTML = '';

        if (this.kolFunc === 0) {
            const el = document.createElement('div');
            el.className = 'func-list-empty';
            el.textContent = 'No functions — type one below';
            this.funcListEl.appendChild(el);
            return;
        }

        for (let i = 1; i <= this.kolFunc; i++) {
            const f = this.funcs[i - 1];
            const color = this._funcColor(i);

            const row = document.createElement('div');
            row.className = 'func-row' + (i === this.tekFunc ? ' active' : '');

            const swatch = document.createElement('div');
            swatch.className = 'func-swatch';
            swatch.title = f.visible ? 'Click to hide' : 'Click to show';
            if (f.visible) {
                swatch.style.background = color;
                swatch.style.opacity = '0.9';
                swatch.style.border = 'none';
            } else {
                swatch.style.background = 'transparent';
                swatch.style.border = `2px solid ${color}`;
                swatch.style.opacity = '0.5';
            }
            swatch.style.cursor = 'pointer';
            swatch.addEventListener('click', e => {
                e.stopPropagation();
                this._toggleFunction(i);
            });

            const label = document.createElement('span');
            label.className = 'func-label';
            label.textContent = f.label;
            label.style.opacity = f.visible ? '1' : '0.38';
            label.title = `${f.isPolar ? 'R(φ)' : 'Y(x)'} = ${f.label}  (double-click to edit)`;

            const del = document.createElement('button');
            del.className = 'func-del';
            del.textContent = '×';
            del.title = 'Delete';

            row.addEventListener('click', e => {
                if (e.target === del) return;
                this._setActive(i);
            });

            label.addEventListener('dblclick', e => {
                e.stopPropagation();
                this._startInlineEdit(row, label, i);
            });

            del.addEventListener('click', e => {
                e.stopPropagation();
                this._deleteFunction(i);
            });

            row.append(swatch, label, del);
            this.funcListEl.appendChild(row);
        }
    }

    _startInlineEdit(row, labelSpan, idx) {
        const input = document.createElement('input');
        input.className = 'func-edit-input';
        input.value = labelSpan.textContent;
        labelSpan.replaceWith(input);
        input.focus();
        input.select();

        let committed = false;

        const finish = (confirm) => {
            if (committed) return;
            committed = true;
            const val = input.value.trim();
            if (confirm && val) {
                const ok = this._editFunction(idx, val);
                if (!ok) input.replaceWith(labelSpan);
            } else {
                input.replaceWith(labelSpan);
            }
        };

        input.addEventListener('keydown', e => {
            e.stopPropagation();
            if (e.key === 'Enter')  { e.preventDefault(); finish(true); }
            if (e.key === 'Escape') { e.preventDefault(); finish(false); }
        });

        input.addEventListener('blur', () => finish(false));
    }

    // ── Toolbar ────────────────────────────────────────────────────────────────

    _setupToolbar() {
        document.querySelectorAll('#toolbar button[data-action]').forEach(btn => {
            btn.addEventListener('click', () => this._handleAction(btn.dataset.action, btn));
        });

        document.getElementById('zoom-in').addEventListener('click', () => this._zoom(0.7));
        document.getElementById('zoom-out').addEventListener('click', () => this._zoom(1 / 0.7));
    }

    _zoom(factor, cx, cy) {
        const wx = cx !== undefined ? cx : (this.xMin + this.xMax) / 2;
        const wy = cy !== undefined ? cy : (this.yMin + this.yMax) / 2;
        this.xMin = wx + (this.xMin - wx) * factor;
        this.xMax = wx + (this.xMax - wx) * factor;
        this.yMin = wy + (this.yMin - wy) * factor;
        this.yMax = wy + (this.yMax - wy) * factor;
        this._replot();
    }

    _handleAction(action, btn) {
        switch (action) {
            case 'grid':
                this.gridVisible = !this.gridVisible;
                btn.classList.toggle('active', this.gridVisible);
                this._replot();
                break;
            case 'derivative':
                this._addDerivative();
                break;
            case 'roots':
                this._showRootsMenu(btn);
                break;
            case 'cursor':
                this.canvas.focus();
                this._doCursor();
                break;
            case 'reset-view':
                this.xMin = -10; this.xMax = 10;
                this.yMin = -10; this.yMax = 10;
                this._replot();
                break;
            case 'clear':
                this._doClear();
                break;
        }
    }

    _showRootsMenu(anchorBtn) {
        const existing = document.getElementById('roots-dropdown');
        if (existing) { existing.remove(); return; }

        if (!this.tekFunc || !this.kolFunc) {
            this._showToast('Select a function first');
            return;
        }

        const menu = document.createElement('div');
        menu.id = 'roots-dropdown';

        const methods = [
            ['Newton (tangent)',  () => this._findRootNewton()],
            ['Chord (secant)',    () => this._findRootChord()],
            ['Combined',         () => this._findRootCombined()],
        ];

        methods.forEach(([label, fn]) => {
            const item = document.createElement('button');
            item.textContent = label;
            item.addEventListener('click', () => {
                menu.remove();
                this.canvas.focus();
                fn();
            });
            menu.appendChild(item);
        });

        document.body.appendChild(menu);
        const r = anchorBtn.getBoundingClientRect();
        menu.style.left = r.left + 'px';
        menu.style.top  = (r.bottom + 4) + 'px';

        const close = (e) => {
            if (!menu.contains(e.target) && e.target !== anchorBtn) {
                menu.remove();
                document.removeEventListener('click', close, true);
            }
        };
        setTimeout(() => document.addEventListener('click', close, true), 0);
    }

    // ── Canvas mouse events ────────────────────────────────────────────────────

    _setupCanvasEvents() {
        const canvas = this.canvas;
        let drag = null;
        let rafPending = false;

        const scheduleRedraw = () => {
            if (rafPending) return;
            rafPending = true;
            requestAnimationFrame(() => { rafPending = false; this._replot(); });
        };

        canvas.addEventListener('wheel', e => {
            e.preventDefault();
            const { px, py, pw, ph } = this.renderer;
            const rect = canvas.getBoundingClientRect();
            const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
            const cy = (e.clientY - rect.top)  * (canvas.height / rect.height);
            if (cx < px || cx > px + pw || cy < py || cy > py + ph) return;
            const wx = this.renderer.cxToWorld(cx);
            const wy = this.renderer.cyToWorld(cy);
            const factor = e.deltaY > 0 ? 1.25 : 0.8;
            this.xMin = wx + (this.xMin - wx) * factor;
            this.xMax = wx + (this.xMax - wx) * factor;
            this.yMin = wy + (this.yMin - wy) * factor;
            this.yMax = wy + (this.yMax - wy) * factor;
            this._applyRange();
            scheduleRedraw();
        }, { passive: false });

        canvas.addEventListener('mousedown', e => {
            if (e.button !== 0 || this._interacting) return;
            const { px, py, pw, ph } = this.renderer;
            const rect = canvas.getBoundingClientRect();
            const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
            const cy = (e.clientY - rect.top)  * (canvas.height / rect.height);
            if (cx < px || cx > px + pw || cy < py || cy > py + ph) return;
            drag = { cx, cy, xMin: this.xMin, xMax: this.xMax, yMin: this.yMin, yMax: this.yMax };
            canvas.style.cursor = 'grabbing';
        });

        canvas.addEventListener('mousemove', e => {
            const { px, py, pw, ph } = this.renderer;
            const rect = canvas.getBoundingClientRect();
            const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
            const cy = (e.clientY - rect.top)  * (canvas.height / rect.height);
            const inPlot = cx >= px && cx <= px + pw && cy >= py && cy <= py + ph;

            if (inPlot) {
                const wx = this.renderer.cxToWorld(cx);
                const wy = this.renderer.cyToWorld(cy);
                this._lastMouseCoords = { wx, wy };
                if (!this._interacting)
                    this.coordsEl.textContent = `X=${wx.toFixed(4)}  Y=${wy.toFixed(4)}`;
                if (!drag) canvas.style.cursor = 'crosshair';
            } else if (!drag) {
                this._lastMouseCoords = null;
                if (!this._interacting) this.coordsEl.textContent = '';
                canvas.style.cursor = 'default';
            }

            if (!drag) return;
            const dx = (cx - drag.cx) / this.renderer.scaleX;
            const dy = (cy - drag.cy) / this.renderer.scaleY;
            this.xMin = drag.xMin - dx; this.xMax = drag.xMax - dx;
            this.yMin = drag.yMin + dy; this.yMax = drag.yMax + dy;
            this._applyRange();
            scheduleRedraw();
        });

        canvas.addEventListener('mouseup', () => {
            if (!drag) return;
            drag = null;
            canvas.style.cursor = 'crosshair';
        });

        canvas.addEventListener('mouseleave', () => {
            drag = null;
            this._lastMouseCoords = null;
            if (!this._interacting) this.coordsEl.textContent = '';
            canvas.style.cursor = 'default';
        });

        // PgUp/PgDn for view history (only when not in interactive mode)
        canvas.addEventListener('keydown', e => {
            if (this._interacting) return;
            if (e.key === 'PageUp')   { e.preventDefault(); this._navigateSlot(+1); }
            if (e.key === 'PageDown') { e.preventDefault(); this._navigateSlot(-1); }
        });
    }

    // ── Root finding ──────────────────────────────────────────────────────────

    _findBracket() {
        const { xMin, xMax, yMin, yMax } = this;
        const n = this.tekFunc;
        const f = this._makeEvalFn(n, this.funcs[n-1]?.isPolar);
        const step = (xMax - xMin) / this.renderer.pw;
        let x1 = null, x2 = null;
        for (let x = xMin; x <= xMax; x += step) {
            const y = f(x);
            if (y !== null && y >= yMin && y <= yMax) { x1 = x; break; }
        }
        for (let x = xMax; x >= xMin; x -= step) {
            const y = f(x);
            if (y !== null && y >= yMin && y <= yMax) { x2 = x; break; }
        }
        return (x1 !== null && x2 !== null) ? { x1, x2 } : null;
    }

    _findRootChord() {
        const bracket = this._findBracket();
        if (!bracket) { this._showToast('No valid region found'); return; }
        let { x1, x2 } = bracket;
        const f = this._makeEvalFn(this.tekFunc, this.funcs[this.tekFunc-1]?.isPolar);
        const EPS = 1e-10;
        let delta = 1, xn;
        while (EPS < Math.abs(delta)) {
            const y1 = f(x1), y2 = f(x2);
            if (y1 === null || y2 === null || y1 === y2) break;
            this.renderer.drawLine(x1, y1, x2, y2, '#FF5555');
            xn = x2 - y2 * (x2 - x1) / (y2 - y1);
            delta = xn - x2;
            x1 = x2; x2 = xn;
        }
        this._showToast('Root  X = ' + xn.toFixed(8), 5000);
    }

    _ensureDerivative(n) {
        let dIdx = this.derivOf[n];
        if (dIdx) return dIdx;
        dIdx = this.kolFunc + 1;
        if (dIdx > MAX_FUNCS) { this._showToast('Too many functions'); return null; }
        const varName = this.funcs[n-1]?.isPolar ? 'F' : 'X';
        this.engine.differentiate(n, dIdx, varName);
        if (this.engine.getError()) {
            this._showToast('Derivative error: ' + this.engine.errorMsg(this.engine.getError()));
            return null;
        }
        this.kolFunc++;
        this.derivOf[n] = dIdx;
        this.funcs[dIdx - 1] = {
            label: this.engine.toString(dIdx).slice(0, 28),
            isPolar: this.funcs[n-1]?.isPolar,
            derivIdx: 0,
            visible: true,
        };
        return dIdx;
    }

    _findRootNewton() {
        const n = this.tekFunc;
        if (!n) return;
        const dIdx = this._ensureDerivative(n);
        if (!dIdx) return;
        const bracket = this._findBracket();
        if (!bracket) { this._showToast('No valid region found'); return; }
        const fOrig  = this._makeEvalFn(n, this.funcs[n-1]?.isPolar);
        const fDeriv = this._makeEvalFn(dIdx, this.funcs[dIdx-1]?.isPolar);
        const EPS = 1e-10;
        let delta = 1, xn = bracket.x1;
        while (EPS < Math.abs(delta)) {
            const y = fOrig(xn), yd = fDeriv(xn);
            if (y === null || yd === null || yd === 0) break;
            const xNew = xn - y / yd;
            this.renderer.drawLine(xn, y, xNew, 0, '#FF5555');
            delta = xNew - xn;
            xn = xNew;
        }
        this._showToast('Root  X = ' + xn.toFixed(8), 5000);
    }

    _findRootCombined() {
        const n = this.tekFunc;
        if (!n) return;
        const dIdx = this._ensureDerivative(n);
        if (!dIdx) return;
        const bracket = this._findBracket();
        if (!bracket) { this._showToast('No valid region found'); return; }
        let { x1, x2 } = bracket;
        const f  = this._makeEvalFn(n, this.funcs[n-1]?.isPolar);
        const fd = this._makeEvalFn(dIdx, this.funcs[dIdx-1]?.isPolar);
        const EPS = 1e-10;
        let delta = 1, xn;
        while (EPS < Math.abs(delta)) {
            const y1 = f(x1), y2 = f(x2);
            if (y1 === null || y2 === null || y1 === y2) break;
            this.renderer.drawLine(x1, y1, x2, y2, '#FF5555');
            xn = x2 - y2 * (x2 - x1) / (y2 - y1);
            x1 = x2; x2 = xn;
            const yn = f(xn), yd = fd(xn);
            if (yn === null || yd === null || yd === 0) break;
            const xnn = xn - yn / yd;
            this.renderer.drawLine(xn, yn, xnn, 0, '#FF5555');
            delta = xnn - xn;
            x1 = xnn;
        }
        this._showToast('Root  X = ' + xn.toFixed(8), 5000);
    }

    // ── Derivative ─────────────────────────────────────────────────────────────

    _addDerivative() {
        if (!this.tekFunc || !this.kolFunc) { this._showToast('Select a function first'); return; }
        const n = this.tekFunc;
        const dIdx = this._ensureDerivative(n);
        if (!dIdx) return;
        this._renderSidebar();
        this._replot();
        const dStr = this.engine.toString(dIdx);
        this._showToast('f′ = ' + dStr.slice(0, 60), 4000);
    }

    // ── Interactive cursor ─────────────────────────────────────────────────────

    async _doCursor() {
        if (!this.tekFunc) { this._showToast('Select a function first'); return; }
        const n = this.tekFunc;
        const isPolar = this.funcs[n-1]?.isPolar;
        const evalFn = this._makeEvalFn(n, isPolar);
        const { px, py, pw, ph } = this.renderer;

        this._interacting = true;
        this._showToast('← → to move along curve · Enter or Esc to exit', 4000);

        let t = isPolar ? 40 : Math.round(pw / 2);
        let saved = null;

        const computePos = () => {
            if (isPolar) {
                const theta = t / 180 * Math.PI;
                this.engine.setVar('F', theta);
                const r = evalFn(theta);
                if (r === null) return null;
                return { wx: r * Math.cos(theta), wy: r * Math.sin(theta),
                         label: `φ=${t.toFixed(1)}°  R=${r.toFixed(4)}` };
            } else {
                const x = this.xMin + t / this.renderer.scaleX;
                const y = evalFn(x);
                if (y === null) return null;
                return { wx: x, wy: y, label: `X=${x.toFixed(4)}  Y=${y.toFixed(4)}` };
            }
        };

        const drawIt = () => {
            if (saved) this.renderer.restoreArea(px, py, saved);
            saved = this.renderer.saveArea(px, py, pw, ph);
            const pos = computePos();
            if (!pos) return;
            const cx = this.renderer.wx(pos.wx);
            const cy = this.renderer.wy(pos.wy);
            this.renderer.drawCursor(cx, cy);
            this.coordsEl.textContent = pos.label;
        };

        drawIt();

        while (true) {
            const e = await waitKey();
            if (e.key === 'ArrowRight') t = Math.min(t + 3, isPolar ? 360 * 5 : pw);
            else if (e.key === 'ArrowLeft') t = Math.max(t - 3, 0);
            else if (e.key === 'Enter' || e.key === 'Escape') {
                if (saved) this.renderer.restoreArea(px, py, saved);
                this.coordsEl.textContent = '';
                break;
            } else continue;
            drawIt();
        }

        this._interacting = false;
    }

    // ── View history (slots) ───────────────────────────────────────────────────

    _saveSlot() {
        this.slots[this.tekSlot] = {
            xMin: this.xMin, xMax: this.xMax, yMin: this.yMin, yMax: this.yMax,
        };
    }

    _loadSlot() {
        const s = this.slots[this.tekSlot];
        this.xMin = s.xMin; this.xMax = s.xMax;
        this.yMin = s.yMin; this.yMax = s.yMax;
        this._applyRange();
    }

    _navigateSlot(delta) {
        this._saveSlot();
        this.tekSlot = Math.max(1, Math.min(NUM_SLOTS, this.tekSlot + delta));
        this._loadSlot();
        this._replot();
    }

    // ── Clear ──────────────────────────────────────────────────────────────────

    _doClear() {
        for (let i = 0; i <= MAX_FUNCS; i++) this.engine.del(i);
        this.kolFunc = 0;
        this.tekFunc = 0;
        this.funcs   = [];
        this.derivOf.fill(0);
        this._renderSidebar();
        this._replot();
    }

    // ── Sidebar resize ─────────────────────────────────────────────────────────

    _setupResizer() {
        const resizer = document.getElementById('sidebar-resizer');
        const sidebar = document.getElementById('sidebar');
        let startX, startW, rafPending = false;

        resizer.addEventListener('mousedown', e => {
            startX = e.clientX;
            startW = sidebar.offsetWidth;
            resizer.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            e.preventDefault();
        });

        const onMove = e => {
            const w = Math.max(160, Math.min(480, startW + e.clientX - startX));
            sidebar.style.width    = w + 'px';
            sidebar.style.minWidth = w + 'px';
            if (!rafPending) {
                rafPending = true;
                requestAnimationFrame(() => {
                    rafPending = false;
                    this.renderer.resize();
                    this._replot();
                });
            }
        };

        const onUp = () => {
            resizer.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
    }

    // ── Toast notifications ────────────────────────────────────────────────────

    _showToast(msg, duration = 3000) {
        this.toastEl.textContent = msg;
        this.toastEl.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), duration);
    }
}

window.addEventListener('DOMContentLoaded', () => { new App(); });
