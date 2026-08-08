import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Book } from '../types/book';

interface StatsDashboardProps {
  visible: boolean;
  onClose: () => void;
  books: Book[];
  yearlyGoal?: number;
}

export function StatsDashboardModal({
  visible,
  onClose,
  books,
  yearlyGoal = 24,
}: StatsDashboardProps) {
  const completedBooks = books.filter((b) => b.status === 'Completed').length;
  const goalPercentage = Math.min(Math.round((completedBooks / yearlyGoal) * 100), 100);

  const totalProgressLogged = books.reduce((acc, b) => acc + (b.progress || 0), 0);

  // Mock weekly activity for display
  const weeklyData = [
    { day: 'Mon', count: 25 },
    { day: 'Tue', count: 42 },
    { day: 'Wed', count: 18 },
    { day: 'Thu', count: 54 },
    { day: 'Fri', count: 30 },
    { day: 'Sat', count: 65 },
    { day: 'Sun', count: 29 },
  ];
  const maxCount = Math.max(...weeklyData.map((d) => d.count), 1);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>Reading Analytics</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Yearly Goal Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>2026 Yearly Goal</Text>
              <View style={styles.goalRow}>
                <View style={styles.goalCircle}>
                  <Text style={styles.goalPercentText}>{goalPercentage}%</Text>
                </View>
                <View style={styles.goalMeta}>
                  <Text style={styles.goalStatText}>
                    {completedBooks} of {yearlyGoal} Books Completed
                  </Text>
                  <Text style={styles.goalSubtext}>
                    {yearlyGoal - completedBooks > 0
                      ? `${yearlyGoal - completedBooks} more books to reach your target!`
                      : '🎉 Goal Achieved!'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Weekly Activity Bar Chart */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Weekly Units Read</Text>
              <View style={styles.chartContainer}>
                {weeklyData.map((d) => {
                  const barHeight = Math.max((d.count / maxCount) * 100, 8);
                  return (
                    <View key={d.day} style={styles.barColumn}>
                      <Text style={styles.barValText}>{d.count}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { height: `${barHeight}%` }]} />
                      </View>
                      <Text style={styles.barLabel}>{d.day}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Overall Summary Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Total Library Insights</Text>
              <View style={styles.insightsGrid}>
                <View style={styles.insightItem}>
                  <Text style={styles.insightVal}>{books.length}</Text>
                  <Text style={styles.insightLabel}>Total Books</Text>
                </View>
                <View style={styles.insightItem}>
                  <Text style={styles.insightVal}>{totalProgressLogged}</Text>
                  <Text style={styles.insightLabel}>Units Read</Text>
                </View>
                <View style={styles.insightItem}>
                  <Text style={styles.insightVal}>
                    {books.filter((b) => b.status === 'Reading').length}
                  </Text>
                  <Text style={styles.insightLabel}>Currently Reading</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2B2930',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#E6E1E5',
    fontSize: 22,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A4458',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#E8DEF8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#1C1B1F',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  cardLabel: {
    color: '#D0BCFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: '#D0BCFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  goalPercentText: {
    color: '#E6E1E5',
    fontSize: 16,
    fontWeight: 'bold',
  },
  goalMeta: {
    flex: 1,
  },
  goalStatText: {
    color: '#E6E1E5',
    fontSize: 16,
    fontWeight: '600',
  },
  goalSubtext: {
    color: '#CAC4D0',
    fontSize: 13,
    marginTop: 2,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 16,
  },
  barColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barValText: {
    color: '#CAC4D0',
    fontSize: 10,
    marginBottom: 4,
  },
  barTrack: {
    width: 14,
    height: 80,
    backgroundColor: '#2B2930',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#D0BCFF',
    borderRadius: 7,
  },
  barLabel: {
    color: '#CAC4D0',
    fontSize: 11,
    marginTop: 6,
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  insightItem: {
    alignItems: 'center',
  },
  insightVal: {
    color: '#E6E1E5',
    fontSize: 22,
    fontWeight: 'bold',
  },
  insightLabel: {
    color: '#CAC4D0',
    fontSize: 12,
    marginTop: 2,
  },
});
