import React from "react";
import { fetchChainSnapshots, type ChainSnapshot } from "./api";

export function App() {
  const [items, setItems] = React.useState<ChainSnapshot[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchChainSnapshots(50)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 1000, margin: "40px auto", padding: 16 }}>
      <h2>SPX Tools</h2>
      <p style={{ color: "#555" }}>React dashboard (MVP)</p>

      {loading && <p>Loading…</p>}
      {error && (
        <p style={{ color: "crimson" }}>
          Error: {error} (Is the backend running on port 8000?)
        </p>
      )}

      <h3>Latest chain snapshots</h3>
      <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ddd" }}>
            <th>ID</th>
            <th>Time (UTC)</th>
            <th>Underlying</th>
            <th>DTE</th>
            <th>Expiration</th>
            <th>Checksum</th>
          </tr>
        </thead>
        <tbody>
          {items.map((x) => (
            <tr key={x.snapshot_id} style={{ borderBottom: "1px solid #f0f0f0" }}>
              <td>{x.snapshot_id}</td>
              <td>{x.ts}</td>
              <td>{x.underlying}</td>
              <td>{x.target_dte}</td>
              <td>{x.expiration}</td>
              <td>
                <code>{x.checksum.slice(0, 12)}</code>
              </td>
            </tr>
          ))}
          {items.length === 0 && !loading && !error && (
            <tr>
              <td colSpan={6} style={{ color: "#555" }}>
                No snapshots yet. (During market hours, the scheduler will start inserting rows.)
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

