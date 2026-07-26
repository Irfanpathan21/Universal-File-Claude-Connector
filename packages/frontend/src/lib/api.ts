/**
 * API Client for the Universal File Toolkit backend.
 */

const API_BASE = '/api';

export interface ApiToolResponse {
  success: boolean;
  outputFiles?: {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    downloadUrl: string;
  }[];
  metadata?: Record<string, unknown>;
  message?: string;
  duration?: number;
  error?: { code: string; message: string; details?: Record<string, unknown> };
}

export interface ToolInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  inputFormats: string[];
  outputFormats: string[];
  maxFiles: number;
  maxFileSize: number;
  parameters: ToolParameter[];
  tags: string[];
}

export interface ToolParameter {
  name: string;
  type: string;
  label: string;
  description: string;
  required: boolean;
  default?: unknown;
  options?: { label: string; value: string | number }[];
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
}

export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  toolCount: number;
}

// ── Fetch helpers ────────────────────────────────────────────

export async function fetchTools(query?: string, category?: string): Promise<{ tools: ToolInfo[]; categories: CategoryInfo[] }> {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (category) params.set('category', category);

  const res = await fetch(`${API_BASE}/tools?${params}`);
  const data = await res.json();
  return data;
}

export async function fetchTool(id: string): Promise<ToolInfo> {
  const res = await fetch(`${API_BASE}/tools/${id}`);
  const data = await res.json();
  return data.tool;
}

export async function fetchCategories(): Promise<CategoryInfo[]> {
  const res = await fetch(`${API_BASE}/categories`);
  const data = await res.json();
  return data.categories;
}

export async function processTool(
  toolId: string,
  files: File[],
  params: Record<string, string> = {},
  onProgress?: (progress: number) => void
): Promise<ApiToolResponse> {
  const formData = new FormData();

  for (const file of files) {
    formData.append('file', file);
  }

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      formData.append(key, value);
    }
  }

  // Determine the API endpoint from the tool ID
  const endpoint = getToolEndpoint(toolId);

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Processing failed');
  }

  return data;
}

export function getDownloadUrl(url: string): string {
  return url;
}

function getToolEndpoint(toolId: string): string {
  const endpointMap: Record<string, string> = {
    // PDF
    merge_pdf: '/pdf/merge',
    split_pdf: '/pdf/split',
    compress_pdf: '/pdf/compress',
    rotate_pdf: '/pdf/rotate',
    extract_pages: '/pdf/extract-pages',
    delete_pages: '/pdf/delete-pages',
    rearrange_pages: '/pdf/rearrange',
    extract_text: '/pdf/extract-text',
    add_watermark: '/pdf/watermark',
    add_page_numbers: '/pdf/page-numbers',
    password_protect: '/pdf/protect',
    pdf_metadata: '/pdf/metadata',
    images_to_pdf: '/pdf/from-images',
    pdf_to_docx: '/pdf/to-docx',
    pdf_to_html: '/pdf/to-html',
    pdf_to_images: '/pdf/extract-images',
    duplicate_pages: '/pdf/duplicate-pages',
    swap_pages: '/pdf/swap-pages',
    reverse_pages: '/pdf/reverse-pages',
    edit_pdf_metadata: '/pdf/edit-metadata',
    flatten_pdf_form: '/pdf/flatten-form',
    pdf_to_txt: '/pdf/to-txt',
    txt_to_pdf: '/pdf/from-txt',
    validate_pdf: '/pdf/validate',
    // Image
    resize_image: '/image/resize',
    crop_image: '/image/crop',
    rotate_image: '/image/rotate',
    flip_image: '/image/flip',
    compress_image: '/image/compress',
    convert_image: '/image/convert',
    image_blur: '/image/blur',
    image_sharpen: '/image/sharpen',
    image_adjust: '/image/adjust',
    image_grayscale: '/image/grayscale',
    image_metadata: '/image/metadata',
    remove_exif: '/image/remove-exif',
    generate_thumbnail: '/image/thumbnail',
    batch_resize: '/image/batch-resize',
    invert_image: '/image/invert',
    gamma_image: '/image/gamma',
    threshold_image: '/image/threshold',
    dominant_colors: '/image/dominant-colors',
    trim_transparent_edges: '/image/trim',
    // Data
    json_to_csv: '/data/json-to-csv',
    csv_to_json: '/data/csv-to-json',
    json_to_xml: '/data/json-to-xml',
    xml_to_json: '/data/xml-to-json',
    json_to_yaml: '/data/json-to-yaml',
    yaml_to_json: '/data/yaml-to-json',
    validate_json: '/data/validate-json',
    format_json: '/data/format-json',
    minify_json: '/data/minify-json',
    format_xml: '/data/format-xml',
    markdown_to_html: '/data/markdown-to-html',
    html_to_markdown: '/data/html-to-markdown',
    // Document
    extract_docx_text: '/document/extract-text',
    docx_to_html: '/document/to-html',
    extract_docx_images: '/document/extract-images',
    extract_docx_hyperlinks: '/document/extract-links',
    docx_to_markdown: '/document/to-markdown',
    text_to_docx: '/document/from-text',
    merge_docx: '/document/merge',
    replace_text_docx: '/document/replace-text',
    extract_docx_comments: '/document/comments',
    word_count_docx: '/document/word-count',
    // Spreadsheet
    excel_to_csv: '/spreadsheet/excel-to-csv',
    csv_to_excel: '/spreadsheet/csv-to-excel',
    json_to_excel: '/spreadsheet/json-to-excel',
    excel_to_json: '/spreadsheet/excel-to-json',
    excel_to_html: '/spreadsheet/to-html',
    merge_excel_sheets: '/spreadsheet/merge-sheets',
    remove_csv_duplicates: '/spreadsheet/remove-duplicates',
    transpose_sheet: '/spreadsheet/transpose',
    protect_workbook: '/spreadsheet/protect',
    split_workbook: '/spreadsheet/split',
    find_replace_excel: '/spreadsheet/replace-cells',
    workbook_statistics: '/spreadsheet/stats',
    // Presentation
    extract_pptx_text: '/presentation/extract-text',
    extract_pptx_notes: '/presentation/extract-notes',
    extract_pptx_images: '/presentation/extract-images',
    pptx_to_html: '/presentation/to-html',
    read_pptx_metadata: '/presentation/metadata',
    // Text Analysis
    word_count: '/text/word-count',
    // Archive (Phase 3 & 4)
    create_zip: '/archive/create-zip',
    extract_zip: '/archive/extract-zip',
    list_archive_contents: '/archive/list-contents',
    compress_gzip: '/archive/compress-gzip',
    decompress_gzip: '/archive/decompress-gzip',
    // Audio (Phase 3)
    convert_audio: '/audio/convert',
    extract_audio_from_video: '/audio/extract-from-video',
    trim_audio: '/audio/trim',
    change_audio_speed: '/audio/change-speed',
    audio_to_waveform: '/audio/waveform',
    // Video (Phase 3)
    compress_video: '/video/compress',
    generate_video_thumbnail: '/video/thumbnail',
    video_to_gif: '/video/to-gif',
    gif_to_video: '/video/from-gif',
    trim_video: '/video/trim',
    mute_video: '/video/mute',
    // OCR & Utility (Phase 4)
    extract_text_from_image_ocr: '/ocr/image-ocr',
    hash_file: '/hash',
    // AI Tools (Phase 4)
    summarize_text: '/ai/summarize',
    extract_keywords: '/ai/extract-keywords',
    sentiment_analysis: '/ai/sentiment',
  };

  return endpointMap[toolId] || `/${toolId.replace(/_/g, '-')}`;
}
