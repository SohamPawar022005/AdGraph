import type { RequiredDocumentItem } from '../lib/complianceChecklist';

interface DocumentIntelligenceCardProps {
  document: RequiredDocumentItem;
  businessName?: string;
}

export default function DocumentIntelligenceCard({
  document,
  businessName,
}: DocumentIntelligenceCardProps) {
  const fields = document.extractedFields || {};
  const issues = document.validationIssues || [];
  const status = document.validationStatus;

  if (status === 'MISSING') {
    return null;
  }

  const isInvalid = status === 'INVALID';
  const isWarning = status === 'WARNING';
  const isValid = status === 'VALID';

  // Format registration IDs if present
  const regIds =
    fields.registration_ids && typeof fields.registration_ids === 'object'
      ? (fields.registration_ids as Record<string, string>)
      : null;

  return (
    <div
      className={`mt-3 rounded-lg border p-4 transition-all duration-200 ${
        isInvalid
          ? 'border-red-300 bg-red-50/50'
          : isWarning
          ? 'border-amber-300 bg-amber-50/50'
          : 'border-emerald-300 bg-emerald-50/40'
      }`}
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5 border-slate-200/80">
        <div className="flex items-center space-x-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs text-white font-mono font-semibold">
            F3
          </span>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Document Intelligence Engine (Feature #3)
            </h4>
            <p className="text-[11px] text-slate-500 font-mono">
              ID: {document.uploadedFileId || 'pending'} · Hash: {String(fields.content_hash_sha256 || 'verified').slice(0, 16)}…
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isValid && (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              <svg className="mr-1 h-3.5 w-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              VALID
            </span>
          )}
          {isInvalid && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
              <svg className="mr-1 h-3.5 w-3.5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              INVALID
            </span>
          )}
          {isWarning && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              <svg className="mr-1 h-3.5 w-3.5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              WARNING
            </span>
          )}
        </div>
      </div>

      {/* Issues / Error Callouts */}
      {issues.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {issues.map((issue, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-2 rounded-md p-2.5 text-xs ${
                issue.startsWith('Notice:')
                  ? 'bg-amber-100/80 text-amber-900 border border-amber-300'
                  : 'bg-red-100/90 text-red-900 border border-red-300'
              }`}
            >
              <span className="font-bold shrink-0">{issue.startsWith('Notice:') ? '⚠️' : '❌'}</span>
              <span className="font-medium">{issue}</span>
            </div>
          ))}
        </div>
      )}

      {/* Extracted Metadata Key-Value Fields */}
      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
          Extracted Metadata Fields & OCR Verification
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {/* Entity Name */}
          {fields.entity_name ? (
            <div className="rounded border border-slate-200/80 bg-white/90 p-2">
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Entity Name</span>
              <span className={`text-xs font-semibold ${
                businessName && String(fields.entity_name) !== businessName ? 'text-red-600' : 'text-slate-800'
              }`}>
                {String(fields.entity_name)}
              </span>
            </div>
          ) : null}

          {/* Validity Dates */}
          {fields.validity_dates ? (
            <div className="rounded border border-slate-200/80 bg-white/90 p-2">
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Validity Period</span>
              <span className="text-xs font-medium text-slate-800">
                {String(fields.validity_dates)}
              </span>
            </div>
          ) : null}

          {/* Payment Date / Amount */}
          {fields.amount ? (
            <div className="rounded border border-slate-200/80 bg-white/90 p-2">
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Challan / Amount</span>
              <span className="text-xs font-medium text-slate-800">
                {String(fields.amount)} {fields.payment_date ? `· ${String(fields.payment_date)}` : ''}
              </span>
            </div>
          ) : null}

          {/* Holder Name */}
          {fields.holder_name ? (
            <div className="rounded border border-slate-200/80 bg-white/90 p-2">
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Signatory / Holder</span>
              <span className="text-xs font-medium text-slate-800">
                {String(fields.holder_name)}
              </span>
            </div>
          ) : null}

          {/* ID Number */}
          {fields.id_number ? (
            <div className="rounded border border-slate-200/80 bg-white/90 p-2">
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">ID / Reference No</span>
              <span className="text-xs font-mono font-medium text-slate-800">
                {String(fields.id_number)}
              </span>
            </div>
          ) : null}

          {/* Registration / Challan Identifiers */}
          {regIds && Object.keys(regIds).length > 0 ? (
            <div className="rounded border border-slate-200/80 bg-white/90 p-2">
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">Registration IDs</span>
              <span className="text-xs font-mono text-slate-700">
                {Object.entries(regIds).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(' · ')}
              </span>
            </div>
          ) : null}

          {/* Signature Verification */}
          <div className="rounded border border-slate-200/80 bg-white/90 p-2">
            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Signature / Seal</span>
            <span className={`text-xs font-semibold ${
              fields.signature_verified ? 'text-emerald-700' : 'text-red-600'
            }`}>
              {fields.signature_verified ? '✓ Verified Digital Signature' : '✗ Missing Signature / Seal'}
            </span>
          </div>

          {/* File Hash & Size */}
          <div className="rounded border border-slate-200/80 bg-white/90 p-2">
            <span className="block text-[10px] text-slate-400 uppercase font-semibold">File Verification</span>
            <span className="text-[11px] font-mono text-slate-600">
              {String(fields.original_filename || 'document.pdf')} ({((Number(fields.size_bytes) || 0) / 1024).toFixed(1)} KB)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
