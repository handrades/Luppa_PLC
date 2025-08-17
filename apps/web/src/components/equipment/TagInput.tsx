/**
 * Tag Input Component for Equipment Forms
 * Story 4.4: Equipment Form UI - Task 5
 *
 * Provides multi-tag input functionality with chip display, validation,
 * drag-and-drop reordering, and proper accessibility support.
 */

import React, { KeyboardEvent, useCallback, useRef, useState } from 'react';
import {
  Box,
  Chip,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Add, Clear, DragIndicator } from '@mui/icons-material';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { TagInputProps } from '../../types/equipment-form';
import { EQUIPMENT_FORM_CONSTRAINTS } from '../../types/equipment-form';
import { singleTagSchema } from '../../validation/equipment.schema';

/**
 * Sortable Tag Chip Component
 */
interface SortableTagProps {
  tag: string;
  index: number;
  onRemove: (index: number) => void;
  disabled?: boolean;
}

const SortableTag: React.FC<SortableTagProps> = ({ tag, index, onRemove, disabled }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tag,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Chip
      ref={setNodeRef}
      style={style}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            {...attributes}
            {...listeners}
            sx={{
              display: 'flex',
              cursor: disabled ? 'default' : 'grab',
              '&:active': { cursor: disabled ? 'default' : 'grabbing' },
            }}
          >
            <DragIndicator sx={{ fontSize: 16 }} />
          </Box>
          {tag}
        </Box>
      }
      onDelete={disabled ? undefined : () => onRemove(index)}
      variant='outlined'
      size='small'
      sx={{
        '& .MuiChip-deleteIcon': {
          fontSize: 16,
        },
      }}
      aria-label={`Tag: ${tag}. Press delete to remove.`}
    />
  );
};

/**
 * Tag Input Component
 *
 * Features:
 * - Add tags on Enter key or comma input
 * - Remove tags individually or clear all
 * - Drag and drop reordering
 * - Tag validation (format, duplicates, limits)
 * - Accessibility support with proper ARIA attributes
 * - Visual feedback for validation errors
 */
const TagInput: React.FC<TagInputProps> = ({
  value = [],
  onChange,
  error,
  disabled = false,
  maxTags = EQUIPMENT_FORM_CONSTRAINTS.MAX_TAGS,
  placeholder = 'Enter tags...',
  label = 'Tags',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Validate a single tag
  const validateTag = useCallback(
    (tag: string): string | null => {
      const trimmedTag = tag.trim();

      if (!trimmedTag) {
        return 'Tag cannot be empty';
      }

      // Check for duplicates (case-insensitive)
      if (value.some(existingTag => existingTag.toLowerCase() === trimmedTag.toLowerCase())) {
        return 'Tag already exists';
      }

      // Validate using schema
      const result = singleTagSchema.safeParse(trimmedTag);
      if (!result.success) {
        return result.error.issues[0]?.message || 'Invalid tag format';
      }

      return null;
    },
    [value]
  );

  // Add a new tag
  const addTag = useCallback(
    (tagToAdd: string) => {
      const trimmedTag = tagToAdd.trim();

      if (!trimmedTag) {
        return;
      }

      // Check if we're at the maximum number of tags
      if (value.length >= maxTags) {
        setInputError(`Maximum ${maxTags} tags allowed`);
        return;
      }

      // Validate the tag
      const validationError = validateTag(trimmedTag);
      if (validationError) {
        setInputError(validationError);
        return;
      }

      // Add the tag
      onChange([...value, trimmedTag]);
      setInputValue('');
      setInputError('');

      // Focus back to input
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [value, maxTags, validateTag, onChange]
  );

  // Remove a tag by index
  const removeTag = useCallback(
    (indexToRemove: number) => {
      const newTags = value.filter((_, index) => index !== indexToRemove);
      onChange(newTags);

      // Focus back to input
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    [value, onChange]
  );

  // Clear all tags
  const clearAllTags = useCallback(() => {
    onChange([]);
    setInputValue('');
    setInputError('');
    inputRef.current?.focus();
  }, [onChange]);

  // Handle input change
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;

      // Check for comma or semicolon to auto-add tag
      if (newValue.includes(',') || newValue.includes(';')) {
        const tags = newValue
          .split(/[,;]/)
          .map(tag => tag.trim())
          .filter(Boolean);
        if (tags.length > 0) {
          addTag(tags[0]); // Add the first tag
          if (tags.length > 1) {
            setInputValue(tags.slice(1).join(','));
          }
          return;
        }
      }

      setInputValue(newValue);
      setInputError(''); // Clear input error when typing
    },
    [addTag]
  );

  // Handle key down events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          if (inputValue.trim()) {
            addTag(inputValue);
          }
          break;

        case 'Backspace':
          if (!inputValue && value.length > 0) {
            // Remove last tag if input is empty
            removeTag(value.length - 1);
          }
          break;

        case 'Escape':
          setInputValue('');
          setInputError('');
          break;
      }
    },
    [inputValue, addTag, value.length, removeTag]
  );

  // Handle drag and drop reordering
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Early return if over is null or active.id equals over.id
      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = value.indexOf(active.id as string);
      const newIndex = value.indexOf(over.id as string);

      // Only call arrayMove if both indices are valid (>= 0)
      if (oldIndex >= 0 && newIndex >= 0) {
        onChange(arrayMove(value, oldIndex, newIndex));
      }
    },
    [value, onChange]
  );

  // Calculate remaining slots
  const remainingSlots = maxTags - value.length;
  const isAtMaxTags = remainingSlots <= 0;

  return (
    <FormControl fullWidth error={!!error || !!inputError} disabled={disabled}>
      <FormLabel component='legend' sx={{ mb: 1 }}>
        {label}
        {remainingSlots > 0 && (
          <Typography variant='caption' sx={{ ml: 1, color: 'text.secondary' }}>
            ({remainingSlots} remaining)
          </Typography>
        )}
      </FormLabel>

      <Box
        sx={{
          border: 1,
          borderColor: error ? 'error.main' : 'grey.300',
          borderRadius: 1,
          p: 1,
          minHeight: 56,
          '&:focus-within': {
            borderColor: error ? 'error.main' : 'primary.main',
            borderWidth: 2,
          },
          ...(disabled && {
            backgroundColor: 'action.disabled',
            pointerEvents: 'none',
          }),
        }}
      >
        {/* Tags Display with Drag and Drop */}
        {value.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={value} strategy={horizontalListSortingStrategy}>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 0.5,
                  mb: 1,
                }}
              >
                {value.map((tag, index) => (
                  <SortableTag
                    key={tag}
                    tag={tag}
                    index={index}
                    onRemove={removeTag}
                    disabled={disabled}
                  />
                ))}
              </Box>
            </SortableContext>
          </DndContext>
        )}

        {/* Input Field */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TextField
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isAtMaxTags ? 'Maximum tags reached' : placeholder}
            disabled={disabled || isAtMaxTags}
            variant='standard'
            size='small'
            fullWidth
            error={!!inputError}
            InputProps={{
              disableUnderline: true,
              sx: { fontSize: '0.875rem' },
            }}
            inputProps={{
              'aria-label': 'Add new tag',
              'aria-describedby': inputError ? 'tag-input-error' : 'tag-input-help',
              maxLength: EQUIPMENT_FORM_CONSTRAINTS.TAG_MAX_LENGTH,
            }}
          />

          {/* Add Button */}
          {inputValue.trim() && !isAtMaxTags && (
            <Tooltip title='Add tag'>
              <IconButton
                size='small'
                onClick={() => addTag(inputValue)}
                disabled={disabled}
                aria-label='Add tag'
              >
                <Add />
              </IconButton>
            </Tooltip>
          )}

          {/* Clear All Button */}
          {value.length > 0 && (
            <Tooltip title='Clear all tags'>
              <IconButton
                size='small'
                onClick={clearAllTags}
                disabled={disabled}
                aria-label='Clear all tags'
              >
                <Clear />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Helper Text */}
      <FormHelperText id='tag-input-help'>
        {inputError && (
          <span id='tag-input-error' style={{ color: 'error.main' }}>
            {inputError}
          </span>
        )}
        {!inputError && error && error}
        {!inputError && !error && (
          <span>
            Press Enter or comma to add tags. {EQUIPMENT_FORM_CONSTRAINTS.TAG_MAX_LENGTH} characters
            max per tag.
            {value.length > 0 && ' Drag tags to reorder.'}
          </span>
        )}
      </FormHelperText>
    </FormControl>
  );
};

export default React.memo(TagInput);
