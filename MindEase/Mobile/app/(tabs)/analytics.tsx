import { AreaChart as AreaChartIcon, PieChart as PieChartIcon, TrendingUp } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import api from '../../src/services/api';

const screenWidth = Dimensions.get('window').width;

interface AnalyticsData {
  moodTrend: { date: string; score: number }[];
  tagDistribution: { name: string; value: number }[];
  totalEntries: number;
  averageMood: number;
}

export default function AnalyticsScreen() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const result = await api.fetchAnalytics();
        if (result.success) {
          setData(result);
        }
      } catch (e) {
        console.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  if (loading) {
    return <View style={styles.loadingContainer} />;
  }

  if (!data || data.totalEntries === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Insights</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Not enough data for insights yet.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    strokeWidth: 3,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#fff',
    },
  };

  const lineData = {
    labels: data.moodTrend.map((t: any) => t.date.split('-').slice(1).join('/')), // Month/Day
    datasets: [
      {
        data: data.moodTrend.map((t: any) => t.score),
        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const pieData = data.tagDistribution.map((t: any, idx: number) => ({
    name: t.name,
    population: t.value,
    color: ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'][idx % 6],
    legendFontColor: '#475569',
    legendFontSize: 12,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <AreaChartIcon size={20} color="#6366f1" />
        </View>
        <Text style={styles.headerTitle}>Your Insights</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statsSummary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{data.averageMood}</Text>
            <Text style={styles.summaryLabel}>Avg. Mood</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{data.totalEntries}</Text>
            <Text style={styles.summaryLabel}>Days Logged</Text>
          </View>
        </View>

        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <TrendingUp size={18} color="#6366f1" />
            <Text style={styles.chartTitle}>Mood Trend</Text>
          </View>
          <View style={styles.chartContainer}>
            <LineChart
              data={lineData}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.lineChart}
              withHorizontalLines={false}
              withVerticalLines={false}
              withInnerLines={false}
              yAxisInterval={1}
              segments={5}
            />
          </View>
        </View>

        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <PieChartIcon size={18} color="#6366f1" />
            <Text style={styles.chartTitle}>Emotional Focus</Text>
          </View>
          <View style={styles.chartContainer}>
            <PieChart
              data={pieData}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
  },
  scrollContent: {
    padding: 24,
  },
  statsSummary: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#6366f1',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 4,
  },
  chartSection: {
    marginBottom: 32,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1e293b',
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  lineChart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
