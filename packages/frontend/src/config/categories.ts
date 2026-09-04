/**
 * File Categories & Theme Configuration
 * Inspired by iLovePDF domain styling and color hierarchy
 */

export interface CategoryTheme {
  id: string;
  name: string;
  shortName: string;
  description: string;
  iconName: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  themeGradient: string;
  borderHover: string;
  headerHoverBg: string;
  featuredTools: string[];
}

export const CATEGORIES_CONFIG: Record<string, CategoryTheme> = {
  pdf: {
    id: 'pdf',
    name: 'PDF Tools',
    shortName: 'PDF',
    description: 'Merge, split, compress, protect, and convert PDF documents',
    iconName: 'FileText',
    accentColor: '#E53E3E',
    badgeBg: 'bg-red-500/10 dark:bg-red-500/20',
    badgeText: 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40',
    themeGradient: 'from-red-500 to-rose-600',
    borderHover: 'hover:border-red-500/50 hover:shadow-red-500/10',
    headerHoverBg: 'hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400',
    featuredTools: ['merge_pdf', 'split_pdf', 'compress_pdf', 'rotate_pdf', 'images_to_pdf', 'password_protect'],
  },
  image: {
    id: 'image',
    name: 'Image Tools',
    shortName: 'Image',
    description: 'Resize, compress, convert, crop, blur, and remove EXIF data',
    iconName: 'Image',
    accentColor: '#00A3C4',
    badgeBg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    badgeText: 'text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/40',
    themeGradient: 'from-cyan-500 to-teal-600',
    borderHover: 'hover:border-cyan-500/50 hover:shadow-cyan-500/10',
    headerHoverBg: 'hover:bg-cyan-50 dark:hover:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400',
    featuredTools: ['resize_image', 'compress_image', 'convert_image', 'crop_image', 'rotate_image', 'remove_exif'],
  },
  document: {
    id: 'document',
    name: 'Word & Docs',
    shortName: 'Word',
    description: 'Convert, extract text, images, and links from Word DOCX files',
    iconName: 'File',
    accentColor: '#2B6CB0',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    badgeText: 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40',
    themeGradient: 'from-blue-600 to-indigo-600',
    borderHover: 'hover:border-blue-500/50 hover:shadow-blue-500/10',
    headerHoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400',
    featuredTools: ['extract_docx_text', 'docx_to_html', 'docx_to_markdown', 'extract_docx_images', 'text_to_docx'],
  },
  spreadsheet: {
    id: 'spreadsheet',
    name: 'Excel & Spreadsheets',
    shortName: 'Excel',
    description: 'Convert Excel to CSV/JSON, merge sheets, clean duplicates, and transpose',
    iconName: 'Table',
    accentColor: '#2F855A',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40',
    themeGradient: 'from-emerald-500 to-green-600',
    borderHover: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10',
    headerHoverBg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400',
    featuredTools: ['excel_to_csv', 'csv_to_excel', 'excel_to_json', 'merge_excel_sheets', 'remove_csv_duplicates'],
  },
  presentation: {
    id: 'presentation',
    name: 'Presentations',
    shortName: 'PowerPoint',
    description: 'Extract text, images, and inspect slide content from PPTX presentations',
    iconName: 'Presentation',
    accentColor: '#DD6B20',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeText: 'text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40',
    themeGradient: 'from-amber-500 to-orange-600',
    borderHover: 'hover:border-amber-500/50 hover:shadow-amber-500/10',
    headerHoverBg: 'hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-600 dark:text-amber-400',
    featuredTools: ['extract_pptx_text', 'extract_pptx_images', 'pptx_slide_count'],
  },
  video: {
    id: 'video',
    name: 'Video & Audio',
    shortName: 'Media',
    description: 'Compress video, extract MP3 audio, trim, convert MKV/MP4/WAV',
    iconName: 'Video',
    accentColor: '#805AD5',
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    badgeText: 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/40',
    themeGradient: 'from-violet-600 to-purple-600',
    borderHover: 'hover:border-purple-500/50 hover:shadow-purple-500/10',
    headerHoverBg: 'hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-600 dark:text-purple-400',
    featuredTools: ['compress_video', 'extract_audio', 'trim_video', 'convert_audio_format', 'video_thumbnail'],
  },
  data: {
    id: 'data',
    name: 'Data & Text',
    shortName: 'Data',
    description: 'JSON, XML, YAML formatters, validators, CSV converters, and Markdown rendering',
    iconName: 'Database',
    accentColor: '#4C51BF',
    badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    badgeText: 'text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40',
    themeGradient: 'from-indigo-600 to-blue-600',
    borderHover: 'hover:border-indigo-500/50 hover:shadow-indigo-500/10',
    headerHoverBg: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400',
    featuredTools: ['json_to_csv', 'csv_to_json', 'json_to_yaml', 'validate_json', 'format_json', 'markdown_to_html'],
  },
  ocr: {
    id: 'ocr',
    name: 'OCR & AI',
    shortName: 'OCR / AI',
    description: 'Extract text from images (OCR), summarize text with AI, and clean metadata',
    iconName: 'Sparkles',
    accentColor: '#D69E2E',
    badgeBg: 'bg-fuchsia-500/10 dark:bg-fuchsia-500/20',
    badgeText: 'text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-200 dark:border-fuchsia-800/40',
    themeGradient: 'from-fuchsia-500 to-pink-600',
    borderHover: 'hover:border-fuchsia-500/50 hover:shadow-fuchsia-500/10',
    headerHoverBg: 'hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/30 text-fuchsia-600 dark:text-fuchsia-400',
    featuredTools: ['image_ocr', 'pdf_ocr', 'ai_summarize', 'ai_translate'],
  },
};
