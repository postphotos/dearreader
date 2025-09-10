@echo off
REM DearReader Setup Script for Windows
REM This script creates the necessary configuration files for DearReader

echo 🚀 Setting up DearReader configuration files...
echo.

REM Check if .env already exists
if exist ".env" (
    echo ⚠️  .env file already exists!
    set /p choice="Do you want to overwrite it? (y/N): "
    if /i "!choice!"=="y" (
        copy .env.example .env >nul
        echo ✅ Created .env from template
    ) else (
        echo Skipping .env creation...
    )
) else (
    copy .env.example .env >nul
    echo ✅ Created .env from template
)

REM Check if crawl_pipeline.yaml already exists
if exist "crawl_pipeline.yaml" (
    echo ⚠️  crawl_pipeline.yaml file already exists!
    set /p choice="Do you want to overwrite it? (y/N): "
    if /i "!choice!"=="y" (
        goto :create_yaml
    ) else (
        echo Skipping crawl_pipeline.yaml creation...
        goto :end
    )
) else (
    goto :create_yaml
)

:create_yaml
REM Create crawl_pipeline.yaml with default configuration
(
echo # DearReader AI-Enhanced Crawl Pipeline Configuration
echo # ============================================================================
echo #
echo # This file contains all AI provider configurations, models, prompts, and pipelines.
echo # API keys are loaded from .env file but can be overridden here.
echo #
echo # ============================================================================
echo.
echo # ============================================================================
echo # LLM PROVIDER DEFINITIONS
echo # ============================================================================
echo # All AI provider configurations, models, prompts, and settings
echo.
echo llm_providers:
echo   # OpenAI Provider - Multiple models with RPM limits
echo   openai-gpt-3.5-turbo:
echo     api_key: "${OPENAI_API_KEY}"
echo     base_url: "${OPENAI_BASE_URL:-https://api.openai.com/v1}"
echo     model: "gpt-3.5-turbo"
echo     temperature: 0.2
echo     max_tokens: 2048
echo     rpm_limit: 3500  # OpenAI Tier 1 limit
echo     parsing_prompt: "Extract structured data from the following text:"
echo     prompt_options:
echo       top_p: 1.0
echo       frequency_penalty: 0.0
echo       presence_penalty: 0.0
echo     request_timeout_ms: 30000
echo     max_retries: 2
echo.
echo   openai-gpt-4:
echo     api_key: "${OPENAI_API_KEY}"
echo     base_url: "${OPENAI_BASE_URL:-https://api.openai.com/v1}"
echo     model: "gpt-4"
echo     temperature: 0.1
echo     max_tokens: 4096
echo     rpm_limit: 200  # GPT-4 rate limit
echo     parsing_prompt: "Analyze and extract key information from the following text:"
echo     prompt_options:
echo       top_p: 1.0
echo       frequency_penalty: 0.0
echo       presence_penalty: 0.0
echo     request_timeout_ms: 60000
echo     max_retries: 3
echo.
echo   # OpenRouter Provider - Multiple models
echo   openrouter-gpt-4:
echo     api_key: "${OPENROUTER_API_KEY}"
echo     base_url: "${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1}"
echo     model: "openai/gpt-4"
echo     temperature: 0.2
echo     max_tokens: 4096
echo     rpm_limit: 100  # OpenRouter limit
echo     parsing_prompt: "Extract structured data from the following text:"
echo     prompt_options:
echo       top_p: 1.0
echo       frequency_penalty: 0.0
echo       presence_penalty: 0.0
echo     request_timeout_ms: 30000
echo     max_retries: 2
echo.
echo   openrouter-claude:
echo     api_key: "${OPENROUTER_API_KEY}"
echo     base_url: "${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1}"
echo     model: "anthropic/claude-3-haiku"
echo     temperature: 0.3
echo     max_tokens: 4096
echo     rpm_limit: 100  # OpenRouter limit
echo     parsing_prompt: "Analyze this content and provide insights:"
echo     prompt_options:
echo       top_p: 1.0
echo       frequency_penalty: 0.0
echo       presence_penalty: 0.0
echo     request_timeout_ms: 30000
echo     max_retries: 2
echo.
echo   # Google Gemini Provider
echo   gemini-pro:
echo     api_key: "${GEMINI_API_KEY}"
echo     base_url: "${GEMINI_BASE_URL:-https://generativelanguage.googleapis.com/v1}"
echo     model: "gemini-pro"
echo     temperature: 0.2
echo     max_tokens: 2048
echo     rpm_limit: 60  # Gemini rate limit
echo     parsing_prompt: "Extract structured data from the following text:"
echo     prompt_options:
echo       top_p: 1.0
echo       frequency_penalty: 0.0
echo       presence_penalty: 0.0
echo     request_timeout_ms: 30000
echo     max_retries: 2
echo.
echo   gemini-pro-vision:
echo     api_key: "${GEMINI_API_KEY}"
echo     base_url: "${GEMINI_BASE_URL:-https://generativelanguage.googleapis.com/v1}"
echo     model: "gemini-pro-vision"
echo     temperature: 0.2
echo     max_tokens: 2048
echo     rpm_limit: 60  # Gemini rate limit
echo     parsing_prompt: "Analyze this image and text content:"
echo     prompt_options:
echo       top_p: 1.0
echo       frequency_penalty: 0.0
echo       presence_penalty: 0.0
echo     request_timeout_ms: 30000
echo     max_retries: 2
echo.
echo # ============================================================================
echo # TASK-SPECIFIC AI MODEL ASSIGNMENTS
echo # ============================================================================
echo # Map tasks to specific provider-model combinations
echo.
echo ai_tasks:
echo   # PDF processing tasks - Use local model for speed, cloud for accuracy
echo   parse_pdf: "openai-gpt-3.5-turbo"           # Primary: Local model for fast PDF parsing
echo   parse_pdf_backup: "openrouter-gpt-4"         # Backup: Cloud model for complex PDFs
echo.
echo   # Content validation - Use more capable models
echo   validate_format: "openrouter-gpt-4"          # Primary: GPT-4 for reliable validation
echo   validate_format_backup: "openai-gpt-4"       # Backup: OpenAI GPT-4
echo.
echo   # Web crawling and content editing
echo   edit_crawl: "openrouter-claude"              # Primary: Claude for content enhancement
echo   edit_crawl_backup: "gemini-pro"              # Backup: Gemini for editing
echo.
echo   # General purpose tasks - Use cost-effective models
echo   general_chat: "openai-gpt-3.5-turbo"         # Primary: Fast, cheap model
echo   general_chat_backup: "openrouter-gpt-4"      # Backup: More capable model
echo.
echo   # Code analysis - Use specialized models
echo   code_analysis: "openrouter-gpt-4"            # Primary: GPT-4 for technical analysis
echo   code_analysis_backup: "openai-gpt-4"         # Backup: OpenAI GPT-4
echo.
echo   # OCR and document processing
echo   ocr_processing: "gemini-pro-vision"          # Primary: Vision model for OCR
echo   ocr_processing_backup: "openrouter-claude"   # Backup: Claude for text analysis
echo.
echo   # Sentiment analysis
echo   sentiment_analysis: "openrouter-claude"      # Primary: Claude for nuanced analysis
echo   sentiment_analysis_backup: "gemini-pro"      # Backup: Gemini
echo.
echo   # Content classification
echo   content_classification: "openai-gpt-3.5-turbo" # Primary: Fast classification
echo   content_classification_backup: "openrouter-gpt-4" # Backup: More accurate
echo.
echo   # Default fallbacks
echo   default: "openai-gpt-3.5-turbo"               # Default to fast, local model
echo   default_backup: "openrouter-gpt-4"           # Default backup to capable cloud model
echo.
echo # ============================================================================
echo # PROMPT DEFINITIONS
echo # ============================================================================
echo.
echo prompts:
echo   # HTML Processing Prompts
echo   html_to_markdown:
echo     name: "Convert HTML to Markdown"
echo     description: "Convert HTML content to clean, readable Markdown format"
echo     template: ^|
echo       Convert the following HTML content to clean, readable Markdown format.
echo       Preserve all important information, links, and formatting.
echo       Remove any navigation, ads, or irrelevant content.
echo       Focus on the main article content.
echo.
echo       HTML Content:
echo       {content}
echo.
echo       Instructions:
echo       - Convert headers (h1, h2, etc.) to Markdown headers
echo       - Convert links to Markdown format [text](url)
echo       - Preserve code blocks and inline code
echo       - Keep lists and formatting
echo       - Remove scripts, styles, and navigation elements
echo       - Ensure the output is clean and readable
echo.
echo   extract_metadata:
echo     name: "Extract Content Metadata"
echo     description: "Extract key metadata from content"
echo     template: ^|
echo       Analyze the following content and extract key metadata.
echo       Return the information in JSON format.
echo.
echo       Content: {content}
echo.
echo       Extract:
echo       - title: Main title or headline
echo       - author: Content author (if available)
echo       - date: Publication date (if available)
echo       - description: Brief summary or description
echo       - keywords: Key topics or tags
echo       - category: Content category or type
echo       - language: Content language
echo       - word_count: Approximate word count
echo.
echo       Return as valid JSON object.
echo.
echo   json_formatting:
echo     name: "Format as JSON"
echo     description: "Format processed content as structured JSON"
echo     template: ^|
echo       Format the following processed content into a structured JSON object.
echo.
echo       Content: {content}
echo       Metadata: {metadata}
echo       Additional Info: {additional_info}
echo.
echo       Create a JSON structure with:
echo       - Basic content information
echo       - Extracted metadata
echo       - Processing results
echo       - Quality metrics
echo       - Timestamps
echo.
echo       Ensure the JSON is valid and well-structured.
echo.
echo # ============================================================================
echo # DEFAULT PROCESSING PIPELINES
echo # ============================================================================
echo.
echo pipelines:
echo   # HTML Content Pipeline
echo   html_default:
echo     name: "HTML Content Processing Pipeline"
echo     description: "Default pipeline for processing HTML web content"
echo     content_type: "html"
echo     stages:
echo       - name: "crawl_content"
echo         type: "crawl"
echo         description: "Crawl and extract HTML content from URL"
echo         config:
echo           format: "html"
echo           include_metadata: true
echo           include_links: false
echo           include_images: false
echo           timeout_ms: 30000
echo           wait_for_selector: "main, article, .content, body"
echo.
echo       - name: "convert_to_markdown"
echo         type: "llm_process"
echo         description: "Convert HTML to clean Markdown"
echo         llm_provider: "openai-gpt-3.5-turbo"
echo         prompt: "html_to_markdown"
echo         config:
echo           input_field: "content"
echo           output_field: "markdown_content"
echo           preserve_links: true
echo           clean_formatting: true
echo.
echo       - name: "extract_metadata"
echo         type: "llm_process"
echo         description: "Extract metadata from content"
echo         llm_provider: "openai-gpt-3.5-turbo"
echo         prompt: "extract_metadata"
echo         config:
echo           input_field: "markdown_content"
echo           output_field: "metadata"
echo           extract_fields: ["title", "author", "date", "description", "keywords", "category"]
echo.
echo       - name: "format_as_json"
echo         type: "llm_process"
echo         description: "Format final result as JSON"
echo         llm_provider: "openai-gpt-3.5-turbo"
echo         prompt: "json_formatting"
echo         config:
echo           combine_fields: ["markdown_content", "metadata", "url", "crawl_timestamp"]
echo           output_format: "structured_json"
echo.
echo   # PDF Content Pipeline
echo   pdf_default:
echo     name: "PDF Content Processing Pipeline"
echo     description: "Default pipeline for processing PDF documents"
echo     content_type: "pdf"
echo     stages:
echo       - name: "download_pdf"
echo         type: "crawl"
echo         description: "Download PDF file from URL"
echo         config:
echo           format: "binary"
echo           include_metadata: true
echo           timeout_ms: 60000
echo           max_file_size_mb: 50
echo.
echo       - name: "extract_text"
echo         type: "pdf_extract"
echo         description: "Extract text from PDF using pdf-lib"
echo         config:
echo           enable_ocr_fallback: false
echo           extract_tables: false
echo           preserve_formatting: true
echo           max_pages: 100
echo.
echo       - name: "format_as_json"
echo         type: "llm_process"
echo         description: "Format final result as JSON"
echo         llm_provider: "openai-gpt-3.5-turbo"
echo         prompt: "json_formatting"
echo         config:
echo           combine_fields: ["final_text", "metadata", "processing_method"]
echo           output_format: "structured_json"
) > crawl_pipeline.yaml
echo ✅ Created crawl_pipeline.yaml with default configuration

:end
echo.
echo 🎉 Setup complete!
echo.
echo Next steps:
echo 1. Edit .env file with your actual API keys
echo 2. Optionally customize crawl_pipeline.yaml for your needs
echo 3. Run the application
echo.
echo 📝 Remember:
echo - Never commit .env to version control
echo - API keys can be overridden in crawl_pipeline.yaml if needed
echo - All AI configurations are now in crawl_pipeline.yaml
echo.
pause