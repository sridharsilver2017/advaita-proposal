// src/pages/portal/PortalSignPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { SignaturePad } from '../../components/signature/SignaturePad';

export const PortalSignPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadPortalData();
  }, [token]);

  async function loadPortalData() {
    try {
      const res = await apiRequest(`/api/portal/${token}`);
      if (res.success) {
        setData(res.portal);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired portal link.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSign(signData: {
    signerName: string;
    signingMethod: 'drawn' | 'typed' | 'uploaded';
    signatureData: string;
    consentText: string;
  }) {
    setSigning(true);
    setError(null);

    try {
      const res = await apiRequest(`/api/portal/${token}/agreement/sign`, {
        method: 'POST',
        body: JSON.stringify({
          signer_name: signData.signerName,
          signing_method: signData.signingMethod,
          signature_data: signData.signatureData,
          consent_text: signData.consentText
        })
      });

      if (res.success) {
        setSuccess(res.message);
        setTimeout(() => {
          navigate(`/portal/${token}/agreement`);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Signature recording failed.');
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-stone-400">Loading signing room...</div>;
  }

  const agreement = data?.agreement;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to={`/portal/${token}/agreement`}
          className="p-2 text-stone-500 hover:text-stone-900 bg-white border border-stone-200 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">Execute Agreement</h1>
          <p className="text-xs text-stone-500">Sign electronically for {agreement?.agreement_number}</p>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs font-bold text-emerald-950">Signature Confirmed & Sealed</p>
            <p className="text-[11px] text-emerald-800">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
            Legally Binding Electronic Signature
          </h2>
        </div>

        <SignaturePad
          defaultName={data?.client?.name || ''}
          onSign={handleSign}
          isLoading={signing}
        />
      </div>
    </div>
  );
};
