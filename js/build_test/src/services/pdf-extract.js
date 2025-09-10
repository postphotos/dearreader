import * as pdfjsLib from 'pdfjs-dist';
export default class PDFExtractor {
    static async extractTextFromPDF(buffer) {
        try {
            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
            let text = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map((item) => item.str).join(' ') + '\n';
            }
            return text;
        }
        catch (error) {
            throw new Error(`Failed to extract text from PDF: ${error?.message || 'Unknown error'}`);
        }
    }
}
//# sourceMappingURL=pdf-extract.js.map