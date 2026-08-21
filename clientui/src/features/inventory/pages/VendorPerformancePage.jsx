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
  Rating,
  Button,
  TextField,
  InputAdornment
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Search as SearchIcon, TrendingUp, TrendingDown, CheckCircle, Cancel, Schedule } from '@mui/icons-material';
import axios from 'axios';
import config from '../../../config';

const VendorPerformancePage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [summary, setSummary] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    fetchVendorPerformance();
  }, [dateRange]);

  const fetchVendorPerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${config.API_BASE_URL}/reports/vendor-performance`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { days: dateRange }
      });

      setVendors(response.data.data?.vendors || []);
      setSummary(response.data.data?.summary || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch vendor performance');
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.ContactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPerformanceRating = (score) => {
    if (score >= 90) return { rating: 5, label: 'Excellent', color: 'success' };
    if (score >= 75) return { rating: 4, label: 'Good', color: 'success' };
    if (score >= 60) return { rating: 3, label: 'Average', color: 'warning' };
    if (score >= 40) return { rating: 2, label: 'Below Average', color: 'error' };
    return { rating: 1, label: 'Poor', color: 'error' };
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  const getTopVendorsChart = () => {
    return vendors.slice(0, 10).map(v => ({
      name: v.Name?.substring(0, 20) || 'N/A',
      orders: v.TotalOrders || 0,
      value: v.TotalValue || 0
    }));
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
          Vendor Performance
        </Typography>
        <Box display="flex" gap={2}>
          <TextField
            size="small"
            select
            SelectProps={{ native: true }}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="180">Last 6 Months</option>
            <option value="365">Last Year</option>
          </TextField>
          <Button variant="contained" onClick={fetchVendorPerformance}>
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
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircle color="success" />
                  <Typography variant="body2" color="text.secondary">Total Vendors</Typography>
                </Box>
                <Typography variant="h4" mt={1}>{summary.totalVendors || 0}</Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Active: {summary.activeVendors || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <Schedule color="primary" />
                  <Typography variant="body2" color="text.secondary">Total Orders</Typography>
                </Box>
                <Typography variant="h4" mt={1}>{summary.totalOrders || 0}</Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Avg per vendor: {((summary.totalOrders || 0) / (summary.totalVendors || 1)).toFixed(1)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <TrendingUp color="success" />
                  <Typography variant="body2" color="text.secondary">Total Value</Typography>
                </Box>
                <Typography variant="h6" mt={1}>{formatCurrency(summary.totalValue || 0)}</Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Avg per order: {formatCurrency((summary.totalValue || 0) / (summary.totalOrders || 1))}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircle color="success" />
                  <Typography variant="body2" color="text.secondary">On-Time Delivery</Typography>
                </Box>
                <Typography variant="h4" mt={1}>{summary.avgOnTimeRate?.toFixed(1) || 0}%</Typography>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Quality: {summary.avgQualityRate?.toFixed(1) || 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Charts */}
      {vendors.length > 0 && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" mb={2}>Top 10 Vendors by Orders</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getTopVendorsChart()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#1976d2" name="Total Orders" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" mb={2}>Performance Distribution</Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">Excellent (90-100)</Typography>
                  <Typography variant="h6" color="success.main">
                    {vendors.filter(v => (v.PerformanceScore || 0) >= 90).length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Good (75-89)</Typography>
                  <Typography variant="h6" color="success.light">
                    {vendors.filter(v => (v.PerformanceScore || 0) >= 75 && (v.PerformanceScore || 0) < 90).length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Average (60-74)</Typography>
                  <Typography variant="h6" color="warning.main">
                    {vendors.filter(v => (v.PerformanceScore || 0) >= 60 && (v.PerformanceScore || 0) < 75).length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">Below Average (<60)</Typography>
                  <Typography variant="h6" color="error.main">
                    {vendors.filter(v => (v.PerformanceScore || 0) < 60).length}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Search */}
      <Box mb={2}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search vendors by name or contact person..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Data Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Vendor Name</TableCell>
                <TableCell>Contact Person</TableCell>
                <TableCell align="right">Total Orders</TableCell>
                <TableCell align="right">Total Value</TableCell>
                <TableCell align="center">On-Time %</TableCell>
                <TableCell align="center">Quality %</TableCell>
                <TableCell align="center">Performance</TableCell>
                <TableCell align="center">Rating</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredVendors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body2" color="text.secondary" py={4}>
                      {searchTerm ? 'No vendors match your search' : 'No vendor performance data available'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVendors.map((vendor, index) => {
                  const performance = getPerformanceRating(vendor.PerformanceScore || 0);
                  return (
                    <TableRow key={index}>
                      <TableCell>{vendor.Name || 'N/A'}</TableCell>
                      <TableCell>{vendor.ContactPerson || 'N/A'}</TableCell>
                      <TableCell align="right">{vendor.TotalOrders || 0}</TableCell>
                      <TableCell align="right">{formatCurrency(vendor.TotalValue || 0)}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${vendor.OnTimeDeliveryRate?.toFixed(0) || 0}%`}
                          size="small"
                          color={(vendor.OnTimeDeliveryRate || 0) >= 80 ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${vendor.QualityRate?.toFixed(0) || 0}%`}
                          size="small"
                          color={(vendor.QualityRate || 0) >= 80 ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${vendor.PerformanceScore?.toFixed(0) || 0} - ${performance.label}`}
                          size="small"
                          color={performance.color}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Rating value={performance.rating} readOnly size="small" />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Information */}
      <Paper sx={{ p: 2, mt: 3, bgcolor: '#f5f5f5' }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Vendor Performance:</strong> Performance score is calculated based on on-time delivery rate, quality rate, 
          order fulfillment rate, and response time. Higher scores indicate more reliable vendors.
        </Typography>
      </Paper>
    </Box>
  );
};

export default VendorPerformancePage;
