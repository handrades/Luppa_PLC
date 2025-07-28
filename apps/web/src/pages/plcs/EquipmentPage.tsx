import { Box, Button, Paper, Typography } from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'

export function EquipmentPage() {
  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <div>
          <Typography variant="h4" component="h1">
            Equipment
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your PLC inventory
          </Typography>
        </div>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          disabled
        >
          Add PLC
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" mb={2}>
          PLC Inventory
        </Typography>
        <Typography color="text.secondary">
          No PLCs found in your inventory. Click "Add PLC" to get started.
        </Typography>
      </Paper>
    </Box>
  )
}
