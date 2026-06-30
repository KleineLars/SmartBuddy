const fs = require('fs');
const path = require('path');
const sourceFile = 'c:/Users/Lars De Backker/Downloads/SmartBuddy/content-scripts/SmartBuddyGames.js';
const targetDir = 'c:/Users/Lars De Backker/Downloads/SmartBuddy Web';

const sourceCode = fs.readFileSync(sourceFile, 'utf8');

// Extract CSS
const styleStart = sourceCode.indexOf('style.textContent = `') + 21;
const styleEnd = sourceCode.indexOf('`;\n    document.head.appendChild(style);');
let css = sourceCode.substring(styleStart, styleEnd).trim();

// Add iframe-specific adjustments
css += `
/* iFrame adjustments */
body, html { margin: 0; padding: 0; overflow: hidden; background: transparent; }
#sg-games-backdrop { background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(8px); }
#sg-games-overlay { display: flex; opacity: 1; visibility: visible; }
`;

fs.writeFileSync(path.join(targetDir, 'games.css'), css);

// Extract HTML
const htmlStart = sourceCode.indexOf('overlay.innerHTML = `') + 21;
const htmlEnd = sourceCode.indexOf('`;\n    document.body.appendChild(overlay);');
let html = sourceCode.substring(htmlStart, htmlEnd).trim();

const fullHtml = `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SmartBuddy Games</title>
    <link rel="stylesheet" href="games.css">
</head>
<body>
    <div id="sg-games-overlay" class="sg-visible">
        ${html}
    </div>
    <script src="games.js"></script>
</body>
</html>`;

fs.writeFileSync(path.join(targetDir, 'games.html'), fullHtml);

console.log('Extraction complete.');
