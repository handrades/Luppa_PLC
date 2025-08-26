/**
 * ImportExportPage Component
 * Main page for import/export functionality
 *
 * Combines import, export, and history features in a single interface
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import {
  CloudDownload as DownloadIcon,
  History as HistoryIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { ImportDialog } from '../../components/import-export/ImportDialog';
import { ExportDialog } from '../../components/import-export/ExportDialog';
import { ImportHistoryPage } from './ImportHistoryPage';
import { useEquipmentData } from '../../stores/equipment.store';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`import-export-tabpanel-${index}`}
      aria-labelledby={`import-export-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `import-export-tab-${index}`,
    'aria-controls': `import-export-tabpanel-${index}`,
  };
}

export const ImportExportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const equipment = useEquipmentData();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleImportClick = () => {
    setImportDialogOpen(true);
  };

  const handleExportClick = () => {
    setExportDialogOpen(true);
  };

  const handleImportClose = () => {
    setImportDialogOpen(false);
    // If import was successful, switch to history tab
    if (activeTab === 0) {
      setActiveTab(2);
    }
  };

  const handleExportClose = () => {
    setExportDialogOpen(false);
  };

  return (
    <Box>
      <Typography variant='h4' component='h1' sx={{ mb: 3 }}>
        Import / Export
      </Typography>

      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label='import export tabs'
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label='Import' icon={<UploadIcon />} iconPosition='start' {...a11yProps(0)} />
          <Tab label='Export' icon={<DownloadIcon />} iconPosition='start' {...a11yProps(1)} />
          <Tab label='History' icon={<HistoryIcon />} iconPosition='start' {...a11yProps(2)} />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant='h6' gutterBottom>
                        Import Equipment Data
                      </Typography>
                      <Typography variant='body2' color='text.secondary' paragraph>
                        Import equipment data from CSV files. The system will validate the data and
                        show a preview before importing.
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant='subtitle2' gutterBottom>
                        Supported Formats:
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        • CSV files with headers matching equipment fields
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        • Maximum file size: 10MB
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        • Required fields: name, equipment_type
                      </Typography>
                    </Box>

                    <Box>
                      <Button
                        variant='contained'
                        startIcon={<UploadIcon />}
                        onClick={handleImportClick}
                        size='large'
                      >
                        Import Equipment
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Stack spacing={3}>
                    <Box>
                      <Typography variant='h6' gutterBottom>
                        Export Equipment Data
                      </Typography>
                      <Typography variant='body2' color='text.secondary' paragraph>
                        Export your equipment data to CSV format. You can export all data or apply
                        filters to export specific equipment.
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant='subtitle2' gutterBottom>
                        Export Options:
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        • Export all equipment ({equipment.length} items)
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        • Filter by site, cell, or equipment type
                      </Typography>
                      <Typography variant='body2' color='text.secondary'>
                        • Choose specific columns to export
                      </Typography>
                    </Box>

                    <Box>
                      <Button
                        variant='contained'
                        startIcon={<DownloadIcon />}
                        onClick={handleExportClick}
                        size='large'
                      >
                        Export Equipment
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <ImportHistoryPage />
        </TabPanel>
      </Paper>

      {/* Import Dialog */}
      <ImportDialog open={importDialogOpen} onClose={handleImportClose} />

      {/* Export Dialog */}
      <ExportDialog open={exportDialogOpen} onClose={handleExportClose} />
    </Box>
  );
};

export default ImportExportPage;
