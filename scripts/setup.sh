#!/bin/bash

# DearReader Setup Script
# This script creates the necessary configuration files for DearReader

set -e

echo "🚀 Setting up DearReader configuration files..."
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping .env creation..."
    else
        cp .env.example .env
        echo "✅ Created .env from template"
    fi
else
    cp .env.example .env
    echo "✅ Created .env from template"
fi

# Check if crawl_pipeline.yaml already exists
if [ -f "crawl_pipeline.yaml" ]; then
    echo "⚠️  crawl_pipeline.yaml file already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping crawl_pipeline.yaml creation..."
    else
        # Create a minimal crawl_pipeline.yaml with just the essential structure
        cat > crawl_pipeline.yaml << 'EOF'
# DearReader AI-Enhanced Crawl Pipeline Configuration
# ============================================================================
#
# This file contains all AI provider configurations, models, prompts, and pipelines.
# API keys are loaded from .env file but can be overridden here.
#
# ============================================================================

# ============================================================================
# LLM PROVIDER DEFINITIONS
# ============================================================================
# All AI provider configurations, models, prompts, and settings

llm_providers:
  # OpenAI Provider - Multiple models with RPM limits
  openai-gpt-3.5-turbo:
    api_key: "${OPENAI_API_KEY}"
    base_url: "${OPENAI_BASE_URL:-https://api.openai.com/v1}"
    model: "gpt-3.5-turbo"
    temperature: 0.2
    max_tokens: 2048
    rpm_limit: 3500  # OpenAI Tier 1 limit
    parsing_prompt: "Extract structured data from the following text:"
    prompt_options:
      top_p: 1.0
      frequency_penalty: 0.0
      presence_penalty: 0.0
    request_timeout_ms: 30000
    max_retries: 2

  openai-gpt-4:
    api_key: "${OPENAI_API_KEY}"
    base_url: "${OPENAI_BASE_URL:-https://api.openai.com/v1}"
    model: "gpt-4"
    temperature: 0.1
    max_tokens: 4096
    rpm_limit: 200  # GPT-4 rate limit
    parsing_prompt: "Analyze and extract key information from the following text:"
    prompt_options:
      top_p: 1.0
      frequency_penalty: 0.0
      presence_penalty: 0.0
    request_timeout_ms: 60000
    max_retries: 3

  # OpenRouter Provider - Multiple models
  openrouter-gpt-4:
    api_key: "${OPENROUTER_API_KEY}"
    base_url: "${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1}"
    model: "openai/gpt-4"
    temperature: 0.2
    max_tokens: 4096
    rpm_limit: 100  # OpenRouter limit
    parsing_prompt: "Extract structured data from the following text:"
    prompt_options:
      top_p: 1.0
      frequency_penalty: 0.0
      presence_penalty: 0.0
    request_timeout_ms: 30000
    max_retries: 2

  openrouter-claude:
    api_key: "${OPENROUTER_API_KEY}"
    base_url: "${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1}"
    model: "anthropic/claude-3-haiku"
    temperature: 0.3
    max_tokens: 4096
    rpm_limit: 100  # OpenRouter limit
    parsing_prompt: "Analyze this content and provide insights:"
    prompt_options:
      top_p: 1.0
      frequency_penalty: 0.0
      presence_penalty: 0.0
    request_timeout_ms: 30000
    max_retries: 2

  # Google Gemini Provider
  gemini-pro:
    api_key: "${GEMINI_API_KEY}"
    base_url: "${GEMINI_BASE_URL:-https://generativelanguage.googleapis.com/v1}"
    model: "gemini-pro"
    temperature: 0.2
    max_tokens: 2048
    rpm_limit: 60  # Gemini rate limit
    parsing_prompt: "Extract structured data from the following text:"
    prompt_options:
      top_p: 1.0
      frequency_penalty: 0.0
      presence_penalty: 0.0
    request_timeout_ms: 30000
    max_retries: 2

  gemini-pro-vision:
    api_key: "${GEMINI_API_KEY}"
    base_url: "${GEMINI_BASE_URL:-https://generativelanguage.googleapis.com/v1}"
    model: "gemini-pro-vision"
    temperature: 0.2
    max_tokens: 2048
    rpm_limit: 60  # Gemini rate limit
    parsing_prompt: "Analyze this image and text content:"
    prompt_options:
      top_p: 1.0
      frequency_penalty: 0.0
      presence_penalty: 0.0
    request_timeout_ms: 30000
    max_retries: 2

# ============================================================================
# TASK-SPECIFIC AI MODEL ASSIGNMENTS
# ============================================================================
# Map tasks to specific provider-model combinations

ai_tasks:
  # PDF processing tasks - Use local model for speed, cloud for accuracy
  parse_pdf: "openai-gpt-3.5-turbo"           # Primary: Local model for fast PDF parsing
  parse_pdf_backup: "openrouter-gpt-4"         # Backup: Cloud model for complex PDFs

  # Content validation - Use more capable models
  validate_format: "openrouter-gpt-4"          # Primary: GPT-4 for reliable validation
  validate_format_backup: "openai-gpt-4"       # Backup: OpenAI GPT-4

  # Web crawling and content editing
  edit_crawl: "openrouter-claude"              # Primary: Claude for content enhancement
  edit_crawl_backup: "gemini-pro"              # Backup: Gemini for editing

  # General purpose tasks - Use cost-effective models
  general_chat: "openai-gpt-3.5-turbo"         # Primary: Fast, cheap model
  general_chat_backup: "openrouter-gpt-4"      # Backup: More capable model

  # Code analysis - Use specialized models
  code_analysis: "openrouter-gpt-4"            # Primary: GPT-4 for technical analysis
  code_analysis_backup: "openai-gpt-4"         # Backup: OpenAI GPT-4

  # OCR and document processing
  ocr_processing: "gemini-pro-vision"          # Primary: Vision model for OCR
  ocr_processing_backup: "openrouter-claude"   # Backup: Claude for text analysis

  # Sentiment analysis
  sentiment_analysis: "openrouter-claude"      # Primary: Claude for nuanced analysis
  sentiment_analysis_backup: "gemini-pro"      # Backup: Gemini

  # Content classification
  content_classification: "openai-gpt-3.5-turbo" # Primary: Fast classification
  content_classification_backup: "openrouter-gpt-4" # Backup: More accurate

  # Default fallbacks
  default: "openai-gpt-3.5-turbo"               # Default to fast, local model
  default_backup: "openrouter-gpt-4"           # Default backup to capable cloud model

# ============================================================================
# PROMPT DEFINITIONS
# ============================================================================

prompts:
  # HTML Processing Prompts
  html_to_markdown:
    name: "Convert HTML to Markdown"
    description: "Convert HTML content to clean, readable Markdown format"
    template: |
      Convert the following HTML content to clean, readable Markdown format.
      Preserve all important information, links, and formatting.
      Remove any navigation, ads, or irrelevant content.
      Focus on the main article content.

      HTML Content:
      {content}

      Instructions:
      - Convert headers (h1, h2, etc.) to Markdown headers
      - Convert links to Markdown format [text](url)
      - Preserve code blocks and inline code
      - Keep lists and formatting
      - Remove scripts, styles, and navigation elements
      - Ensure the output is clean and readable

  extract_metadata:
    name: "Extract Content Metadata"
    description: "Extract key metadata from content"
    template: |
      Analyze the following content and extract key metadata.
      Return the information in JSON format.

      Content: {content}

      Extract:
      - title: Main title or headline
      - author: Content author (if available)
      - date: Publication date (if available)
      - description: Brief summary or description
      - keywords: Key topics or tags
      - category: Content category or type
      - language: Content language
      - word_count: Approximate word count

      Return as valid JSON object.

# ============================================================================
# DEFAULT PROCESSING PIPELINES
# ============================================================================

pipelines:
  # HTML Content Pipeline
  html_default:
    name: "HTML Content Processing Pipeline"
    description: "Default pipeline for processing HTML web content"
    content_type: "html"
    stages:
      - name: "crawl_content"
        type: "crawl"
        description: "Crawl and extract HTML content from URL"
        config:
          format: "html"
          include_metadata: true
          include_links: false
          include_images: false
          timeout_ms: 30000
          wait_for_selector: "main, article, .content, body"

      - name: "convert_to_markdown"
        type: "llm_process"
        description: "Convert HTML to clean Markdown"
        llm_provider: "openai-gpt-3.5-turbo"
        prompt: "html_to_markdown"
        config:
          input_field: "content"
          output_field: "markdown_content"
          preserve_links: true
          clean_formatting: true

      - name: "extract_metadata"
        type: "llm_process"
        description: "Extract metadata from content"
        llm_provider: "openai-gpt-3.5-turbo"
        prompt: "extract_metadata"
        config:
          input_field: "markdown_content"
          output_field: "metadata"
          extract_fields: ["title", "author", "date", "description", "keywords", "category"]

      - name: "format_as_json"
        type: "llm_process"
        description: "Format final result as JSON"
        llm_provider: "openai-gpt-3.5-turbo"
        prompt: "json_formatting"
        config:
          combine_fields: ["markdown_content", "metadata", "url", "crawl_timestamp"]
          output_format: "structured_json"

  # PDF Content Pipeline
  pdf_default:
    name: "PDF Content Processing Pipeline"
    description: "Default pipeline for processing PDF documents"
    content_type: "pdf"
    stages:
      - name: "download_pdf"
        type: "crawl"
        description: "Download PDF file from URL"
        config:
          format: "binary"
          include_metadata: true
          timeout_ms: 60000
          max_file_size_mb: 50

      - name: "extract_text"
        type: "pdf_extract"
        description: "Extract text from PDF using pdf-lib"
        config:
          enable_ocr_fallback: false
          extract_tables: false
          preserve_formatting: true
          max_pages: 100

      - name: "quality_check"
        type: "llm_process"
        description: "Check if extracted content makes sense"
        llm_provider: "openai-gpt-3.5-turbo"
        prompt: "pdf_quality_check"
        config:
          input_field: "extracted_text"
          output_field: "quality_assessment"
          quality_threshold: 7.0

      - name: "format_as_json"
        type: "llm_process"
        description: "Format final result as JSON"
        llm_provider: "openai-gpt-3.5-turbo"
        prompt: "json_formatting"
        config:
          combine_fields: ["final_text", "metadata", "quality_assessment", "processing_method"]
          output_format: "structured_json"
EOF
        echo "✅ Created crawl_pipeline.yaml with default configuration"
    fi
else
    # Create a minimal crawl_pipeline.yaml with just the essential structure
    cat > crawl_pipeline.yaml << 'EOF'
# DearReader AI-Enhanced Crawl Pipeline Configuration
# ============================================================================
#
# This file contains all AI provider configurations, models, prompts, and pipelines.
# API keys are loaded from .env file but can be overridden here.
#
# ============================================================================

# ============================================================================
# LLM PROVIDER DEFINITIONS
# ============================================================================
# All AI provider configurations, models, prompts, and settings

llm_providers:
  # OpenAI Provider - Multiple models with RPM limits
  openai-gpt-3.5-turbo:
    api_key: "${OPENAI_API_KEY}"
    base_url: "${OPENAI_BASE_URL:-https://api.openai.com/v1}"
    model: "gpt-3.5-turbo"
    temperature: 0.2
    max_tokens: 2048
    rpm_limit: 3500  # OpenAI Tier 1 limit
    parsing_prompt: "Extract structured data from the following text:"
    prompt_options:
      top_p: 1.0
      frequency_penalty: 0.0
      presence_penalty: 0.0
    request_timeout_ms: 30000
    max_retries: 2

  openai-gpt-4:
    api_key: "${OPENAI_API_KEY}"
    base_url: "${OPENAI_BASE_URL:-https://api.openai.com/v1}"
    model: "gpt-4"
    temperature: 0.1
    max_tokens: 4096
    rpm_limit: 200  # GPT-4 rate limit
    parsing_prompt: "Analyze and extract key information from the following text:"
    prompt_options:
      top_p: 1.0
      frequency_penalty: 0.0
      presence_penalty: 0.0
    request_timeout_ms: 60000
    max_retries: 3

  # OpenRouter Provider - Multiple models
  openrouter-gpt-4:
    api_key: "${OPENROUTER_API_KEY}"
    base_url: "${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1}"
    model: "openai/gpt-4"
    temperature: 0.2
    max_tokens: 4096
    rpm_limit: 100  # OpenRouter limit
    parsing_prompt: "Extract structured data from the following text:"
    prompt_options:
      top_p: 1.0
      frequency_penalty: 0.0
      presence_penalty: 0.0
    request_timeout_ms: 30000
    max_retries: 2

  openrouter-claude:
    api_key: "${OPENROUTER_API_KEY}"
    base_url: "${OPENROUTER_BASE_URL:-https://openrouter.ai/api/v1}"
    model: "anthropic/claude-3-haiku"
    temperature: 0.3
    max_tokens: 4096
    rpm_limit: 100  # OpenRouter limit
    parsing_prompt: "Analyze this content and provide insights:"
    prompt_options:
      top_p: 1.0
      frequency_penalty: 0.0
      presence_penalty: 0.0
    request_timeout_ms: 30000
    max_retries: 2

  # Google Gemini Provider
  gemini-pro:
    api_key: "${GEMINI_API_KEY}"
    base_url: "${GEMINI_BASE_URL:-https://generativelanguage.googleapis.com/v1}"
    model: "gemini-pro"
    temperature: 0.2
    max_tokens: 2048
    rpm_limit: 60  # Gemini rate limit
    parsing_prompt: "Extract structured data from the following text:"
    prompt_options:
      top_p: 1.0
      frequency_penalty: 0.0
      presence_penalty: 0.0
    request_timeout_ms: 30000
    max_retries: 2

  gemini-pro-vision:
    api_key: "${GEMINI_API_KEY}"
    base_url: "${GEMINI_BASE_URL:-https://generativelanguage.googleapis.com/v1}"
    model: "gemini-pro-vision"
    temperature: 0.2
    max_tokens: 2048
    rpm_limit: 60  # Gemini rate limit
    parsing_prompt: "Analyze this image and text content:"
    prompt_options:
      top_p: 1.0
      frequency_penalty: 0.0
      presence_penalty: 0.0
    request_timeout_ms: 30000
    max_retries: 2

# ============================================================================
# TASK-SPECIFIC AI MODEL ASSIGNMENTS
# ============================================================================
# Map tasks to specific provider-model combinations

ai_tasks:
  # PDF processing tasks - Use local model for speed, cloud for accuracy
  parse_pdf: "openai-gpt-3.5-turbo"           # Primary: Local model for fast PDF parsing
  parse_pdf_backup: "openrouter-gpt-4"         # Backup: Cloud model for complex PDFs

  # Content validation - Use more capable models
  validate_format: "openrouter-gpt-4"          # Primary: GPT-4 for reliable validation
  validate_format_backup: "openai-gpt-4"       # Backup: OpenAI GPT-4

  # Web crawling and content editing
  edit_crawl: "openrouter-claude"              # Primary: Claude for content enhancement
  edit_crawl_backup: "gemini-pro"              # Backup: Gemini for editing

  # General purpose tasks - Use cost-effective models
  general_chat: "openai-gpt-3.5-turbo"         # Primary: Fast, cheap model
  general_chat_backup: "openrouter-gpt-4"      # Backup: More capable model

  # Code analysis - Use specialized models
  code_analysis: "openrouter-gpt-4"            # Primary: GPT-4 for technical analysis
  code_analysis_backup: "openai-gpt-4"         # Backup: OpenAI GPT-4

  # OCR and document processing
  ocr_processing: "gemini-pro-vision"          # Primary: Vision model for OCR
  ocr_processing_backup: "openrouter-claude"   # Backup: Claude for text analysis

  # Sentiment analysis
  sentiment_analysis: "openrouter-claude"      # Primary: Claude for nuanced analysis
  sentiment_analysis_backup: "gemini-pro"      # Backup: Gemini

  # Content classification
  content_classification: "openai-gpt-3.5-turbo" # Primary: Fast classification
  content_classification_backup: "openrouter-gpt-4" # Backup: More accurate

  # Default fallbacks
  default: "openai-gpt-3.5-turbo"               # Default to fast, local model
  default_backup: "openrouter-gpt-4"           # Default backup to capable cloud model

# ============================================================================
# PROMPT DEFINITIONS
# ============================================================================

prompts:
  # HTML Processing Prompts
  html_to_markdown:
    name: "Convert HTML to Markdown"
    description: "Convert HTML content to clean, readable Markdown format"
    template: |
      Convert the following HTML content to clean, readable Markdown format.
      Preserve all important information, links, and formatting.
      Remove any navigation, ads, or irrelevant content.
      Focus on the main article content.

      HTML Content:
      {content}

      Instructions:
      - Convert headers (h1, h2, etc.) to Markdown headers
      - Convert links to Markdown format [text](url)
      - Preserve code blocks and inline code
      - Keep lists and formatting
      - Remove scripts, styles, and navigation elements
      - Ensure the output is clean and readable

  extract_metadata:
    name: "Extract Content Metadata"
    description: "Extract key metadata from content"
    template: |
      Analyze the following content and extract key metadata.
      Return the information in JSON format.

      Content: {content}

      Extract:
      - title: Main title or headline
      - author: Content author (if available)
      - date: Publication date (if available)
      - description: Brief summary or description
      - keywords: Key topics or tags
      - category: Content category or type
      - language: Content language
      - word_count: Approximate word count

      Return as valid JSON object.

  # PDF Processing Prompts
  pdf_quality_check:
    name: "PDF Content Quality Check"
    description: "Check if extracted PDF content makes sense and is complete"
    template: |
      Analyze the following extracted PDF content and evaluate its quality.
      Check if the content appears complete, readable, and properly formatted.

      PDF Content:
      {content}

      Evaluate:
      1. Is the content readable and properly formatted?
      2. Does the text appear complete (no missing sections)?
      3. Are there any obvious extraction errors or garbled text?
      4. Is the content in the expected language?
      5. Does the content structure make sense?

      Provide a quality score (1-10) and brief explanation.
      If quality is poor (< 7), recommend OCR processing.

  json_formatting:
    name: "Format as JSON"
    description: "Format processed content as structured JSON"
    template: |
      Format the following processed content into a structured JSON object.

      Content: {content}
      Metadata: {metadata}
      Additional Info: {additional_info}

      Create a JSON structure with:
      - Basic content information
      - Extracted metadata
      - Processing results
      - Quality metrics
      - Timestamps

      Ensure the JSON is valid and well-structured.

# ============================================================================
# DEFAULT PROCESSING PIPELINES
# ============================================================================

pipelines:
  # HTML Content Pipeline
  html_default:
    name: "HTML Content Processing Pipeline"
    description: "Default pipeline for processing HTML web content"
    content_type: "html"
    stages:
      - name: "crawl_content"
        type: "crawl"
        description: "Crawl and extract HTML content from URL"
        config:
          format: "html"
          include_metadata: true
          include_links: false
          include_images: false
          timeout_ms: 30000
          wait_for_selector: "main, article, .content, body"

      - name: "convert_to_markdown"
        type: "llm_process"
        description: "Convert HTML to clean Markdown"
        llm_provider: "openai-gpt-3.5-turbo"
        prompt: "html_to_markdown"
        config:
          input_field: "content"
          output_field: "markdown_content"
          preserve_links: true
          clean_formatting: true

      - name: "extract_metadata"
        type: "llm_process"
        description: "Extract metadata from content"
        llm_provider: "openai-gpt-3.5-turbo"
        prompt: "extract_metadata"
        config:
          input_field: "markdown_content"
          output_field: "metadata"
          extract_fields: ["title", "author", "date", "description", "keywords", "category"]

      - name: "format_as_json"
        type: "llm_process"
        description: "Format final result as JSON"
        llm_provider: "openai-gpt-3.5-turbo"
        prompt: "json_formatting"
        config:
          combine_fields: ["markdown_content", "metadata", "url", "crawl_timestamp"]
          output_format: "structured_json"

  # PDF Content Pipeline
  pdf_default:
    name: "PDF Content Processing Pipeline"
    description: "Default pipeline for processing PDF documents"
    content_type: "pdf"
    stages:
      - name: "download_pdf"
        type: "crawl"
        description: "Download PDF file from URL"
        config:
          format: "binary"
          include_metadata: true
          timeout_ms: 60000
          max_file_size_mb: 50

      - name: "extract_text"
        type: "pdf_extract"
        description: "Extract text from PDF using pdf-lib"
        config:
          enable_ocr_fallback: false
          extract_tables: false
          preserve_formatting: true
          max_pages: 100

      - name: "quality_check"
        type: "llm_process"
        description: "Check if extracted content makes sense"
        llm_provider: "openai-gpt-3.5-turbo"
        prompt: "pdf_quality_check"
        config:
          input_field: "extracted_text"
          output_field: "quality_assessment"
          quality_threshold: 7.0

      - name: "format_as_json"
        type: "llm_process"
        description: "Format final result as JSON"
        llm_provider: "openai-gpt-3.5-turbo"
        prompt: "json_formatting"
        config:
          combine_fields: ["final_text", "metadata", "quality_assessment", "processing_method"]
          output_format: "structured_json"
EOF
    echo "✅ Created crawl_pipeline.yaml with default configuration"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your actual API keys"
echo "2. Optionally customize crawl_pipeline.yaml for your needs"
echo "3. Run the application"
echo ""
echo "📝 Remember:"
echo "- Never commit .env to version control"
echo "- API keys can be overridden in crawl_pipeline.yaml if needed"
echo "- All AI configurations are now in crawl_pipeline.yaml"