import React from "react";
import { fetchChainSnapshots, runSnapshotNow, type ChainSnapshot, type RunSnapshotResult } from "./api";

export function App() {
  const [items, setItems] = React.useState<ChainSnapshot[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [adminKey, setAdminKey] = React.useState<string>("");
  const [runResult, setRunResult] = React.useState<RunSnapshotResult | null>(null);

  const refresh = React.useCallback(() => {
    setError(null);
    setLoading(true);
    fetchChainSnapshots(50)
      .then((rows) => setItems(rows))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const runSnapshot = React.useCallback(async () => {
    setError(null);
    setRunResult(null);
    try {
      const result = await runSnapshotNow(adminKey.trim() ? adminKey.trim() : undefined);
      setRunResult(result);
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [adminKey, refresh]);

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 1000, margin: "40px auto", padding: 16 }}>
      <h2>SPX Tools</h2>
      <p style={{ color: "#555" }}>React dashboard (MVP)</p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "16px 0" }}>
        <button onClick={refresh} style={{ padding: "8px 12px" }}>
          Refresh
        </button>
        <button onClick={runSnapshot} style={{ padding: "8px 12px" }}>
          Run snapshot now
        </button>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ color: "#555" }}>Admin key (optional)</span>
          <input
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="X-API-Key"
            style={{ padding: "8px 10px", width: 260 }}
          />
        </label>
      </div>

      {loading && <p>Loading…</p>}
      {error && (
        <p style={{ color: "crimson" }}>
          Error: {error} (Is the backend running on port 8000?)
        </p>
      )}

      {runResult && (
        <div style={{ background: "#f7f7f7", padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Snapshot run result</strong>
          </div>
          <pre style={{ margin: 0, overflowX: "auto" }}>{JSON.stringify(runResult, null, 2)}</pre>
        </div>
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
                No snapshots yet. Try clicking “Run snapshot now”.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

