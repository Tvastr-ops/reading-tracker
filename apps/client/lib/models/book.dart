class BookStatus {
  static const String reading = 'Reading';
  static const String planToRead = 'Plan to Read';
  static const String onHold = 'On Hold';
  static const String completed = 'Completed';
  static const String dropped = 'Dropped';

  static const List<String> all = [
    reading,
    planToRead,
    onHold,
    completed,
    dropped,
  ];
}

class PublicationTypes {
  static const List<String> all = [
    'Novel',
    'Novella',
    'Novelette',
    'Web Novel',
    'Light Novel',
    'Short Story',
    'Collection',
    'Anthology',
    'Essay',
    'Fanfiction',
    'Other',
  ];
}

class Book {
  final String id;
  final String title;
  final String type;
  final String? unitType;
  final String? progressStructure;
  final num? parentProgress;
  final num? parentTotal;
  final num? latestUnits;
  final bool? isOngoing;
  final String? author;
  final String status;
  final double? rating;
  final double progress;
  final double? totalUnits;
  final String? genreTags;
  final String? sourceLink;
  final String? coverUrl;
  final double? readingPace;
  final String? dateStarted;
  final String? dateFinished;
  final String? notes;
  final bool? isFavorite;
  final String? deletedAt;
  final String createdAt;
  final String updatedAt;
  final String syncStatus;

  const Book({
    required this.id,
    required this.title,
    this.type = 'Novel',
    this.unitType,
    this.progressStructure,
    this.parentProgress,
    this.parentTotal,
    this.latestUnits,
    this.isOngoing,
    this.author,
    this.status = BookStatus.planToRead,
    this.rating,
    this.progress = 0.0,
    this.totalUnits,
    this.genreTags,
    this.sourceLink,
    this.coverUrl,
    this.readingPace,
    this.dateStarted,
    this.dateFinished,
    this.notes,
    this.isFavorite,
    this.deletedAt,
    required this.createdAt,
    required this.updatedAt,
    this.syncStatus = 'synced',
  });

  double get completionPercentage {
    final effectiveTotal = (isOngoing == true && totalUnits == null)
        ? latestUnits?.toDouble()
        : totalUnits;
    if (effectiveTotal == null || effectiveTotal <= 0) return 0.0;
    final pct = (progress / effectiveTotal) * 100;
    return pct.clamp(0.0, 100.0);
  }

  Book copyWith({
    String? id,
    String? title,
    String? type,
    String? unitType,
    String? progressStructure,
    num? parentProgress,
    num? parentTotal,
    num? latestUnits,
    bool clearLatestUnits = false,
    bool? isOngoing,
    String? author,
    String? status,
    double? rating,
    bool clearRating = false,
    double? progress,
    double? totalUnits,
    bool clearTotalUnits = false,
    String? genreTags,
    String? sourceLink,
    String? coverUrl,
    bool clearCoverUrl = false,
    double? readingPace,
    String? dateStarted,
    bool clearDateStarted = false,
    String? dateFinished,
    bool clearDateFinished = false,
    String? notes,
    bool clearNotes = false,
    bool? isFavorite,
    String? deletedAt,
    bool clearDeletedAt = false,
    String? createdAt,
    String? updatedAt,
    String? syncStatus,
  }) {
    return Book(
      id: id ?? this.id,
      title: title ?? this.title,
      type: type ?? this.type,
      unitType: unitType ?? this.unitType,
      progressStructure: progressStructure ?? this.progressStructure,
      parentProgress: parentProgress ?? this.parentProgress,
      parentTotal: parentTotal ?? this.parentTotal,
      latestUnits: clearLatestUnits ? null : (latestUnits ?? this.latestUnits),
      isOngoing: isOngoing ?? this.isOngoing,
      author: author ?? this.author,
      status: status ?? this.status,
      rating: clearRating ? null : (rating ?? this.rating),
      progress: progress ?? this.progress,
      totalUnits: clearTotalUnits ? null : (totalUnits ?? this.totalUnits),
      genreTags: genreTags ?? this.genreTags,
      sourceLink: sourceLink ?? this.sourceLink,
      coverUrl: clearCoverUrl ? null : (coverUrl ?? this.coverUrl),
      readingPace: readingPace ?? this.readingPace,
      dateStarted: clearDateStarted ? null : (dateStarted ?? this.dateStarted),
      dateFinished: clearDateFinished ? null : (dateFinished ?? this.dateFinished),
      notes: clearNotes ? null : (notes ?? this.notes),
      isFavorite: isFavorite ?? this.isFavorite,
      deletedAt: clearDeletedAt ? null : (deletedAt ?? this.deletedAt),
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      syncStatus: syncStatus ?? this.syncStatus,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'type': type,
      'unit_type': unitType,
      'progress_structure': progressStructure,
      'parent_progress': parentProgress,
      'parent_total': parentTotal,
      'latest_units': latestUnits,
      'is_ongoing': isOngoing == null ? null : (isOngoing! ? 1 : 0),
      'author': author,
      'status': status,
      'rating': rating,
      'progress': progress,
      'total_units': totalUnits,
      'genre_tags': genreTags,
      'source_link': sourceLink,
      'cover_url': coverUrl,
      'reading_pace': readingPace,
      'date_started': dateStarted,
      'date_finished': dateFinished,
      'notes': notes,
      'is_favorite': isFavorite == null ? null : (isFavorite! ? 1 : 0),
      'deleted_at': deletedAt,
      'created_at': createdAt,
      'updated_at': updatedAt,
      'sync_status': syncStatus,
    };
  }

  /// Clean remote payload schema excluding local SQLite-specific columns (like `sync_status`).
  Map<String, dynamic> toRemoteMap() {
    return {
      'id': id,
      'title': title,
      'type': type,
      'unit_type': unitType ?? 'pages',
      'progress_structure': progressStructure ?? 'single',
      'parent_progress': parentProgress,
      'parent_total': parentTotal,
      'latest_units': latestUnits,
      'is_ongoing': isOngoing ?? false,
      'author': author,
      'status': status,
      'rating': (rating != null && rating! > 0) ? rating : null,
      'progress': progress,
      'total_units': totalUnits,
      'genre_tags': genreTags,
      'source_link': sourceLink,
      'cover_url': coverUrl,
      'reading_pace': readingPace,
      'date_started': dateStarted,
      'date_finished': dateFinished,
      'notes': notes,
      'is_favorite': isFavorite ?? false,
      'deleted_at': deletedAt,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  factory Book.fromMap(Map<String, dynamic> map) {
    return Book(
      id: map['id']?.toString() ?? '',
      title: map['title']?.toString() ?? '',
      type: map['type']?.toString() ?? 'Novel',
      unitType: map['unit_type']?.toString(),
      progressStructure: map['progress_structure']?.toString(),
      parentProgress: map['parent_progress'] as num?,
      parentTotal: map['parent_total'] as num?,
      latestUnits: map['latest_units'] as num?,
      isOngoing: map['is_ongoing'] == null ? null : (map['is_ongoing'] == 1 || map['is_ongoing'] == true),
      author: map['author']?.toString(),
      status: map['status']?.toString() ?? BookStatus.planToRead,
      rating: map['rating'] != null ? (map['rating'] as num).toDouble() : null,
      progress: map['progress'] != null ? (map['progress'] as num).toDouble() : 0.0,
      totalUnits: map['total_units'] != null ? (map['total_units'] as num).toDouble() : null,
      genreTags: map['genre_tags']?.toString(),
      sourceLink: map['source_link']?.toString(),
      coverUrl: map['cover_url']?.toString(),
      readingPace: map['reading_pace'] != null ? (map['reading_pace'] as num).toDouble() : null,
      dateStarted: map['date_started']?.toString(),
      dateFinished: map['date_finished']?.toString(),
      notes: map['notes']?.toString(),
      isFavorite: map['is_favorite'] == null ? null : (map['is_favorite'] == 1 || map['is_favorite'] == true),
      deletedAt: map['deleted_at']?.toString(),
      createdAt: map['created_at']?.toString() ?? DateTime.now().toUtc().toIso8601String(),
      updatedAt: map['updated_at']?.toString() ?? DateTime.now().toUtc().toIso8601String(),
      syncStatus: map['sync_status']?.toString() ?? 'synced',
    );
  }

  Map<String, dynamic> toSupabaseJson() => toRemoteMap();
}

class ReadingLogEntry {
  final String id;
  final String bookId;
  final double? fromProgress;
  final double toProgress;
  final String? note;
  final String loggedAt;
  final String syncStatus;

  const ReadingLogEntry({
    required this.id,
    required this.bookId,
    this.fromProgress,
    required this.toProgress,
    this.note,
    required this.loggedAt,
    this.syncStatus = 'synced',
  });

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'book_id': bookId,
      'from_progress': fromProgress,
      'to_progress': toProgress,
      'note': note,
      'logged_at': loggedAt,
      'sync_status': syncStatus,
    };
  }

  /// Clean remote payload schema excluding `sync_status`.
  Map<String, dynamic> toRemoteMap() {
    return {
      'id': id,
      'book_id': bookId,
      'from_progress': fromProgress,
      'to_progress': toProgress,
      'note': note,
      'logged_at': loggedAt,
    };
  }

  Map<String, dynamic> toSupabaseJson() => toRemoteMap();

  factory ReadingLogEntry.fromMap(Map<String, dynamic> map) {
    return ReadingLogEntry(
      id: map['id']?.toString() ?? '',
      bookId: map['book_id']?.toString() ?? '',
      fromProgress: map['from_progress'] != null ? (map['from_progress'] as num).toDouble() : null,
      toProgress: (map['to_progress'] as num?)?.toDouble() ?? 0.0,
      note: map['note']?.toString(),
      loggedAt: map['logged_at']?.toString() ?? DateTime.now().toUtc().toIso8601String(),
      syncStatus: map['sync_status']?.toString() ?? 'synced',
    );
  }

  ReadingLogEntry copyWith({
    String? id,
    String? bookId,
    double? fromProgress,
    double? toProgress,
    String? note,
    String? loggedAt,
    String? syncStatus,
  }) {
    return ReadingLogEntry(
      id: id ?? this.id,
      bookId: bookId ?? this.bookId,
      fromProgress: fromProgress ?? this.fromProgress,
      toProgress: toProgress ?? this.toProgress,
      note: note ?? this.note,
      loggedAt: loggedAt ?? this.loggedAt,
      syncStatus: syncStatus ?? this.syncStatus,
    );
  }
}
