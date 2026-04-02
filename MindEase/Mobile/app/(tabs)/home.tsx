import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Activity, BookOpen, MessageCircle, Moon, Star, Sun } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../../src/services/api';

export default function HomeScreen() {
  const router = useRouter();
  const [greeting, setGreeting] = useState<string>('');
  const [stats, setStats] = useState<{ total: number; avgMood: number }>({ total: 0, avgMood: 0 });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    const loadStats = async () => {
      try {
        const result = await api.fetchAnalytics();
        if (result.success) {
          setStats({ total: result.totalEntries, avgMood: result.averageMood });
        }
      } catch (e) {
        console.warn('Failed to load home stats');
      }
    };
    loadStats();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>MindEase User</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn}>
            <Star size={24} color="#6366f1" fill="#6366f1" />
          </TouchableOpacity>
        </View>

        <LinearGradient
          colors={['#6366f1', '#818cf8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>How are you feeling today?</Text>
            <Text style={styles.heroSubtitle}>Your AI companion is here to listen and support you.</Text>
            <TouchableOpacity style={styles.chatBtn} onPress={() => router.push('/(tabs)/chat' as any)}>
              <Text style={styles.chatBtnText}>Start Conversation</Text>
              <MessageCircle size={18} color="#6366f1" strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <BookOpen size={20} color="#6366f1" />
              </View>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Journal Entries</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Sun size={20} color="#10b981" />
              </View>
              <Text style={styles.statValue}>{stats.avgMood}</Text>
              <Text style={styles.statLabel}>Avg. Mood Score</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Insights</Text>
          <TouchableOpacity style={styles.insightCard} onPress={() => router.push('/(tabs)/analytics' as any)}>
            <View style={styles.insightIcon}>
              <Activity size={24} color="#6366f1" />
            </View>
            <View style={styles.insightBody}>
              <Text style={styles.insightTitle}>View your trends</Text>
              <Text style={styles.insightSubtitle}>See how your mood has evolved this week.</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mindful Moments</Text>
          <View style={styles.momentsGrid}>
            <TouchableOpacity style={styles.momentCard}>
              <Sun size={20} color="#f59e0b" />
              <Text style={styles.momentText}>Morning Reflection</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.momentCard}>
              <Moon size={20} color="#8b5cf6" />
              <Text style={styles.momentText}>Evening Unwind</Text>
            </TouchableOpacity>
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
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
  },
  profileBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    borderRadius: 32,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  heroContent: {
    gap: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: 16,
  },
  chatBtn: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
  },
  chatBtnText: {
    color: '#6366f1',
    fontWeight: '800',
    fontSize: 15,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  insightIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  insightBody: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  insightSubtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  momentsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  momentCard: {
    flex: 1,
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  momentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
});
