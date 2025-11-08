'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { formatPrice as formatPriceUtil } from '@/lib/utils';

interface PricingCalendarProps {
  room: any;
  onClose: () => void;
}

interface PricingRule {
  id: string;
  start_date: string;
  end_date: string;
  price_per_night: number;
  min_stay: number;
  max_stay?: number;
  pricing_type: string;
  template_id?: string;
  color_code: string;
  notes?: string;
  is_active: boolean;
}

interface PricingTemplate {
  id: string;
  name: string;
  description: string;
  base_price_adjustment_type: string;
  base_price_adjustment_value: number;
  color_code: string;
  min_stay: number;
  max_stay?: number;
}

export default function PricingCalendar({ room, onClose }: PricingCalendarProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [templates, setTemplates] = useState<PricingTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isSyncedFromOctorate, setIsSyncedFromOctorate] = useState(false);
  const [hotelPmsType, setHotelPmsType] = useState<string>('internal');

  // Calendar interaction states
  const [selectedDates, setSelectedDates] = useState<{start: Date | null, end: Date | null}>({start: null, end: null});
  const [isSelecting, setIsSelecting] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    price_per_night: '',
    min_stay: '1',
    max_stay: '',
    pricing_type: 'custom',
    template_id: '',
    color_code: '#3B82F6',
    notes: ''
  });

  const calendarRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if hotel uses Octorate
      const { data: hotelData } = await supabase
        .from('hotels')
        .select('pms_type, octorate_connection_id')
        .eq('id', room.hotel_id)
        .single();

      if (hotelData) {
        setHotelPmsType(hotelData.pms_type || 'internal');
        if (hotelData.pms_type === 'octorate') {
          // Check if room is synced from Octorate
          const { data: roomData } = await supabase
            .from('rooms')
            .select('is_synced_from_octorate')
            .eq('id', room.id)
            .single();
          
          setIsSyncedFromOctorate(roomData?.is_synced_from_octorate || false);
        }
      }
      
      // Fetch pricing rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('room_pricing')
        .select('*')
        .eq('room_id', room.id)
        .order('start_date', { ascending: true });

      if (rulesError) throw rulesError;

      // Fetch templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('pricing_templates')
        .select('*')
        .eq('hotel_id', room.hotel_id)
        .eq('is_active', true);

      if (templatesError) throw templatesError;

      // Fetch conflicts
      const { data: conflictsData, error: conflictsError } = await supabase
        .from('pricing_conflicts')
        .select('*')
        .eq('room_id', room.id)
        .eq('is_resolved', false);

      if (conflictsError) throw conflictsError;

      setPricingRules(rulesData || []);
      setTemplates(templatesData || []);
      setConflicts(conflictsData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [room.hotel_id, room.id, supabase]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getPricingForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    // Find the most specific pricing rule for this date
    const applicableRules = pricingRules.filter(rule => 
      rule.is_active &&
      dateStr >= rule.start_date &&
      dateStr <= rule.end_date
    );
    
    if (applicableRules.length === 0) {
      return {
        price: room.base_price,
        color: '#E5E7EB',
        rule: null,
        isBase: true
      };
    }
    
    // Sort by specificity (shortest range first)
    const mostSpecific = applicableRules.sort((a, b) => {
      const aRange = new Date(a.end_date).getTime() - new Date(a.start_date).getTime();
      const bRange = new Date(b.end_date).getTime() - new Date(b.start_date).getTime();
      return aRange - bRange;
    })[0];
    
    return {
      price: mostSpecific.price_per_night,
      color: mostSpecific.color_code,
      rule: mostSpecific,
      isBase: false
    };
  };

  const handleDateClick = (date: Date) => {
    if (!isSelecting) {
      // Start new selection
      setSelectedDates({ start: date, end: null });
      setIsSelecting(true);
    } else {
      // Complete selection
      if (selectedDates.start && date >= selectedDates.start) {
        setSelectedDates({ start: selectedDates.start, end: date });
        setIsSelecting(false);
        setShowForm(true);
      } else {
        // Reset selection
        setSelectedDates({ start: date, end: null });
      }
    }
  };

  const handleDateHover = (date: Date) => {
    if (isSelecting && selectedDates.start) {
      setHoveredDate(date);
    }
  };

  const handleMouseLeave = () => {
    if (!isSyncedFromOctorate) {
      setHoveredDate(null);
    }
  };

  const isDateInRange = (date: Date, start: Date | null, end: Date | null) => {
    if (!start) return false;
    if (!end) return date.getTime() === start.getTime();
    return date >= start && date <= end;
  };

  const isDateSelected = (date: Date) => {
    return isDateInRange(date, selectedDates.start, selectedDates.end) ||
           isDateInRange(date, selectedDates.start, hoveredDate);
  };

  const handleSavePricingRule = async () => {
    if (isSyncedFromOctorate) {
      setError('Pricing is synced from Octorate and cannot be edited here. Please manage pricing in Octorate.');
      return;
    }

    if (!selectedDates.start || !selectedDates.end || !formData.price_per_night) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('room_pricing')
        .insert({
          room_id: room.id,
          start_date: selectedDates.start.toISOString().split('T')[0],
          end_date: selectedDates.end.toISOString().split('T')[0],
          price_per_night: parseFloat(formData.price_per_night),
          min_stay: parseInt(formData.min_stay),
          max_stay: formData.max_stay ? parseInt(formData.max_stay) : null,
          pricing_type: formData.pricing_type,
          template_id: formData.template_id || null,
          color_code: formData.color_code,
          notes: formData.notes || null,
        });

      if (insertError) throw insertError;

      // Reset form and selection
      setSelectedDates({ start: null, end: null });
      setShowForm(false);
      setFormData({
        price_per_night: '',
        min_stay: '1',
        max_stay: '',
        pricing_type: 'custom',
        template_id: '',
        color_code: '#3B82F6',
        notes: ''
      });

      // Refresh data
      await fetchData();
      router.refresh();
    } catch (err: any) {
      console.error('Error saving pricing rule:', err);
      setError(err.message || 'Failed to save pricing rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Delete this pricing rule?')) return;

    try {
      const { error } = await supabase
        .from('room_pricing')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;

      await fetchData();
      router.refresh();
    } catch (err: any) {
      console.error('Error deleting rule:', err);
      setError(err.message);
    }
  };

  const applyTemplate = async (template: PricingTemplate) => {
    if (!selectedDates.start || !selectedDates.end) {
      setError('Please select a date range first');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let price = room.base_price;
      
      // Calculate price based on template
      if (template.base_price_adjustment_type === 'percentage') {
        price = room.base_price * (1 + template.base_price_adjustment_value / 100);
      } else if (template.base_price_adjustment_type === 'fixed') {
        price = room.base_price + template.base_price_adjustment_value;
      } else if (template.base_price_adjustment_type === 'multiplier') {
        price = room.base_price * template.base_price_adjustment_value;
      }

      const { error: insertError } = await supabase
        .from('room_pricing')
        .insert({
          room_id: room.id,
          start_date: selectedDates.start.toISOString().split('T')[0],
          end_date: selectedDates.end.toISOString().split('T')[0],
          price_per_night: Math.round(price * 100) / 100,
          min_stay: template.min_stay,
          max_stay: template.max_stay || null,
          pricing_type: 'template',
          template_id: template.id,
          color_code: template.color_code,
          notes: `Applied template: ${template.name}`,
        });

      if (insertError) throw insertError;

      // Reset selection
      setSelectedDates({ start: null, end: null });
      setShowForm(false);

      // Refresh data
      await fetchData();
      router.refresh();
    } catch (err: any) {
      console.error('Error applying template:', err);
      setError(err.message || 'Failed to apply template');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return formatPriceUtil(price, 'RON');
  };

  const days = getDaysInMonth(currentMonth);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[95vh] w-full max-w-7xl overflow-y-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Pricing Calendar</h2>
              <p className="text-sm text-gray-600">
                {room.name} • Base Price: {formatPrice(room.base_price)}/night
              </p>
              {isSyncedFromOctorate && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 w-fit">
                  <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium text-blue-900">
                    🔒 Read-only: Pricing synced from Octorate
                  </span>
                </div>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Month Navigation */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="rounded-lg bg-gray-100 px-3 py-2 text-gray-700 hover:bg-gray-200"
            >
              ← Previous
            </button>
            <h3 className="text-xl font-semibold text-gray-900">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="rounded-lg bg-gray-100 px-3 py-2 text-gray-700 hover:bg-gray-200"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-8 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Calendar */}
              <div className="lg:col-span-2">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-4 text-sm text-gray-600">
                    💡 Click and drag to select date ranges for pricing
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center text-sm">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="p-2 font-medium text-gray-500">
                        {day}
                      </div>
                    ))}
                    
                    {days.map((day, index) => {
                      if (!day) {
                        return <div key={index} className="h-12"></div>;
                      }
                      
                      const pricing = getPricingForDate(day);
                      const isSelected = isDateSelected(day);
                      const isToday = day.toDateString() === new Date().toDateString();
                      
                      return (
                        <div
                          key={day.getTime()}
                          className={`h-12 ${isSyncedFromOctorate ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} rounded-lg border-2 transition-all hover:shadow-md ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-100' 
                              : 'border-transparent hover:border-gray-300'
                          } ${isToday ? 'ring-2 ring-blue-300' : ''}`}
                          style={{ backgroundColor: isSelected ? '#DBEAFE' : pricing.color + '20' }}
                          onClick={() => !isSyncedFromOctorate && handleDateClick(day)}
                          onMouseEnter={() => !isSyncedFromOctorate && handleDateHover(day)}
                          onMouseLeave={() => !isSyncedFromOctorate && handleMouseLeave()}
                        >
                          <div className="flex h-full flex-col items-center justify-center">
                            <div className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                              {day.getDate()}
                            </div>
                            <div className={`text-xs ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}>
                              {formatPrice(pricing.price)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Conflicts */}
                {conflicts.length > 0 && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                    <h4 className="font-medium text-red-800">⚠️ Pricing Conflicts Detected</h4>
                    {conflicts.map(conflict => (
                      <div key={conflict.id} className="mt-2 text-sm text-red-700">
                        {conflict.message} ({formatDate(new Date(conflict.conflict_date_range.split(',')[0]))} - {formatDate(new Date(conflict.conflict_date_range.split(',')[1]))})
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Templates */}
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 font-semibold text-gray-900">Quick Templates</h3>
                  <div className="space-y-2">
                    {templates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => applyTemplate(template)}
                        disabled={!selectedDates.start || !selectedDates.end || saving}
                        className="w-full rounded-lg border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 disabled:opacity-50"
                        style={{ borderLeftColor: template.color_code, borderLeftWidth: '4px' }}
                      >
                        <div className="font-medium text-gray-900">{template.name}</div>
                        <div className="text-sm text-gray-600">{template.description}</div>
                        <div className="text-sm font-medium text-gray-700">
                          {template.base_price_adjustment_type === 'percentage' && '+'}
                          {template.base_price_adjustment_value}
                          {template.base_price_adjustment_type === 'percentage' ? '%' : 'RON'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pricing Rules */}
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="mb-3 font-semibold text-gray-900">
                    Pricing Rules ({pricingRules.length})
                  </h3>
                  
                  {pricingRules.length === 0 ? (
                    <div className="py-4 text-center text-gray-500">
                      <p>No custom pricing rules yet</p>
                      <p className="mt-1 text-sm">Base price applies to all dates</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pricingRules.map(rule => (
                        <div
                          key={rule.id}
                          className="rounded-lg border border-gray-200 p-3"
                          style={{ borderLeftColor: rule.color_code, borderLeftWidth: '4px' }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {formatDate(new Date(rule.start_date))} → {formatDate(new Date(rule.end_date))}
                              </div>
                              <div className="text-lg font-bold" style={{ color: rule.color_code }}>
                                {formatPrice(rule.price_per_night)}
                              </div>
                              {rule.min_stay > 1 && (
                                <div className="text-xs text-gray-600">Min {rule.min_stay} nights</div>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="ml-2 rounded-lg border border-red-300 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pricing Form Modal */}
          {showForm && (
            <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
              <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">Set Pricing</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Price per Night *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price_per_night}
                      onChange={(e) => setFormData({...formData, price_per_night: e.target.value})}
                      placeholder={`Base: ${formatPrice(room.base_price)}`}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Min Stay
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.min_stay}
                        onChange={(e) => setFormData({...formData, min_stay: e.target.value})}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        Max Stay
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.max_stay}
                        onChange={(e) => setFormData({...formData, max_stay: e.target.value})}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Color
                    </label>
                    <div className="flex gap-2">
                      {['#3B82F6', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6', '#F97316'].map(color => (
                        <button
                          key={color}
                          onClick={() => setFormData({...formData, color_code: color})}
                          className={`h-8 w-8 rounded-full border-2 ${
                            formData.color_code === color ? 'border-gray-900' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Optional notes..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
                      rows={2}
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleSavePricingRule}
                      disabled={saving}
                      className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      {saving ? 'Saving...' : 'Save Pricing'}
                    </button>
                    <button
                      onClick={() => {
                        setShowForm(false);
                        setSelectedDates({start: null, end: null});
                        setError('');
                      }}
                      className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-600 px-6 py-2 font-semibold text-white hover:bg-gray-700"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
