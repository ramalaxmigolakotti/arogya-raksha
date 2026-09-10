'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Upload, Image as ImageIcon, Video, Trash2, X, Play, Pause,
  ZoomIn, Download, ChevronLeft, ChevronRight, Camera, Film,
  Eye, Clock, HardDrive, Sparkles, GripVertical, Search,
  Filter, Grid3X3, LayoutList, RefreshCw, AlertCircle, CheckCircle2,
  CloudUpload, FileImage, FileVideo
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import api from '@/lib/api';

/* ─── Types ─── */
interface MediaItem {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  media_type: 'image' | 'video';
  url: string;
  thumbnail_url?: string;
  public_id: string;
  title: string;
  description: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  duration?: number;
  created_at: string;
}

/* ─── Helpers ─── */
function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function MediaGalleryPage() {
  const { t, language } = useLanguage();
  /* ── State ── */
  const [myMedia, setMyMedia] = useState<MediaItem[]>([]);
  const [doctorGallery, setDoctorGallery] = useState<MediaItem[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'gallery'>('my');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadFile, setUploadFile] = useState<{ data: string; type: 'image' | 'video'; name: string } | null>(null);
  const [uploadPreview, setUploadPreview] = useState('');

  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Toast helper ── */
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  /* ── Fetch ── */
  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const [myRes, galleryRes] = await Promise.all([
        api.getMyMedia(),
        api.getDoctorGallery(),
      ]);
      if (myRes.success) setMyMedia(myRes.media || []);
      if (galleryRes.success) setDoctorGallery(galleryRes.media || []);
    } catch {
      showToast('Failed to load media', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  /* ── Compress image using canvas ── */
  const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context failed'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  /* ── File selection ── */
  const handleFileSelect = async (file: File) => {
    if (!file) return;
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isVideo && !isImage) {
      showToast('Unsupported file type. Please upload an image or video.', 'error');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showToast('File too large. Maximum size is 50MB.', 'error');
      return;
    }

    if (isImage) {
      // Compress images before upload to avoid timeout
      try {
        const compressed = await compressImage(file);
        setUploadFile({ data: compressed, type: 'image', name: file.name });
        setUploadPreview(compressed);
        setShowUploadModal(true);
      } catch {
        showToast('Failed to process image.', 'error');
      }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setUploadFile({ data: dataUrl, type: 'video', name: file.name });
        setUploadPreview(dataUrl);
        setShowUploadModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  /* ── Drag & Drop ── */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  /* ── Upload ── */
  const handleUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);
    setUploadProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setUploadProgress(p => Math.min(p + Math.random() * 15, 90));
    }, 300);

    try {
      const res = await api.uploadMedia({
        fileData: uploadFile.data,
        mediaType: uploadFile.type,
        title: uploadTitle,
        description: uploadDesc,
      });

      clearInterval(interval);
      setUploadProgress(100);

      if (res.success) {
        showToast('Media uploaded successfully!', 'success');
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadPreview('');
        setUploadTitle('');
        setUploadDesc('');
        fetchMedia();
      } else {
        showToast(res.message || 'Upload failed', 'error');
      }
    } catch {
      clearInterval(interval);
      showToast('Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this media?')) return;
    try {
      const res = await api.deleteMedia(id);
      if (res.success) {
        showToast('Media deleted', 'success');
        fetchMedia();
      } else {
        showToast(res.message || 'Delete failed', 'error');
      }
    } catch {
      showToast('Delete failed', 'error');
    }
  };

  /* ── Lightbox navigation ── */
  const currentList = activeTab === 'my' ? myMedia : doctorGallery;
  const lightboxIndex = lightboxItem ? currentList.findIndex(m => m.id === lightboxItem.id) : -1;

  const lightboxPrev = () => {
    if (lightboxIndex > 0) setLightboxItem(currentList[lightboxIndex - 1]);
  };
  const lightboxNext = () => {
    if (lightboxIndex < currentList.length - 1) setLightboxItem(currentList[lightboxIndex + 1]);
  };

  /* ── Filtered list ── */
  const displayList = (activeTab === 'my' ? myMedia : doctorGallery).filter(m => {
    if (filterType !== 'all' && m.media_type !== filterType) return false;
    if (searchQuery && !m.title?.toLowerCase().includes(searchQuery.toLowerCase()) && !m.user_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  /* ── Stats ── */
  const totalImages = myMedia.filter(m => m.media_type === 'image').length;
  const totalVideos = myMedia.filter(m => m.media_type === 'video').length;
  const totalSize = myMedia.reduce((sum, m) => sum + (m.bytes || 0), 0);

  /* ================================================================
     RENDER
     ================================================================ */
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-500 pb-12">
      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold animate-in slide-in-from-right-8 duration-300 ${
          toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {toast.message}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-violet-500/30">
            <Camera className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Media Gallery</h1>
            <p className="text-sm text-slate-500 font-medium">Upload & manage your medical photos and videos</p>
          </div>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-violet-500/25 transition-all hover:-translate-y-0.5"
        >
          <CloudUpload className="h-4 w-4" /> Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); e.target.value = ''; }}
        />
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={FileImage} label="Images" value={totalImages.toString()} color="sky" />
        <StatCard icon={FileVideo} label="Videos" value={totalVideos.toString()} color="amber" />
        <StatCard icon={HardDrive} label="Storage Used" value={formatBytes(totalSize)} color="violet" />
      </div>

      {/* ── Drop zone ── */}
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer group ${
          dragOver
            ? 'border-violet-400 bg-violet-50 scale-[1.01]'
            : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/30'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`p-4 rounded-2xl transition-all ${dragOver ? 'bg-violet-100' : 'bg-slate-100 group-hover:bg-violet-100'}`}>
            <Upload className={`h-8 w-8 transition-colors ${dragOver ? 'text-violet-500' : 'text-slate-400 group-hover:text-violet-500'}`} />
          </div>
          <div>
            <p className="text-base font-bold text-slate-700">Drag & drop files here</p>
            <p className="text-sm text-slate-400 mt-1">
              or <span className="text-violet-500 font-semibold">browse files</span> — Images & videos up to 50MB
            </p>
          </div>
        </div>
      </div>

      {/* ── Tabs & Filters ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Tab switcher */}
        <div className="flex bg-slate-100 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'my'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            My Uploads
          </button>
          <button
            onClick={() => setActiveTab('gallery')}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'gallery'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Doctor Gallery
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 w-48 transition-all"
            />
          </div>

          {/* Type filter */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {(['all', 'image', 'video'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all capitalize ${
                  filterType === type
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {type === 'all' ? 'All' : type === 'image' ? '📷' : '🎥'} {type}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
            >
              <Grid3X3 className="h-4 w-4 text-slate-600" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm' : ''}`}
            >
              <LayoutList className="h-4 w-4 text-slate-600" />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchMedia}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Gallery ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading media...</p>
          </div>
        </div>
      ) : displayList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-slate-100 p-5 rounded-2xl mb-4">
            <Camera className="h-10 w-10 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">No media found</h3>
          <p className="text-sm text-slate-400 max-w-sm">
            {activeTab === 'my'
              ? 'Upload your first photo or video to get started!'
              : 'No doctor media available yet.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayList.map(item => (
            <MediaCard
              key={item.id}
              item={item}
              onView={() => setLightboxItem(item)}
              onDelete={activeTab === 'my' ? () => handleDelete(item.id) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {displayList.map(item => (
            <MediaListItem
              key={item.id}
              item={item}
              onView={() => setLightboxItem(item)}
              onDelete={activeTab === 'my' ? () => handleDelete(item.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* ── Upload Modal ── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="bg-violet-100 p-2 rounded-xl">
                  <CloudUpload className="h-5 w-5 text-violet-500" />
                </div>
                <h2 className="text-lg font-bold text-slate-800">Upload Media</h2>
              </div>
              <button onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadPreview(''); }}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Preview */}
            <div className="px-6 py-4 space-y-4">
              {uploadPreview && (
                <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                  {uploadFile?.type === 'video' ? (
                    <video src={uploadPreview} controls className="w-full max-h-60 object-contain" />
                  ) : (
                    <img src={uploadPreview} alt="Preview" className="w-full max-h-60 object-contain" />
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-slate-500">
                {uploadFile?.type === 'video' ? <Film className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                <span className="font-medium">{uploadFile?.name}</span>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  placeholder="Give your upload a title..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  value={uploadDesc}
                  onChange={e => setUploadDesc(e.target.value)}
                  placeholder="Add a description..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all resize-none"
                />
              </div>

              {/* Progress bar */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>Uploading...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowUploadModal(false); setUploadFile(null); setUploadPreview(''); }}
                disabled={uploading}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-violet-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {uploading ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="h-4 w-4" /> Upload</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxItem && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setLightboxItem(null)}>
          {/* Close */}
          <button className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            onClick={() => setLightboxItem(null)}>
            <X className="h-6 w-6" />
          </button>

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              onClick={e => { e.stopPropagation(); lightboxPrev(); }}>
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Next */}
          {lightboxIndex < currentList.length - 1 && (
            <button className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              onClick={e => { e.stopPropagation(); lightboxNext(); }}>
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Content */}
          <div className="max-w-5xl max-h-[85vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
            {lightboxItem.media_type === 'video' ? (
              <video src={lightboxItem.url} controls autoPlay className="max-h-[70vh] rounded-xl shadow-2xl" />
            ) : (
              <img src={lightboxItem.url} alt={lightboxItem.title} className="max-h-[70vh] rounded-xl shadow-2xl object-contain" />
            )}

            {/* Info bar */}
            <div className="mt-4 bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl text-white flex items-center gap-6">
              <span className="font-bold text-sm">{lightboxItem.title || 'Untitled'}</span>
              <span className="text-xs text-white/60">by {lightboxItem.user_name}</span>
              <span className="text-xs text-white/60">{lightboxItem.width}×{lightboxItem.height}</span>
              <span className="text-xs text-white/60">{formatBytes(lightboxItem.bytes)}</span>
              <span className="text-xs text-white/60">{timeAgo(lightboxItem.created_at)}</span>
              <a href={lightboxItem.url} target="_blank" rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1 text-xs font-bold text-violet-300 hover:text-violet-200 transition-colors">
                <Download className="h-3.5 w-3.5" /> Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   SUB-COMPONENTS
   ================================================================ */

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colorMap: Record<string, { bg: string; icon: string; ring: string }> = {
    sky: { bg: 'bg-sky-50', icon: 'text-sky-500', ring: 'ring-sky-200' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-500', ring: 'ring-amber-200' },
    violet: { bg: 'bg-violet-50', icon: 'text-violet-500', ring: 'ring-violet-200' },
  };
  const c = colorMap[color] || colorMap.violet;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/30 flex items-center gap-4 hover:shadow-xl transition-shadow">
      <div className={`${c.bg} p-3 rounded-xl ring-2 ${c.ring}`}>
        <Icon className={`h-5 w-5 ${c.icon}`} />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-slate-900">{value}</p>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

function MediaCard({ item, onView, onDelete }: { item: MediaItem; onView: () => void; onDelete?: () => void }) {
  return (
    <div className="group relative bg-white rounded-2xl border border-slate-100 shadow-md shadow-slate-200/20 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      {/* Thumbnail */}
      <div className="relative aspect-square bg-slate-100 overflow-hidden cursor-pointer" onClick={onView}>
        {item.media_type === 'video' ? (
          <>
            {item.thumbnail_url ? (
              <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                <Film className="h-12 w-12 text-slate-500" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/20 backdrop-blur-md p-3 rounded-full group-hover:scale-110 transition-transform">
                <Play className="h-6 w-6 text-white fill-white" />
              </div>
            </div>
            {item.duration && (
              <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-md">
                {Math.floor(item.duration / 60)}:{String(Math.floor(item.duration % 60)).padStart(2, '0')}
              </span>
            )}
          </>
        ) : (
          <img
            src={item.url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
          <div className="flex items-center gap-2 w-full">
            <button className="p-1.5 rounded-lg bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors" onClick={e => { e.stopPropagation(); onView(); }}>
              <ZoomIn className="h-4 w-4 text-white" />
            </button>
            {onDelete && (
              <button className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 transition-colors ml-auto" onClick={e => { e.stopPropagation(); onDelete(); }}>
                <Trash2 className="h-4 w-4 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Type badge */}
        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
          {item.media_type === 'video' ? <Video className="h-3 w-3 text-amber-500" /> : <ImageIcon className="h-3 w-3 text-sky-500" />}
          {item.media_type}
        </span>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-bold text-slate-800 truncate">{item.title || 'Untitled'}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-slate-400 font-medium">{item.user_name}</p>
          <p className="text-xs text-slate-400">{timeAgo(item.created_at)}</p>
        </div>
      </div>
    </div>
  );
}

function MediaListItem({ item, onView, onDelete }: { item: MediaItem; onView: () => void; onDelete?: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-md shadow-slate-200/20 p-4 flex items-center gap-4 hover:shadow-lg transition-shadow group">
      {/* Thumb */}
      <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer bg-slate-100" onClick={onView}>
        {item.media_type === 'video' ? (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <Play className="h-6 w-6 text-white/60" />
          </div>
        ) : (
          <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 truncate">{item.title || 'Untitled'}</p>
        <p className="text-xs text-slate-400 mt-0.5">{item.description || 'No description'}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            {item.media_type === 'video' ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
            {item.format?.toUpperCase()}
          </span>
          <span className="text-xs text-slate-400">{item.width}×{item.height}</span>
          <span className="text-xs text-slate-400">{formatBytes(item.bytes)}</span>
        </div>
      </div>

      {/* Meta */}
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-medium text-slate-500">{item.user_name}</p>
        <p className="text-xs text-slate-400 mt-0.5">{timeAgo(item.created_at)}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button onClick={onView} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">
          <Eye className="h-4 w-4 text-slate-400" />
        </button>
        {onDelete && (
          <button onClick={onDelete} className="p-2 rounded-xl border border-red-200 hover:bg-red-50 transition-colors">
            <Trash2 className="h-4 w-4 text-red-400" />
          </button>
        )}
      </div>
    </div>
  );
}
