# Performance Optimization

## Efficient Data Handling for Large Datasets

Optimize for handling 10,000+ PLCs:

```typescript
// Virtualization for large lists
interface PlcListProps {
  plcs: PLCRecord[];
  itemHeight: number;
}

const VirtualizedPlcList: React.FC<PlcListProps> = ({ plcs, itemHeight }) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    plcs.length
  );

  const visiblePlcs = plcs.slice(visibleStart, visibleEnd);

  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: plcs.length * itemHeight, position: 'relative' }}>
        {visiblePlcs.map((plc, index) => (
          <div
            key={plc.id}
            style={{
              position: 'absolute',
              top: (visibleStart + index) * itemHeight,
              height: itemHeight,
              width: '100%'
            }}
          >
            <PlcCard plc={plc} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Memoization Strategies

```typescript
// Expensive calculations for PLC health metrics
const calculatePlcHealthMetrics = useMemo(() => {
  return plcs.reduce(
    (metrics, plc) => {
      const health = calculatePlcHealthScore(
        plc.uptime,
        plc.errorCount,
        plc.lastResponseTime,
      );

      return {
        ...metrics,
        [plc.id]: health,
        averageHealth:
          (metrics.averageHealth * metrics.count + health) /
          (metrics.count + 1),
        count: metrics.count + 1,
      };
    },
    { averageHealth: 0, count: 0 },
  );
}, [plcs]);

// Memoized filter functions
const filteredPlcs = useMemo(() => {
  return plcs.filter((plc) => {
    const matchesSite = !filters.site || plc.location.siteName === filters.site;
    const matchesStatus = !filters.status || plc.status === filters.status;
    const matchesTags =
      !filters.tags?.length ||
      filters.tags.some((tag) => plc.tags.includes(tag));

    return matchesSite && matchesStatus && matchesTags;
  });
}, [plcs, filters.site, filters.status, filters.tags]);
```
