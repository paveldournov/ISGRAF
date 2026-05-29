# ISGRAF — Mathematical Function Grapher

> **Investigation of Function Graphs (Исследование графиков функций)**
>
> A modern Web-based emulation and faithful reconstruction of the classic DOS function graphing application originally developed in Turbo Pascal by **P.A. Dournov** at VoGTU in 1992.

---

### [🚀 Open ISGRAF Web Application](https://paveldournov.github.io/ISGRAF/)

*Click the link above to run the fully functional web application directly in your browser.*

---

## 📸 Interface Preview & Design Aesthetics
ISGRAF emulates the vintage 16-color EGA/VGA Borland Graphics Interface (BGI) color palette and typography with modern responsive web capabilities. It features:
*   An authentic CRT-blue plot canvas with bright yellow axes and high-contrast curves.
*   A classic side panel styled using vintage IDE layout designs (`Courier New` monospaced typography).
*   Double-line borders, retro cursor ticks, and a responsive layout that resizes perfectly on modern screens.

---

## 🌟 Key Features

1.  **Dual Coordinate Graphing**: Supports standard Cartesian ($y = f(x)$) and Polar ($r = f(\theta)$) coordinate spaces. Up to 10 functions can be managed simultaneously.
2.  **Symbolic Differentiation**: Computes exact algebraic derivatives dynamically (e.g., $d/dx[\sin(x)] = \cos(x)$) and plots them as independent curves.
3.  **Step-by-Step Root Finding**: Replicates the exact legacy interactive numerical root-finding algorithms using visual step rendering:
    *   *Newton-Raphson (Tangent) Method*
    *   *Secant (Chord) Method*
    *   *Combined Method*
4.  **Interactive Curve Cursor**: Trace values along any active curve dynamically using the $\leftarrow$ and $\rightarrow$ arrow keys to view precise $(x, y)$ coordinate readouts.
5.  **View State History (Slots)**: Use `PageUp` and `PageDown` keys to navigate through up to 255 previously captured zoom and pan configurations.
6.  **Collapsible Reference Panel**: A newly integrated syntax helper panel directly inside the sidebar, letting users discover all supported operations, constants, and variables and inject them into the active input field with a single click.

---

## 🛠️ Supported Syntax Reference

*   **Operators**: `+` (add), `-` (subtract), `*` (multiply), `/` (divide), `^` (power).
*   **Functions**: `sin(u)`, `cos(u)`, `tg(u)` (tangent), `ln(u)` (natural log), `lg(u)` (log10), `log(u)` (log2).
*   **Constants**: `E` (Euler's number), `P` (Pi / $\pi$).
*   **Variables**: `X` (for Cartesian curves) or `F` (representing the angle $\theta$ for polar curves).
*   *Backward compatibility: Fully supports Russian mathematical aliases (e.g., `син` $\rightarrow$ `sin`).*

---

## 📂 Project Structure

```
ISGRAF/
├── index.html                 # Main web application entry point
├── style.css                  # EGA/VGA-themed retro CSS styling
├── js/
│   ├── app.js                 # Central orchestrator (replicates ISGRF.PAS)
│   ├── mathEngine.js          # Infix-to-tree parser & differentiator (replicates FUNC.PAS)
│   ├── renderer.js            # Canvas BGI graphics drawer (emulates EGAVGA.BGI)
│   └── ui.js                  # Asynchronous keyboard scan primitives
│
└── [Original 1992 DOS Sources]
    ├── ISGRF.PAS              # Original Turbo Pascal main file
    ├── FUNC.PAS               # Original mathematical library unit
    ├── DPALIB.PAS             # Original string utility unit
    ├── EGAVGA.BGI             # Borland EGA/VGA graphics adapter driver
    └── ISGRF.EXE              # Compiled DOS binary
```

---

## 🚀 Running Locally

Since the modernized port is built with pure vanilla HTML5, CSS3, and JavaScript, no build step or node package installations are required!
1. Clone the repository: `git clone https://github.com/paveldournov/ISGRAF.git`
2. Open `index.html` directly in any web browser.

---

## 📜 History & Context
This project serves as a preservation of Russian computer science educational history, showcasing how mathematical software was developed in the early 90s under Turbo Pascal's constraints and how those precise graphics and algorithmic structures can be fully emulated using standard modern web tools.
