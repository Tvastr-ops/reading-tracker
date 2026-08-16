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
  Future<bool> deleteBook(String id);
  Future<bool> pushReadingLog(ReadingLogEntry entry);
  Future<int?> fetchYearlyGoal();
  Future<bool> pushYearlyGoal(int goal);
}
