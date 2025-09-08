import * as pdfjsLib from 'pdfjs-dist';

export default class PDFExtractor {
    static async extractTextFromPDF(buffer: Buffer): Promise<string> {
        try {
            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
            let text = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map((item: any) => item.str).join(' ') + '\n';
            }

            return text;
        } catch (error: any) {
            throw new Error(`Failed to extract text from PDF: ${error?.message || 'Unknown error'}`);
        }
    }
}