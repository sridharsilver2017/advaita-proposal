// src/components/signature/SignaturePad.tsx
import React, { useRef, useState, useEffect } from 'react';
import { Pen, Type, Upload, RotateCcw, Check, ShieldCheck } from 'lucide-react';

interface SignaturePadProps {
  defaultName?: string;
  onSign: (data: {
    signerName: string;
    signingMethod: 'drawn' | 'typed' | 'uploaded';
    signatureData: string;
    consentText: string;
  }) => void;
  isLoading?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  defaultName = '',
  onSign,
  isLoading = false
}) => {
  const [tab, setTab] = useState<'drawn' | 'typed' | 'uploaded'>('drawn');
  const [signerName, setSignerName] = useState(defaultName);
  const [typedFont, setTypedFont] = useState<'font-editorial' | 'font-sans'>('font-editorial');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (defaultName && !signerName) {
      setSignerName(defaultName);
    }
  }, [defaultName]);

  // Setup canvas
  useEffect(() => {
    if (tab === 'drawn' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [tab]);

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    setIsDrawing(true);
    setHasDrawn(true);
    draw(e);
  }

  function stopDrawing() {
    setIsDrawing(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.beginPath();
    }
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing && e.type !== 'mousedown' && e.type !== 'touchstart') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG/JPG)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    setError(null);
    if (!signerName.trim()) {
      setError('Please provide your full legal name.');
      return;
    }
    if (!consentChecked) {
      setError('You must confirm consent to execute this agreement by electronic signature.');
      return;
    }

    let signatureData = '';

    if (tab === 'drawn') {
      if (!hasDrawn || !canvasRef.current) {
        setError('Please draw your signature in the box provided.');
        return;
      }
      signatureData = canvasRef.current.toDataURL('image/png');
    } else if (tab === 'typed') {
      // Create dataURL from typed signature
      const offscreen = document.createElement('canvas');
      offscreen.width = 400;
      offscreen.height = 100;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 100);
        ctx.font = 'italic 28px Georgia, serif';
        ctx.fillStyle = '#0f172a';
        ctx.fillText(signerName.trim(), 20, 60);
      }
      signatureData = offscreen.toDataURL('image/png');
    } else if (tab === 'uploaded') {
      if (!uploadedImage) {
        setError('Please upload a clear image of your signature.');
        return;
      }
      signatureData = uploadedImage;
    }

    const consentStatement = `I, ${signerName.trim()}, hereby confirm my intent to sign and execute this agreement electronically. I accept all stated terms and agree that this electronic signature carries full legal force.`;

    onSign({
      signerName: signerName.trim(),
      signingMethod: tab,
      signatureData,
      consentText: consentStatement
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1.5">
          Signatory Full Legal Name
        </label>
        <input
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="e.g. Rahul Sharma"
          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition"
        />
      </div>

      {/* Tabs */}
      <div>
        <div className="flex border-b border-stone-200 gap-4 mb-3">
          <button
            type="button"
            onClick={() => setTab('drawn')}
            className={`pb-2 text-xs font-medium flex items-center gap-1.5 border-b-2 transition ${
              tab === 'drawn'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Pen className="w-3.5 h-3.5" />
            Draw Signature
          </button>
          <button
            type="button"
            onClick={() => setTab('typed')}
            className={`pb-2 text-xs font-medium flex items-center gap-1.5 border-b-2 transition ${
              tab === 'typed'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Type Signature
          </button>
          <button
            type="button"
            onClick={() => setTab('uploaded')}
            className={`pb-2 text-xs font-medium flex items-center gap-1.5 border-b-2 transition ${
              tab === 'uploaded'
                ? 'border-stone-900 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Image
          </button>
        </div>

        {/* Tab 1: Draw */}
        {tab === 'drawn' && (
          <div className="space-y-2">
            <div className="relative border-2 border-dashed border-stone-200 rounded-xl bg-stone-50 overflow-hidden">
              <canvas
                ref={canvasRef}
                width={450}
                height={140}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseMove={draw}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
                className="w-full h-36 cursor-crosshair touch-none"
              />
              <button
                type="button"
                onClick={clearCanvas}
                className="absolute top-2 right-2 px-2 py-1 text-xs text-stone-600 bg-white/90 hover:bg-white rounded-md shadow-xs border border-stone-200 flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            </div>
            <p className="text-[11px] text-stone-400">
              Draw smoothly using finger, touch pen, or mouse cursor.
            </p>
          </div>
        )}

        {/* Tab 2: Type */}
        {tab === 'typed' && (
          <div className="space-y-3">
            <div className="p-6 border border-stone-200 rounded-xl bg-stone-50 text-center">
              <span className={`text-2xl text-stone-900 tracking-wide ${typedFont}`}>
                {signerName.trim() || 'Your Name'}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 italic">
              Notice: Typing your name and completing this action constitutes an electronic signature with identical legal intent as a physical signature.
            </p>
          </div>
        )}

        {/* Tab 3: Upload */}
        {tab === 'uploaded' && (
          <div className="space-y-3">
            {uploadedImage ? (
              <div className="relative p-4 border border-stone-200 rounded-xl bg-white text-center">
                <img
                  src={uploadedImage}
                  alt="Uploaded signature preview"
                  className="max-h-24 mx-auto object-contain"
                />
                <button
                  type="button"
                  onClick={() => setUploadedImage(null)}
                  className="mt-2 text-xs text-rose-600 hover:underline"
                >
                  Remove & upload another
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50 hover:bg-stone-100 cursor-pointer transition">
                <Upload className="w-6 h-6 text-stone-400 mb-2" />
                <span className="text-xs text-stone-600 font-medium">Click to select signature image</span>
                <span className="text-[10px] text-stone-400 mt-1">PNG or JPG with transparent or white background</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}
      </div>

      {/* Legal Consent Checkbox */}
      <div className="p-3.5 bg-stone-100 rounded-xl border border-stone-200">
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="mt-0.5 rounded text-stone-900 focus:ring-stone-900"
          />
          <span className="text-xs text-stone-700 leading-relaxed">
            I confirm that I have reviewed the agreement terms, accept them without reservation, and agree to execute this document by digital signature with full legal binding force.
          </span>
        </label>
      </div>

      {error && (
        <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={isLoading}
        onClick={handleSubmit}
        className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-medium text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition"
      >
        <ShieldCheck className="w-4 h-4" />
        {isLoading ? 'Signing & Verifying...' : 'Sign & Submit Agreement'}
      </button>
    </div>
  );
};
