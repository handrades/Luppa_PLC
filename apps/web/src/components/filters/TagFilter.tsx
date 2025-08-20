/**
 * Tag Filter Component
 * Story 5.1: Advanced Filtering System
 *
 * Component for filtering by tags with AND/OR logic,
 * include/exclude lists, and tag suggestions.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  ButtonGroup,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormLabel,
  Paper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Clear as ClearIcon,
  Settings as LogicIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';

import type { TagFilter as TagFilterType, TagOption } from '../../types/advanced-filters';

/**
 * Props for TagFilter component
 */
interface TagFilterProps {
  tagFilter?: TagFilterType;
  availableTags: TagOption[];
  onChange: (tagFilter?: TagFilterType) => void;
  loading?: boolean;
}

/**
 * Tag input component for adding new tags
 */
interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: (tag: string) => void;
  availableTags: TagOption[];
  existingTags: string[];
  placeholder: string;
  loading?: boolean;
}

const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  onAdd,
  availableTags,
  existingTags,
  placeholder,
  loading = false,
}) => {
  const [inputValue, setInputValue] = useState('');

  // Filter available tags to exclude already selected ones
  const filteredTags = useMemo(() => {
    return availableTags
      .filter(tag => !existingTags.includes(tag.value))
      .sort((a, b) => b.frequency - a.frequency); // Sort by frequency
  }, [availableTags, existingTags]);

  const handleAdd = useCallback(
    (tag: string) => {
      if (tag.trim() && !existingTags.includes(tag.trim())) {
        onAdd(tag.trim());
        setInputValue('');
        onChange('');
      }
    },
    [onAdd, existingTags, onChange]
  );

  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && inputValue.trim()) {
        event.preventDefault();
        handleAdd(inputValue);
      }
    },
    [inputValue, handleAdd]
  );

  return (
    <Autocomplete
      freeSolo
      options={filteredTags}
      getOptionLabel={option => (typeof option === 'string' ? option : option.label)}
      renderOption={(props, option) => (
        <Box component='li' {...props}>
          <Box flex={1}>
            <Typography variant='body2'>{option.label}</Typography>
            {option.category && (
              <Typography variant='caption' color='textSecondary'>
                {option.category}
              </Typography>
            )}
          </Box>
          <Typography variant='caption' color='primary'>
            {option.count}
          </Typography>
        </Box>
      )}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      value={value}
      onChange={(_, newValue) => {
        if (typeof newValue === 'string') {
          handleAdd(newValue);
        } else if (newValue) {
          handleAdd(newValue.value);
        }
      }}
      renderInput={params => (
        <TextField
          {...params}
          size='small'
          placeholder={placeholder}
          onKeyPress={handleKeyPress}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading && <CircularProgress color='inherit' size={16} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      loading={loading}
    />
  );
};

/**
 * Tag list display component
 */
interface TagListProps {
  tags: string[];
  onRemove: (tag: string) => void;
  color: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  emptyMessage: string;
}

const TagList: React.FC<TagListProps> = ({ tags, onRemove, color, emptyMessage }) => {
  if (tags.length === 0) {
    return (
      <Typography variant='body2' color='textSecondary' sx={{ py: 1 }}>
        {emptyMessage}
      </Typography>
    );
  }

  return (
    <Box display='flex' flexWrap='wrap' gap={0.5}>
      {tags.map(tag => (
        <Chip
          key={tag}
          label={tag}
          size='small'
          color={color}
          variant='outlined'
          onDelete={() => onRemove(tag)}
          sx={{ fontSize: '0.75rem' }}
        />
      ))}
    </Box>
  );
};

/**
 * Tag filter component
 */
export const TagFilter: React.FC<TagFilterProps> = ({
  tagFilter,
  availableTags,
  onChange,
  loading = false,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [includeInput, setIncludeInput] = useState('');
  const [excludeInput, setExcludeInput] = useState('');

  const includeTags = useMemo(() => tagFilter?.include || [], [tagFilter?.include]);
  const excludeTags = useMemo(() => tagFilter?.exclude || [], [tagFilter?.exclude]);
  const logic = tagFilter?.logic || 'AND';

  // Handle logic change
  const handleLogicChange = useCallback(
    (newLogic: 'AND' | 'OR') => {
      if (includeTags.length > 0 || excludeTags.length > 0) {
        onChange({
          include: includeTags,
          exclude: excludeTags,
          logic: newLogic,
        });
      }
    },
    [includeTags, excludeTags, onChange]
  );

  // Handle include tag addition
  const handleIncludeAdd = useCallback(
    (tag: string) => {
      if (!includeTags.includes(tag) && !excludeTags.includes(tag)) {
        const newInclude = [...includeTags, tag];
        onChange({
          include: newInclude,
          exclude: excludeTags,
          logic,
        });
      }
    },
    [includeTags, excludeTags, logic, onChange]
  );

  // Handle exclude tag addition
  const handleExcludeAdd = useCallback(
    (tag: string) => {
      if (!excludeTags.includes(tag) && !includeTags.includes(tag)) {
        const newExclude = [...excludeTags, tag];
        onChange({
          include: includeTags,
          exclude: newExclude,
          logic,
        });
      }
    },
    [includeTags, excludeTags, logic, onChange]
  );

  // Handle include tag removal
  const handleIncludeRemove = useCallback(
    (tag: string) => {
      const newInclude = includeTags.filter(t => t !== tag);
      if (newInclude.length === 0 && excludeTags.length === 0) {
        onChange(undefined);
      } else {
        onChange({
          include: newInclude,
          exclude: excludeTags,
          logic,
        });
      }
    },
    [includeTags, excludeTags, logic, onChange]
  );

  // Handle exclude tag removal
  const handleExcludeRemove = useCallback(
    (tag: string) => {
      const newExclude = excludeTags.filter(t => t !== tag);
      if (newExclude.length === 0 && includeTags.length === 0) {
        onChange(undefined);
      } else {
        onChange({
          include: includeTags,
          exclude: newExclude,
          logic,
        });
      }
    },
    [includeTags, excludeTags, logic, onChange]
  );

  // Handle clear all
  const handleClearAll = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  const hasActiveTags = includeTags.length > 0 || excludeTags.length > 0;
  const allExistingTags = [...includeTags, ...excludeTags];

  return (
    <FormControl fullWidth>
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
        <FormLabel
          sx={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: 'text.primary',
          }}
        >
          Tag Filters
          {hasActiveTags && (
            <Typography component='span' variant='body2' sx={{ ml: 1, color: 'primary.main' }}>
              ({includeTags.length + excludeTags.length} tags)
            </Typography>
          )}
        </FormLabel>
        {hasActiveTags && (
          <Button size='small' startIcon={<ClearIcon />} onClick={handleClearAll} color='secondary'>
            Clear All
          </Button>
        )}
      </Box>

      {/* Logic selection */}
      {includeTags.length > 1 && (
        <Box mb={2}>
          <Typography variant='body2' color='textSecondary' gutterBottom>
            Include Logic:
          </Typography>
          <ButtonGroup size='small'>
            <Button
              variant={logic === 'AND' ? 'contained' : 'outlined'}
              onClick={() => handleLogicChange('AND')}
              startIcon={<LogicIcon />}
            >
              AND (All tags required)
            </Button>
            <Button
              variant={logic === 'OR' ? 'contained' : 'outlined'}
              onClick={() => handleLogicChange('OR')}
              startIcon={<LogicIcon />}
            >
              OR (Any tag matches)
            </Button>
          </ButtonGroup>
        </Box>
      )}

      {/* Tab navigation */}
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        variant='fullWidth'
        sx={{ mb: 2 }}
      >
        <Tab
          label={
            <Box display='flex' alignItems='center' gap={1}>
              <AddIcon fontSize='small' />
              Include ({includeTags.length})
            </Box>
          }
        />
        <Tab
          label={
            <Box display='flex' alignItems='center' gap={1}>
              <RemoveIcon fontSize='small' />
              Exclude ({excludeTags.length})
            </Box>
          }
        />
      </Tabs>

      {/* Include tags tab */}
      {activeTab === 0 && (
        <Box>
          <Typography variant='body2' color='textSecondary' gutterBottom>
            Equipment must have these tags
            {includeTags.length > 1 && ` (${logic} logic)`}:
          </Typography>

          <TagInput
            value={includeInput}
            onChange={setIncludeInput}
            onAdd={handleIncludeAdd}
            availableTags={availableTags}
            existingTags={allExistingTags}
            placeholder='Add tags to include...'
            loading={loading}
          />

          <Box mt={2}>
            <TagList
              tags={includeTags}
              onRemove={handleIncludeRemove}
              color='primary'
              emptyMessage='No include tags selected. Equipment can have any tags.'
            />
          </Box>
        </Box>
      )}

      {/* Exclude tags tab */}
      {activeTab === 1 && (
        <Box>
          <Typography variant='body2' color='textSecondary' gutterBottom>
            Equipment must NOT have these tags:
          </Typography>

          <TagInput
            value={excludeInput}
            onChange={setExcludeInput}
            onAdd={handleExcludeAdd}
            availableTags={availableTags}
            existingTags={allExistingTags}
            placeholder='Add tags to exclude...'
            loading={loading}
          />

          <Box mt={2}>
            <TagList
              tags={excludeTags}
              onRemove={handleExcludeRemove}
              color='error'
              emptyMessage='No exclude tags selected. No tags will be filtered out.'
            />
          </Box>
        </Box>
      )}

      {/* Logic explanation */}
      {hasActiveTags && (
        <>
          <Divider sx={{ my: 2 }} />
          <Paper
            variant='outlined'
            sx={{
              p: 1.5,
              bgcolor: 'info.50',
              borderColor: 'info.200',
            }}
          >
            <Typography variant='body2' fontWeight={500} gutterBottom>
              Current Filter Logic:
            </Typography>
            <Typography variant='body2' color='textSecondary'>
              {includeTags.length > 0 && (
                <>
                  Equipment must have {logic === 'AND' ? 'ALL' : 'ANY'} of: {includeTags.join(', ')}
                </>
              )}
              {includeTags.length > 0 && excludeTags.length > 0 && <br />}
              {excludeTags.length > 0 && <>Equipment must NOT have: {excludeTags.join(', ')}</>}
            </Typography>
          </Paper>
        </>
      )}

      {/* Popular tags suggestion */}
      {!hasActiveTags && availableTags.length > 0 && (
        <Box mt={2}>
          <Typography variant='body2' color='textSecondary' gutterBottom>
            Popular tags:
          </Typography>
          <Box display='flex' flexWrap='wrap' gap={0.5}>
            {availableTags
              .sort((a, b) => b.frequency - a.frequency)
              .slice(0, 10)
              .map(tag => (
                <Chip
                  key={tag.value}
                  label={`${tag.label} (${tag.count})`}
                  size='small'
                  variant='outlined'
                  clickable
                  onClick={() => handleIncludeAdd(tag.value)}
                  sx={{ fontSize: '0.75rem' }}
                />
              ))}
          </Box>
        </Box>
      )}

      {/* Validation warning */}
      {includeTags.length === 0 && excludeTags.length === 0 && (
        <Alert severity='info' sx={{ mt: 2, fontSize: '0.875rem' }}>
          Select tags to filter equipment. Use "Include" for tags that must be present and "Exclude"
          for tags that must not be present.
        </Alert>
      )}
    </FormControl>
  );
};
