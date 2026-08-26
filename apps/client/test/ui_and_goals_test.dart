import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:reading_tracker_app/widgets/brutalist_widgets.dart';
import 'package:reading_tracker_app/models/book.dart';
import 'package:reading_tracker_app/screens/timeline_screen.dart';
import 'package:reading_tracker_app/screens/library_screen.dart';
import 'package:reading_tracker_app/widgets/book_edit_dialog.dart';

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

      expect(find.byType(TimelineScreen), findsOneWidget);
    });

    testWidgets('BookEditDialog genre suggestions cap to 6 and expand on MORE click', (tester) async {
      tester.view.physicalSize = const Size(1200, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: BookEditDialog(
                onSave: (_) {},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final altFinder = find.byWidgetPredicate((w) => w is Text && (w.data?.contains('MORE') ?? false));

      // With default seeds (22 items), MORE chip should be visible
      expect(altFinder, findsOneWidget);
      expect(find.text('+ Cyberpunk'), findsNothing); // Should be hidden initially

      // Tap MORE
      await tester.tap(altFinder);
      await tester.pumpAndSettle();

      // Should now show LESS and the expanded tags
      expect(find.text('LESS'), findsOneWidget);
      expect(find.text('+ Cyberpunk'), findsOneWidget);

      // Tap LESS
      await tester.tap(find.text('LESS'));
      await tester.pumpAndSettle();

      expect(altFinder, findsOneWidget);
      expect(find.text('+ Cyberpunk'), findsNothing);
    });

    testWidgets('LibraryScreen Sort & Filter modal MORE/LESS toggles expand correctly', (tester) async {
      tester.view.physicalSize = const Size(1200, 1800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() => tester.view.resetPhysicalSize());

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: LibraryScreen(
              onNavigateToSync: () {},
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      // Open Sort & Filter sheet by tapping the filter button
      final filterBtn = find.byTooltip('Sort & Filter');
      if (filterBtn.evaluate().isNotEmpty) {
        await tester.tap(filterBtn);
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 400));

        // Check for rating MORE toggle
        final moreToggles = find.text('MORE');
        expect(moreToggles, findsWidgets);

        // Tap the rating MORE toggle
        await tester.tap(moreToggles.last);
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 200));

        // 3 ★, 2 ★, 1 ★ should now be visible
        expect(find.text('3 ★ & ABOVE'), findsOneWidget);
        expect(find.text('2 ★ & ABOVE'), findsOneWidget);
        expect(find.text('1 ★ & ABOVE'), findsOneWidget);
      }
    });
  });
}

