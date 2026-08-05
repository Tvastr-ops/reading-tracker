import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { searchOpenLibraryCovers } from '../services/openLibrary';
import type { Book, BookFormatType, BookStatus } from '../types/book';

interface BookEditModalProps {
  visible: boolean;
  onClose: () => void;
  book: Book | null;
  onSave: (updatedBook: Book) => void;
}

export function BookEditModal({ visible, onClose, book, onSave }: BookEditModalProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [type, setType] = useState<BookFormatType>('Novel');
  const [status, setStatus] = useState<BookStatus>('Reading');
  const [rating, setRating] = useState('4.5');
  const [progress, setProgress] = useState('0');
  const [totalUnits, setTotalUnits] = useState('300');
  const [coverUrl, setCoverUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [fetchingCover, setFetchingCover] = useState(false);

  useEffect(() => {
    if (book) {
      setTitle(book.title);
      setAuthor(book.author || '');
      setType(book.type);
      setStatus(book.status);
      setRating(book.rating ? book.rating.toString() : '4.5');
      setProgress(book.progress ? book.progress.toString() : '0');
      setTotalUnits(book.total_units ? book.total_units.toString() : '');
      setCoverUrl(book.cover_url || '');
      setNotes(book.notes || '');
    }
  }, [book]);

  const handleFetchCover = async () => {
    if (!title.trim()) return;
    setFetchingCover(true);
    const fetched = await searchOpenLibraryCovers(title);
    setFetchingCover(false);
    if (fetched) {
      setCoverUrl(fetched);
    }
  };

  const handleSave = () => {
    if (!book || !title.trim()) return;
    const updated: Book = {
      ...book,
      title: title.trim(),
      author: author.trim() || 'Unknown Author',
      type,
      status,
      rating: parseFloat(rating) || 0,
      progress: parseInt(progress, 10) || 0,
      total_units: parseInt(totalUnits, 10) || null,
      cover_url: coverUrl.trim() || null,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
      sync_status: 'pending_update',
    };
    onSave(updated);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>Edit Book Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Title:</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Book Title"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Author:</Text>
            <TextInput
              style={styles.textInput}
              value={author}
              onChangeText={setAuthor}
              placeholder="Author Name"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Format Type:</Text>
            <View style={styles.chipRow}>
              {(['Novel', 'Light Novel', 'Web Novel', 'Non-Fiction'] as const).map((fmt) => (
                <TouchableOpacity
                  key={fmt}
                  style={[styles.chip, type === fmt && styles.activeChip]}
                  onPress={() => setType(fmt)}
                >
                  <Text style={[styles.chipText, type === fmt && styles.activeChipText]}>
                    {fmt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Reading Status:</Text>
            <View style={styles.chipRow}>
              {(['Reading', 'Plan to Read', 'Completed', 'On Hold', 'Dropped'] as const).map(
                (st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.chip, status === st && styles.activeChip]}
                    onPress={() => setStatus(st)}
                  >
                    <Text style={[styles.chipText, status === st && styles.activeChipText]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </View>

            <View style={styles.numRow}>
              <View style={styles.numCol}>
                <Text style={styles.inputLabel}>Progress:</Text>
                <TextInput
                  style={styles.textInput}
                  value={progress}
                  onChangeText={setProgress}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.numCol}>
                <Text style={styles.inputLabel}>Total Units:</Text>
                <TextInput
                  style={styles.textInput}
                  value={totalUnits}
                  onChangeText={setTotalUnits}
                  keyboardType="numeric"
                  placeholder="Optional"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Cover Image URL:</Text>
            <View style={styles.coverFetchRow}>
              <TextInput
                style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                value={coverUrl}
                onChangeText={setCoverUrl}
                placeholder="https://..."
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={styles.fetchBtn}
                onPress={handleFetchCover}
                disabled={fetchingCover}
              >
                {fetchingCover ? (
                  <ActivityIndicator size="small" color="#381E72" />
                ) : (
                  <Text style={styles.fetchBtnText}>Auto Fetch</Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Notes & Review:</Text>
            <TextInput
              style={[styles.textInput, { height: 80 }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Your notes..."
              placeholderTextColor="#999"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
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
    maxHeight: '90%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#E6E1E5',
    fontSize: 20,
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
  inputLabel: {
    color: '#E6E1E5',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#36343B',
    color: '#E6E1E5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#4A4458',
    marginRight: 6,
    marginBottom: 6,
  },
  activeChip: {
    backgroundColor: '#D0BCFF',
  },
  chipText: {
    color: '#E8DEF8',
    fontSize: 12,
    fontWeight: '600',
  },
  activeChipText: {
    color: '#381E72',
  },
  numRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  numCol: {
    flex: 0.48,
  },
  coverFetchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fetchBtn: {
    backgroundColor: '#D0BCFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 8,
  },
  fetchBtnText: {
    color: '#381E72',
    fontSize: 12,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    marginBottom: 20,
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
    color: '#381E72',
    fontSize: 14,
    fontWeight: '700',
  },
});
