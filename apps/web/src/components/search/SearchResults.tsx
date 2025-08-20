import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DOMPurify from 'dompurify';
import {
  ArrowDropDown as ArrowDropDownIcon,
  Code as CodeIcon,
  GetApp as DownloadIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterIcon,
  OpenInNew as OpenInNewIcon,
  Sort as SortIcon,
  TableChart as TableChartIcon,
} from '@mui/icons-material';
import { FixedSizeList as VirtualizedList } from 'react-window';
import { SearchResultItem } from '../../types/search';
// import { useSearchStore } from '../../stores/search.store';
import { exportSearchResults } from '../../utils/searchExport';

interface SearchResultsProps {
  results?: SearchResultItem[];
  loading?: boolean;
  error?: string | null;
  totalResults?: number;
  searchQuery?: string;
  onResultClick?: (result: SearchResultItem) => void;
  onExport?: (results: SearchResultItem[]) => void;
  enableVirtualization?: boolean;
  virtualizationThreshold?: number;
  showRelevanceScore?: boolean;
  groupByType?: boolean;
}

interface GroupedResults {
  [key: string]: SearchResultItem[];
}

interface SearchResultCardProps {
  result: SearchResultItem;
  searchQuery?: string;
  onResultClick?: (result: SearchResultItem) => void;
  showRelevanceScore?: boolean;
  style?: React.CSSProperties;
}

/**
 * Individual search result card component
 */
const SearchResultCard: React.FC<SearchResultCardProps> = ({
  result,
  searchQuery,
  onResultClick,
  showRelevanceScore = false,
  style,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Render highlighted text or fallback to regular text
  const renderHighlightedText = (text: string, highlighted?: string) => {
    if (!highlighted || !searchQuery) {
      return text;
    }

    // Sanitize HTML content to prevent XSS attacks and allow only safe mark tags
    const sanitizedHtml = DOMPurify.sanitize(highlighted, {
      ALLOWED_TAGS: ['mark'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });

    // Add styling to mark tags and render as sanitized HTML
    const styledHtml = sanitizedHtml.replace(
      /<mark>/g,
      '<mark style="background-color: #fff59d; padding: 0 2px; border-radius: 2px;">'
    );

    return (
      <span
        dangerouslySetInnerHTML={{
          __html: styledHtml,
        }}
      />
    );
  };

  return (
    <Card
      sx={{
        mb: 1,
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: 3,
          transform: 'translateY(-1px)',
        },
        ...style,
      }}
      onClick={() => onResultClick?.(result)}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* Header with equipment name and relevance score */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant='h6' component='h3' sx={{ fontWeight: 600, mb: 0.5 }}>
              {renderHighlightedText(result.tag_id, result.highlighted_fields?.tag_id)}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 1 }}>
              {renderHighlightedText(
                result.plc_description,
                result.highlighted_fields?.description
              )}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
            {showRelevanceScore && (
              <Tooltip title={`Relevance Score: ${result.relevance_score.toFixed(3)}`}>
                <Chip
                  label={result.relevance_score.toFixed(2)}
                  size='small'
                  color='primary'
                  variant='outlined'
                />
              </Tooltip>
            )}
            <IconButton
              size='small'
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Equipment details row */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          <Chip
            label={renderHighlightedText(
              `${result.make} ${result.model}`,
              result.highlighted_fields?.make || result.highlighted_fields?.model
            )}
            size='small'
            variant='outlined'
          />
          <Chip
            label={result.equipment_type}
            size='small'
            color='secondary'
            variant='outlined'
          />
          {result.ip_address && (
            <Chip
              label={result.ip_address}
              size='small'
              color='info'
              variant='outlined'
            />
          )}
        </Box>

        {/* Hierarchy path */}
        <Typography variant='body2' color='text.secondary' sx={{ fontStyle: 'italic' }}>
          📍 {renderHighlightedText(result.hierarchy_path, 
            result.highlighted_fields?.site_name || 
            result.highlighted_fields?.cell_name || 
            result.highlighted_fields?.equipment_name
          )}
        </Typography>

        {/* Expandable details */}
        <Collapse in={expanded} timeout='auto' unmountOnExit>
          <Divider sx={{ my: 2 }} />
          
          <Stack spacing={1}>
            {result.firmware_version && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2' fontWeight={500}>
                  Firmware Version:
                </Typography>
                <Typography variant='body2'>
                  {result.firmware_version}
                </Typography>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant='body2' fontWeight={500}>
                Equipment:
              </Typography>
              <Typography variant='body2'>
                {result.equipment_name}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant='body2' fontWeight={500}>
                Cell:
              </Typography>
              <Typography variant='body2'>
                {result.cell_name} (Line {result.line_number})
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant='body2' fontWeight={500}>
                Site:
              </Typography>
              <Typography variant='body2'>
                {result.site_name}
              </Typography>
            </Box>

            {result.tags_text && (
              <Box>
                <Typography variant='body2' fontWeight={500} gutterBottom>
                  Related Tags:
                </Typography>
                <Typography variant='body2' color='text.secondary'>
                  {result.tags_text}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button
                size='small'
                startIcon={<OpenInNewIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to equipment details
                  onResultClick?.(result);
                }}
              >
                View Details
              </Button>
            </Box>
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
};

/**
 * Virtualized list item component for performance
 */
const VirtualizedResultItem: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: {
    results: SearchResultItem[];
    searchQuery?: string;
    onResultClick?: (result: SearchResultItem) => void;
    showRelevanceScore?: boolean;
  };
}> = ({ index, style, data }) => {
  const { results, searchQuery, onResultClick, showRelevanceScore } = data;
  const result = results[index];

  return (
    <div style={style}>
      <SearchResultCard
        result={result}
        searchQuery={searchQuery}
        onResultClick={onResultClick}
        showRelevanceScore={showRelevanceScore}
        style={{ margin: '0 8px 8px 8px' }}
      />
    </div>
  );
};

/**
 * SearchResults component with virtual scrolling and result highlighting
 */
export const SearchResults: React.FC<SearchResultsProps> = ({
  results = [],
  loading = false,
  error = null,
  totalResults = 0,
  searchQuery = '',
  onResultClick,
  onExport,
  enableVirtualization = true,
  virtualizationThreshold = 100,
  showRelevanceScore = false,
  groupByType = false,
}) => {
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [filterType, setFilterType] = useState<string>('all');
  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(null);

  // Memoized sorted and filtered results
  const processedResults = useMemo(() => {
    let filtered = results;

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(result => result.equipment_type === filterType);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.relevance_score - a.relevance_score;
        case 'name':
          return a.tag_id.localeCompare(b.tag_id);
        case 'make':
          return a.make.localeCompare(b.make);
        case 'site':
          return a.site_name.localeCompare(b.site_name);
        default:
          return 0;
      }
    });

    return sorted;
  }, [results, sortBy, filterType]);

  // Group results by equipment type if enabled
  const groupedResults = useMemo((): GroupedResults => {
    if (!groupByType) return { all: processedResults };

    return processedResults.reduce((groups, result) => {
      const type = result.equipment_type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(result);
      return groups;
    }, {} as GroupedResults);
  }, [processedResults, groupByType]);

  // Get unique equipment types for filter
  const equipmentTypes = useMemo(() => {
    return [...new Set(results.map(result => result.equipment_type))].sort();
  }, [results]);

  // Handle export menu
  const handleExportMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  }, []);

  const handleExportMenuClose = useCallback(() => {
    setExportMenuAnchor(null);
  }, []);

  // Handle export with format selection
  const handleExport = useCallback((format: 'csv' | 'json') => {
    try {
      const filename = `search_results_${searchQuery.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}`;
      
      exportSearchResults(processedResults, {
        format,
        filename,
        includeMetadata: true,
      });

      // Also call the legacy onExport prop if provided
      onExport?.(processedResults);
      
      handleExportMenuClose();
    } catch (error) {
      // console.error('Export failed:', error);
      // You could add a toast notification here
    }
  }, [processedResults, searchQuery, onExport, handleExportMenuClose]);

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
        <CircularProgress />
        <Typography variant='body1' sx={{ ml: 2 }}>
          Searching...
        </Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert severity='error' sx={{ mt: 2 }}>
        <Typography variant='body1' fontWeight={500}>
          Search Error
        </Typography>
        <Typography variant='body2'>
          {error}
        </Typography>
      </Alert>
    );
  }

  // No results state
  if (results.length === 0 && searchQuery) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
        <Typography variant='h6' gutterBottom>
          No results found for "{searchQuery}"
        </Typography>
        <Typography variant='body2' color='text.secondary' gutterBottom>
          Try adjusting your search terms or check the search help for tips.
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant='body2' fontWeight={500}>
            Search suggestions:
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            • Use shorter, more general terms
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            • Check for spelling mistakes
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            • Try searching by make, model, or location
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Controls bar
  const renderControls = () => (
    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <Typography variant='body2' color='text.secondary'>
        {totalResults} result{totalResults !== 1 ? 's' : ''} found
        {searchQuery && ` for "${searchQuery}"`}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
        {/* Equipment type filter */}
        <FormControl size='small' sx={{ minWidth: 120 }}>
          <InputLabel>Filter</InputLabel>
          <Select
            value={filterType}
            label='Filter'
            onChange={(e) => setFilterType(e.target.value)}
            startAdornment={<FilterIcon fontSize='small' />}
          >
            <MenuItem value='all'>All Types</MenuItem>
            {equipmentTypes.map(type => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Sort options */}
        <FormControl size='small' sx={{ minWidth: 120 }}>
          <InputLabel>Sort</InputLabel>
          <Select
            value={sortBy}
            label='Sort'
            onChange={(e) => setSortBy(e.target.value)}
            startAdornment={<SortIcon fontSize='small' />}
          >
            <MenuItem value='relevance'>Relevance</MenuItem>
            <MenuItem value='name'>Name</MenuItem>
            <MenuItem value='make'>Make</MenuItem>
            <MenuItem value='site'>Site</MenuItem>
          </Select>
        </FormControl>

        {/* Export button with menu */}
        {processedResults.length > 0 && (
          <>
            <Button
              variant='outlined'
              size='small'
              startIcon={<DownloadIcon />}
              endIcon={<ArrowDropDownIcon />}
              onClick={handleExportMenuOpen}
              aria-controls={exportMenuAnchor ? 'export-menu' : undefined}
              aria-haspopup='true'
            >
              Export
            </Button>
            <Menu
              id='export-menu'
              anchorEl={exportMenuAnchor}
              open={Boolean(exportMenuAnchor)}
              onClose={handleExportMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={() => handleExport('csv')}>
                <ListItemIcon>
                  <TableChartIcon fontSize='small' />
                </ListItemIcon>
                <ListItemText 
                  primary='Export as CSV'
                  secondary={`${processedResults.length} results`}
                />
              </MenuItem>
              <MenuItem onClick={() => handleExport('json')}>
                <ListItemIcon>
                  <CodeIcon fontSize='small' />
                </ListItemIcon>
                <ListItemText 
                  primary='Export as JSON'
                  secondary={`${processedResults.length} results`}
                />
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>
    </Box>
  );

  // Render grouped results
  const renderGroupedResults = () => {
    return Object.entries(groupedResults).map(([groupName, groupResults]) => (
      <Box key={groupName} sx={{ mb: 3 }}>
        {groupByType && groupName !== 'all' && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant='h6' component='h3'>
              {groupName}
            </Typography>
            <Badge badgeContent={groupResults.length} color='primary' sx={{ ml: 1 }} />
          </Box>
        )}
        {renderResultsList(groupResults)}
      </Box>
    ));
  };

  // Render results list (with or without virtualization)
  const renderResultsList = (resultsList: SearchResultItem[]) => {
    if (enableVirtualization && resultsList.length > virtualizationThreshold) {
      return (
        <VirtualizedList
          height={600}
          width="100%"
          itemCount={resultsList.length}
          itemSize={180}
          itemData={{
            results: resultsList,
            searchQuery,
            onResultClick,
            showRelevanceScore,
          }}
        >
          {VirtualizedResultItem}
        </VirtualizedList>
      );
    }

    return (
      <Box>
        {resultsList.map((result) => (
          <SearchResultCard
            key={result.plc_id}
            result={result}
            searchQuery={searchQuery}
            onResultClick={onResultClick}
            showRelevanceScore={showRelevanceScore}
          />
        ))}
      </Box>
    );
  };

  return (
    <Box>
      {renderControls()}
      {groupByType ? renderGroupedResults() : renderResultsList(processedResults)}
    </Box>
  );
};
