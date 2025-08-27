# React Component Best Practices

## Component Structure

Follow consistent patterns for industrial UI components:

```typescript
// ✅ Good - Proper component structure
interface PlcCardProps {
  plc: PLCRecord;
  onStatusChange?: (id: string, status: EquipmentStatus) => void;
  showDetails?: boolean;
}

const PlcCard: React.FC<PlcCardProps> = ({
  plc,
  onStatusChange,
  showDetails = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStatusChange = useCallback((newStatus: EquipmentStatus) => {
    onStatusChange?.(plc.id, newStatus);
  }, [plc.id, onStatusChange]);

  return (
    <Card>
      <CardHeader
        title={plc.description}
        subheader={`${plc.make} ${plc.model}`}
        action={
          <PlcStatusIndicator
            status={plc.status}
            onChange={handleStatusChange}
          />
        }
      />
      {showDetails && (
        <CardContent>
          <PlcDetails plc={plc} />
        </CardContent>
      )}
    </Card>
  );
};
```

## Custom Hooks

Create reusable hooks for industrial data operations:

```typescript
// Custom hook for PLC data management
interface UsePlcDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const usePlcData = (
  filters: PlcQueryOptions,
  options: UsePlcDataOptions = {},
) => {
  const { autoRefresh = false, refreshInterval = 30000 } = options;
  const [data, setData] = useState<PLCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await plcApi.query(filters);
      setData(response.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchData]);

  return { data, loading, error, refetch: fetchData };
};
```
