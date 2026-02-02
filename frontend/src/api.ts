export type ChainSnapshot = {
  snapshot_id: number;
  ts: string;
  underlying: string;
  target_dte: number;
  expiration: string;
  checksum: string;
};

export async function fetchChainSnapshots(limit = 50): Promise<ChainSnapshot[]> {
  const r = await fetch(`/api/chain-snapshots?limit=${encodeURIComponent(limit)}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = (await r.json()) as { items: ChainSnapshot[] };
  return data.items;
}

export type RunSnapshotResult = {
  skipped: boolean;
  reason: string | null;
  now_et: string;
  inserted: Array<{
    target_dte: number;
    expiration: string;
    actual_dte_days: number;
    checksum: string;
  }>;
};

export async function runSnapshotNow(apiKey?: string): Promise<RunSnapshotResult> {
  const r = await fetch(`/api/admin/run-snapshot`, {
    method: "POST",
    headers: apiKey ? { "X-API-Key": apiKey } : undefined,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as RunSnapshotResult;
}

