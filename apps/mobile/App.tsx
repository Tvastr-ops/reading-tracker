import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Image,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from './src/db/database';
import { Book, BookStatus, BookFormatType } from './src/types/book';
import {
  formatProgressDisplay,
  getUnitLabel,
  getQuickChipOptions,
} from './src/utils/formatters';
import { syncWithSupabase } from './src/db/syncEngine';
import { StatsDashboardModal } from './src/components/StatsDashboardModal';
import { BookEditModal } from './src/components/BookEditModal';

const INITIAL_BOOKS: Book[] = [
  {
    id: '1',
    title: 'The Midnight Library',
    author: 'Matt Haig',
    type: 'Novel',
    status: 'Reading',
    rating: 4.8,
    progress: 240,
    total_units: 388,
    genre_tags: 'Fiction, Fantasy',
    source_link: null,
    cover_url: 'https://covers.openlibrary.org/b/id/10313322-M.jpg',
    reading_pace: 4.2,
    date_started: '2026-07-15',
    date_finished: null,
    notes: 'Inspiring parallel life concept.',
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Overlord',
    author: 'Kugane Maruyama',
    type: 'Light Novel',
    status: 'Reading',
    rating: 4.9,
    progress: 14,
    total_units: 16,
    genre_tags: 'Fantasy, Isekai',
    source_link: null,
    cover_url: null,
    reading_pace: 2.0,
    date_started: '2026-07-20',
    date_finished: null,
    notes: 'Volume 14 completed.',
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Shadow Slave',
    author: 'Guilty3',
    type: 'Web Novel',
    status: 'Reading',
    rating: 4.9,
    progress: 1420,
    total_units: 1800,
    genre_tags: 'Dark Fantasy, System',
    source_link: null,
    cover_url: null,
    reading_pace: 15.0,
    date_started: '2026-06-01',
    date_finished: null,
    notes: 'Antarctica arc was peak.',
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'Atomic Habits',
    author: 'James Clear',
    type: 'Non-Fiction',
    status: 'Plan to Read',
    rating: 4.8,
    progress: 0,
    total_units: 320,
    genre_tags: 'Self-Help',
    source_link: null,
    cover_url: 'https://covers.openlibrary.org/b/id/12869622-M.jpg',
    reading_pace: null,
    date_started: null,
    date_finished: null,
    notes: null,
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<BookStatus | 'All'>('Reading');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeNav, setActiveNav] = useState<'Library' | 'Stats' | 'Discover'>('Library');

  // Modals
  const [statsVisible, setStatsVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [customUnits, setCustomUnits] = useState('15');
  const [logNote, setLogNote] = useState('');

  // Add Book State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookType, setNewBookType] = useState<BookFormatType>('Novel');
  const [newBookTotal, setNewBookTotal] = useState('300');

  useEffect(() => {
    initDatabase()
      .then(async () => {
        setDbReady(true);
        setSyncing(true);
        const res = await syncWithSupabase();
        setSyncing(false);
        if (res.books && res.books.length > 0) {
          setBooks(res.books);
        }
      })
      .catch((err) => console.error('DB init error:', err));
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    const res = await syncWithSupabase();
    setSyncing(false);
    if (res.books && res.books.length > 0) {
      setBooks(res.books);
    }
  };

  const filteredBooks = books.filter((book) => {
    const matchesTab = activeTab === 'All' || book.status === activeTab;
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const handleQuickAddUnits = (book: Book, amount: number) => {
    const currentProg = book.progress || 0;
    const newProgress = book.total_units
      ? Math.min(currentProg + amount, book.total_units)
      : currentProg + amount;

    setBooks(
      books.map((b) =>
        b.id === book.id
          ? {
              ...b,
              progress: newProgress,
              status:
                b.total_units && newProgress >= b.total_units
                  ? ('Completed' as BookStatus)
                  : b.status,
              updated_at: new Date().toISOString(),
            }
          : b
      )
    );
  };

  const handleAddSession = () => {
    if (!selectedBook) return;
    const addedAmount = parseInt(customUnits, 10) || 0;
    if (addedAmount <= 0) return;

    handleQuickAddUnits(selectedBook, addedAmount);
    setLogModalVisible(false);
    setSelectedBook(null);
    setCustomUnits('15');
    setLogNote('');
    Keyboard.dismiss();
  };

  const handleSaveEditBook = (updated: Book) => {
    setBooks(books.map((b) => (b.id === updated.id ? updated : b)));
  };

  const handleCreateBook = () => {
    if (!newBookTitle.trim()) return;
    const newBook: Book = {
      id: Date.now().toString(),
      title: newBookTitle.trim(),
      author: newBookAuthor.trim() || 'Unknown Author',
      type: newBookType,
      status: 'Reading',
      rating: 5.0,
      progress: 0,
      total_units: parseInt(newBookTotal, 10) || null,
      genre_tags: 'Fiction',
      source_link: null,
      cover_url: null,
      reading_pace: null,
      date_started: new Date().toISOString().split('T')[0],
      date_finished: null,
      notes: null,
      deleted_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: 'pending_create',
    };
    setBooks([newBook, ...books]);
    setNewBookTitle('');
    setNewBookAuthor('');
    setAddModalVisible(false);
    Keyboard.dismiss();
  };

  const renderBookItem = ({ item }: { item: Book }) => {
    const percentage = item.total_units
      ? Math.round(((item.progress || 0) / item.total_units) * 100)
      : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => {
          setEditingBook(item);
          setEditVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          {item.cover_url ? (
            <Image source={{ uri: item.cover_url }} style={styles.coverImage} />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={styles.coverText}>{item.title.charAt(0)}</Text>
              <Text style={styles.formatBadge}>{item.type.charAt(0)}</Text>
            </View>
          )}

          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.bookAuthor}>
              {item.author || 'Unknown'} • <Text style={styles.typeText}>{item.type}</Text>
            </Text>

            <Text style={styles.progressText}>
              {formatProgressDisplay(item)}{' '}
              {item.total_units ? `(${percentage}%)` : ''}
            </Text>

            {item.total_units ? (
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(percentage, 100)}%` },
                  ]}
                />
              </View>
            ) : null}
          </View>
        </View>

        {/* Card Footer with One-Tap Quick Steppers */}
        <View style={styles.cardFooter}>
          <View style={styles.cardSteppersRow}>
            <Text style={styles.stepperLabel}>Quick:</Text>
            <TouchableOpacity
              style={styles.stepperChip}
              onPress={(e) => {
                e.stopPropagation();
                handleQuickAddUnits(item, 1);
              }}
            >
              <Text style={styles.stepperChipText}>+1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stepperChip}
              onPress={(e) => {
                e.stopPropagation();
                handleQuickAddUnits(item, 5);
              }}
            >
              <Text style={styles.stepperChipText}>+5</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.logButton}
            activeOpacity={0.8}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedBook(item);
              setCustomUnits('15');
              setLogModalVisible(true);
            }}
          >
            <Text style={styles.logButtonText}>+ Custom Log</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (!dbReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D0BCFF" />
        <Text style={styles.loadingText}>Loading Reading Tracker...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        {/* M3 Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Deep Focus</Text>
            <Text style={styles.headerSubtitle}>Text Format Reading Tracker</Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.7}
              onPress={() => setStatsVisible(true)}
            >
              <Text style={styles.iconBtnText}>📊</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.offlineChip}
              activeOpacity={0.7}
              onPress={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#381E72" />
              ) : (
                <>
                  <View style={styles.onlineDot} />
                  <Text style={styles.offlineChipText}>Sync</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search books or authors..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Main Content Area */}
        <FlatList
          data={filteredBooks}
          keyExtractor={(item) => item.id}
          renderItem={renderBookItem}
          contentContainerStyle={styles.listContainer}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          ListHeaderComponent={
            <View>
              {/* Stitch M3 Streak Banner */}
              <View style={styles.streakBanner}>
                <View style={styles.streakInfo}>
                  <Text style={styles.streakTitle}>14 Day Streak!</Text>
                  <Text style={styles.streakSubtitle}>
                    You're on fire. Keep the focus going.
                  </Text>
                </View>
                <View style={styles.fireBadge}>
                  <Text style={styles.fireIcon}>🔥</Text>
                </View>
              </View>

              {/* Status Filter Tabs */}
              <View style={styles.tabsWrapper}>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={
                    ['Reading', 'Plan to Read', 'Completed', 'On Hold', 'Dropped', 'All'] as const
                  }
                  keyExtractor={(item) => item}
                  contentContainerStyle={styles.tabsContainer}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.tabChip, activeTab === item && styles.activeTabChip]}
                      activeOpacity={0.7}
                      onPress={() => setActiveTab(item)}
                    >
                      <Text
                        style={[
                          styles.tabChipText,
                          activeTab === item && styles.activeTabChipText,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📖</Text>
              <Text style={styles.emptyTitle}>No Books Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No results match your search query.'
                  : `No books currently in "${activeTab}".`}
              </Text>
            </View>
          }
        />

        {/* Floating Action Button (FAB) */}
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => setAddModalVisible(true)}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>

        {/* Stitch M3 Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveNav('Library')}
          >
            <Text style={[styles.navIcon, activeNav === 'Library' && styles.activeNavIcon]}>
              📚
            </Text>
            <Text style={[styles.navText, activeNav === 'Library' && styles.activeNavText]}>
              Library
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              setActiveNav('Stats');
              setStatsVisible(true);
            }}
          >
            <Text style={[styles.navIcon, activeNav === 'Stats' && styles.activeNavIcon]}>
              📊
            </Text>
            <Text style={[styles.navText, activeNav === 'Stats' && styles.activeNavText]}>
              Stats
            </Text>
          </TouchableOpacity>
        </View>

        {/* Modals */}
        <StatsDashboardModal
          visible={statsVisible}
          onClose={() => {
            setStatsVisible(false);
            setActiveNav('Library');
          }}
          books={books}
        />

        <BookEditModal
          visible={editVisible}
          onClose={() => setEditVisible(false)}
          book={editingBook}
          onSave={handleSaveEditBook}
        />

        {/* Log Session Modal */}
        <Modal visible={logModalVisible} transparent animationType="slide">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalContent}
              >
                <Text style={styles.modalTitle}>Log Reading Session</Text>
                {selectedBook && (
                  <Text style={styles.modalSubtitle}>
                    {selectedBook.title} ({formatProgressDisplay(selectedBook)})
                  </Text>
                )}

                <Text style={styles.inputLabel}>
                  Quick Add ({selectedBook ? getUnitLabel(selectedBook.type) : 'units'}):
                </Text>
                <View style={styles.quickChipRow}>
                  {selectedBook &&
                    getQuickChipOptions(selectedBook.type).map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.quickChip,
                          customUnits === num.toString() && styles.activeQuickChip,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => setCustomUnits(num.toString())}
                      >
                        <Text
                          style={[
                            styles.quickChipText,
                            customUnits === num.toString() && styles.activeQuickChipText,
                          ]}
                        >
                          +{num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.inputLabel}>Or type exact amount read today (e.g. 29 or 54):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="How much did you read?"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={customUnits}
                  onChangeText={setCustomUnits}
                />

                <TextInput
                  style={[styles.textInput, { height: 60 }]}
                  placeholder="Session Notes (Optional)"
                  placeholderTextColor="#999"
                  multiline
                  value={logNote}
                  onChangeText={setLogNote}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setLogModalVisible(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleAddSession}>
                    <Text style={styles.saveBtnText}>Save Log</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Add Book Modal */}
        <Modal visible={addModalVisible} transparent animationType="slide">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalContent}
              >
                <Text style={styles.modalTitle}>Add New Book</Text>
                
                <Text style={styles.inputLabel}>Select Format:</Text>
                <View style={styles.quickChipRow}>
                  {(['Novel', 'Light Novel', 'Web Novel', 'Non-Fiction'] as const).map((fmt) => (
                    <TouchableOpacity
                      key={fmt}
                      style={[styles.quickChip, newBookType === fmt && styles.activeQuickChip]}
                      activeOpacity={0.7}
                      onPress={() => setNewBookType(fmt)}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          newBookType === fmt && styles.activeQuickChipText,
                        ]}
                      >
                        {fmt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.textInput}
                  placeholder="Title"
                  placeholderTextColor="#999"
                  value={newBookTitle}
                  onChangeText={setNewBookTitle}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Author"
                  placeholderTextColor="#999"
                  value={newBookAuthor}
                  onChangeText={setNewBookAuthor}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="Total Units / Pages (Optional for Serials)"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={newBookTotal}
                  onChangeText={setNewBookTotal}
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddModalVisible(false)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleCreateBook}>
                    <Text style={styles.saveBtnText}>Add Book</Text>
                  </TouchableOpacity>
                </View>
              </KeyboardAvoidingView>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141317', // Stitch M3 Surface Dim
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#141317',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#E5E1E7',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTitle: {
    color: '#D0BCFF', // M3 Primary Tint
    fontSize: 26,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#CAC4D0',
    fontSize: 12,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    backgroundColor: '#201F23',
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  iconBtnText: {
    fontSize: 16,
  },
  offlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D0BCFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#381E72',
    marginRight: 6,
  },
  offlineChipText: {
    color: '#381E72',
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: '#201F23',
    color: '#E5E1E7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 14,
  },
  streakBanner: {
    backgroundColor: '#D0BCFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakInfo: {
    flex: 1,
  },
  streakTitle: {
    color: '#210F48',
    fontSize: 22,
    fontWeight: '800',
  },
  streakSubtitle: {
    color: '#4D3D76',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  fireBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E9DDFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  fireIcon: {
    fontSize: 26,
  },
  tabsWrapper: {
    marginBottom: 12,
  },
  tabsContainer: {
    paddingHorizontal: 16,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#201F23',
    marginRight: 8,
  },
  activeTabChip: {
    backgroundColor: '#D0BCFF',
  },
  tabChipText: {
    color: '#CAC4D0',
    fontSize: 13,
    fontWeight: '500',
  },
  activeTabChipText: {
    color: '#210F48',
    fontWeight: '700',
  },
  listContainer: {
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#201F23',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
  },
  coverImage: {
    width: 60,
    height: 84,
    borderRadius: 10,
    marginRight: 14,
  },
  coverPlaceholder: {
    width: 60,
    height: 84,
    borderRadius: 10,
    backgroundColor: '#4A4458',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    position: 'relative',
  },
  coverText: {
    color: '#D0BCFF',
    fontSize: 26,
    fontWeight: 'bold',
  },
  formatBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#381E72',
    color: '#D0BCFF',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  bookTitle: {
    color: '#E5E1E7',
    fontSize: 17,
    fontWeight: '700',
  },
  bookAuthor: {
    color: '#CAC4D0',
    fontSize: 13,
    marginTop: 2,
  },
  typeText: {
    color: '#D0BCFF',
  },
  progressText: {
    color: '#D0BCFF',
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#353438',
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#D0BCFF',
    borderRadius: 3,
  },
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 10,
  },
  cardSteppersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperLabel: {
    color: '#CAC4D0',
    fontSize: 11,
    marginRight: 6,
  },
  stepperChip: {
    backgroundColor: '#353438',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginRight: 6,
  },
  stepperChipText: {
    color: '#D0BCFF',
    fontSize: 12,
    fontWeight: '700',
  },
  logButton: {
    backgroundColor: '#4A4458',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  logButtonText: {
    color: '#E8DEF8',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#E5E1E7',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: '#CAC4D0',
    fontSize: 13,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 84,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#D0BCFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabIcon: {
    color: '#210F48',
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: -2,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#201F23',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 20,
    opacity: 0.6,
  },
  activeNavIcon: {
    opacity: 1,
  },
  navText: {
    color: '#CAC4D0',
    fontSize: 11,
    marginTop: 2,
  },
  activeNavText: {
    color: '#D0BCFF',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#201F23',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    color: '#E5E1E7',
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#CAC4D0',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  inputLabel: {
    color: '#E5E1E7',
    fontSize: 13,
    marginBottom: 8,
    marginTop: 6,
  },
  quickChipRow: {
    flexDirection: 'row',
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#353438',
    marginRight: 8,
    marginBottom: 8,
  },
  activeQuickChip: {
    backgroundColor: '#D0BCFF',
  },
  quickChipText: {
    color: '#E8DEF8',
    fontSize: 13,
    fontWeight: '600',
  },
  activeQuickChipText: {
    color: '#210F48',
  },
  textInput: {
    backgroundColor: '#353438',
    color: '#E5E1E7',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  cancelBtnText: {
    color: '#CAC4D0',
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: '#D0BCFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#210F48',
    fontSize: 14,
    fontWeight: '700',
  },
});
