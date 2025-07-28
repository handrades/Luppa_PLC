import { Box, Card, CardContent, Grid, Paper, Typography } from '@mui/material'
import { 
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Computer as ComputerIcon,
  Warning as WarningIcon 
} from '@mui/icons-material'

export function DashboardPage() {
  return (
    <Box>
      <Typography variant="h4" component="h1" mb={3}>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Overview of your PLC inventory system
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <ComputerIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
              <Box>
                <Typography variant="h6" component="div">
                  Total PLCs
                </Typography>
                <Typography variant="h4" color="primary">
                  0
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
              <Box>
                <Typography variant="h6" component="div">
                  Online
                </Typography>
                <Typography variant="h4" color="success.main">
                  0
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <WarningIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
              <Box>
                <Typography variant="h6" component="div">
                  Alerts
                </Typography>
                <Typography variant="h4" color="warning.main">
                  0
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ display: 'flex', alignItems: 'center' }}>
              <AssessmentIcon sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
              <Box>
                <Typography variant="h6" component="div">
                  Sites
                </Typography>
                <Typography variant="h4" color="info.main">
                  0
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" mb={2}>
              Recent Activity
            </Typography>
            <Typography color="text.secondary">
              No recent activity to display. Start by adding PLCs to your inventory.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

