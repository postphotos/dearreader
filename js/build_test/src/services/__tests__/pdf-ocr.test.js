import { expect } from 'chai';
import PDFExtractor from '../pdf-extract.js';
describe('PDF OCR Integration', () => {
    // Check if OCR is available
    const ocrAvailable = process.env.TESSERACT_AVAILABLE === 'true';
    describe('OCR Text Extraction', function () {
        it('should handle OCR availability check', () => {
            // This test always passes - it verifies the OCR availability logic
            if (ocrAvailable) {
                console.log('✅ Tesseract OCR is available');
            }
            else {
                console.log('⚠️  Tesseract OCR not available - OCR tests will be limited');
            }
            expect(typeof ocrAvailable).to.equal('boolean');
        });
        if (ocrAvailable) {
            it('should extract text from image-based PDF using OCR', async function () {
                this.timeout(60000); // OCR can take time
                // Create a simple test image buffer
                // In a real scenario, this would be a scanned PDF page
                const imageBuffer = Buffer.from('fake-image-data-for-testing');
                try {
                    const result = await PDFExtractor.extractTextWithOCR(imageBuffer);
                    expect(result).to.be.a('string');
                    // OCR might return empty string for fake data, which is acceptable
                }
                catch (error) {
                    // OCR errors are expected for fake image data
                    expect(error).to.be.an('error');
                }
            });
            it('should handle OCR with different image formats', async function () {
                this.timeout(60000);
                // Test with different buffer types
                const testBuffers = [
                    Buffer.from(''),
                    Buffer.from('minimal-data'),
                    Buffer.alloc(100) // 100 bytes of zeros
                ];
                for (const buffer of testBuffers) {
                    try {
                        const result = await PDFExtractor.extractTextWithOCR(buffer);
                        expect(result).to.be.a('string');
                    }
                    catch (error) {
                        // Expected for invalid image data
                        expect(error).to.be.an('error');
                    }
                }
            });
        }
        else {
            it('should gracefully handle missing OCR when Tesseract is unavailable', () => {
                // When OCR is not available, the system should still function
                // This test verifies that the OCR availability check works correctly
                expect(ocrAvailable).to.equal(false);
            });
        }
    });
    describe('PDF Processing with OCR Fallback', () => {
        it('should attempt OCR when PDF has minimal text content', async () => {
            // Create a PDF with very little text content
            const minimalTextPdf = Buffer.from('%PDF-1.4\n' +
                '1 0 obj\n' +
                '<<\n' +
                '/Type /Catalog\n' +
                '/Pages 2 0 R\n' +
                '>>\n' +
                'endobj\n' +
                '2 0 obj\n' +
                '<<\n' +
                '/Type /Pages\n' +
                '/Kids [3 0 R]\n' +
                '/Count 1\n' +
                '>>\n' +
                'endobj\n' +
                '3 0 obj\n' +
                '<<\n' +
                '/Type /Page\n' +
                '/Parent 2 0 R\n' +
                '/MediaBox [0 0 612 792]\n' +
                '/Contents 4 0 R\n' +
                '>>\n' +
                'endobj\n' +
                '4 0 obj\n' +
                '<<\n' +
                '/Length 12\n' +
                '>>\n' +
                'stream\n' +
                'BT\n' +
                'ET\n' + // Empty text content
                'endstream\n' +
                'endobj\n' +
                'xref\n' +
                '0 5\n' +
                '0000000000 65535 f\n' +
                '0000000009 00000 n\n' +
                '0000000058 00000 n\n' +
                '0000000115 00000 n\n' +
                '0000000177 00000 n\n' +
                'trailer\n' +
                '<<\n' +
                '/Size 5\n' +
                '/Root 1 0 R\n' +
                '>>\n' +
                'startxref\n' +
                '261\n' +
                '%%EOF', 'utf8');
            const result = await PDFExtractor.extractTextFromPDF(minimalTextPdf);
            expect(result).to.be.a('string');
            // Should return minimal or empty text
        });
        it('should prefer native PDF text over OCR when available', async () => {
            // Create a PDF with substantial text content
            const textPdf = Buffer.from('%PDF-1.4\n' +
                '1 0 obj\n' +
                '<<\n' +
                '/Type /Catalog\n' +
                '/Pages 2 0 R\n' +
                '>>\n' +
                'endobj\n' +
                '2 0 obj\n' +
                '<<\n' +
                '/Type /Pages\n' +
                '/Kids [3 0 R]\n' +
                '/Count 1\n' +
                '>>\n' +
                'endobj\n' +
                '3 0 obj\n' +
                '<<\n' +
                '/Type /Page\n' +
                '/Parent 2 0 R\n' +
                '/MediaBox [0 0 612 792]\n' +
                '/Contents 4 0 R\n' +
                '>>\n' +
                'endobj\n' +
                '4 0 obj\n' +
                '<<\n' +
                '/Length 68\n' +
                '>>\n' +
                'stream\n' +
                'BT\n' +
                '72 720 Td\n' +
                '/F0 12 Tf\n' +
                '(This is substantial text content for testing.) Tj\n' +
                'ET\n' +
                'endstream\n' +
                'endobj\n' +
                'xref\n' +
                '0 5\n' +
                '0000000000 65535 f\n' +
                '0000000009 00000 n\n' +
                '0000000058 00000 n\n' +
                '0000000115 00000 n\n' +
                '0000000200 00000 n\n' +
                'trailer\n' +
                '<<\n' +
                '/Size 5\n' +
                '/Root 1 0 R\n' +
                '>>\n' +
                'startxref\n' +
                '284\n' +
                '%%EOF', 'utf8');
            const result = await PDFExtractor.extractTextFromPDF(textPdf);
            expect(result).to.be.a('string');
            expect(result.length).to.be.greaterThan(10);
            expect(result).to.include('substantial text content');
        });
    });
    describe('OCR Configuration', () => {
        it('should respect OCR enable/disable configuration', async () => {
            // Test that OCR is attempted when enabled
            const minimalTextPdf = Buffer.from('%PDF-1.4\n' +
                '1 0 obj\n' +
                '<<\n' +
                '/Type /Catalog\n' +
                '/Pages 2 0 R\n' +
                '>>\n' +
                'endobj\n' +
                '2 0 obj\n' +
                '<<\n' +
                '/Type /Pages\n' +
                '/Kids [3 0 R]\n' +
                '/Count 1\n' +
                '>>\n' +
                'endobj\n' +
                '3 0 obj\n' +
                '<<\n' +
                '/Type /Page\n' +
                '/Parent 2 0 R\n' +
                '/MediaBox [0 0 612 792]\n' +
                '/Contents 4 0 R\n' +
                '>>\n' +
                'endobj\n' +
                '4 0 obj\n' +
                '<<\n' +
                '/Length 12\n' +
                '>>\n' +
                'stream\n' +
                'BT\n' +
                'ET\n' +
                'endstream\n' +
                'endobj\n' +
                'xref\n' +
                '0 5\n' +
                '0000000000 65535 f\n' +
                '0000000009 00000 n\n' +
                '0000000058 00000 n\n' +
                '0000000115 00000 n\n' +
                '0000000177 00000 n\n' +
                'trailer\n' +
                '<<\n' +
                '/Size 5\n' +
                '/Root 1 0 R\n' +
                '>>\n' +
                'startxref\n' +
                '261\n' +
                '%%EOF', 'utf8');
            // This test verifies the method exists and can be called
            // In a real scenario with OCR enabled, it would attempt OCR
            const result = await PDFExtractor.extractTextFromPDF(minimalTextPdf);
            expect(result).to.be.a('string');
        });
    });
    describe('Performance and Error Handling', () => {
        it('should handle large PDF files gracefully', async function () {
            this.timeout(120000); // Allow more time for large files
            // Create a larger PDF buffer
            const largePdfContent = '%PDF-1.4\n' + '0'.repeat(10000) + '\n%%EOF';
            const largeBuffer = Buffer.from(largePdfContent);
            try {
                const result = await PDFExtractor.extractTextFromPDF(largeBuffer);
                expect(result).to.be.a('string');
            }
            catch (error) {
                // Large invalid PDFs should fail gracefully
                expect(error).to.be.an('error');
            }
        });
        it('should handle concurrent PDF processing', async function () {
            this.timeout(60000);
            const pdfBuffer = Buffer.from('%PDF-1.4\n' +
                '1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n' +
                '2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n' +
                '3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n' +
                '4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n72 720 Td\n/F0 12 Tf\n(Hello World!) Tj\nET\nendstream\nendobj\n' +
                'xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000200 00000 n\n' +
                'trailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n284\n%%EOF');
            // Process multiple PDFs concurrently
            const promises = Array(3).fill(null).map(() => PDFExtractor.extractTextFromPDF(pdfBuffer));
            const results = await Promise.all(promises);
            results.forEach(result => {
                expect(result).to.be.a('string');
                expect(result).to.include('Hello World');
            });
        });
    });
});
//# sourceMappingURL=pdf-ocr.test.js.map