import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Protected } from '../../components/auth/Protected';
import { RoleShell } from '../../components/layout/RoleShell';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../lib/auth-context';
import { LANDLORD_NAV } from '../../lib/nav';

export const Route = createFileRoute('/landlord/verification')({
  component: () => (
    <Protected role="landlord">
      <VerificationPage />
    </Protected>
  ),
});

function VerificationPage() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<File | null>(null);
  const [selectedProof, setSelectedProof] = useState<File | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const status = user?.verification_status ?? 'pending';

  return (
    <RoleShell title="Verification" nav={LANDLORD_NAV}>
      <Card className="mx-auto max-w-2xl">
        <h1 className="text-xl font-bold">Account verification</h1>
        <p className="mt-1 text-sm text-gray-ink">
          Verification status:{' '}
          <span className="rounded-full bg-mint px-2 py-0.5 text-sm capitalize">{status}</span>
        </p>

        <p className="mt-4 text-sm text-gray-ink">
          To complete verification, upload a valid government-issued ID and proof of property
          ownership. Your account is reviewed within 24–48 hours.
        </p>

        <div className="mt-4 flex flex-col gap-4">
          <div>
            <p className="mb-1 text-sm font-medium">Valid government ID</p>
            <label className="block cursor-pointer rounded-md border border-dashed border-gray-300 p-4 text-center text-sm hover:bg-gray-50">
              {selectedId ? selectedId.name : 'Choose an ID image (jpg/png)'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setSelectedId(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div>
            <p className="mb-1 text-sm font-medium">Proof of property ownership</p>
            <label className="block cursor-pointer rounded-md border border-dashed border-gray-300 p-4 text-center text-sm hover:bg-gray-50">
              {selectedProof ? selectedProof.name : 'Choose a document (jpg/png/pdf)'}
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => setSelectedProof(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <Button
            disabled={!selectedId || !selectedProof}
            onClick={() => setNote('Document upload is recorded locally. Upload to the API will be wired once the verification endpoint is finalized.')}
          >
            Submit documents
          </Button>

          {note ? <p className="rounded-md bg-mint p-3 text-sm">{note}</p> : null}

          <Link to="/landlord" className="text-sm text-primary hover:underline">
            ← Back to dashboard
          </Link>
        </div>
      </Card>
    </RoleShell>
  );
}
