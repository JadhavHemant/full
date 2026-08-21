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
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import axios from 'axios';
import config from '../../../config';

const ABCAnalysisPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [warehouse, setWarehouse] = useState('all');
  const [warehouses, setWarehouses] = useState([]);

  const COLORS = {
    A: '#4caf50',
    B: '#ff9800',
    C: '#f44336'
  };

  useEffect(() => {
    fetchWarehouses();
    fetchABCAnalysis();
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

  const fetchABCAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const params = warehouse !== 'all' ? { warehouseId: warehouse } : {};
      
      const response = await axios.get(`${config.API_BASE_URL}/reports/abc-analysis`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      setAnalysisData(response.data.data?.items || []);
      setSummary(response.data.data?.summary || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch ABC analysis');
    } finally {
      setLoading(false);
    }
  };

  const getPieChartData = () => {
    if (!summary) return [];
    return [
      { name: 'Class A', value: summary.categoryA?.count || 0, percentage: summary.categoryA?.percentage || 0 },
      { name: 'Class B', value: summary.categoryB?.count || 0, percentage: summary.categoryB?.percentage || 0 },
      { name: 'Class C', value: summary.categoryC?.count || 0, percentage: summary.categoryC?.percentage || 0 }
    ];
  };

  const getValueChartData = () => {
    if (!summary) return [];
    return [
      { name: 'Class A', value: summary.categoryA?.value || 0 },
      { name: 'Class B', value: summary.categoryB?.value || 0 },
      { name: 'Class C', value: summary.categoryC?.value || 0 }
    ];
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  const getClassChip = (classification) => {
    return (
      <Chip
        label={`Class ${classification}`}
        size="small"
        sx={{
          bgcolor: COLORS[classification],
          color: 'white',
          fontWeight: 'bold'
        }}
      />
    );
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
          ABC Analysis
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
          <Button variant="contained" onClick={fetchABCAnalysis}>
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
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Typography variant="h6" color="success.main">Class A (High Value)</Typography>
                <Typography variant="h4">{summary.categoryA?.count || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {summary.categoryA?.percentage?.toFixed(1) || 0}% of items | {summary.categoryA?.valuePercentage?.toFixed(1) || 0}% of value
                </Typography>
                <Typography variant="h6" color="success.main" mt={1}>
                  {formatCurrency(summary.categoryA?.value || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#fff3e0' }}>
              <CardContent>
                <Typography variant="h6" color="warning.main">Class B (Medium Value)</Typography>
                <Typography variant="h4">{summary.categoryB?.count || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {summary.categoryB?.percentage?.toFixed(1) || 0}% of items | {summary.categoryB?.valuePercentage?.toFixed(1) || 0}% of value
                </Typography>
                <Typography variant="h6" color="warning.main" mt={1}>
                  {formatCurrency(summary.categoryB?.value || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#ffebee' }}>
              <CardContent>
                <Typography variant="h6" color="error.main">Class C (Low Value)</Typography>
                <Typography variant="h4">{summary.categoryC?.count || 0}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {summary.categoryC?.percentage?.toFixed(1) || 0}% of items | {summary.categoryC?.valuePercentage?.toFixed(1) || 0}% of value
                </Typography>
                <Typography variant="h6" color="error.main" mt={1}>
                  {formatCurrency(summary.categoryC?.value || 0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Charts */}
      {summary && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" mb={2}>Item Distribution</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getPieChartData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getPieChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" mb={2}>Value Distribution</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getValueChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#8884d8">
                    {getValueChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index]} />
                    ))}
                  </Bar>
                </BarChart>
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
                <TableCell align="right">Cumulative %</TableCell>
                <TableCell align="center">Classification</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {analysisData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" py={4}>
                      No data available for ABC analysis
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                analysisData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.ProductCode}</TableCell>
                    <TableCell>{item.ProductName}</TableCell>
                    <TableCell align="right">{item.StockQuantity}</TableCell>
                    <TableCell align="right">{formatCurrency(item.TotalValue)}</TableCell>
                    <TableCell align="right">{item.CumulativePercentage?.toFixed(2)}%</TableCell>
                    <TableCell align="center">{getClassChip(item.Classification)}</TableCell>
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
          <strong>ABC Analysis:</strong> Class A items (high value) typically represent 70-80% of inventory value but only 10-20% of items. 
          Class B items (medium value) represent 15-25% of value and 20-30% of items. 
          Class C items (low value) represent 5-10% of value but 50-70% of items.
        </Typography>
      </Paper>
    </Box>
  );
};

export default ABCAnalysisPage;
