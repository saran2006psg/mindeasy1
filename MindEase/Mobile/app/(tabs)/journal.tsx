import { BookOpen, Calendar, Clock, Smile } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../../src/services/api';

interface JournalEntry {
  id: string;
  createdAt: string;
  userMessage: string;
  aiResponse: string;
  tag: string;
  moodScore: number;
}

const tagColorMap: Record<string, string> = {
  Anxiety: '#06b6d4',
  Stress: '#f59e0b',
  Motivation: '#6366f1',
  Sleep: '#8b5cf6',
  Sadness: '#3b82f6',
  Happy: '#10b981',
};

export default function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadJournal = async () => {
      try {
        const data = await api.fetchJournal();
        setEntries(data);
      } catch (e) {
        console.error('Failed to load journal');
      } finally {
        setLoading(false);
      }
    };
    loadJournal();
  }, []);

  const renderItem = ({ item }: { item: JournalEntry }) => {
    const date = new Date(item.createdAt);
    const tagColor = tagColorMap[item.tag] || '#64748b';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.dateTime}>
            <Calendar size={14} color="#94a3b8" />
            <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
            <Clock size={14} color="#94a3b8" style={{ marginLeft: 8 }} />
            <Text style={styles.dateText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: tagColor + '15', borderColor: tagColor + '30' }]}>
            <Text style={[styles.tagText, { color: tagColor }]}>{item.tag}</Text>
          </View>
        </View>

        <View style={styles.entryBody}>
          <View style={styles.messageRow}>
            <Text style={styles.label}>You</Text>
            <Text style={styles.messageText}>{item.userMessage}</Text>
          </View>
          <View style={[styles.messageRow, styles.aiRow]}>
            <Text style={[styles.label, { color: '#10b981' }]}>MindEase</Text>
            <Text style={styles.messageText}>{item.aiResponse}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.moodBadge}>
            <Smile size={16} color="#6366f1" />
            <Text style={styles.moodText}>Mood: {item.moodScore}/10</Text>
          </View>
          <TouchableOpacity style={styles.detailsBtn}>
            <Text style={styles.detailsBtnText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.typingDot} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <BookOpen size={20} color="#6366f1" />
        </View>
        <Text style={styles.headerTitle}>Conversation Journal</Text>
      </View>

      <FlatList
        data={entries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No entries yet. Start chatting to build your journal!</Text>
          </View>
        }
      />
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
  listContent: {
    padding: 20,
    gap: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  entryBody: {
    gap: 12,
    marginBottom: 16,
  },
  messageRow: {
    gap: 4,
  },
  aiRow: {
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6366f1',
  },
  messageText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  moodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  detailsBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  detailsBtnText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366f1',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
  },
});
