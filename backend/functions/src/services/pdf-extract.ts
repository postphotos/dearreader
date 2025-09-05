import { singleton } from 'tsyringe';
import { Logger } from '../shared/index.js';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

export interface PDFExtractionResult {
    text: string;
    pageCount: number;
    metadata?: {
        title?: string;
        author?: string;
        subject?: string;
        creator?: string;
        producer?: string;
        creationDate?: Date;
        modificationDate?: Date;
    };
}

@singleton()
export class PDFExtractor {
    private config: any = {};
    protected logger: Logger;

    constructor() {
        console.log('PDFExtractor constructor called');
        this.logger = new Logger();
        this.loadConfig();
    }

    private loadConfig() {
        try {
            const configPath = path.join(process.cwd(), 'config.yaml');
            if (fs.existsSync(configPath)) {
                const configContent = fs.readFileSync(configPath, 'utf8');
                const fullConfig: any = yaml.load(configContent) || {};
                this.config = fullConfig.pdf || {};
                console.log('PDFExtractor loaded config:', this.config);
            } else {
                console.log('No config.yaml found for PDFExtractor, using defaults');
                this.config = {
                    enable_parsing: true,
                    max_file_size_mb: 50,
                    processing_timeout_seconds: 30,
                    enable_ocr: false,
                    extract_metadata: true,
                    max_pages: 100
                };
            }
        } catch (error) {
            console.error('Error loading config for PDFExtractor:', error);
            this.config = {
                enable_parsing: true,
                max_file_size_mb: 50,
                processing_timeout_seconds: 30,
                enable_ocr: false,
                extract_metadata: true,
                max_pages: 100
            };
        }
    }

    isEnabled(): boolean {
        return this.config.enable_parsing === true;
    }

    async extractFromUrl(url: URL): Promise<PDFExtractionResult | null> {
        console.log('PDFExtractor.extractFromUrl called:', { url: url.toString() });

        if (!this.isEnabled()) {
            console.log('PDF extraction is disabled in config');
            return null;
        }

        try {
            // Check if URL points to a PDF
            if (!this.isPdfUrl(url)) {
                console.log('URL does not appear to be a PDF:', url.toString());
                return null;
            }

            // For now, we'll use a placeholder implementation
            // In a production environment, you would:
            // 1. Download the PDF
            // 2. Use a PDF parsing library like pdf-parse or pdfjs-dist
            // 3. Extract text and metadata

            console.log('PDF extraction not fully implemented yet');
            return {
                text: `[PDF Content from ${url.toString()}]\n\nThis PDF would be extracted here in a full implementation.`,
                pageCount: 1,
                metadata: this.config.extract_metadata ? {
                    title: `PDF Document from ${url.hostname}`,
                    creator: 'DearReader PDF Extractor',
                } : undefined
            };
        } catch (error) {
            this.logger.error('Error extracting PDF:', error);
            return null;
        }
    }

    private isPdfUrl(url: URL): boolean {
        // Check if URL ends with .pdf
        if (url.pathname.toLowerCase().endsWith('.pdf')) {
            return true;
        }

        // Check common PDF viewer patterns
        const pdfPatterns = [
            /\/pdf\//i,
            /\.pdf$/i,
            /\/download.*\.pdf/i,
            /\/view.*\.pdf/i,
        ];

        return pdfPatterns.some(pattern => pattern.test(url.pathname));
    }

    async extractFromBuffer(buffer: Buffer): Promise<PDFExtractionResult | null> {
        console.log('PDFExtractor.extractFromBuffer called with buffer length:', buffer.length);

        if (!this.isEnabled()) {
            console.log('PDF extraction is disabled in config');
            return null;
        }

        // Check file size limit
        const fileSizeMB = buffer.length / (1024 * 1024);
        if (fileSizeMB > this.config.max_file_size_mb) {
            console.log(`PDF file size ${fileSizeMB.toFixed(2)}MB exceeds limit of ${this.config.max_file_size_mb}MB`);
            return null;
        }

        try {
            // Placeholder for PDF buffer extraction
            // In production, use pdf-parse or similar library
            return {
                text: '[PDF Content from buffer]\n\nThis would contain the extracted text from the PDF buffer.',
                pageCount: 1,
                metadata: this.config.extract_metadata ? {
                    title: 'PDF Document',
                    creator: 'DearReader PDF Extractor',
                } : undefined
            };
        } catch (error) {
            this.logger.error('Error extracting PDF from buffer:', error);
            return null;
        }
    }
}
