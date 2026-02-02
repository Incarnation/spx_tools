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

