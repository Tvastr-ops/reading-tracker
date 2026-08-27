/// Represents a distinct reading cycle/journey for a book.
///
/// Supports full history of multiple reads (first read, re-read 1, re-read 2...)
/// with distinct start/finish dates, per-read rating, and review notes.
class ReadingJourney {
  final String id;
  final String bookId;
  final int journeyIndex; // 1 = 1st Read, 2 = 2nd Read, etc.
  final String status; // 'reading', 'completed', 'abandoned', 'on_hold'
  final String dateStarted;
  final String? dateFinished;
  final double? rating;
  final String? review;
  final String createdAt;
  final String updatedAt;
  final String syncStatus;

  const ReadingJourney({
    required this.id,
    required this.bookId,
    this.journeyIndex = 1,
    this.status = 'reading',
    required this.dateStarted,
    this.dateFinished,
    this.rating,
    this.review,
    required this.createdAt,
    required this.updatedAt,
    this.syncStatus = 'synced',
  });

  bool get isCompleted => status == 'completed' || dateFinished != null;
  bool get isReread => journeyIndex > 1;

  /// Duration of the reading journey if both start and finish dates are available.
  Duration? get duration {
    if (dateFinished == null || dateFinished!.isEmpty) return null;
    final start = DateTime.tryParse(dateStarted);
    final finish = DateTime.tryParse(dateFinished!);
    if (start == null || finish == null) return null;
    return finish.difference(start);
  }

  /// Formatted duration string (e.g. "14 days", "1 day", "Today").
  String? get formattedDuration {
    final dur = duration;
    if (dur == null) return null;
    final days = dur.inDays;
    if (days <= 0) return 'Same day';
    if (days == 1) return '1 day';
    return '$days days';
  }

  /// Formatted historical reading velocity if total units and duration are known.
  String? formattedPace(double? totalUnits, {String unitType = 'pages'}) {
    final dur = duration;
    if (dur == null || totalUnits == null || totalUnits <= 0) return null;
    final days = dur.inDays.clamp(1, 99999);
    final perWeek = (totalUnits / days) * 7;
    if (perWeek <= 0) return null;
    return '~${perWeek.toStringAsFixed(1)} $unitType/wk';
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'book_id': bookId,
      'journey_index': journeyIndex,
      'status': status,
      'date_started': dateStarted,
      'date_finished': dateFinished,
      'rating': rating,
      'review': review,
      'created_at': createdAt,
      'updated_at': updatedAt,
      'sync_status': syncStatus,
    };
  }

  /// Clean remote payload schema excluding local `sync_status`.
  Map<String, dynamic> toRemoteMap() {
    return {
      'id': id,
      'book_id': bookId,
      'journey_index': journeyIndex,
      'status': status,
      'date_started': dateStarted,
      'date_finished': dateFinished,
      'rating': rating,
      'review': review,
      'created_at': createdAt,
      'updated_at': updatedAt,
    };
  }

  Map<String, dynamic> toSupabaseJson() => toRemoteMap();

  factory ReadingJourney.fromMap(Map<String, dynamic> map) {
    return ReadingJourney(
      id: map['id']?.toString() ?? '',
      bookId: map['book_id']?.toString() ?? '',
      journeyIndex: map['journey_index'] != null ? (map['journey_index'] as num).toInt() : 1,
      status: map['status']?.toString() ?? 'reading',
      dateStarted: map['date_started']?.toString() ?? DateTime.now().toUtc().toIso8601String(),
      dateFinished: map['date_finished']?.toString(),
      rating: map['rating'] != null ? (map['rating'] as num).toDouble() : null,
      review: map['review']?.toString(),
      createdAt: map['created_at']?.toString() ?? DateTime.now().toUtc().toIso8601String(),
      updatedAt: map['updated_at']?.toString() ?? DateTime.now().toUtc().toIso8601String(),
      syncStatus: map['sync_status']?.toString() ?? 'synced',
    );
  }

  ReadingJourney copyWith({
    String? id,
    String? bookId,
    int? journeyIndex,
    String? status,
    String? dateStarted,
    String? dateFinished,
    bool clearDateFinished = false,
    double? rating,
    bool clearRating = false,
    String? review,
    bool clearReview = false,
    String? createdAt,
    String? updatedAt,
    String? syncStatus,
  }) {
    return ReadingJourney(
      id: id ?? this.id,
      bookId: bookId ?? this.bookId,
      journeyIndex: journeyIndex ?? this.journeyIndex,
      status: status ?? this.status,
      dateStarted: dateStarted ?? this.dateStarted,
      dateFinished: clearDateFinished ? null : (dateFinished ?? this.dateFinished),
      rating: clearRating ? null : (rating ?? this.rating),
      review: clearReview ? null : (review ?? this.review),
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      syncStatus: syncStatus ?? this.syncStatus,
    );
  }

  @override
  String toString() {
    return 'ReadingJourney(id: $id, bookId: $bookId, index: $journeyIndex, status: $status, started: $dateStarted, finished: $dateFinished)';
  }
}
