const fs = require('fs');
const path = require('path');
const cssDir = path.join(__dirname, 'css', 'main');
const files = ['_base-launcher.css', '_app-layout.css', '_action-modal.css'];
const TARGET_BEZIER = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const MIN_DURATION_MS = 250;
function fluidifyTransitions(content) {
    return content.replace(/transition:\s*([^;]+);/g, (match, transitionValue) => {
        // Split by comma in case there are multiple transitions
        const parts = transitionValue.split(',').map(p => p.trim());
        const newParts = parts.map(part => {
            // A basic transition part looks like: "opacity 0.2s ease" or "transform 0.14s ease"
            // Let's replace 'ease', 'ease-in-out', 'linear' with our cubic-bezier
            let newPart = part.replace(/\bease(-in-out|-out|-in)?\b|\blinear\b/g, TARGET_BEZIER);

            // Also let's boost duration slightly if it's too fast, so the fluidity is noticeable
            newPart = newPart.replace(/(\d*\.?\d+)s/g, (timeMatch, timeVal) => {
                let ms = parseFloat(timeVal) * 1000;
                if (ms < MIN_DURATION_MS && ms > 0) { // Don't touch 0s
                    return (MIN_DURATION_MS / 1000) + 's';
                }
                return timeMatch;
            });
            // If it already had cubic-bezier, but maybe a basic one, leave it or standardize it
            if (newPart.includes('cubic-bezier') && !newPart.includes(TARGET_BEZIER)) {
                newPart = newPart.replace(/cubic-bezier\([^)]+\)/, TARGET_BEZIER);
            }
            return newPart;
        });
        // Also globally add transition for basic interactive things if we want? No, just modify existing ones safely.
        return `transition: ${newParts.join(', ')};`;
    });
}
for (const file of files) {
    const filePath = path.join(cssDir, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = fluidifyTransitions(content);

        // Let's also add global button/link hover transition if not present
        // Actually, the regex above handles everything that already has 'transition:'
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Fluidified ${file}`);
    }
}
