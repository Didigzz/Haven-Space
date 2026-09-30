import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import {
  bulkPatchPropertyStatus,
  getProperties,
  patchPropertyStatus,
} from '../../../lib/api/admin';
import type { AdminPropertyRow } from '../../../lib/types';
import { Button } from '../../ui/Button';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import { DataTable, type Column } from '../../ui/DataTable';
import { StatusBadge } from '../../ui/StatusBadge';
import { AdminSection } from '../AdminSection';
import { BULK_SELECT_CLASSES, BulkActionBar } from '../BulkActionBar';
import { TableSkeleton } from '../AdminSkeletons';
import type { PushToast } from '../sections';

type PendingConfirm = {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  run: () => void;
};

/**
 * Listings submitted for moderation.
 *
 * Row actions are real `Button` variants now — same labels, same positions —
 * so they have hit padding and press feedback instead of being ~20px-tall
 * underlined text (R24). `Publish` stays one click; `Reject` and `Flag` are
 * negative outcomes and confirm first (D12/R26).
 */
export function PropertiesSection({ token, push }: { token: string; push: PushToast }) {
  const queryClient = useQueryClient();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState('reject');
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
  };

  const properties = useQuery({
    queryKey: ['admin', 'properties'],
    queryFn: () => getProperties(token),
    enabled: Boolean(token),
  });

  const patchProperty = useMutation({
    mutationFn: ({ propertyId, action }: { propertyId: number; action: string }) =>
      patchPropertyStatus(token, propertyId, action),
    onSuccess: result => {
      push({ tone: 'success', message: result.message });
      setConfirm(null);
      invalidate();
    },
    onError: (error: Error) => {
      push({ tone: 'error', message: error.message });
      setConfirm(null);
    },
  });

  const bulkProperties = useMutation({
    mutationFn: ({ ids, action }: { ids: number[]; action: string }) =>
      bulkPatchPropertyStatus(token, ids, action),
    onSuccess: result => {
      const failed = result.data?.failed?.length ?? 0;
      push({ tone: 'success', message: result.message });
      if (failed > 0) push({ tone: 'error', message: `${failed} failed` });
      if (failed === 0) setSelected(new Set());
      else setSelected(new Set(result.data?.failed.map(f => f.id) ?? []));
      setConfirm(null);
      invalidate();
    },
    onError: (error: Error) => {
      push({ tone: 'error', message: error.message });
      setConfirm(null);
    },
  });

  const overCap = selected.size > 100;
  const rows = properties.data?.data ?? [];

  function requestAction(row: AdminPropertyRow, action: string) {
    if (action === 'publish') {
      patchProperty.mutate({ propertyId: row.id, action });
      return;
    }

    setConfirm({
      title: `${action === 'reject' ? 'Reject' : 'Flag'} ${row.title}?`,
      message: `This will set moderation status to "${action}" for this property.`,
      confirmLabel: action === 'reject' ? 'Reject' : 'Flag',
      run: () => patchProperty.mutate({ propertyId: row.id, action }),
    });
  }

  function requestBulk() {
    const count = selected.size;
    setConfirm({
      title: `${bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1)} ${count} propert${
        count > 1 ? 'ies' : 'y'
      }?`,
      message: `This will set moderation status to "${bulkAction}" for ${count} selected properties.`,
      confirmLabel: bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1),
      run: () => bulkProperties.mutate({ ids: Array.from(selected), action: bulkAction }),
    });
  }

  const columns: Column<AdminPropertyRow>[] = [
    { header: 'Title', cell: row => row.title },
    { header: 'Price', cell: row => `₱${Number(row.price).toLocaleString()}` },
    { header: 'Status', cell: row => <StatusBadge status={row.listing_moderation_status} /> },
    { header: 'Landlord', cell: row => `${row.landlord_first} ${row.landlord_last}` },
    {
      header: 'Actions',
      cell: row => (
        <div className="flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => requestAction(row, 'publish')}>
            Publish
          </Button>
          <Button variant="dangerGhost" size="sm" onClick={() => requestAction(row, 'reject')}>
            Reject
          </Button>
          <Button variant="warningGhost" size="sm" onClick={() => requestAction(row, 'flag')}>
            Flag
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminSection
      section="properties"
      isLoading={properties.isLoading}
      error={properties.error}
      empty={!properties.data?.data.length}
      emptyTitle="No properties found"
      emptyIcon="list"
      skeleton={<TableSkeleton rows={5} columns={5} />}
      actions={
        rows.length ? (
          <Button
            variant={selectMode ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              if (selectMode) setSelected(new Set());
              setSelectMode(value => !value);
            }}
          >
            {selectMode ? 'Cancel' : 'Select'}
          </Button>
        ) : null
      }
      toolbar={
        rows.length ? <p className="mb-3 text-xs text-gray-ink">{rows.length} properties</p> : null
      }
    >
      <DataTable
        rows={rows}
        columns={columns}
        keyFor={row => row.id}
        selectable={selectMode}
        selectedIds={selected as Set<string | number>}
        onToggle={id => {
          const next = new Set(selected);
          if (next.has(id as number)) next.delete(id as number);
          else {
            if (next.size >= 100) {
              push({ tone: 'error', message: 'Max 100 per bulk operation' });
              return;
            }
            next.add(id as number);
          }
          setSelected(next);
        }}
        onToggleAll={checked => {
          if (checked) {
            if (rows.length > 100)
              push({ tone: 'info', message: 'Selected first 100 — max 100 per bulk operation' });
            setSelected(new Set(rows.slice(0, 100).map(r => r.id)));
          } else setSelected(new Set());
        }}
      />

      {selectMode && selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          busy={bulkProperties.isPending}
          overCap={overCap}
          onApply={requestBulk}
          onCancel={() => {
            setSelectMode(false);
            setSelected(new Set());
          }}
          actionControl={
            <select
              aria-label="Bulk property action"
              value={bulkAction}
              onChange={event => setBulkAction(event.target.value)}
              className={BULK_SELECT_CLASSES}
            >
              <option value="publish">publish</option>
              <option value="reject">reject</option>
              <option value="flag">flag</option>
            </select>
          }
        />
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? null}
        confirmLabel={confirm?.confirmLabel ?? 'Confirm'}
        busy={patchProperty.isPending || bulkProperties.isPending}
        onConfirm={() => confirm?.run()}
        onCancel={() => setConfirm(null)}
      />
    </AdminSection>
  );
}
