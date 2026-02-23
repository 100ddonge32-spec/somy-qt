const fs = require('fs');
const file = './src/app/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const startMarker = '{/* 설정 모달 */}';
const targetIndex = content.indexOf(startMarker);
if (targetIndex !== -1) {
    const endMarker = '{/* Character Section */}';
    const endIndex = content.indexOf(endMarker);
    if (endIndex !== -1) {
        let rawModal = content.substring(targetIndex, endIndex).trim();
        // The modal starts with '{/* 설정 모달 */}\n{showSettings && ('
        // and ends with ')}'
        let innerModal = rawModal
            .replace(/^\{\/\* 설정 모달 \*\/\}\n\s*\{showSettings && \(/m, '') // remove prefix
            .replace(/\)\}$/, ''); // remove suffix ')}'

        const newFunc = `
    const renderSettingsModal = () => {
        if (!showSettings) return null;
        return (
            ${innerModal}
        );
    };
`;

        // Remove old block
        content = content.substring(0, targetIndex) + '\n                    ' + content.substring(endIndex);

        // Insert newFunc right before `// 최종 렌더링`
        const finalRenderMarker = '// 최종 렌더링';
        const finalRenderIndex = content.indexOf(finalRenderMarker);
        content = content.substring(0, finalRenderIndex) + newFunc + '\n    ' + content.substring(finalRenderIndex);

        // Add to main return (insert {renderSettingsModal()} after {renderContent()})
        const renderContentMarker = '{renderContent()}';
        const renderContentIndex = content.indexOf(renderContentMarker);
        content = content.substring(0, renderContentIndex + renderContentMarker.length) + '\n            {renderSettingsModal()}' + content.substring(renderContentIndex + renderContentMarker.length);

        fs.writeFileSync(file, content, 'utf8');
        console.log("Modal extracted successfully.");
    }
}
