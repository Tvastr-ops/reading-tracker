import '../../models/book.dart';

enum SyncBackendType {
  supabase,
  selfHostedRest,
  offlineOnly,
}

abstract class RemoteSyncProvider {
  String get name;
  SyncBackendType get type;

  Future<bool> testConnection();
  Future<List<Book>> fetchRemoteBooks();
  Future<bool> pushBook(Book book);
  Future<bool> deleteBook(String id, {bool permanent = false});
  Future<bool> pushReadingLog(ReadingLogEntry entry);
  Future<List<ReadingLogEntry>> fetchRemoteReadingLogs({DateTime? since});
  Future<int?> fetchYearlyGoal();
  Future<bool> pushYearlyGoal(int goal);
}
