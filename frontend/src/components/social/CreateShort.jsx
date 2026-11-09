import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiPost } from '../../lib/api';
import { emitCatalogChange } from '../../lib/catalogEvents';

const MAX_VIDEO_BYTES = 8 * 1024 * 1024;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });
}

function captureThumbnail(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    let settled = false;

    const finish = (value) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      resolve(value);
    };

    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => {
      try {
        video.currentTime = Math.min(0.4, Number.isFinite(video.duration) ? video.duration : 0.4);
      } catch {
        finish('');
      }
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const width = video.videoWidth || 360;
        const height = video.videoHeight || 640;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish('');
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        finish(canvas.toDataURL('image/jpeg', 0.72));
      } catch {
        finish('');
      }
    };
    video.onerror = () => finish('');
    video.src = objectUrl;
  });
}

export const CreateShort = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [video, setVideo] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setTitle('');
    setVideo('');
    setThumbnail('');
    setFileName('');
    setLoading(false);
  };

  const close = () => {
    setOpen(false);
    reset();
  };

  const openUploader = () => {
    if (!userProfile) {
      navigate('/login');
      return;
    }
    setOpen(true);
  };

  const handleVideo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      alert('Please choose a video file.');
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      alert('Please choose a video under 8MB.');
      return;
    }

    try {
      const [dataUrl, preview] = await Promise.all([
        readAsDataUrl(file),
        captureThumbnail(file),
      ]);
      setVideo(dataUrl);
      setThumbnail(preview);
      setFileName(file.name);
    } catch (error) {
      console.error(error);
      alert('Could not read that video. Try another file.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!userProfile) {
      navigate('/login');
      return;
    }
    if (!title.trim() || !video) return;

    setLoading(true);
    try {
      await apiPost('/api/shorts', {
        userId: userProfile.uid,
        authorName: userProfile.displayName,
        avatar: userProfile.photoURL,
        dealerName: userProfile.displayName,
        title: title.trim(),
        video,
        thumbnail,
      });
      emitCatalogChange();
      close();
    } catch (error) {
      console.error(error);
      alert(error.message || 'Failed to upload short. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openUploader}
        className="shrink-0 snap-start w-32 md:w-40 aspect-[9/16] rounded-3xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors flex flex-col items-center justify-center gap-3 text-primary shadow-sm"
      >
        <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
          <Plus size={22} />
        </div>
        <div className="px-3 text-center">
          <p className="text-[10px] md:text-xs font-black uppercase tracking-widest">Upload</p>
          <p className="text-[9px] md:text-[10px] font-medium text-primary/70 mt-1">Gem Short</p>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" onClick={close}>
          <div
            className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Upload Gem Short</h3>
                <p className="text-xs text-slate-400 font-medium">Share a quick stone or cutting clip</p>
              </div>
              <button
                type="button"
                onClick={close}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Ceylon Blue under daylight"
                  className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 font-medium text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
                  required
                  maxLength={120}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Video</label>
                <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleVideo} />
                {video ? (
                  <div className="relative aspect-[9/16] max-h-72 mx-auto rounded-3xl overflow-hidden bg-slate-900">
                    <video
                      src={video}
                      poster={thumbnail || undefined}
                      className="w-full h-full object-cover"
                      controls
                      playsInline
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setVideo('');
                        setThumbnail('');
                        setFileName('');
                      }}
                      className="absolute top-3 right-3 p-2 rounded-full bg-white/90 text-slate-800"
                      aria-label="Remove video"
                    >
                      <X size={14} />
                    </button>
                    {fileName && (
                      <p className="absolute bottom-3 left-3 right-3 text-[10px] font-bold text-white truncate drop-shadow">
                        {fileName}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full aspect-[9/16] max-h-72 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col items-center justify-center gap-3 text-slate-400"
                  >
                    <Upload size={28} className="text-primary" />
                    <div className="text-center px-4">
                      <p className="text-sm font-bold text-slate-700">Choose video</p>
                      <p className="text-[10px] font-medium mt-1">MP4 or similar, under 8MB</p>
                    </div>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !title.trim() || !video}
                className="w-full h-12 rounded-full bg-primary text-white font-black text-sm shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all"
              >
                {loading ? 'Uploading...' : 'Publish Short'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
