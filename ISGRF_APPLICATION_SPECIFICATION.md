# ISGRF Application Specification

## Overview

ISGRF (Investigation of Function Graphs) is a web-based mathematical function plotting and analysis application that replicates the functionality of the original Pascal ISGRF program developed by Dournov P.A. at VoGTU in 1992. This specification provides a comprehensive guide for recreating the application from scratch.

## Table of Contents

1. [Project Architecture](#project-architecture)
2. [Core Features](#core-features)
3. [Technical Requirements](#technical-requirements)
4. [File Structure](#file-structure)
5. [User Interface Design](#user-interface-design)
6. [Functional Components](#functional-components)
7. [Mathematical Engine](#mathematical-engine)
8. [Chart System](#chart-system)
9. [Analysis Tools](#analysis-tools)
10. [User Experience](#user-experience)
11. [Implementation Guidelines](#implementation-guidelines)
12. [Testing Requirements](#testing-requirements)

## Project Architecture

### Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charting**: Chart.js v4.4.0 with zoom plugin
- **Mathematics**: Math.js v11.8.0 for expression parsing and evaluation
- **Build**: No build system required (vanilla JavaScript)
- **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge)

### Application Pattern
- **Modular Architecture**: Separate concerns into distinct modules
- **Class-Based Design**: Object-oriented approach with ES6 classes
- **Event-Driven**: DOM events and custom event system
- **Progressive Enhancement**: Graceful degradation for missing features

## Core Features

### 1. Function Management
- **Multiple Function Support**: Up to 10 simultaneous functions
- **Dynamic Addition/Removal**: Real-time function list management
- **Function Types**: Cartesian (y = f(x)) and Polar (r = f(θ))
- **Derivative Calculation**: Automatic derivative generation
- **Function Validation**: Real-time syntax checking and error reporting

### 2. Mathematical Analysis
- **Root Finding**: Numerical methods for finding zeros
- **Extrema Detection**: Finding local maxima and minima
- **Inflection Points**: Detecting points of concavity change
- **Tangent Lines**: Interactive tangent line construction
- **Integration**: Numerical integration with Simpson's rule
- **Function Intersections**: Finding intersection points between functions

### 3. Interactive Plotting
- **Real-time Rendering**: Immediate plot updates
- **Zoom and Pan**: Interactive navigation with mouse/touch
- **Grid System**: Customizable grid display
- **Axis Control**: Manual and automatic range setting
- **Legend System**: Function identification and color coding

### 4. Coordinate Systems
- **Cartesian Coordinates**: Standard x-y plotting
- **Polar Coordinates**: r-θ plotting with conversion
- **Dynamic Switching**: Runtime coordinate system changes

## Technical Requirements

### Browser Compatibility
- **Minimum**: ES6 support (Chrome 51+, Firefox 54+, Safari 10+, Edge 15+)
- **Optimal**: Modern browsers with Canvas 2D and WebGL support
- **Screen Resolution**: 1024x768 minimum, responsive design

### Performance Requirements
- **Function Evaluation**: 1000+ points per second
- **Real-time Plotting**: <100ms update latency
- **Memory Usage**: <50MB for typical usage
- **Startup Time**: <2 seconds on modern hardware

### Dependencies
```html
<!-- Chart.js with zoom plugin -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
<script src="https://unpkg.com/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js"></script>

<!-- Math.js for expression parsing -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.8.0/math.min.js"></script>
```

## File Structure

```
ISGRF/
├── index.html                 # Main application page
├── style.css                  # Complete styling
├── js/
│   ├── main.js               # Application orchestrator
│   ├── interface.js          # UI management and event handling
│   ├── funcParser.js         # Mathematical expression parser
│   ├── plotter.js           # Chart.js wrapper and plotting logic
│   └── analysis.js          # Mathematical analysis tools
└── assets/                   # Images, icons (optional)
```

## User Interface Design

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│                        Header                                │
├─────────────────────────────────────────────────────────────┤
│  Functions │  View  │ Analysis │ Options │  Help            │
├────────────┴────────┴──────────┴─────────┴──────────────────┤
│ Left Panel                    │         Chart Area           │
│ ┌─────────────────────────┐  │                             │
│ │   Function List         │  │                             │
│ │ • f₁(x) = sin(x)       │  │                             │
│ │ • f₂(x) = x²           │  │         Interactive          │
│ │                         │  │         Function Plot       │
│ │   Add New Function      │  │                             │
│ │ ┌─────────────────────┐ │  │                             │
│ │ │ sin(x) + cos(x)     │ │  │                             │
│ │ └─────────────────────┘ │  │                             │
│ │                         │  │                             │
│ │   Analysis Tools        │  │                             │
│ │ • Find Roots           │  │                             │
│ │ • Find Extrema         │  │                             │
│ │ • Tangent Lines        │  │                             │
│ └─────────────────────────┘  │                             │
└──────────────────────────────┴─────────────────────────────┘
```

### Color Scheme
- **Primary**: #3498db (Chart.js blue)
- **Secondary**: #2c3e50 (Dark blue-gray)
- **Accent**: #e74c3c (Red for errors/important actions)
- **Success**: #27ae60 (Green for valid states)
- **Background**: #f5f5f5 (Light gray)
- **Text**: #333333 (Dark gray)

### Typography
- **Primary Font**: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
- **Header Size**: 1.5em
- **Body Size**: 0.9em
- **Code Font**: 'Courier New', monospace

## Functional Components

### 1. ISGRFApp Class (main.js)
```javascript
class ISGRFApp {
    constructor() {
        this.interface = null;
        this.currentView = {
            xMin: -10, xMax: 10,
            yMin: null, yMax: null,
            points: 1000
        };
    }
    
    // Methods:
    initializeApp()
    setupCoordinateSystem()
    setupRangeInputs()
    setDefaultValues()
}
```

### 2. InterfaceManager Class (interface.js)
```javascript
class InterfaceManager {
    constructor() {
        this.functions = [];
        this.selectedFunction = null;
        this.currentPanel = 'functions';
        this.translations = { /* i18n support */ };
    }
    
    // Core Methods:
    initializeInterface()
    setupEventListeners()
    addFunction(expression, type)
    deleteFunction(index)
    updateFunctionList()
    switchPanel(panelName)
    updateStatus(message)
    showError(message)
    
    // Analysis Methods:
    analyzeFunction(functionIndex)
    findRoots(functionIndex)
    findExtrema(functionIndex)
    findInflectionPoints(functionIndex)
    calculateTangent(functionIndex, xPoint)
    calculateIntegral(functionIndex, xMin, xMax)
}
```

### 3. FunctionParser Class (funcParser.js)
```javascript
class FunctionParser {
    constructor() {
        this.math = math; // Math.js instance
        this.constants = {
            'e': Math.E, 'pi': Math.PI,
            'π': Math.PI, 'E': Math.E, 'PI': Math.PI
        };
    }
    
    // Core Methods:
    parseFunction(expression)
    evaluateFunction(expression, variables)
    validateSyntax(expression)
    preprocessExpression(expression)
    
    // Russian Function Aliases:
    // син → sin, кос → cos, тан → tan, лн → ln
    
    // Advanced Methods:
    calculateDerivative(expression, variable)
    findSymbolicDerivative(expression)
}
```

### 4. ChartManager Class (plotter.js)
```javascript
class ChartManager {
    constructor(canvasId) {
        this.chart = null;
        this.canvasId = canvasId;
        this.datasets = [];
    }
    
    // Core Methods:
    initializeChart()
    updateChart()
    addDataset(name, data, color, type)
    removeDataset(name)
    clearChart()
    
    // Interaction Methods:
    setupZoomPan()
    resetZoom()
    fitToData()
    
    // Coordinate Methods:
    setupCartesianMode()
    setupPolarMode()
    convertPolarToCartesian(rData, thetaData)
}
```

### 5. MathAnalysis Class (analysis.js)
```javascript
class MathAnalysis {
    constructor() {
        this.tolerance = 1e-10;
        this.maxIterations = 1000;
    }
    
    // Numerical Methods:
    integrate(funcStr, a, b, n)       // Simpson's rule
    findRoots(funcStr, xMin, xMax)    // Bisection/Newton-Raphson
    findExtrema(funcStr, xMin, xMax)  // Derivative-based
    findInflectionPoints(funcStr, xMin, xMax)
    findIntersections(func1, func2, xMin, xMax)
    
    // Utility Methods:
    isSignificantPoint(y1, y2, threshold)
    numericalDerivative(funcStr, x, h)
    bisectionMethod(funcStr, a, b)
    newtonRaphsonMethod(funcStr, x0)
}
```

## Mathematical Engine

### Expression Parsing
- **Library**: Math.js for robust expression evaluation
- **Supported Functions**:
  - **Trigonometric**: sin, cos, tan, sec, csc, cot
  - **Inverse Trig**: asin, acos, atan, asec, acsc, acot
  - **Hyperbolic**: sinh, cosh, tanh, sech, csch, coth
  - **Logarithmic**: log (base 10), ln (natural log), log2
  - **Exponential**: exp, pow (^), sqrt, cbrt
  - **Utility**: abs, sign, floor, ceil, round
  - **Constants**: pi, e, infinity

### Russian Function Aliases
For backward compatibility with the original Pascal version:
- син → sin
- кос → cos  
- тан → tan
- лн → ln

### Error Handling
- **Syntax Errors**: Real-time validation with helpful messages
- **Domain Errors**: Graceful handling of undefined values (√(-1), ln(-1))
- **Division by Zero**: Special handling with visual indicators
- **Overflow Protection**: Large number detection and clamping

### Numerical Methods
- **Root Finding**: Bisection method with Newton-Raphson refinement
- **Integration**: Simpson's rule with adaptive subdivision
- **Derivatives**: Central difference approximation
- **Extrema**: Sign change detection in derivative

## Chart System

### Chart.js Configuration
```javascript
const chartConfig = {
    type: 'line',
    data: { datasets: [] },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        scales: {
            x: { 
                type: 'linear',
                display: true,
                title: { display: true, text: 'x' }
            },
            y: {
                type: 'linear', 
                display: true,
                title: { display: true, text: 'y' }
            }
        },
        plugins: {
            zoom: {
                pan: { enabled: true, mode: 'xy' },
                zoom: { wheel: { enabled: true }, mode: 'xy' }
            },
            legend: { display: true },
            tooltip: { 
                mode: 'nearest',
                intersect: false,
                callbacks: {
                    title: (context) => `x = ${context[0].parsed.x.toFixed(4)}`,
                    label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(4)}`
                }
            }
        },
        elements: {
            point: { radius: 0, hitRadius: 5 },
            line: { borderWidth: 2, tension: 0 }
        }
    }
};
```

### Color Management
- **Function Colors**: Distinct colors for up to 10 functions
- **Color Palette**: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#16a085']
- **Special Colors**: 
  - Grid: rgba(200, 200, 200, 0.3)
  - Axes: #333333
  - Analysis points: #ff6b6b

### Performance Optimization
- **Point Reduction**: Intelligent sampling for large datasets
- **Viewport Culling**: Only render visible data points
- **Animation Disabling**: For real-time updates
- **Memory Management**: Dataset cleanup and reuse

## Analysis Tools

### Root Finding Algorithm
```javascript
findRoots(funcStr, xMin, xMax, tolerance = 1e-10) {
    const roots = [];
    const step = (xMax - xMin) / 1000;
    
    for (let x = xMin; x < xMax - step; x += step) {
        const y1 = evaluate(funcStr, x);
        const y2 = evaluate(funcStr, x + step);
        
        // Sign change indicates root
        if (y1 * y2 < 0) {
            const root = bisectionMethod(funcStr, x, x + step, tolerance);
            if (root !== null) roots.push(root);
        }
    }
    
    return removeDuplicates(roots, tolerance);
}
```

### Extrema Detection
```javascript
findExtrema(funcStr, xMin, xMax, tolerance = 1e-6) {
    const derivative = calculateDerivative(funcStr);
    const extrema = findRoots(derivative, xMin, xMax, tolerance);
    
    return extrema.map(x => ({
        x: x,
        y: evaluate(funcStr, x),
        type: classifyExtremum(funcStr, x)
    }));
}
```

### Integration Implementation
```javascript
integrate(funcStr, a, b, n = 1000) {
    // Simpson's rule: (h/3)[f(x₀) + 4f(x₁) + 2f(x₂) + ... + f(xₙ)]
    if (n % 2 === 1) n++; // Ensure even intervals
    
    const h = (b - a) / n;
    let sum = evaluate(funcStr, a) + evaluate(funcStr, b);
    
    for (let i = 1; i < n; i += 2) {
        sum += 4 * evaluate(funcStr, a + i * h);
    }
    for (let i = 2; i < n; i += 2) {
        sum += 2 * evaluate(funcStr, a + i * h);
    }
    
    return (h / 3) * sum;
}
```

## User Experience

### Interaction Patterns
1. **Function Addition**: Type expression → Validate → Add to list → Plot immediately
2. **Analysis**: Select function → Choose analysis type → View results overlaid on chart
3. **Navigation**: Mouse wheel zoom, drag to pan, double-click to reset
4. **Customization**: Menu-driven settings with immediate visual feedback

### Error Handling
- **Invalid Syntax**: Red border on input, tooltip with specific error
- **Domain Errors**: Dotted line segments for undefined regions
- **No Solutions**: Clear message with suggestion to adjust range
- **Performance Issues**: Progress indicators for long calculations

### Accessibility
- **Keyboard Navigation**: Tab order, Enter/Space activation
- **Screen Readers**: ARIA labels and descriptions
- **Color Blindness**: Distinguishable line styles in addition to colors
- **High Contrast**: Respect system preferences

### Responsive Design
- **Mobile**: Collapsible left panel, touch-friendly controls
- **Tablet**: Optimized touch targets, gesture support
- **Desktop**: Full feature set, keyboard shortcuts

## Implementation Guidelines

### Code Organization
1. **Separation of Concerns**: Each class handles specific functionality
2. **Event-Driven Architecture**: Loose coupling through events
3. **Error Boundaries**: Graceful degradation for component failures
4. **Performance First**: Optimize for interactive frame rates

### Development Workflow
1. **Phase 1**: Core plotting and basic function evaluation
2. **Phase 2**: Analysis tools and advanced mathematics
3. **Phase 3**: UI polish and performance optimization
4. **Phase 4**: Testing, accessibility, and browser compatibility

### Best Practices
- **ES6+ Features**: Classes, arrow functions, template literals
- **Modern APIs**: Canvas 2D, requestAnimationFrame, Web Workers (if needed)
- **Progressive Enhancement**: Core functionality without JavaScript
- **Security**: Input sanitization, XSS prevention

### Performance Considerations
- **Function Evaluation**: Cache compiled expressions
- **Chart Updates**: Batch operations, minimize redraws
- **Memory Management**: Clean up event listeners, clear datasets
- **CPU Usage**: Use requestAnimationFrame for animations

## Testing Requirements

### Unit Testing
- **FunctionParser**: Expression parsing accuracy
- **MathAnalysis**: Numerical method precision
- **ChartManager**: Data visualization correctness
- **InterfaceManager**: UI state management

### Integration Testing
- **End-to-End Workflows**: Complete user scenarios
- **Cross-Browser**: Compatibility across target browsers
- **Performance**: Frame rate, memory usage, startup time
- **Accessibility**: Screen reader, keyboard navigation

### Mathematical Validation
- **Known Functions**: Compare against analytical solutions
- **Edge Cases**: Asymptotes, discontinuities, complex domains
- **Precision**: Numerical accuracy within tolerance
- **Convergence**: Algorithm stability and reliability

### User Acceptance Testing
- **Usability**: Task completion rates, error rates
- **Performance**: Perceived responsiveness
- **Compatibility**: Device and browser coverage
- **Educational Value**: Effectiveness for learning mathematics

## Additional Considerations

### Localization Support
- **Text Strings**: Externalized in translation objects
- **Number Formats**: Locale-appropriate decimal separators
- **Mathematical Notation**: Regional variations (e.g., comma vs. period)

### Extensibility
- **Plugin Architecture**: Support for additional analysis tools
- **Custom Functions**: User-defined function library
- **Export Capabilities**: SVG, PNG, CSV data export
- **API Integration**: External mathematical services

### Educational Features
- **Step-by-Step Solutions**: Detailed calculation breakdowns
- **Interactive Tutorials**: Guided exploration of concepts
- **Examples Library**: Pre-built interesting functions
- **Mathematical Reference**: Built-in help for functions and concepts

This specification provides a complete foundation for recreating the ISGRF application with modern web technologies while preserving the mathematical rigor and functionality of the original Pascal version.
