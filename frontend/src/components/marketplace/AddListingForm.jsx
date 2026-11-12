import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Gem, ImagePlus, Layers, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { apiGet, apiPost } from '../../lib/api';
import { emitCatalogChange } from '../../lib/catalogEvents';
import { hasVerifiedPhone } from '../../lib/phone';
import { LoadingImage } from '../ui/LoadingImage';

const SALE_TYPE_OPTIONS = [
  { id: 'single', label: 'Single Gem', Icon: Gem },
  { id: 'lot', label: 'Gem Lot', Icon: Layers },
];

const GEM_TYPES = [
  'Sapphire', 'Ruby', 'Emerald', 'Spinel', 'Diamond',
  'Alexandrite', 'Tourmaline', 'Aquamarine', 'Tanzanite',
];

const WEIGHT_OPTIONS = [
  { value: '0.5', label: '0.5 ct' },
  { value: '1', label: '1 ct' },
  { value: '1.5', label: '1.5 ct' },
  { value: '2', label: '2 ct' },
  { value: '3', label: '3 ct' },
  { value: '5', label: '5 ct' },
  { value: '10', label: '10 ct' },
];

const PRICE_OPTIONS = [
  { value: '50000', label: '50K' },
  { value: '100000', label: '100K' },
  { value: '250000', label: '250K' },
  { value: '500000', label: '500K' },
  { value: '1000000', label: '1M' },
  { value: '2500000', label: '2.5M' },
  { value: '5000000', label: '5M' },
];

const CUT_OPTIONS = ['Oval', 'Cushion', 'Round', 'Pear', 'Emerald Cut', 'Marquise', 'Cabochon'];
const CLARITY_OPTIONS = ['Eye Clean', 'Loupe Clean', 'Slightly Included', 'Moderately Included', 'Heavily Included'];
const TREATMENT_OPTIONS = ['Unheated', 'Heated', 'Unknown'];
const CERTIFICATION_OPTIONS = ['None', 'GIA', 'GRS', 'GIC', 'Local Lab'];
const ORIGIN_OPTIONS = ['Sri Lanka', 'Madagascar', 'Myanmar', 'Thailand', 'Mozambique', 'Tanzania'];
const SHAPE_OPTIONS = ['Oval', 'Cushion', 'Round', 'Pear', 'Emerald', 'Marquise', 'Trilliant', 'Princess', 'Heart'];
const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Available' },
  { value: 'SOLD', label: 'Sold' },
];

const MIN_IMAGES = 1;
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

const FIELD_CLASS =
  'w-full h-14 px-5 rounded-2xl bg-slate-50 border border-slate-100 font-medium text-slate-900 placeholder:text-slate-300 focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none';

function readAsDataUrl(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== 'function') return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    reader.onload = () => {
      onProgress?.(100);
      resolve(String(reader.result || ''));
    };
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });
}

function normalizeOptions(options) {
  return options.map((option) => (
    typeof option === 'string'
      ? { value: option, label: option }
      : option
  ));
}

function ChoiceStep({
  options,
  value,
  onSelect,
  onCustomChange,
  allowCustom = false,
  customPlaceholder = 'Enter a value…',
  customInputType = 'text',
  customStep,
}) {
  const items = normalizeOptions(options);
  const stringValue = value == null ? '' : String(value);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {items.map((option) => {
          const selected = stringValue === String(option.value);
          return (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => onSelect(option.value)}
              className={cn(
                'px-8 py-4 rounded-2xl text-base font-bold transition-all border-2',
                selected
                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-105'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-800'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {allowCustom && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Or enter another value
          </p>
          <input
            type={customInputType}
            step={customStep}
            min={customInputType === 'number' ? '0' : undefined}
            value={stringValue}
            onChange={(event) => onCustomChange?.(event.target.value)}
            placeholder={customPlaceholder}
            className={FIELD_CLASS}
          />
        </div>
      )}
    </div>
  );
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
  const [stepIndex, setStepIndex] = useState(0);
  const [saleType, setSaleType] = useState('');
  const [selectedGemType, setSelectedGemType] = useState('');
  const [images, setImages] = useState([]);
  const [imageUpload, setImageUpload] = useState(null);
  const [status, setStatus] = useState('ACTIVE');
  const [form, setForm] = useState({
    weight: '',
    price: '',
    cut: '',
    clarity: '',
    treatment: '',
    certification: '',
    origin: '',
    shape: '',
  });

  const steps = useMemo(() => {
    const base = [
      { id: 'saleType', label: 'What are you selling?', hint: 'Choose a single gem or a gem lot.' },
      { id: 'gemType', label: 'Gem Type', hint: 'What kind of stone are you listing?' },
      { id: 'weight', label: 'Carat Weight', hint: 'Enter the carat weight of the gem.' },
      { id: 'price', label: 'Price (LKR)', hint: 'Set your asking price in Sri Lankan Rupees.' },
      { id: 'cut', label: 'Cut', hint: 'Choose the cut of the stone.' },
      { id: 'clarity', label: 'Clarity', hint: 'How clean is the stone?' },
      { id: 'treatment', label: 'Treatment', hint: 'Has the stone been treated?' },
      { id: 'certification', label: 'Certification', hint: 'Any lab certification?' },
      { id: 'origin', label: 'Origin', hint: 'Where is the stone from?' },
      { id: 'shape', label: 'Shape', hint: 'Select the shape of the gem.' },
    ];
    if (isEditing) {
      base.push({ id: 'status', label: 'Listing Status', hint: 'Is this gem still available?' });
    }
    base.push({ id: 'photos', label: 'Photos', hint: 'Add 1 to 5 clear photos. First image is the cover.' });
    return base;
  }, [isEditing]);

  const currentStep = steps[stepIndex] || steps[0];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === steps.length - 1;
  const progress = ((stepIndex + 1) / steps.length) * 100;

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
        const gemType = String(listing.gemType || listing.variety || listing.type || '').trim();
        const nextSaleType = listing.saleType === 'lot' ? 'lot' : 'single';
        setSaleType(nextSaleType);
        setSelectedGemType(gemType);
        setImages(Array.isArray(listing.images) ? listing.images.filter(Boolean) : []);
        setStatus(listing.status === 'SOLD' ? 'SOLD' : 'ACTIVE');
        setForm({
          weight: listing.caratWeight ?? listing.weight ?? '',
          price: listing.price ?? '',
          cut: String(listing.cut || '').trim(),
          clarity: String(listing.clarity || '').trim(),
          treatment: String(listing.treatment || '').trim(),
          certification: String(listing.certification || '').trim(),
          origin: String(listing.origin || '').trim(),
          shape: String(listing.shape || '').trim(),
        });
        setStepIndex(0);
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
    if (!files.length || imageUpload) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      alert(`You can upload up to ${MAX_IMAGES} images.`);
      return;
    }

    const selected = files.slice(0, remaining);
    if (files.length > remaining) {
      alert(`Only ${remaining} more image${remaining === 1 ? '' : 's'} can be added (max ${MAX_IMAGES}).`);
    }

    const validFiles = [];
    for (const file of selected) {
      if (!file.type.startsWith('image/')) {
        alert('Please choose image files only.');
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        alert(`"${file.name}" is too large. Keep each photo under 1.5MB.`);
        continue;
      }
      validFiles.push(file);
    }
    if (!validFiles.length) return;

    const totalBytes = validFiles.reduce((sum, file) => sum + file.size, 0) || 1;
    let loadedBytes = 0;

    setImageUpload({
      progress: 0,
      current: 1,
      total: validFiles.length,
      fileName: validFiles[0].name,
    });

    try {
      const next = [];
      for (let index = 0; index < validFiles.length; index += 1) {
        const file = validFiles[index];
        const baseLoaded = loadedBytes;
        setImageUpload({
          progress: Math.min(99, Math.round((baseLoaded / totalBytes) * 100)),
          current: index + 1,
          total: validFiles.length,
          fileName: file.name,
        });

        const dataUrl = await readAsDataUrl(file, (fileProgress) => {
          const overall = baseLoaded + (file.size * (fileProgress / 100));
          setImageUpload({
            progress: Math.min(99, Math.round((overall / totalBytes) * 100)),
            current: index + 1,
            total: validFiles.length,
            fileName: file.name,
          });
        });
        loadedBytes += file.size;
        next.push(dataUrl);
      }

      if (next.length) {
        setImages((current) => [...current, ...next].slice(0, MAX_IMAGES));
      }
      setImageUpload({
        progress: 100,
        current: validFiles.length,
        total: validFiles.length,
        fileName: validFiles[validFiles.length - 1]?.name || '',
      });
      window.setTimeout(() => setImageUpload(null), 350);
    } catch (error) {
      console.error(error);
      setImageUpload(null);
      alert('Could not read one of those images. Try again.');
    }
  };

  const removeImage = (index) => {
    setImages((current) => current.filter((_, i) => i !== index));
  };

  const validateStep = (stepId) => {
    switch (stepId) {
      case 'saleType':
        if (!saleType) {
          alert('Choose whether you are selling a single gem or a gem lot.');
          return false;
        }
        return true;
      case 'gemType':
        if (!String(selectedGemType || '').trim()) {
          alert('Select or enter a gem type.');
          return false;
        }
        return true;
      case 'weight': {
        const weight = Number(form.weight);
        if (!form.weight || !Number.isFinite(weight) || weight <= 0) {
          alert('Enter a valid carat weight.');
          return false;
        }
        return true;
      }
      case 'price': {
        const price = Number(form.price);
        if (!form.price || !Number.isFinite(price) || price <= 0) {
          alert('Enter a valid price.');
          return false;
        }
        return true;
      }
      case 'cut':
        if (!form.cut) {
          alert('Select a cut.');
          return false;
        }
        return true;
      case 'clarity':
        if (!form.clarity) {
          alert('Select a clarity grade.');
          return false;
        }
        return true;
      case 'treatment':
        if (!form.treatment) {
          alert('Select a treatment.');
          return false;
        }
        return true;
      case 'certification':
        if (!form.certification) {
          alert('Select a certification.');
          return false;
        }
        return true;
      case 'origin':
        if (!form.origin) {
          alert('Select an origin.');
          return false;
        }
        return true;
      case 'shape':
        if (!form.shape) {
          alert('Select a shape.');
          return false;
        }
        return true;
      case 'status':
        return true;
      case 'photos':
        if (images.length < MIN_IMAGES) {
          alert(`Add at least ${MIN_IMAGES} image of your gem.`);
          return false;
        }
        if (images.length > MAX_IMAGES) {
          alert(`You can upload a maximum of ${MAX_IMAGES} images.`);
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (!validateStep(currentStep.id)) return;
    if (!isLastStep) setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const selectAndAdvance = (applySelection) => {
    applySelection();
    if (!isLastStep) {
      setStepIndex((current) => Math.min(current + 1, steps.length - 1));
    }
  };

  const goBack = () => {
    if (isFirstStep) {
      onCancel?.();
      return;
    }
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  const saveListing = async () => {
    if (!userProfile) {
      navigate('/login');
      return;
    }
    if (!hasVerifiedPhone(userProfile)) {
      alert('Enter a valid phone number before listing a gem.');
      navigate('/profile?tab=settings');
      return;
    }
    if (!validateStep('photos')) return;

    setLoading(true);

    const gemType = String(selectedGemType || '').trim() || 'Sapphire';
    const weightLabel = form.weight ? `${form.weight}ct ` : '';
    const lotLabel = saleType === 'lot' ? ' Lot' : '';
    const title = `${weightLabel}${gemType}${lotLabel}`.trim();

    const payload = {
      userId: userProfile.uid,
      title,
      saleType: saleType === 'lot' ? 'lot' : 'single',
      gemType,
      caratWeight: Number(form.weight),
      price: Number(form.price),
      currency: 'LKR',
      cut: form.cut,
      clarity: form.clarity,
      treatment: form.treatment,
      certification: form.certification,
      origin: form.origin,
      shape: form.shape,
      dimensions: '',
      description: '',
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isLastStep) {
      goNext();
      return;
    }
    await saveListing();
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

      <form onSubmit={handleSubmit} className={cn('space-y-6', compact ? 'px-1 pb-2' : 'p-8')}>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {currentStep.label}
            </p>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="min-h-[220px] flex flex-col justify-center space-y-4">
          <div className="space-y-1">
            <label className="text-lg font-black text-slate-900 tracking-tight block">
              {currentStep.label}
            </label>
            <p className="text-sm text-slate-400 font-medium">{currentStep.hint}</p>
          </div>

          {currentStep.id === 'saleType' && (
            <div className="grid grid-cols-2 gap-3">
              {SALE_TYPE_OPTIONS.map(({ id, label, Icon }) => {
                const selected = saleType === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectAndAdvance(() => setSaleType(id))}
                    className={cn(
                      'flex flex-col items-center justify-center gap-3 rounded-2xl border px-4 py-6 transition-all',
                      selected
                        ? 'border-primary bg-primary/5 text-primary shadow-md shadow-primary/15 scale-[1.02]'
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white'
                    )}
                  >
                    <span
                      className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center',
                        selected ? 'bg-primary text-white' : 'bg-white text-slate-400 border border-slate-100'
                      )}
                    >
                      <Icon size={22} />
                    </span>
                    <span className="text-sm font-black tracking-tight">{label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {currentStep.id === 'gemType' && (
            <ChoiceStep
              allowCustom
              options={GEM_TYPES}
              value={selectedGemType}
              onSelect={(type) => selectAndAdvance(() => setSelectedGemType(type))}
              onCustomChange={setSelectedGemType}
              customPlaceholder="e.g. Padparadscha"
            />
          )}

          {currentStep.id === 'weight' && (
            <ChoiceStep
              allowCustom
              options={WEIGHT_OPTIONS}
              value={form.weight}
              onSelect={(weight) => selectAndAdvance(() => updateField('weight', weight))}
              onCustomChange={(weight) => updateField('weight', weight)}
              customPlaceholder="e.g. 2.75"
              customInputType="number"
              customStep="0.01"
            />
          )}

          {currentStep.id === 'price' && (
            <ChoiceStep
              allowCustom
              options={PRICE_OPTIONS}
              value={form.price}
              onSelect={(price) => selectAndAdvance(() => updateField('price', price))}
              onCustomChange={(price) => updateField('price', price)}
              customPlaceholder="e.g. 175000"
              customInputType="number"
            />
          )}

          {currentStep.id === 'cut' && (
            <ChoiceStep
              allowCustom
              options={CUT_OPTIONS}
              value={form.cut}
              onSelect={(cut) => selectAndAdvance(() => updateField('cut', cut))}
              onCustomChange={(cut) => updateField('cut', cut)}
              customPlaceholder="e.g. Asscher"
            />
          )}

          {currentStep.id === 'clarity' && (
            <ChoiceStep
              allowCustom
              options={CLARITY_OPTIONS}
              value={form.clarity}
              onSelect={(clarity) => selectAndAdvance(() => updateField('clarity', clarity))}
              onCustomChange={(clarity) => updateField('clarity', clarity)}
              customPlaceholder="e.g. VS1"
            />
          )}

          {currentStep.id === 'treatment' && (
            <ChoiceStep
              allowCustom
              options={TREATMENT_OPTIONS}
              value={form.treatment}
              onSelect={(treatment) => selectAndAdvance(() => updateField('treatment', treatment))}
              onCustomChange={(treatment) => updateField('treatment', treatment)}
              customPlaceholder="e.g. Diffusion"
            />
          )}

          {currentStep.id === 'certification' && (
            <ChoiceStep
              allowCustom
              options={CERTIFICATION_OPTIONS}
              value={form.certification}
              onSelect={(certification) => selectAndAdvance(() => updateField('certification', certification))}
              onCustomChange={(certification) => updateField('certification', certification)}
              customPlaceholder="e.g. AGL"
            />
          )}

          {currentStep.id === 'origin' && (
            <ChoiceStep
              allowCustom
              options={ORIGIN_OPTIONS}
              value={form.origin}
              onSelect={(origin) => selectAndAdvance(() => updateField('origin', origin))}
              onCustomChange={(origin) => updateField('origin', origin)}
              customPlaceholder="e.g. Kashmir"
            />
          )}

          {currentStep.id === 'shape' && (
            <ChoiceStep
              allowCustom
              options={SHAPE_OPTIONS}
              value={form.shape}
              onSelect={(shape) => selectAndAdvance(() => updateField('shape', shape))}
              onCustomChange={(shape) => updateField('shape', shape)}
              customPlaceholder="e.g. Radiant"
            />
          )}

          {currentStep.id === 'status' && (
            <ChoiceStep
              options={STATUS_OPTIONS}
              value={status}
              onSelect={(nextStatus) => selectAndAdvance(() => setStatus(nextStatus))}
            />
          )}

          {currentStep.id === 'photos' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
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
                disabled={Boolean(imageUpload)}
              />

              {imageUpload && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-slate-600 truncate">
                      Attaching {imageUpload.fileName || 'photo'}
                      {imageUpload.total > 1 ? ` (${imageUpload.current}/${imageUpload.total})` : ''}
                    </p>
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary shrink-0">
                      {imageUpload.progress}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-150 ease-out"
                      style={{ width: `${imageUpload.progress}%` }}
                    />
                  </div>
                </div>
              )}

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
                      disabled={Boolean(imageUpload)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 transition-colors disabled:opacity-50"
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
                    disabled={Boolean(imageUpload)}
                    className="aspect-square rounded-2xl border border-dashed border-slate-200 bg-slate-50 hover:bg-white hover:border-primary/40 text-slate-400 hover:text-primary transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <ImagePlus size={22} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {imageUpload ? 'Uploading' : images.length ? 'Add' : 'Upload'}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={goBack}
            className="px-3 py-2 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            {isFirstStep ? (onCancel ? 'Cancel' : 'Back') : 'Back'}
          </button>

          <button
            type="submit"
            disabled={loading || (isLastStep && images.length < MIN_IMAGES)}
            className="px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md shadow-primary/25 hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 transition-all inline-flex items-center justify-center gap-1.5 text-sm disabled:opacity-50"
          >
            {isLastStep
              ? (loading
                ? (isEditing ? 'Saving...' : 'Publishing...')
                : (isEditing ? 'Save Changes' : 'List Your Gem'))
              : 'Continue'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}
