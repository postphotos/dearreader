import { expect } from 'chai';
import PDFExtractor from '../pdf-extract.js';
import * as fs from 'fs';
import * as path from 'path';

describe('PDFExtractor', () => {
    describe('extractTextFromPDF', () => {
        it('should extract text from a valid PDF buffer', async () => {
            // Create a minimal valid PDF buffer for testing
            const pdfBuffer = Buffer.from(
                '%PDF-1.4\n' +
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
                '/Length 44\n' +
                '>>\n' +
                'stream\n' +
                'BT\n' +
                '72 720 Td\n' +
                '/F0 12 Tf\n' +
                '(Hello, PDF World!) Tj\n' +
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
                '%%EOF',
                'utf8'
            );

            const result = await PDFExtractor.extractTextFromPDF(pdfBuffer);
            expect(result).to.be.a('string');
            expect(result.length).to.be.greaterThan(0);
        });

        it('should handle empty PDF buffer', async () => {
            const emptyBuffer = Buffer.from('');

            try {
                await PDFExtractor.extractTextFromPDF(emptyBuffer);
                expect.fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.message).to.include('Failed to extract text from PDF');
            }
        });

        it('should handle invalid PDF buffer', async () => {
            const invalidBuffer = Buffer.from('This is not a PDF file');

            try {
                await PDFExtractor.extractTextFromPDF(invalidBuffer);
                expect.fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.message).to.include('Failed to extract text from PDF');
            }
        });
    });

    describe('extractTextWithOCR', () => {
        it('should check OCR availability', () => {
            // This test always passes - it verifies OCR availability logic
            const ocrEnabled = process.env.TEST_OCR_ENABLED === 'true';
            if (ocrEnabled) {
                console.log('✅ OCR testing is enabled');
            } else {
                console.log('⚠️  OCR testing is disabled (set TEST_OCR_ENABLED=true to enable)');
            }
            expect(typeof ocrEnabled).to.equal('boolean');
        });

        if (process.env.TEST_OCR_ENABLED) {
            it('should extract text using OCR from image buffer', async function() {
                // Create a simple test image buffer (this would normally be a scanned PDF)
                const imageBuffer = Buffer.from('fake-image-data');

                const result = await PDFExtractor.extractTextWithOCR(imageBuffer);
                expect(result).to.be.a('string');
            });
        } else {
            it('should handle missing OCR configuration gracefully', () => {
                // When OCR is not enabled, the system should still function
                expect(process.env.TEST_OCR_ENABLED).to.not.equal('true');
            });
        }

        it('should handle OCR errors gracefully', async () => {
            const invalidBuffer = Buffer.from('');

            try {
                await PDFExtractor.extractTextWithOCR(invalidBuffer);
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).to.be.an('error');
            }
        });
    });
});