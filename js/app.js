// js/app.js — Main application (port of ISGRF.PAS main logic)

const MENU_ITEMS = ['Function', 'Plot', 'Axes', 'Scale', 'Misc', 'Points', 'Clear', 'Info'];

// Up to 10 functions
const MAX_FUNCS = 10;

// 256 saved coordinate slots (1-indexed)
const NUM_SLOTS = 255;

class App {
    constructor() {
        this.engine   = new MathEngine();
        this.renderer = new Renderer();

        this.canvas   = document.getElementById('screen');
        this.inputEl  = document.getElementById('textInput');

        this.renderer.init(this.canvas);
        attachKeyboard(this.canvas);
        this.canvas.focus();

        // Function state
        this.funcs = [];        // {label, isPolar, derivIdx} — up to 10
        this.tekFunc = 0;       // current function index (1-based, 0=none)
        this.kolFunc = 0;       // count of functions

        // Coordinate slots
        this.slots = Array.from({ length: NUM_SLOTS + 1 }, () =>
            ({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 }));
        this.tekSlot = 1;

        // View range
        this.xMin = -10; this.xMax = 10;
        this.yMin = -10; this.yMax = 10;

        // Plot state
        this.plotIsEmpty = true;
        this.newScale    = false;
        this.colorIdx    = 0;   // cycles through FUNC_COLORS
        this.discontinuities = [];

        // Derivative bookkeeping: derivOf[n] = index of func that is derivative of n
        this.derivOf = new Array(MAX_FUNCS + 1).fill(0);

        this.dotMode = false;

        window.addEventListener('resize', () => {
            this.renderer.resize();
            this.redrawAll();
        });

        // Handle canvas clicks on menu bar
        this.canvas.addEventListener('click', e => this._onCanvasClick(e));

        this.run();
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    _applyRange() {
        this.renderer.setRange(this.xMin, this.xMax, this.yMin, this.yMax);
    }

    _saveSlot() {
        this.slots[this.tekSlot] = {
            xMin: this.xMin, xMax: this.xMax,
            yMin: this.yMin, yMax: this.yMax,
        };
    }

    _loadSlot() {
        const s = this.slots[this.tekSlot];
        this.xMin = s.xMin; this.xMax = s.xMax;
        this.yMin = s.yMin; this.yMax = s.yMax;
        this._applyRange();
    }

    _funcColor(idx) {
        const palette = [
            '#55FF55','#FF5555','#55FFFF','#FF55FF',
            '#5555FF','#00AAAA','#FFFFFF','#AAAAAA',
            '#FFFF55','#AA00AA',
        ];
        return palette[(idx - 1) % palette.length];
    }

    _nextColor() {
        this.colorIdx = (this.colorIdx + 1) % 10;
        return this._funcColor(this.colorIdx + 1);
    }

    // Build eval function for func index n (1-based)
    _makeEvalFn(n, isPolar) {
        const engine = this.engine;
        if (isPolar) {
            return (theta) => {
                engine.setVar('F', theta);
                return engine.evaluate(n);
            };
        } else {
            return (x) => {
                engine.setVar('X', x);
                return engine.evaluate(n);
            };
        }
    }

    // ── Screen draw ───────────────────────────────────────────────────────────

    redrawAll() {
        this._applyRange();
        this.renderer.drawFrame();
        this.renderer.clearPlot();
        this.renderer.drawAxes();
        this.renderer.drawMenuBar(MENU_ITEMS, this.menuIdx ?? 0);
        this.renderer.drawStatusBar(this.xMin, this.xMax, this.yMin, this.yMax, this.tekSlot);
    }

    drawCurrentAxes() {
        this._applyRange();
        this.renderer.clearPlot();
        this.renderer.drawAxes();
    }

    // ── Root finding ──────────────────────────────────────────────────────────

    // Find two valid points bracketing a root-like region
    _findBracket() {
        const { xMin, xMax, yMin, yMax } = this;
        const n = this.tekFunc;
        const isPolar = this.funcs[n - 1]?.isPolar;
        const f = this._makeEvalFn(n, isPolar);
        const step = (xMax - xMin) / this.renderer.pw;
        let x1 = null, x2 = null;

        // Scan left→right for first valid in-range point
        for (let x = xMin; x <= xMax; x += step) {
            const y = f(x);
            if (y !== null && y >= yMin && y <= yMax) { x1 = x; break; }
        }
        // Scan right→left for last valid in-range point
        for (let x = xMax; x >= xMin; x -= step) {
            const y = f(x);
            if (y !== null && y >= yMin && y <= yMax) { x2 = x; break; }
        }
        return (x1 !== null && x2 !== null) ? { x1, x2 } : null;
    }

    // Chord (secant) method
    async _findRootChord() {
        const bracket = this._findBracket();
        if (!bracket) { await this._showError('No valid region found'); return; }
        let { x1, x2 } = bracket;
        const n = this.tekFunc;
        const isPolar = this.funcs[n-1]?.isPolar;
        const f = this._makeEvalFn(n, isPolar);
        const color = '#FF5555';
        const EPS = 1e-10;
        let delta = 1;
        let xn;

        while (EPS < Math.abs(delta)) {
            const y1 = f(x1), y2 = f(x2);
            if (y1 === null || y2 === null || y1 === y2) break;
            this.renderer.drawLine(x1, y1, x2, y2, color);
            xn = x2 - y2 * (x2 - x1) / (y2 - y1);
            delta = xn - x2;
            x1 = x2; x2 = xn;
        }
        await this._showResult('Root X = ' + xn.toFixed(8));
    }

    // Newton (tangent) method — requires derivative
    async _findRootNewton() {
        const n = this.tekFunc;
        if (!n) return;

        // Ensure derivative exists
        let dIdx = this.derivOf[n];
        if (!dIdx) {
            dIdx = this.kolFunc + 1;
            if (dIdx > MAX_FUNCS) { await this._showError('Too many functions'); return; }
            const varName = this.funcs[n-1]?.isPolar ? 'F' : 'X';
            this.engine.differentiate(n, dIdx, varName);
            if (this.engine.getError()) {
                await this._showError('Derivative error: ' + this.engine.errorMsg(this.engine.getError()));
                return;
            }
            this.kolFunc++;
            this.derivOf[n] = dIdx;
            this.funcs[dIdx - 1] = {
                label: this.engine.toString(dIdx),
                isPolar: this.funcs[n-1]?.isPolar,
                derivIdx: 0,
            };
        }

        const bracket = this._findBracket();
        if (!bracket) { await this._showError('No valid region found'); return; }
        let { x1 } = bracket;
        const fOrig = this._makeEvalFn(n, this.funcs[n-1]?.isPolar);
        const fDeriv = this._makeEvalFn(dIdx, this.funcs[dIdx-1]?.isPolar);
        const color = '#FF5555';
        const EPS = 1e-10;
        let delta = 1, xn = x1;

        while (EPS < Math.abs(delta)) {
            const y = fOrig(xn), yd = fDeriv(xn);
            if (y === null || yd === null || yd === 0) break;
            const xNew = xn - y / yd;
            this.renderer.drawLine(xn, y, xNew, 0, color);
            delta = xNew - xn;
            xn = xNew;
        }
        await this._showResult('Root X = ' + xn.toFixed(8));
    }

    // Combined method (alternates chord and Newton steps)
    async _findRootCombined() {
        const n = this.tekFunc;
        if (!n) return;

        let dIdx = this.derivOf[n];
        if (!dIdx) {
            dIdx = this.kolFunc + 1;
            if (dIdx > MAX_FUNCS) { await this._showError('Too many functions'); return; }
            const varName = this.funcs[n-1]?.isPolar ? 'F' : 'X';
            this.engine.differentiate(n, dIdx, varName);
            if (this.engine.getError()) { await this._showError('Derivative error'); return; }
            this.kolFunc++;
            this.derivOf[n] = dIdx;
            this.funcs[dIdx - 1] = {
                label: this.engine.toString(dIdx),
                isPolar: this.funcs[n-1]?.isPolar,
                derivIdx: 0,
            };
        }

        const bracket = this._findBracket();
        if (!bracket) { await this._showError('No valid region found'); return; }
        let { x1, x2 } = bracket;
        const f  = this._makeEvalFn(n, this.funcs[n-1]?.isPolar);
        const fd = this._makeEvalFn(dIdx, this.funcs[dIdx-1]?.isPolar);
        const color = '#FF5555';
        const EPS = 1e-10;
        let delta = 1, xn;

        while (EPS < Math.abs(delta)) {
            const y1 = f(x1), y2 = f(x2);
            if (y1 === null || y2 === null || y1 === y2) break;
            this.renderer.drawLine(x1, y1, x2, y2, color);
            xn = x2 - y2 * (x2 - x1) / (y2 - y1); // chord step
            x1 = x2; x2 = xn;
            const yn = f(xn), yd = fd(xn);
            if (yn === null || yd === null || yd === 0) break;
            const xnn = xn - yn / yd;                // Newton step
            this.renderer.drawLine(xn, yn, xnn, 0, color);
            delta = xnn - xn;
            x1 = xnn;
        }
        await this._showResult('Root X = ' + xn.toFixed(8));
    }

    // ── Error/result display ──────────────────────────────────────────────────

    async _showError(msg) {
        this.renderer.showError(msg);
        await waitAnyKey();
        this.renderer.clearTopStrip();
    }

    async _showResult(msg) {
        this.renderer.showResult(msg);
        await waitAnyKey();
        this.renderer.clearTopStrip();
    }

    // ── Interactive cursor (Ukazat) ────────────────────────────────────────────

    async _doCursor() {
        if (!this.tekFunc) return;
        const n = this.tekFunc;
        const isPolar = this.funcs[n-1]?.isPolar;
        const evalFn = this._makeEvalFn(n, isPolar);
        const { px, py, pw, ph } = this.renderer;
        const { xMin, xMax, yMin, yMax } = this;

        let t = isPolar ? 40 : Math.round(pw / 2);  // pixel position or angle in degrees
        let saved = null;

        const computePos = () => {
            if (isPolar) {
                const theta = t / 180 * Math.PI;
                this.engine.setVar('F', theta);
                const r = evalFn(theta);
                if (r === null) return null;
                const wx = r * Math.cos(theta);
                const wy = r * Math.sin(theta);
                return { wx, wy, label: `f=${(t).toFixed(1)}° R=${r.toFixed(3)}` };
            } else {
                const x = xMin + t / this.renderer.scaleX;
                const y = evalFn(x);
                if (y === null) return null;
                return { wx: x, wy: y, label: `X=${x.toFixed(3)} Y=${y.toFixed(3)}` };
            }
        };

        const drawIt = () => {
            if (saved) this.renderer.restoreArea(px, py, saved);
            saved = this.renderer.saveArea(px, py, pw, ph);
            const pos = computePos();
            if (!pos) return;
            const cx = this.renderer.wx(pos.wx);
            const cy = this.renderer.wy(pos.wy);
            this.renderer.drawCursor(cx, cy, pos.label);
        };

        drawIt();

        while (true) {
            const e = await waitKey();
            const step = 3;
            if (e.key === 'ArrowRight') {
                if (isPolar) t = Math.min(t + step, 360 * 5);
                else t = Math.min(t + step, pw);
            } else if (e.key === 'ArrowLeft') {
                if (isPolar) t = Math.max(t - step, 0);
                else t = Math.max(t - step, 0);
            } else if (e.key === 'Enter' || e.key === 'Escape') {
                if (saved) this.renderer.restoreArea(px, py, saved);
                break;
            } else continue;
            drawIt();
        }
    }

    // ── Zoom selector (Масштаб) ────────────────────────────────────────────────

    async _doZoomSelector() {
        const { px, py, pw, ph } = this.renderer;
        let sx = px + 40, sy = py + 40, sx2 = sx + 80, sy2 = sy + 60;

        const drawSel = () => this.renderer.drawSelector(sx, sy, sx2, sy2);

        let saved = this.renderer.saveArea(px, py, pw, ph);
        drawSel();

        while (true) {
            const e = await waitKey();
            // Restore before moving
            this.renderer.restoreArea(px, py, saved);
            saved = this.renderer.saveArea(px, py, pw, ph);

            const shiftHeld = e.shiftKey;
            const D = shiftHeld ? 5 : 10;

            if (e.key === 'ArrowRight') {
                if (shiftHeld) sx2 = Math.min(sx2 + D, px + pw);
                else { sx += D; sx2 += D; }
            } else if (e.key === 'ArrowLeft') {
                if (shiftHeld) sx2 = Math.max(sx2 - D, sx + 10);
                else { sx -= D; sx2 -= D; }
            } else if (e.key === 'ArrowDown') {
                if (shiftHeld) sy2 = Math.min(sy2 + D, py + ph);
                else { sy += D; sy2 += D; }
            } else if (e.key === 'ArrowUp') {
                if (shiftHeld) sy2 = Math.max(sy2 - D, sy + 10);
                else { sy -= D; sy2 -= D; }
            } else if (e.key === 'Enter') {
                this.renderer.restoreArea(px, py, saved);
                // Convert canvas coords to world coords
                const wx1 = this.renderer.cxToWorld(sx);
                const wx2 = this.renderer.cxToWorld(sx2);
                const wy1 = this.renderer.cyToWorld(sy2);
                const wy2 = this.renderer.cyToWorld(sy);
                this._saveSlot();
                this.tekSlot = Math.min(this.tekSlot + 1, NUM_SLOTS);
                this.xMin = wx1; this.xMax = wx2;
                this.yMin = wy1; this.yMax = wy2;
                return;
            } else if (e.key === 'Escape') {
                this.renderer.restoreArea(px, py, saved);
                return;
            }

            // Clamp to plot area
            sx = Math.max(px, sx); sy = Math.max(py, sy);
            sx2 = Math.min(px + pw, sx2); sy2 = Math.min(py + ph, sy2);

            drawSel();
        }
    }

    // ── Pan (MoveOsi) ──────────────────────────────────────────────────────────

    async _doPan() {
        while (true) {
            const e = await waitKey();
            if (e.key === 'Enter' || e.key === 'Escape') break;

            const shiftHeld = e.shiftKey;
            const koef = shiftHeld ? 0 : 1;
            const stepX = (this.xMax - this.xMin) / 10;
            const stepY = (this.yMax - this.yMin) / 10;

            if (e.key === 'ArrowLeft') {
                this.xMin -= stepX; this.xMax -= stepX * koef;
            } else if (e.key === 'ArrowRight') {
                this.xMin += stepX * koef; this.xMax += stepX;
            } else if (e.key === 'ArrowUp') {
                this.yMin += stepY * koef; this.yMax += stepY;
            } else if (e.key === 'ArrowDown') {
                this.yMin -= stepY; this.yMax -= stepY * koef;
            } else continue;

            this._applyRange();
            this.drawCurrentAxes();
            this.renderer.drawStatusBar(this.xMin, this.xMax, this.yMin, this.yMax, this.tekSlot);
        }
    }

    // ── Menu actions ───────────────────────────────────────────────────────────

    async _doFunction() {
        const { px, py } = this.renderer;

        if (this.kolFunc > 0) {
            // Show popup: Add | Delete | func1 | func2 | ...
            const items = ['Add', 'Delete', ...this.funcs.slice(0, this.kolFunc).map(f => f.label.slice(0, 18))];
            const sel = await showPopup(this.renderer, px + 15, py + 20, items);
            if (sel === -1) return;

            if (sel === 1) {
                // Delete current function
                if (!this.tekFunc) return;
                this.engine.shiftDown(this.tekFunc, this.kolFunc);
                this.funcs.splice(this.tekFunc - 1, 1);
                this.kolFunc--;
                this.tekFunc = Math.min(this.tekFunc, this.kolFunc) || (this.kolFunc > 0 ? 1 : 0);
                return;
            }

            if (sel > 1) {
                // Edit selected function
                this.tekFunc = sel - 1;  // sel=2 → func 1, etc.
                await this._editFunction(this.tekFunc);
                return;
            }
            // sel === 0 → Add
        }

        // Add new function
        if (this.kolFunc >= MAX_FUNCS) return;
        await this._addFunction();
    }

    async _addFunction() {
        // Choose type: Cartesian or Polar
        const typeItems = ['Cartesian  Y(X)=', 'Polar      R(f)='];
        const typeSel = await showPopup(this.renderer, 15, this.renderer.py + 20, typeItems);
        if (typeSel === -1) return;

        const isPolar = (typeSel === 1);
        const prompt  = isPolar ? 'R(f)=' : 'Y(X)=';
        const promptW = this.renderer.measureText(prompt);

        // Show formula input
        this.renderer.textAt(prompt, this.renderer.px + 15, this.renderer.py + 25, '#FFFF55');

        const { value, cancelled } = await readText(
            this.canvas, this.inputEl, this.renderer,
            this.renderer.px + 15 + promptW, this.renderer.py + 12,
            29, ''
        );

        if (cancelled || !value.trim()) return;

        const n = this.kolFunc + 1;
        const err = this.engine.parse(value, n);
        if (err) {
            await this._showError(this.engine.errorMsg(err));
            return;
        }

        this.kolFunc++;
        this.tekFunc = n;
        this.funcs[n - 1] = {
            label: this.engine.toString(n).slice(0, 20) || value.slice(0, 20),
            isPolar,
            derivIdx: 0,
        };
    }

    async _editFunction(n) {
        const isPolar = this.funcs[n - 1]?.isPolar;
        const prompt  = isPolar ? 'R(f)=' : 'Y(X)=';
        const promptW = this.renderer.measureText(prompt);
        const initial = this.engine.toString(n);

        this.renderer.textAt(prompt, this.renderer.px + 15, this.renderer.py + 25, '#FFFF55');

        const { value, cancelled } = await readText(
            this.canvas, this.inputEl, this.renderer,
            this.renderer.px + 15 + promptW, this.renderer.py + 12,
            29, initial
        );

        if (cancelled || !value.trim()) return;

        const err = this.engine.parse(value, n);
        if (err) {
            await this._showError(this.engine.errorMsg(err));
            return;
        }
        this.funcs[n - 1].label = this.engine.toString(n).slice(0, 20) || value.slice(0, 20);
    }

    async _doPlot() {
        if (!this.tekFunc || !this.kolFunc) return;
        const n = this.tekFunc;
        const isPolar = this.funcs[n - 1]?.isPolar;

        this._applyRange();

        if (this.plotIsEmpty || this.newScale) {
            this.renderer.clearPlot();
            this.colorIdx = 0;
            this.newScale = false;
        } else {
            this.colorIdx = (this.colorIdx + 1) % 10;
        }

        // Always draw axes before the function (same as original PutGrafik)
        this.renderer.drawAxes();

        const color = this._funcColor(this.colorIdx + 1);
        const evalFn = this._makeEvalFn(n, isPolar);
        const discs = this.renderer.plotFunction(evalFn, color, isPolar);
        this.discontinuities = discs;
        this.plotIsEmpty = false;
    }

    async _doAxes() {
        this._saveSlot();
        this.tekSlot = Math.min(this.tekSlot + 1, NUM_SLOTS);
        this.drawCurrentAxes();
        this.renderer.drawStatusBar(this.xMin, this.xMax, this.yMin, this.yMax, this.tekSlot);
        await this._doPan();
        this._saveSlot();
        this.plotIsEmpty = true;
    }

    async _doScale() {
        this._saveSlot();
        await this._doZoomSelector();
        this._applyRange();
        this.drawCurrentAxes();
        this.renderer.drawStatusBar(this.xMin, this.xMax, this.yMin, this.yMax, this.tekSlot);
        this.newScale = true;   // next Plot will clear and reset color
    }

    async _doMisc() {
        const x = Math.round(this.renderer.canvas.width * 0.35);
        // Items match original Rasnoe actions (labels in original were mismatched)
        const items = ['Show derivative', 'Draw grid', 'Dot mode: on/off', 'Set range manually'];
        const sel = await showPopup(this.renderer, x, this.renderer.py + 20, items);

        if (sel === 0) {
            await this._showDerivative();
        } else if (sel === 1) {
            this.renderer.drawGrid();
        } else if (sel === 2) {
            this.dotMode = !this.dotMode;
            await this._showResult('Dot mode: ' + (this.dotMode ? 'ON' : 'OFF'));
        } else if (sel === 3) {
            await this._setRangeManually();
        }
    }

    async _showDerivative() {
        if (!this.tekFunc || !this.kolFunc) return;
        const n = this.tekFunc;
        const varName = this.funcs[n-1]?.isPolar ? 'F' : 'X';

        let dIdx = this.derivOf[n];
        if (!dIdx) {
            dIdx = this.kolFunc + 1;
            if (dIdx > MAX_FUNCS) { await this._showError('Too many functions'); return; }
            this.engine.differentiate(n, dIdx, varName);
            if (this.engine.getError()) {
                await this._showError('Derivative error: ' + this.engine.errorMsg(this.engine.getError()));
                return;
            }
            this.kolFunc++;
            this.derivOf[n] = dIdx;
            this.funcs[dIdx - 1] = {
                label: this.engine.toString(dIdx).slice(0, 20),
                isPolar: this.funcs[n-1]?.isPolar,
                derivIdx: 0,
            };
        }

        // Display the derivative formula and plot it
        const dStr = this.engine.toString(dIdx);
        await this._showResult('f' + dIdx + '= ' + dStr.slice(0, 40));

        // Plot the derivative
        this._applyRange();
        this.renderer.drawAxes();
        const evalFn = this._makeEvalFn(dIdx, this.funcs[dIdx-1]?.isPolar);
        this.renderer.plotFunction(evalFn, C[12], this.funcs[dIdx-1]?.isPolar); // LightRed
        this.tekFunc = dIdx;
    }

    async _setRangeManually() {
        const fields = [
            { key: 'yMin', prompt: 'Ymin:', def: this.yMin },
            { key: 'yMax', prompt: 'Ymax:', def: this.yMax },
            { key: 'xMin', prompt: 'Xmin:', def: this.xMin },
            { key: 'xMax', prompt: 'Xmax:', def: this.xMax },
        ];
        const vals = {};

        for (const field of fields) {
            const pw = this.renderer.measureText(field.prompt);
            this.renderer.textAt(field.prompt, this.renderer.px + 40, this.renderer.py + 25, '#FFFF55');
            const { value, cancelled } = await readText(
                this.canvas, this.inputEl, this.renderer,
                this.renderer.px + 40 + pw + 4, this.renderer.py + 12,
                10, String(field.def.toFixed(2))
            );
            if (cancelled) return;
            const n = parseFloat(value);
            vals[field.key] = isNaN(n) ? field.def : n;
        }

        if (vals.yMax <= vals.yMin) vals.yMax = vals.yMin + 10;
        if (vals.xMax <= vals.xMin) vals.xMax = vals.xMin + 10;
        this.xMin = vals.xMin; this.xMax = vals.xMax;
        this.yMin = vals.yMin; this.yMax = vals.yMax;
        this._applyRange();
        this.drawCurrentAxes();
        this.renderer.drawStatusBar(this.xMin, this.xMax, this.yMin, this.yMax, this.tekSlot);
    }

    async _doPoints() {
        if (!this.kolFunc) return;
        const x = Math.round(this.renderer.canvas.width * 0.5);
        const items = ['Find root by OX', 'Find root by OY (f(0))', 'Interactive cursor'];
        const sel = await showPopup(this.renderer, x, this.renderer.py + 20, items);

        if (sel === 0) {
            const sub = await showPopup(this.renderer, x + 20, this.renderer.py + 60,
                ['Newton (tangent)', 'Chord (secant)', 'Combined']);
            if (sub === 0) await this._findRootNewton();
            else if (sub === 1) await this._findRootChord();
            else if (sub === 2) await this._findRootCombined();
        } else if (sel === 1) {
            this.engine.setVar('X', 0);
            const r = this.engine.evaluate(this.tekFunc);
            if (r === null) await this._showError(this.engine.errorMsg(this.engine.getError()));
            else await this._showResult('f(0) = ' + r.toFixed(8));
        } else if (sel === 2) {
            await this._doCursor();
        }
    }

    async _doClear() {
        const x = Math.round(this.renderer.canvas.width * 0.6);
        const items = ['Clear plot', 'Reset all'];
        const sel = await showPopup(this.renderer, x, this.renderer.py + 20, items);

        if (sel === 0) {
            this.renderer.clearPlot();
            this.renderer.drawAxes();
            this.plotIsEmpty = true;
            this.colorIdx = 0;
        } else if (sel === 1) {
            this.kolFunc = 0;
            this.tekFunc = 0;
            this.funcs = [];
            this.derivOf.fill(0);
            this.discontinuities = [];
            this.colorIdx = 0;
            this.plotIsEmpty = true;
            for (let i = 0; i <= 10; i++) this.engine.del(i);
            this.redrawAll();
        }
    }

    _doInfo() {
        const lines = ['── Functions ──'];
        for (let i = 0; i < this.kolFunc; i++) {
            const marker = (i + 1 === this.tekFunc) ? '→' : ' ';
            lines.push(`${marker}${i+1}. ${this.funcs[i].label} [${this.funcs[i].isPolar ? 'Polar' : 'Cart.'}]`);
        }
        lines.push('');
        lines.push('── Discontinuities ──');
        if (this.discontinuities.length === 0) {
            lines.push('  (none detected)');
        } else {
            lines.push('  ' + this.discontinuities.map(x => x.toFixed(3)).join('  '));
        }
        lines.push('');
        lines.push('Press any key to close');
        this.renderer.drawInfoBox(lines, 'ISGRF Info');
    }

    // ── Slot navigation ────────────────────────────────────────────────────────

    _navigateSlot(delta) {
        this._saveSlot();
        this.tekSlot = Math.max(1, Math.min(NUM_SLOTS, this.tekSlot + delta));
        this._loadSlot();
        this.drawCurrentAxes();
        this.renderer.drawStatusBar(this.xMin, this.xMax, this.yMin, this.yMax, this.tekSlot);
        // Replot current function in new range
        if (this.tekFunc && this.kolFunc) {
            const n = this.tekFunc;
            const evalFn = this._makeEvalFn(n, this.funcs[n-1]?.isPolar);
            this.renderer.plotFunction(evalFn, this._funcColor(this.colorIdx + 1), this.funcs[n-1]?.isPolar);
        }
    }

    // ── Canvas click → menu ────────────────────────────────────────────────────

    _onCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const cx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const cy = (e.clientY - rect.top)  * (this.canvas.height / rect.height);

        // If click is in menu bar row
        if (cy < this.renderer.MENU_H) {
            const ranges = this.renderer.menuItemRanges(MENU_ITEMS);
            for (let i = 0; i < ranges.length; i++) {
                if (cx >= ranges[i].x && cx < ranges[i].x + ranges[i].w) {
                    // Synthesise Enter key for that item
                    this._pendingMenuClick = i;
                    // inject into key queue as a special event
                    if (_keyResolvers.length > 0) {
                        const resolve = _keyResolvers.shift();
                        resolve({ key: '__MENU_CLICK__', menuIdx: i, preventDefault: () => {} });
                    }
                    return;
                }
            }
        }
    }

    // ── Main loop ──────────────────────────────────────────────────────────────

    async run() {
        this.redrawAll();
        await showWelcome(this.renderer);
        this.redrawAll();

        let menuIdx = 0;
        this.menuIdx = menuIdx;

        while (true) {
            this.renderer.drawMenuBar(MENU_ITEMS, menuIdx);
            this.renderer.drawStatusBar(this.xMin, this.xMax, this.yMin, this.yMax, this.tekSlot);

            const e = await waitKey();

            // Mouse click on menu bar
            if (e.key === '__MENU_CLICK__') {
                menuIdx = e.menuIdx;
                this.menuIdx = menuIdx;
                this.renderer.drawMenuBar(MENU_ITEMS, menuIdx);
                await this._handleMenuItem(menuIdx);
                continue;
            }

            if (e.key === 'ArrowLeft')  { menuIdx = (menuIdx + MENU_ITEMS.length - 1) % MENU_ITEMS.length; }
            else if (e.key === 'ArrowRight') { menuIdx = (menuIdx + 1) % MENU_ITEMS.length; }
            else if (e.key === 'PageUp')  { this._navigateSlot(+1); }
            else if (e.key === 'PageDown'){ this._navigateSlot(-1); }
            else if (e.key === 'Escape') {
                // Exit confirmation
                const sel = await showPopup(this.renderer,
                    Math.round(this.canvas.width / 2 - 60),
                    Math.round(this.canvas.height / 2 - 20),
                    ['Yes — reload page', 'No — stay']);
                if (sel === 0) location.reload();
            }
            else if (e.key === 'Enter') {
                await this._handleMenuItem(menuIdx);
            }

            this.menuIdx = menuIdx;
        }
    }

    async _handleMenuItem(idx) {
        switch (idx) {
            case 0: await this._doFunction(); this.redrawAll(); break;
            case 1: await this._doPlot();                       break;
            case 2: await this._doAxes();     this.redrawAll(); break;
            case 3: await this._doScale();                      break;
            case 4: await this._doMisc();                       break;
            case 5: await this._doPoints();                     break;
            case 6: await this._doClear();                      break;
            case 7: this._doInfo(); await waitAnyKey(); this.redrawAll(); break;
        }
        this.renderer.drawMenuBar(MENU_ITEMS, this.menuIdx ?? 0);
        this.renderer.drawStatusBar(this.xMin, this.xMax, this.yMin, this.yMax, this.tekSlot);
    }
}

// Boot
window.addEventListener('DOMContentLoaded', () => { new App(); });
