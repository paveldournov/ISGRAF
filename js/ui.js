// js/ui.js — Async UI primitives: key input, popups, text dialogs

// Global key queue — filled by keydown events on the canvas
let _keyResolvers = [];

function _handleKeyDown(e) {
    if (_keyResolvers.length > 0) {
        const resolve = _keyResolvers.shift();
        resolve(e);
        e.preventDefault();
    }
}

// Attach to a canvas element
function attachKeyboard(canvas) {
    canvas.addEventListener('keydown', _handleKeyDown);
}

// Wait for next keypress
function waitKey() {
    return new Promise(resolve => _keyResolvers.push(resolve));
}

// Wait for any key (used after displaying a message)
async function waitAnyKey() {
    await waitKey();
}

// Wait for a key that is one of the allowed keys (by e.key value)
async function waitKeys(allowed) {
    while (true) {
        const e = await waitKey();
        if (allowed.includes(e.key)) return e;
    }
}

// ── Popup menu ────────────────────────────────────────────────────────────────

// Show a popup menu at (x, y). Returns selected 0-based index, or -1 for Esc.
async function showPopup(renderer, x, y, items, startIdx = 0) {
    const { pw, ph } = renderer.popupSize(items);

    // Clamp to stay on screen
    const W = renderer.canvas.width, H = renderer.canvas.height;
    if (x + pw > W) x = W - pw - 4;
    if (y + ph > H) y = H - ph - 4;

    const saved = renderer.saveArea(x, y, pw + 2, ph + 2);
    let idx = Math.max(0, Math.min(startIdx, items.length - 1));

    renderer.drawPopup(x, y, items, idx);

    while (true) {
        const e = await waitKey();
        const prev = idx;

        switch (e.key) {
            case 'ArrowUp':
                idx = idx > 0 ? idx - 1 : items.length - 1;
                break;
            case 'ArrowDown':
                idx = idx < items.length - 1 ? idx + 1 : 0;
                break;
            case 'Enter':
                renderer.restoreArea(x, y, saved);
                return idx;
            case 'Escape':
                renderer.restoreArea(x, y, saved);
                return -1;
        }

        if (idx !== prev) renderer.drawPopup(x, y, items, idx);
    }
}

// ── Text input dialog ─────────────────────────────────────────────────────────

// Display a prompt and accept text input using the HTML <input> element.
// Returns { value, cancelled }.
function readText(canvas, htmlInput, renderer, cx, cy, maxLen = 29, initial = '') {
    return new Promise(resolve => {
        // Position the HTML input over the canvas at (cx, cy) in CSS pixels
        const rect   = canvas.getBoundingClientRect();
        const scaleX = rect.width  / canvas.width;
        const scaleY = rect.height / canvas.height;

        htmlInput.style.display = 'block';
        htmlInput.style.left    = (rect.left + cx * scaleX) + 'px';
        htmlInput.style.top     = (rect.top  + cy * scaleY - 2) + 'px';
        htmlInput.style.width   = (maxLen * 8 * scaleX) + 'px';
        htmlInput.style.fontSize = Math.round(renderer.FONT_H * scaleY) + 'px';
        htmlInput.maxLength     = maxLen;
        htmlInput.value         = initial;
        htmlInput.focus();

        function done(cancelled) {
            const value = htmlInput.value;
            htmlInput.style.display = 'none';
            canvas.focus();
            resolve({ value, cancelled });
        }

        function onKey(e) {
            if (e.key === 'Enter')  { htmlInput.removeEventListener('keydown', onKey); done(false); }
            if (e.key === 'Escape') { htmlInput.removeEventListener('keydown', onKey); done(true);  }
        }

        htmlInput.addEventListener('keydown', onKey);
    });
}

// ── Mouse click → menu item ───────────────────────────────────────────────────

// Returns a promise that resolves when the canvas is clicked.
function waitClick(canvas) {
    return new Promise(resolve => {
        function handler(e) {
            canvas.removeEventListener('click', handler);
            const rect = canvas.getBoundingClientRect();
            resolve({
                x: (e.clientX - rect.left) * (canvas.width  / rect.width),
                y: (e.clientY - rect.top)  * (canvas.height / rect.height),
            });
        }
        canvas.addEventListener('click', handler);
    });
}

// ── Welcome splash ────────────────────────────────────────────────────────────

async function showWelcome(renderer) {
    renderer.drawInfoBox([
        '',
        '  Welcome to Function Graph Analysis  ',
        '',
        '  Plot and explore mathematical functions  ',
        '  in Cartesian and Polar coordinates.  ',
        '',
        '  Navigate with arrow keys, Enter to select.  ',
        '',
        '  Press any key to continue...  ',
        '',
    ], 'ISGRF v1.0');
    await waitAnyKey();
}
