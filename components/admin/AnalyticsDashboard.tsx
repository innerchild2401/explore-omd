'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AnalyticsDashboardProps {
  omdId: string;
}

interface Metrics {
  totalVisitors: number;
  detailViews: number;
  contactClicks: number;
  bookings: number;
  totalRevenue: number;
  conversionRate: number;
}

interface Business {
  id: string;
  name: string;
  type: string;
}

interface TimeSeriesData {
  date: string;
  visitors: number;
  views: number;
  contacts: number;
  bookings: number;
  revenue: number;
}

interface TopBusiness {
  name: string;
  visitors: number;
  revenue: number;
}

export default function AnalyticsDashboard({ omdId }: AnalyticsDashboardProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({
    totalVisitors: 0,
    detailViews: 0,
    contactClicks: 0,
    bookings: 0,
    totalRevenue: 0,
    conversionRate: 0,
  });
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [topBusinesses, setTopBusinesses] = useState<TopBusiness[]>([]);

  useEffect(() => {
    fetchData();
  }, [selectedBusiness, selectedType, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get all businesses for this OMD
      const { data: businessesData } = await supabase
        .from('businesses')
        .select('id, name, type')
        .eq('omd_id', omdId)
        .eq('status', 'active');

      setBusinesses(businessesData || []);

      // Calculate date range
      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Build query filter
      let analyticsQuery = supabase
        .from('business_analytics')
        .select('event_type, revenue_amount, created_at, business_id');

      // Apply filters
      if (selectedBusiness !== 'all') {
        analyticsQuery = analyticsQuery.eq('business_id', selectedBusiness);
      }

      if (selectedType !== 'all') {
        // Filter by business type
        const businessIds = businessesData
          ?.filter((b) => b.type === selectedType)
          .map((b) => b.id) || [];
        if (businessIds.length > 0) {
          analyticsQuery = analyticsQuery.in('business_id', businessIds);
        } else {
          setMetrics({
            totalVisitors: 0,
            detailViews: 0,
            contactClicks: 0,
            bookings: 0,
            totalRevenue: 0,
            conversionRate: 0,
          });
          setLoading(false);
          return;
        }
      }

      // Filter by date range
      analyticsQuery = analyticsQuery.gte('created_at', startDate.toISOString());

      const { data: analyticsData } = await analyticsQuery;

      // Calculate metrics
      const totalVisitors =
        analyticsData?.filter((e) => e.event_type === 'page_view').length || 0;
      const detailViews =
        analyticsData?.filter((e) => e.event_type === 'detail_view').length || 0;
      const contactClicks =
        analyticsData?.filter((e) => e.event_type === 'contact_click').length || 0;
      const bookings =
        analyticsData?.filter((e) => e.event_type === 'booking_completed').length || 0;

      // Calculate revenue from bookings
      const revenueData = analyticsData?.filter(
        (e) => e.event_type === 'booking_completed' && e.revenue_amount
      ) || [];
      const totalRevenue = revenueData.reduce((sum, e) => sum + (e.revenue_amount || 0), 0);

      // Calculate conversion rate
      const conversionRate =
        totalVisitors > 0 ? parseFloat(((bookings / totalVisitors) * 100).toFixed(1)) : 0;

      setMetrics({
        totalVisitors,
        detailViews,
        contactClicks,
        bookings,
        totalRevenue,
        conversionRate,
      });

      // Calculate time series data
      const dailyData = new Map<string, { visitors: number; views: number; contacts: number; bookings: number; revenue: number }>();
      const businessesMap = new Map(businesses.map(b => [b.id, b]));

      analyticsData?.forEach(event => {
        const date = new Date(event.created_at).toISOString().split('T')[0];
        if (!dailyData.has(date)) {
          dailyData.set(date, { visitors: 0, views: 0, contacts: 0, bookings: 0, revenue: 0 });
        }
        const dayData = dailyData.get(date)!;
        
        if (event.event_type === 'page_view') dayData.visitors++;
        if (event.event_type === 'detail_view') dayData.views++;
        if (event.event_type === 'contact_click') dayData.contacts++;
        if (event.event_type === 'booking_completed') {
          dayData.bookings++;
          dayData.revenue += event.revenue_amount || 0;
        }
      });

      const sortedDailyData = Array.from(dailyData.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setTimeSeriesData(sortedDailyData);

      // Calculate top performing businesses
      const businessStats = new Map<string, { visitors: number; revenue: number }>();
      analyticsData?.forEach(event => {
        const businessId = event.business_id;
        const business = businessesMap.get(businessId);
        if (!business) return;

        if (!businessStats.has(businessId)) {
          businessStats.set(businessId, { visitors: 0, revenue: 0 });
        }
        const stats = businessStats.get(businessId)!;

        if (event.event_type === 'page_view') stats.visitors++;
        if (event.event_type === 'booking_completed' && event.revenue_amount) {
          stats.revenue += event.revenue_amount;
        }
      });

      const sortedBusinesses = Array.from(businessStats.entries())
        .map(([businessId, stats]) => {
          const business = businessesMap.get(businessId);
          return { name: business?.name || 'Unknown', visitors: stats.visitors, revenue: stats.revenue };
        })
        .sort((a, b) => b.visitors - a.visitors)
        .slice(0, 5);

      setTopBusinesses(sortedBusinesses);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBusinesses =
    selectedType === 'all'
      ? businesses
      : businesses.filter((b) => b.type === selectedType);

  return (
    <div className="space-y-6 text-gray-900">
      {/* Filters */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Date Range */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
            </select>
          </div>

          {/* Business Type */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Business Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring"
            >
              <option value="all">All Types</option>
              <option value="hotel">Hotels</option>
              <option value="restaurant">Restaurants</option>
              <option value="experience">Experiences</option>
            </select>
          </div>

          {/* Individual Business */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Business
            </label>
            <select
              value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring"
            >
              <option value="all">All Businesses</option>
              {filteredBusinesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Total Visitors */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Visitors</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.totalVisitors}</p>
              </div>
              <div className="rounded-full bg-blue-100 p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Detail Views */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Detail Views</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.detailViews}</p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Contact Clicks */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Contact Clicks</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.contactClicks}</p>
              </div>
              <div className="rounded-full bg-purple-100 p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Bookings */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bookings</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.bookings}</p>
              </div>
              <div className="rounded-full bg-yellow-100 p-3">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">€{metrics.totalRevenue.toFixed(2)}</p>
              </div>
              <div className="rounded-full bg-emerald-100 p-3">
                <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{metrics.conversionRate}%</p>
              </div>
              <div className="rounded-full bg-indigo-100 p-3">
                <svg className="h-6 w-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      {!loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Traffic Over Time */}
          {timeSeriesData.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Traffic Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="visitors" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="views" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="contacts" stackId="3" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Revenue Over Time */}
          {timeSeriesData.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Revenue Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    formatter={(value: number) => `€${value.toFixed(2)}`}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Conversion Funnel */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Conversion Funnel</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'Visitors', value: metrics.totalVisitors },
                { name: 'Detail Views', value: metrics.detailViews },
                { name: 'Contact Clicks', value: metrics.contactClicks },
                { name: 'Bookings', value: metrics.bookings },
              ]} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#666" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} stroke="#666" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Performing Businesses */}
          {topBusinesses.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">Top Performing Businesses</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topBusinesses}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 10 }}
                    stroke="#666"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="visitors" fill="#3b82f6" name="Visitors" />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue (€)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

