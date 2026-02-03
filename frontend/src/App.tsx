import React from "react";
import { fetchChainSnapshots, runSnapshotNow, type ChainSnapshot, type RunSnapshotResult } from "./api";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Container,
  Group,
  Loader,
  ScrollArea,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";

function truncate(s: string, n: number) {
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

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
    <Box bg="gray.0" mih="100vh" py="xl">
      <Container size="lg">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={2}>SPX Tools</Title>
            <Text c="dimmed" mt={4}>
              React dashboard (MVP)
            </Text>
          </div>
          <Badge variant="light">Snapshots</Badge>
        </Group>

        <Card withBorder radius="md" mt="lg" p="md">
          <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
            <Group>
              <Button onClick={refresh} variant="light">
                Refresh
              </Button>
              <Button onClick={runSnapshot}>Run snapshot now</Button>
            </Group>
            <TextInput
              label="Admin key (optional)"
              value={adminKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdminKey(e.currentTarget.value)}
              placeholder="X-API-Key"
              w={320}
            />
          </Group>
        </Card>

        {error && (
          <Alert mt="md" color="red" title="Error">
            <Text>
              {error} <Text span c="dimmed">(Is the backend running on port 8000?)</Text>
            </Text>
          </Alert>
        )}

        {runResult && (
          <Card withBorder radius="md" mt="md" p="md">
            <Group justify="space-between" mb="xs">
              <Text fw={600}>Snapshot run result</Text>
              <Badge variant="light" color={runResult.skipped ? "yellow" : "green"}>
                {runResult.skipped ? "Skipped" : "Inserted"}
              </Badge>
            </Group>
            <ScrollArea h={220} type="auto">
              <Code block>{JSON.stringify(runResult, null, 2)}</Code>
            </ScrollArea>
          </Card>
        )}

        <Card withBorder radius="md" mt="lg" p="md">
          <Group justify="space-between" align="center" mb="sm">
            <Text fw={600}>Latest chain snapshots</Text>
            {loading ? (
              <Group gap="xs">
                <Loader size="sm" />
                <Text c="dimmed" size="sm">
                  Loading…
                </Text>
              </Group>
            ) : (
              <Text c="dimmed" size="sm">
                {items.length} rows
              </Text>
            )}
          </Group>

          <ScrollArea type="auto">
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Time (UTC)</Table.Th>
                  <Table.Th>Underlying</Table.Th>
                  <Table.Th>DTE</Table.Th>
                  <Table.Th>Expiration</Table.Th>
                  <Table.Th>Checksum</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {items.map((x) => (
                  <Table.Tr key={x.snapshot_id}>
                    <Table.Td>{x.snapshot_id}</Table.Td>
                    <Table.Td>{x.ts}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">{x.underlying}</Badge>
                    </Table.Td>
                    <Table.Td>{x.target_dte}</Table.Td>
                    <Table.Td>{x.expiration}</Table.Td>
                    <Table.Td>
                      <Code>{truncate(x.checksum, 12)}</Code>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {items.length === 0 && !loading && !error && (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text c="dimmed">No snapshots yet. Try clicking “Run snapshot now”.</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card>
      </Container>
    </Box>
  );
}

