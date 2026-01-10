import React from 'react';
import {
  Search,
  X,
  Settings,
  Home,
  FolderOpen,
  Folder,
  User,
  Calendar,
  Download,
  RefreshCw,
  Trash2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  Filter,
  Bug,
  Package,
  ArrowUpNarrowWide,
  ArrowDownNarrowWide,
  Moon,
  Sun,
  Check,
  Info,
  Lightbulb,
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  ImagePlus,
  Image,
  Images,
  Plus,
  GripVertical,
  FileSearch,
  BookOpen,
  Send,
  History,
  Copy,
} from 'lucide-react';

const ICONS = {
  search: Search,
  close: X,
  x: X,
  settings: Settings,
  home: Home,
  folder_open: FolderOpen,
  folder: Folder,
  person: User,
  calendar: Calendar,
  download: Download,
  refresh: RefreshCw,
  delete: Trash2,
  trash_2: Trash2,
  check_circle: CheckCircle2,
  chevron_left: ChevronLeft,
  chevron_right: ChevronRight,
  chevron_down: ChevronDown,
  chevron_up: ChevronUp,
  open_in_new: ExternalLink,
  external_link: ExternalLink,
  feedback: MessageSquare,
  filter: Filter,
  bug: Bug,
  chat: MessageSquare,
  package: Package,
  sort_up: ArrowUpNarrowWide,
  sort_down: ArrowDownNarrowWide,
  moon: Moon,
  sun: Sun,
  check: Check,
  copy: Copy,
  info: Info,
  'callout-note': Info,
  'callout-tip': Lightbulb,
  'callout-important': AlertOctagon,
  'callout-warning': AlertTriangle,
  'callout-caution': AlertCircle,
  alert_circle: AlertCircle,
  image: Image,
  image_plus: ImagePlus,
  images: Images,
  plus: Plus,
  grip_vertical: GripVertical,
  file_search: FileSearch,
  book_open: BookOpen,
  send: Send,
  history: History,
};

export default function Icon({ name, size = 18, className = '', strokeWidth = 2, title, ...rest }) {
  const LucideIcon = ICONS[name];
  if (!LucideIcon) return null;
  return (
    <LucideIcon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : 'presentation'}
      {...rest}
    />
  );
}
