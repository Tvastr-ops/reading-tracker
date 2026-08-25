import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:reading_tracker_app/widgets/brutalist_widgets.dart';
import 'package:reading_tracker_app/models/book.dart';
import 'package:reading_tracker_app/screens/timeline_screen.dart';

void main() {
  group('UI & Goal Enhancements Tests', () {
    testWidgets('TypographicBookCover renders title, author, and format banner', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: TypographicBookCover(
              title: 'Metamorphosis',
              author: 'Franz Kafka',
              type: 'Novella',
              width: 120,
              height: 180,
            ),
          ),
        ),
      );

      expect(find.text('METAMORPHOSIS'), findsOneWidget);
      expect(find.text('FRANZ KAFKA'), findsOneWidget);
      expect(find.text('NOVELLA'), findsOneWidget);
    });

    test('ReadingLogEntry copyWith updates note and other fields cleanly', () {
      const log = ReadingLogEntry(
        id: 'log-1',
        bookId: 'book-123',
        fromProgress: 10,
        toProgress: 25,
        loggedAt: '2026-08-24T12:00:00Z',
      );

      final updated = log.copyWith(note: 'Finished chapter 2');
      expect(updated.id, 'log-1');
      expect(updated.bookId, 'book-123');
      expect(updated.fromProgress, 10);
      expect(updated.toProgress, 25);
      expect(updated.note, 'Finished chapter 2');
      expect(updated.loggedAt, '2026-08-24T12:00:00Z');
    });

    testWidgets('BrutalistButton displays child text and handles interaction', (tester) async {
      bool pressed = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: BrutalistButton(
              onPressed: () => pressed = true,
              child: const Text('CLICK ME'),
            ),
          ),
        ),
      );

      expect(find.text('CLICK ME'), findsOneWidget);
      await tester.tap(find.text('CLICK ME'));
      expect(pressed, isTrue);
    });

    testWidgets('TimelineScreen renders empty state gracefully without hanging', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: TimelineScreen(),
          ),
        ),
      );

      // Initial pump shows loading or empty state
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.byType(TimelineScreen), findsOneWidget);
    });
  });
}

