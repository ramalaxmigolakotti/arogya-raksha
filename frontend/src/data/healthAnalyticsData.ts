// Health Analytics sample data for charts and visualizations

export interface HealthMetric {
  date: string;
  value: number;
  label?: string;
}

export interface AnalyticsCategory {
  id: string;
  name: string;
  unit: string;
  normalRange: { min: number; max: number };
  data: HealthMetric[];
  color: string;
}

// Generate last 30 days of sample data
function generateDates(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toISOString().split('T')[0];
  });
}

const dates30 = generateDates(30);

export const healthAnalyticsData: AnalyticsCategory[] = [
  {
    id: 'blood_pressure',
    name: 'Blood Pressure',
    unit: 'mmHg',
    normalRange: { min: 80, max: 120 },
    color: '#ef4444',
    data: dates30.map(date => ({
      date,
      value: Math.round(110 + Math.random() * 20 - 10),
    })),
  },
  {
    id: 'heart_rate',
    name: 'Heart Rate',
    unit: 'bpm',
    normalRange: { min: 60, max: 100 },
    color: '#f97316',
    data: dates30.map(date => ({
      date,
      value: Math.round(72 + Math.random() * 16 - 8),
    })),
  },
  {
    id: 'blood_glucose',
    name: 'Blood Glucose',
    unit: 'mg/dL',
    normalRange: { min: 70, max: 140 },
    color: '#8b5cf6',
    data: dates30.map(date => ({
      date,
      value: Math.round(100 + Math.random() * 40 - 20),
    })),
  },
  {
    id: 'weight',
    name: 'Weight',
    unit: 'kg',
    normalRange: { min: 50, max: 90 },
    color: '#06b6d4',
    data: dates30.map(date => ({
      date,
      value: parseFloat((70 + Math.random() * 2 - 1).toFixed(1)),
    })),
  },
  {
    id: 'spo2',
    name: 'Oxygen Saturation',
    unit: '%',
    normalRange: { min: 95, max: 100 },
    color: '#10b981',
    data: dates30.map(date => ({
      date,
      value: Math.round(97 + Math.random() * 3 - 1),
    })),
  },
  {
    id: 'steps',
    name: 'Daily Steps',
    unit: 'steps',
    normalRange: { min: 8000, max: 12000 },
    color: '#f59e0b',
    data: dates30.map(date => ({
      date,
      value: Math.round(7000 + Math.random() * 5000),
    })),
  },
];

export const healthSummaryStats = {
  totalCheckIns: 28,
  averageSleep: 6.8,
  medicineAdherence: 87,
  appointmentsThisMonth: 2,
  activeConditions: ['Hypertension', 'Type 2 Diabetes'],
  recentAlerts: [
    { type: 'warning', message: 'Blood pressure slightly elevated on 3 days', date: '2024-01-15' },
    { type: 'info', message: 'Medicine reminder: Metformin 500mg due', date: '2024-01-14' },
    { type: 'success', message: 'Step goal achieved 5 days this week', date: '2024-01-13' },
  ],
};

export const diseasePrevalenceData = [
  { name: 'Hypertension', value: 35, color: '#ef4444' },
  { name: 'Diabetes', value: 28, color: '#8b5cf6' },
  { name: 'Respiratory', value: 18, color: '#06b6d4' },
  { name: 'Cardiac', value: 12, color: '#f97316' },
  { name: 'Others', value: 7, color: '#6b7280' },
];

export const monthlyAppointments = [
  { month: 'Aug', count: 2 }, { month: 'Sep', count: 3 }, { month: 'Oct', count: 1 },
  { month: 'Nov', count: 4 }, { month: 'Dec', count: 2 }, { month: 'Jan', count: 2 },
];
