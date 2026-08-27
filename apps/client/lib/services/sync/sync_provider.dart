import '../../models/book.dart';
import '../../models/reading_journey.dart';

enum SyncBackendType {
  supabase,
  selfHostedRest,
  offlineOnly,
}

abstract class RemoteSyncProvider {
  String get name;
  SyncBackendType get type;

  Future<bool> testConnection();
  Future<List<Book>> fetchRemoteBooks({DateTime? since});
  Future<bool> pushBook(Book book);
  Future<List<String>> pushBooks(List<Book> books) async {
    final failed = <String>[];
    for (final b in books) {
      final ok = await pushBook(b);
      if (!ok) failed.add(b.id);
    }
    return failed;
  }
  Future<bool> deleteBook(String id, {bool permanent = false});
  Future<bool> pushReadingJourney(ReadingJourney journey);
  Future<List<String>> pushReadingJourneys(List<ReadingJourney> journeys) async {
    final failed = <String>[];
    for (final j in journeys) {
      final ok = await pushReadingJourney(j);
      if (!ok) failed.add(j.id);
    }
    return failed;
  }
  Future<List<ReadingJourney>> fetchRemoteReadingJourneys({DateTime? since});
  Future<bool> pushReadingLog(ReadingLogEntry entry);
  Future<List<String>> pushReadingLogs(List<ReadingLogEntry> logs) async {
    final failed = <String>[];
    for (final l in logs) {
      final ok = await pushReadingLog(l);
      if (!ok) failed.add(l.id);
    }
    return failed;
  }
  Future<List<ReadingLogEntry>> fetchRemoteReadingLogs({DateTime? since});
  Future<int?> fetchYearlyGoal();
  Future<bool> pushYearlyGoal(int goal);
}
