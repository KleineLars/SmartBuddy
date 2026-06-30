const fs = require('fs');
const path = require('path');
const sourceFile = 'c:/Users/Lars De Backker/Downloads/SmartBuddy/content-scripts/SmartBuddyGames.js';
const targetDir = 'c:/Users/Lars De Backker/Downloads/SmartBuddy Web';

const sourceCode = fs.readFileSync(sourceFile, 'utf8');

// Extract CSS using Regex
const styleMatch = sourceCode.match(/style\.textContent\s*=\s*`([\s\S]*?)`;\s*document\.head\.appendChild\(style\);/);
let css = styleMatch ? styleMatch[1].trim() : '/* CSS ERROR */';

// Add iframe-specific adjustments
css += `
/* iFrame adjustments */
body, html { margin: 0; padding: 0; background: transparent; height: 100vh; width: 100vw; }
#sg-games-backdrop { background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(8px); }
#sg-games-overlay { display: flex !important; opacity: 1 !important; visibility: visible !important; }
`;

fs.writeFileSync(path.join(targetDir, 'games.css'), css);

// Extract HTML using Regex
const htmlMatch = sourceCode.match(/overlay\.innerHTML\s*=\s*`([\s\S]*?)`;\s*document\.body\.appendChild\(overlay\);/);
let html = htmlMatch ? htmlMatch[1].trim() : '<!-- HTML ERROR -->';

const fullHtml = `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SmartBuddy Games</title>
    <link rel="stylesheet" href="games.css">
    <style>
      /* Ensure the background is transparent */
      body { background-color: transparent !important; }
    </style>
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
