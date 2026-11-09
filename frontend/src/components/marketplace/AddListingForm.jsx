import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown, ImagePlus, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { apiGet, apiPost } from '../../lib/api';
import { emitCatalogChange } from '../../lib/catalogEvents';
import { hasVerifiedPhone } from '../../lib/phone';
import { LoadingImage } from '../ui/LoadingImage';

const GEM_TYPES = [
  'Sapphire', 'Ruby', 'Emerald', 'Spinel', 'Diamond',
  'Alexandrite', 'Tourmaline', 'Aquamarine', 'Tanzanite', 'Other',
];

const CUT_OPTIONS = ['Oval', 'Cushion', 'Round', 'Pear', 'Emerald Cut', 'Marquise', 'Cabochon', 'Other'];
const CLARITY_OPTIONS = ['Eye Clean', 'Loupe Clean', 'Slightly Included', 'Moderately Included', 'Heavily Included'];
const TREATMENT_OPTIONS = ['Unheated', 'Heated', 'Unknown'];
const CERTIFICATION_OPTIONS = ['None', 'GIA', 'GRS', 'GIC', 'Local Lab'];
const ORIGIN_OPTIONS = ['Sri Lanka', 'Madagascar', 'Myanmar', 'Thailand', 'Mozambique', 'Tanzania', 'Other'];
const SHAPE_OPTIONS = ['Oval', 'Cushion', 'Round', 'Pear', 'Emerald', 'Marquise', 'Trilliant', 'Princess', 'Heart', 'Other'];

const MIN_IMAGES = 1;
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });
}

function optionOrFallback(options, value) {
  const next = String(value || '').trim();
  if (!next) return '';
  return options.includes(next) ? next : options[options.length - 1];
}

export function AddListingForm({
  listingId = null,
  onSuccess = null,
  onCancel = null,
  compact = false,
}) {
  const isEditing = Boolean(listingId);
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [loadingListing, setLoadingListing] = useState(isEditing);
  const [selectedGemType, setSelectedGemType] = useState('Sapphire');
  const [images, setImages] = useState([]);
  const [status, setStatus] = useState('ACTIVE');
  const [form, setForm] = useState({
    title: '',
    weight: '',
    price: '',
    cut: '',
    clarity: '',
    treatment: '',
    certification: '',
    origin: 'Sri Lanka',
    shape: '',
    dimensions: '',
    description: '',
  });

  useEffect(() => {
    if (!isEditing) {
      setLoadingListing(false);
      return undefined;
    }
    if (!userProfile) {
      navigate('/login');
      return undefined;
    }
    let cancelled = false;
    setLoadingListing(true);
    apiGet(`/api/listings/${encodeURIComponent(listingId)}`)
      .then((data) => {
        if (cancelled) return;
        const listing = data?.listing;
        if (!listing) {
          alert('Listing not found.');
          onCancel?.();
          return;
        }
        const ownerIds = new Set(
          [listing.vendorId, data?.vendor?.id, data?.vendor?.userId]
            .filter(Boolean)
            .map(String)
        );
        if (!ownerIds.has(userProfile.uid)) {
          alert('You can only edit your own listings.');
          onCancel?.();
          return;
        }
        const gemType = listing.gemType || listing.variety || listing.type || 'Sapphire';
        setSelectedGemType(GEM_TYPES.includes(gemType) ? gemType : 'Other');
        setImages(Array.isArray(listing.images) ? listing.images.filter(Boolean) : []);
        setStatus(listing.status === 'SOLD' ? 'SOLD' : 'ACTIVE');
        setForm({
          title: listing.title || '',
          weight: listing.caratWeight ?? listing.weight ?? '',
          price: listing.price ?? '',
          cut: optionOrFallback(CUT_OPTIONS, listing.cut),
          clarity: optionOrFallback(CLARITY_OPTIONS, listing.clarity),
          treatment: optionOrFallback(TREATMENT_OPTIONS, listing.treatment),
          certification: optionOrFallback(CERTIFICATION_OPTIONS, listing.certification),
          origin: optionOrFallback(ORIGIN_OPTIONS, listing.origin),
          shape: optionOrFallback(SHAPE_OPTIONS, listing.shape),
          dimensions: listing.dimensions || '',
          description: listing.description || '',
        });
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          alert(error.message || 'Could not load that listing.');
          onCancel?.();
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingListing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEditing, listingId, navigate, onCancel, userProfile]);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleImages = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      alert(`You can upload up to ${MAX_IMAGES} images.`);
      return;
    }

    const selected = files.slice(0, remaining);
    if (files.length > remaining) {
      alert(`Only ${remaining} more image${remaining === 1 ? '' : 's'} can be added (max ${MAX_IMAGES}).`);
    }

    try {
      const next = [];
      for (const file of selected) {
        if (!file.type.startsWith('image/')) {
          alert('Please choose image files only.');
          continue;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          alert(`"${file.name}" is too large. Keep each photo under 1.5MB.`);
          continue;
        }
        next.push(await readAsDataUrl(file));
      }
      if (next.length) {
        setImages((current) => [...current, ...next].slice(0, MAX_IMAGES));
      }
    } catch (error) {
      console.error(error);
      alert('Could not read one of those images. Try again.');
    }
  };

  const removeImage = (index) => {
    setImages((current) => current.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!userProfile) {
      navigate('/login');
      return;
    }
    if (!hasVerifiedPhone(userProfile)) {
      alert('Enter a valid phone number before listing a gem.');
      navigate('/profile?tab=settings');
      return;
    }
    if (images.length < MIN_IMAGES) {
      alert(`Add at least ${MIN_IMAGES} image of your gem.`);
      return;
    }
    if (images.length > MAX_IMAGES) {
      alert(`You can upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }
    setLoading(true);

    const payload = {
      userId: userProfile.uid,
      title: form.title,
      gemType: selectedGemType,
      caratWeight: Number(form.weight),
      price: Number(form.price),
      currency: 'LKR',
      cut: form.cut,
      clarity: form.clarity,
      treatment: form.treatment,
      certification: form.certification,
      origin: form.origin,
      shape: form.shape,
      dimensions: form.dimensions,
      description: form.description,
      images,
      status,
    };

    try {
      const saved = isEditing
        ? await apiPost(`/api/listings/${encodeURIComponent(listingId)}`, payload)
        : await apiPost('/api/listings', payload);
      emitCatalogChange();
      if (onSuccess) {
        onSuccess(saved);
      } else {
        navigate(`/listings/${saved.id || listingId}`);
      }
    } catch (error) {
      console.error(error);
      alert(error.message || (isEditing ? 'Failed to update listing.' : 'Failed to add listing.'));
    } finally {
      setLoading(false);
    }
  };

  if (loadingListing) {
    return <div className="py-12 text-center font-bold text-slate-500">Loading listing...</div>;
  }

  return (
    <div className={cn('bg-white overflow-hidden', compact ? '' : 'rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50')}>
      {!compact && (
        <div className="px-8 pt-8 pb-4">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {isEditing ? 'Edit Listing' : 'List Gem'}
          </h2>
          <p className="text-slate-400 text-xs font-medium">
            {isEditing ? 'Update your marketplace listing' : 'Marketplace Submission'}
          </p>
          {!userProfile && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2 font-medium">
              Sign in when you are ready to {isEditing ? 'save your changes' : 'publish your listing'}.
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className={cn('space-y-7', compact ? 'px-1 pb-2' : 'p-8')}>
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Listing Title</label>
          <input
            name="title"
            type="text"
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="e.g. Natural Unheated Ceylon Blue Sapphire"
            className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-100 font-medium text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
            required
          />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Gem Type</label>
          <div className="flex flex-wrap gap-2">
            {GEM_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedGemType(type)}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-bold transition-all border',
                  selectedGemType === type
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-105'
                    : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Carat Weight</label>
            <input
              name="weight"
              type="number"
              step="0.01"
              value={form.weight}
              onChange={(event) => updateField('weight', event.target.value)}
              placeholder="e.g. 2.5"
              className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-100 font-medium text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Price (LKR)</label>
            <input
              name="price"
              type="number"
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
              placeholder="e.g. 1500"
              className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-100 font-medium text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Cut</label>
            <div className="relative">
              <select
                name="cut"
                value={form.cut}
                onChange={(event) => updateField('cut', event.target.value)}
                className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-100 font-medium text-slate-900 appearance-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
                required
              >
                <option value="" disabled>Select cut</option>
                {CUT_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Clarity</label>
            <div className="relative">
              <select
                name="clarity"
                value={form.clarity}
                onChange={(event) => updateField('clarity', event.target.value)}
                className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-100 font-medium text-slate-900 appearance-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
                required
              >
                <option value="" disabled>Select clarity</option>
                {CLARITY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Treatment</label>
            <div className="relative">
              <select
                name="treatment"
                value={form.treatment}
                onChange={(event) => updateField('treatment', event.target.value)}
                className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-100 font-medium text-slate-900 appearance-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
                required
              >
                <option value="" disabled>Select</option>
                {TREATMENT_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Certification</label>
            <div className="relative">
              <select
                name="certification"
                value={form.certification}
                onChange={(event) => updateField('certification', event.target.value)}
                className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-100 font-medium text-slate-900 appearance-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
                required
              >
                <option value="" disabled>Select</option>
                {CERTIFICATION_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Origin</label>
            <div className="relative">
              <select
                name="origin"
                value={form.origin}
                onChange={(event) => updateField('origin', event.target.value)}
                className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-100 font-medium text-slate-900 appearance-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
              >
                <option value="" disabled>Select origin</option>
                {ORIGIN_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Shape</label>
            <div className="relative">
              <select
                name="shape"
                value={form.shape}
                onChange={(event) => updateField('shape', event.target.value)}
                className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-100 font-medium text-slate-900 appearance-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
              >
                <option value="" disabled>Select shape</option>
                {SHAPE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Dimensions (L x W x D mm)</label>
          <input
            name="dimensions"
            type="text"
            value={form.dimensions}
            onChange={(event) => updateField('dimensions', event.target.value)}
            placeholder="e.g. 10.5 x 8.2 x 5.1"
            className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-100 font-medium text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Description</label>
          <textarea
            name="description"
            rows={4}
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            placeholder="Additional details, condition notes..."
            className="w-full p-5 rounded-2xl bg-slate-50 border border-slate-100 font-medium text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none resize-none"
          />
        </div>

        {isEditing && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Listing Status</label>
            <div className="relative">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-100 font-medium text-slate-900 appearance-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
              >
                <option value="ACTIVE">Available</option>
                <option value="SOLD">Sold</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Photos</label>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {images.length}/{MAX_IMAGES} · min {MIN_IMAGES}
            </span>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImages}
          />

          <div className="grid grid-cols-3 gap-3">
            {images.map((src, index) => (
              <div
                key={`${index}-${src.slice(0, 32)}`}
                className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-100"
              >
                <LoadingImage src={src} alt={`Gem photo ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 transition-colors"
                  aria-label={`Remove photo ${index + 1}`}
                >
                  <X size={14} />
                </button>
                {index === 0 && (
                  <span className="absolute bottom-2 left-2 text-[9px] font-black uppercase tracking-widest bg-white/90 text-slate-700 px-2 py-1 rounded-full">
                    Cover
                  </span>
                )}
              </div>
            ))}

            {images.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="aspect-square rounded-2xl border border-dashed border-slate-200 bg-slate-50 hover:bg-white hover:border-primary/40 text-slate-400 hover:text-primary transition-all flex flex-col items-center justify-center gap-2"
              >
                <ImagePlus size={22} />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {images.length ? 'Add' : 'Upload'}
                </span>
              </button>
            )}
          </div>

          <p className="text-xs text-slate-400 font-medium">
            Upload 1 to 5 clear photos. The first image is used as the cover.
          </p>
        </div>

        <div className={cn('flex gap-3 pt-2', compact ? 'flex-col-reverse sm:flex-row sm:justify-end' : '')}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-4 rounded-2xl font-bold text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || images.length < MIN_IMAGES}
            className={cn(
              'py-5 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 text-lg disabled:opacity-50',
              compact ? 'flex-1 px-6' : 'w-full mt-4'
            )}
          >
            {loading
              ? (isEditing ? 'Saving...' : 'Publishing...')
              : (isEditing ? 'Save Changes' : 'List Your Gem')}
            {!loading && <ArrowRight size={22} />}
          </button>
        </div>
      </form>
    </div>
  );
}
