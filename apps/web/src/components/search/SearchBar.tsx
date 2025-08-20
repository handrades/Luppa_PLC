import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Autocomplete,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Modal,
  Paper,
  Popper,
  TextField,
  Typography,
} from '@mui/material';
import {
  Clear as ClearIcon,
  Close as CloseIcon,
  Help as HelpIcon,
  History as HistoryIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useDebounce } from '../../hooks/useDebounce';
import { useSearchStore } from '../../stores/search.store';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  showHelp?: boolean;
  maxSuggestions?: number;
}

/**
 * SearchBar component with Material-UI design
 * Features debounced search, suggestions dropdown, and keyboard navigation
 */
export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search equipment, PLCs, sites...',
  onSearch,
  onClear,
  autoFocus = false,
  disabled = false,
  fullWidth = true,
  size = 'medium',
  showHelp = true,
  maxSuggestions = 10,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Store integration
  const {
    recentSearches,
    suggestions,
    // loading, // TODO: Use loading state for search feedback
    suggestionsLoading,
    setQuery,
    addToHistory,
    clearHistory,
    getSuggestions,
  } = useSearchStore();

  // Debounce the input value for suggestions
  const debouncedValue = useDebounce(inputValue, 300);

  // Handle input value changes
  const handleInputChange = useCallback((_event: React.SyntheticEvent, newValue: string) => {
    setInputValue(newValue);
    setShowSuggestions(newValue.length > 0);
  }, []);

  // Handle search execution
  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) return;

      const trimmedQuery = searchQuery.trim();
      setQuery(trimmedQuery);
      addToHistory(trimmedQuery);
      setShowSuggestions(false);
      onSearch?.(trimmedQuery);

      // Focus the input after search
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    },
    [setQuery, addToHistory, onSearch]
  );

  // Handle clear functionality
  const handleClear = useCallback(() => {
    setInputValue('');
    setQuery('');
    setShowSuggestions(false);
    onClear?.();
    inputRef.current?.focus();
  }, [setQuery, onClear]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    (suggestion: string) => {
      setInputValue(suggestion);
      handleSearch(suggestion);
    },
    [handleSearch]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          handleSearch(inputValue);
          break;
        case 'Escape':
          setShowSuggestions(false);
          inputRef.current?.blur();
          break;
        case 'ArrowDown':
          // Let Autocomplete handle arrow navigation
          break;
        default:
          break;
      }
    },
    [inputValue, handleSearch]
  );

  // Fetch suggestions when debounced value changes
  useEffect(() => {
    if (debouncedValue.length > 1) {
      getSuggestions(debouncedValue, maxSuggestions);
    }
  }, [debouncedValue, getSuggestions, maxSuggestions]);

  // Prepare suggestion options
  const suggestionOptions = React.useMemo(() => {
    const options: Array<{ label: string; type: 'recent' | 'suggestion' }> = [];

    // Add recent searches if input is empty or matches
    if (
      inputValue.length === 0 ||
      recentSearches.some(search => search.query.toLowerCase().includes(inputValue.toLowerCase()))
    ) {
      const matchingRecent = recentSearches
        .filter(
          search =>
            inputValue.length === 0 || search.query.toLowerCase().includes(inputValue.toLowerCase())
        )
        .slice(0, 5)
        .map(search => ({ label: search.query, type: 'recent' as const }));

      options.push(...matchingRecent);
    }

    // Add AI-generated suggestions
    const filteredSuggestions = suggestions
      .filter(suggestion => !options.some(opt => opt.label === suggestion))
      .slice(0, maxSuggestions - options.length)
      .map(suggestion => ({ label: suggestion, type: 'suggestion' as const }));

    options.push(...filteredSuggestions);

    return options;
  }, [inputValue, recentSearches, suggestions, maxSuggestions]);

  return (
    <>
      <Box sx={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
        <Autocomplete
          freeSolo
          options={suggestionOptions}
          getOptionLabel={option => (typeof option === 'string' ? option : option.label)}
          inputValue={inputValue}
          onInputChange={handleInputChange}
          onChange={(_event, value) => {
            if (value && typeof value === 'object') {
              handleSuggestionSelect(value.label);
            } else if (typeof value === 'string') {
              handleSuggestionSelect(value);
            }
          }}
          onOpen={() => setShowSuggestions(true)}
          onClose={() => setShowSuggestions(false)}
          open={showSuggestions && suggestionOptions.length > 0}
          disabled={disabled}
          loading={suggestionsLoading}
          PaperComponent={props => (
            <Paper {...props} elevation={3} sx={{ mt: 1 }}>
              {props.children}
            </Paper>
          )}
          PopperComponent={props => (
            <Popper {...props} placement='bottom-start' style={{ zIndex: 1300 }} />
          )}
          renderInput={params => (
            <TextField
              {...params}
              ref={inputRef}
              placeholder={placeholder}
              size={size}
              fullWidth={fullWidth}
              autoFocus={autoFocus}
              onKeyDown={handleKeyDown}
              sx={{
                '& .MuiInputBase-root': {
                  minHeight: size === 'medium' ? '48px' : '40px',
                  paddingRight: '8px',
                },
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: 'primary.main',
                  },
                  '&.Mui-focused fieldset': {
                    borderWidth: 2,
                    borderColor: 'primary.main',
                  },
                },
              }}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position='start'>
                    <SearchIcon color='action' />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position='end'>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {suggestionsLoading && (
                        <CircularProgress size={20} sx={{ color: 'primary.main' }} />
                      )}
                      {inputValue && (
                        <IconButton
                          size='small'
                          onClick={handleClear}
                          aria-label='Clear search'
                          sx={{ padding: 0.5 }}
                        >
                          <ClearIcon fontSize='small' />
                        </IconButton>
                      )}
                      {showHelp && (
                        <IconButton
                          size='small'
                          onClick={() => setHelpModalOpen(true)}
                          aria-label='Search help'
                          sx={{ padding: 0.5 }}
                        >
                          <HelpIcon fontSize='small' />
                        </IconButton>
                      )}
                    </Box>
                  </InputAdornment>
                ),
                'aria-label': 'Equipment search',
                'aria-describedby': 'search-help',
              }}
            />
          )}
          renderOption={(props, option) => (
            <ListItem {...props} dense>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                {option.type === 'recent' ? (
                  <HistoryIcon fontSize='small' color='action' />
                ) : (
                  <SearchIcon fontSize='small' color='action' />
                )}
                <ListItemText
                  primary={option.label}
                  primaryTypographyProps={{
                    variant: 'body2',
                    noWrap: true,
                  }}
                />
                {option.type === 'recent' && (
                  <Chip
                    label='Recent'
                    size='small'
                    variant='outlined'
                    sx={{ fontSize: '0.75rem', height: 20 }}
                  />
                )}
              </Box>
            </ListItem>
          )}
          noOptionsText={
            inputValue.length > 0 ? 'No suggestions found' : 'Start typing to search...'
          }
        />
      </Box>

      {/* Search Help Modal */}
      <Modal
        open={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        aria-labelledby='search-help-title'
        aria-describedby='search-help-description'
      >
        <Card
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', sm: 500 },
            maxHeight: '80vh',
            overflow: 'auto',
          }}
        >
          <CardContent>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography id='search-help-title' variant='h6' component='h2'>
                Search Help
              </Typography>
              <IconButton
                onClick={() => setHelpModalOpen(false)}
                aria-label='Close help'
                size='small'
              >
                <CloseIcon />
              </IconButton>
            </Box>

            <Typography variant='body1' gutterBottom>
              Search across all equipment fields including descriptions, makes, models, sites, and
              more.
            </Typography>

            <Typography variant='h6' gutterBottom sx={{ mt: 3 }}>
              Search Tips:
            </Typography>

            <List dense>
              <ListItem>
                <ListItemText
                  primary='Simple Search'
                  secondary="Type any word or phrase: 'Siemens', 'PLC-001', 'Assembly Line'"
                />
              </ListItem>
              <Divider component='li' />
              <ListItem>
                <ListItemText
                  primary='Multiple Terms'
                  secondary="Search for multiple words: 'Siemens S7' will find equipment matching both terms"
                />
              </ListItem>
              <Divider component='li' />
              <ListItem>
                <ListItemText
                  primary='Partial Matching'
                  secondary="Start typing and get suggestions: 'Sie' will suggest 'Siemens'"
                />
              </ListItem>
              <Divider component='li' />
              <ListItem>
                <ListItemText
                  primary='IP Addresses'
                  secondary="Search by IP: '192.168.1' will find all equipment in that subnet"
                />
              </ListItem>
              <Divider component='li' />
              <ListItem>
                <ListItemText
                  primary='Site & Location'
                  secondary="Find by location: 'Building A', 'Line 2', 'Assembly Cell'"
                />
              </ListItem>
            </List>

            <Typography variant='h6' gutterBottom sx={{ mt: 2 }}>
              Keyboard Shortcuts:
            </Typography>

            <List dense>
              <ListItem>
                <ListItemText primary='Enter' secondary='Execute search' />
              </ListItem>
              <ListItem>
                <ListItemText primary='Escape' secondary='Close suggestions or clear focus' />
              </ListItem>
              <ListItem>
                <ListItemText primary='Arrow Keys' secondary='Navigate through suggestions' />
              </ListItem>
            </List>

            {recentSearches.length > 0 && (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 2,
                    mb: 1,
                  }}
                >
                  <Typography variant='h6'>Recent Searches:</Typography>
                  <IconButton onClick={clearHistory} size='small' aria-label='Clear search history'>
                    <ClearIcon fontSize='small' />
                  </IconButton>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {recentSearches.slice(0, 8).map((search, index) => (
                    <Chip
                      key={index}
                      label={search.query}
                      size='small'
                      onClick={() => {
                        handleSuggestionSelect(search.query);
                        setHelpModalOpen(false);
                      }}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Modal>
    </>
  );
};
