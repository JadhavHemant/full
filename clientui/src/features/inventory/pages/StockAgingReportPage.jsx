import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axios from 'axios';
import config from '../../../config';

const StockAgingReportPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agingData, setAgingData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [warehouse, setWarehouse] = useState('all');
  const [warehouses, setWarehouses] = useState([]);

  const AGE_COLORS = {
    '0-30': '#4caf50',
    '31-60': '#8bc34a',
    '61-90': '#ff9800',
    '91-180': '#ff5722',
    '180+': '#f44336'
  };

  useEffect(() => {
    fetchWarehouses();
    fetchStockAging();
  }, [warehouse]);

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.API_BASE_URL}/warehouses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWarehouses(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch warehouses:', err);
    }
  };

  const fetchStockAging = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const params = warehouse !== 'all' ? { warehouseId: warehouse } : {};
      
      const response = await axios.get(`${config.API_BASE_URL}/reports/stock-aging`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setAgingData(response.data.data?.items || []);
      setSummary(response.data.data?.summary || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch stock aging report');
    } finally {
      setLoading(false);
    }
  };

  const getAgeBracket = (days) => {
    if (days <= 30) return '0-30';
    if (days <= 60) return '31-60';
    if (days <= 90) return '61-90';
    if (days <= 180) return '91-180';
    return '180+';
  };

  const getAgeChip = (days) => {
    const bracket = getAgeBracket(days);
    return (
      <Chip
        label={`${days} days`}
        size="small"
        sx={{
          bgcolor: AGE_COLORS[bracket],
          color: 'white',
          fontWeight: 'bold'
        }}
      />
    );
  };

  const getChartData = () => {
    if (!summary) return [];
    return [
      { name: '0-30 days', count: summary.age_0_30?.count || 0, value: summary.age_0_30?.value || 0 },
      { name: '31-60 days', count: summary.age_31_60?.count || 0, value: summary.age_31_60?.value || 0 },
      { name: '61-90 days', count: summary.age_61_90?.count || 0, value: summary.age_61_90?.value || 0 },
      { name: '91-180 days', count: summary.age_91_180?.count || 0, value: summary.age_91_180?.value || 0 },
      { name: '180+ days', count: summary.age_180_plus?.count || 0, value: summary.age_180_plus?.value || 0 }
    ];
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Stock Aging Report
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Warehouse</InputLabel>
            <Select
              value={warehouse}
              label="Warehouse"
              onChange={(e) => setWarehouse(e.target.value)}
            >
              <MenuItem value="all">All Warehouses</MenuItem>
              {warehouses.map((wh) => (
                <MenuItem key={wh.Id} value={wh.Id}>
                  {wh.Name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={fetchStockAging}>
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">0-30 Days</Typography>
                <Typography variant="h5">{summary.age_0_30?.count || 0}</Typography>
                <Typography variant="body2" color="success.main">
                  {formatCurrency(summary.age_0_30?.value || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: '#f1f8e9' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">31-60 Days</Typography>
                <Typography variant="h5">{summary.age_31_60?.count || 0}</Typography>
                <Typography variant="body2" color="success.light">
                  {formatCurrency(summary.age_31_60?.value || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: '#fff3e0' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">61-90 Days</Typography>
                <Typography variant="h5">{summary.age_61_90?.count || 0}</Typography>
                <Typography variant="body2" color="warning.main">
                  {formatCurrency(summary.age_61_90?.value || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: '#fbe9e7' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">91-180 Days</Typography>
                <Typography variant="h5">{summary.age_91_180?.count || 0}</Typography>
                <Typography variant="body2" color="error.light">
                  {formatCurrency(summary.age_91_180?.value || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card sx={{ bgcolor: '#ffebee' }}>
              <CardContent>
                <Typography variant="body2" color="text.secondary">180+ Days</Typography>
                <Typography variant="h5">{summary.age_180_plus?.count || 0}</Typography>
                <Typography variant="body2" color="error.main">
                  {formatCurrency(summary.age_180_plus?.value || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Charts */}
      {summary && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" mb={2}>Stock Value by Age</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="value" fill="#8884d8" name="Value">
                    {getChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(AGE_COLORS)[index]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" mb={2}>Item Count Distribution</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getChartData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, count }) => `${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {getChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(AGE_COLORS)[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Data Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product Code</TableCell>
                <TableCell>Product Name</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Value</TableCell>
                <TableCell align="right">Last Movement</TableCell>
                <TableCell align="center">Age (Days)</TableCell>
                <TableCell>Warehouse</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {agingData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary" py={4}>
                      No aging data available
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                agingData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.ProductCode}</TableCell>
                    <TableCell>{item.ProductName}</TableCell>
                    <TableCell align="right">{item.StockQuantity}</TableCell>
                    <TableCell align="right">{formatCurrency(item.TotalValue)}</TableCell>
                    <TableCell align="right">
                      {item.LastMovementDate ? new Date(item.LastMovementDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell align="center">{getAgeChip(item.AgeDays)}</TableCell>
                    <TableCell>{item.WarehouseName || 'N/A'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Information */}
      <Paper sx={{ p: 2, mt: 3, bgcolor: '#f5f5f5' }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Stock Aging Report:</strong> Shows how long inventory has been sitting in your warehouse. 
          Older stock (90+ days) may indicate slow-moving items that need attention through discounting, promotions, or liquidation.
          Fresh stock (0-30 days) indicates healthy inventory turnover.
        </Typography>
      </Paper>
    </Box>
  );
};

export default StockAgingReportPage;
