import 'dart:math' as math;
import 'package:flutter/material.dart';

enum PaperPatternType {
  none,
  paperGrain,
  dotGrid,
  washiFibers,
  manuscriptGrid,
  ledgerLines,
  halftoneDots,
  blueprintGrid,
}

class PaperTextureCanvas extends StatelessWidget {
  final Widget child;
  final PaperPatternType patternType;
  final bool isDark;
  final Color? baseCanvasColor;
  final bool enabled;

  const PaperTextureCanvas({
    super.key,
    required this.child,
    required this.patternType,
    required this.isDark,
    this.baseCanvasColor,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    if (!enabled || patternType == PaperPatternType.none) {
      return child;
    }

    final inkColor = isDark ? Colors.white : Colors.black;

    return Stack(
      fit: StackFit.expand,
      children: [
        child,
        // Procedural stationery pattern overlay with hitTest ignored
        Positioned.fill(
          child: IgnorePointer(
            child: RepaintBoundary(
              child: CustomPaint(
                painter: _PaperPatternPainter(
                  patternType: patternType,
                  inkColor: inkColor,
                  isDark: isDark,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _PaperPatternPainter extends CustomPainter {
  final PaperPatternType patternType;
  final Color inkColor;
  final bool isDark;

  _PaperPatternPainter({
    required this.patternType,
    required this.inkColor,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    switch (patternType) {
      case PaperPatternType.dotGrid:
        _drawDotGrid(canvas, size);
        break;
      case PaperPatternType.washiFibers:
        _drawWashiFibers(canvas, size);
        break;
      case PaperPatternType.manuscriptGrid:
        _drawManuscriptGrid(canvas, size);
        break;
      case PaperPatternType.ledgerLines:
        _drawLedgerLines(canvas, size);
        break;
      case PaperPatternType.halftoneDots:
        _drawHalftoneDots(canvas, size);
        break;
      case PaperPatternType.paperGrain:
        _drawPaperGrain(canvas, size);
        break;
      case PaperPatternType.blueprintGrid:
        _drawBlueprintGrid(canvas, size);
        break;
      case PaperPatternType.none:
        break;
    }
  }

  /// Architectural 24px stationery dot-grid for Drafting Vellum, Nordic Glacier, and Nordic Night
  void _drawDotGrid(Canvas canvas, Size size) {
    const spacing = 22.0;
    final paint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.18 : 0.14)
      ..style = PaintingStyle.fill;

    for (double x = spacing; x < size.width; x += spacing) {
      for (double y = spacing; y < size.height; y += spacing) {
        canvas.drawCircle(Offset(x, y), 1.3, paint);
      }
    }
  }

  /// Japanese handmade washi fiber flecks for Matcha & Washi, Midnight Matcha, and Charred Papyrus
  void _drawWashiFibers(Canvas canvas, Size size) {
    final fiberPaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.16 : 0.13)
      ..strokeWidth = 1.3
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final specklePaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.18 : 0.14)
      ..style = PaintingStyle.fill;

    // Deterministic procedural fiber flecks across a 75px repeatable grid
    const cellSize = 75.0;
    for (double cx = 0; cx < size.width; cx += cellSize) {
      for (double cy = 0; cy < size.height; cy += cellSize) {
        final seed = ((cx * 31 + cy * 17) % 1000).toInt();
        final rand = math.Random(seed);

        final x1 = cx + rand.nextDouble() * (cellSize - 15) + 8;
        final y1 = cy + rand.nextDouble() * (cellSize - 15) + 8;
        final len = 6.0 + rand.nextDouble() * 12.0;
        final angle = rand.nextDouble() * math.pi;

        canvas.drawLine(
          Offset(x1, y1),
          Offset(x1 + math.cos(angle) * len, y1 + math.sin(angle) * len),
          fiberPaint,
        );

        if (rand.nextDouble() > 0.25) {
          final sx = cx + rand.nextDouble() * cellSize;
          final sy = cy + rand.nextDouble() * cellSize;
          canvas.drawCircle(Offset(sx, sy), 1.2, specklePaint);
        }
      }
    }
  }

  /// Japanese Genko Yoshi stationery manuscript grid for Sakura Manuscript, Midnight Sakura, and Dark Academia
  void _drawManuscriptGrid(Canvas canvas, Size size) {
    const colSpacing = 26.0;
    const rowSpacing = 26.0;
    final linePaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.15 : 0.11)
      ..strokeWidth = 0.9
      ..style = PaintingStyle.stroke;

    for (double x = colSpacing; x < size.width; x += colSpacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), linePaint);
    }
    for (double y = rowSpacing; y < size.height; y += rowSpacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), linePaint);
    }
  }

  /// Horizontal ruled ledger journal lines with red/ink margin for Charcoal Ledger and Crumpled Kraft
  void _drawLedgerLines(Canvas canvas, Size size) {
    const spacing = 28.0;
    final linePaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.15 : 0.12)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    for (double y = spacing; y < size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), linePaint);
    }

    // Left vertical margin line (classic accounting ledger rule)
    if (size.width > 60) {
      final marginPaint = Paint()
        ..color = inkColor.withValues(alpha: isDark ? 0.18 : 0.14)
        ..strokeWidth = 1.2
        ..style = PaintingStyle.stroke;
      canvas.drawLine(const Offset(44, 0), Offset(44, size.height), marginPaint);
    }
  }

  /// Authentic manga tankobon screentone & vintage pulp comic halftone dots
  void _drawHalftoneDots(Canvas canvas, Size size) {
    const spacing = 16.0;
    final paint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.16 : 0.13)
      ..style = PaintingStyle.fill;

    bool stagger = false;
    for (double y = spacing; y < size.height; y += spacing) {
      final offsetX = stagger ? spacing / 2 : 0.0;
      for (double x = spacing + offsetX; x < size.width; x += spacing) {
        canvas.drawCircle(Offset(x, y), 1.25, paint);
      }
      stagger = !stagger;
    }
  }

  /// Organic book paper grain & tactile speckling for Classic Paperback
  void _drawPaperGrain(Canvas canvas, Size size) {
    final grainPaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.15 : 0.12)
      ..style = PaintingStyle.fill;

    const blockSize = 60.0;
    for (double bx = 0; bx < size.width; bx += blockSize) {
      for (double by = 0; by < size.height; by += blockSize) {
        final seed = ((bx * 47 + by * 23) % 1000).toInt();
        final rand = math.Random(seed);

        for (int i = 0; i < 7; i++) {
          final gx = bx + rand.nextDouble() * blockSize;
          final gy = by + rand.nextDouble() * blockSize;
          canvas.drawCircle(Offset(gx, gy), 0.9 + rand.nextDouble() * 0.6, grainPaint);
        }
      }
    }
  }

  /// Architectural drafting major/minor engineering grid for Cyanotype Blueprint
  void _drawBlueprintGrid(Canvas canvas, Size size) {
    const minorSpacing = 16.0;
    const majorSpacing = 64.0;

    final minorPaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.12 : 0.09)
      ..strokeWidth = 0.7
      ..style = PaintingStyle.stroke;

    final majorPaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.22 : 0.16)
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke;

    // Minor grid
    for (double x = minorSpacing; x < size.width; x += minorSpacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), minorPaint);
    }
    for (double y = minorSpacing; y < size.height; y += minorSpacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), minorPaint);
    }

    // Major grid
    for (double x = majorSpacing; x < size.width; x += majorSpacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), majorPaint);
    }
    for (double y = majorSpacing; y < size.height; y += majorSpacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), majorPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _PaperPatternPainter oldDelegate) {
    return oldDelegate.patternType != patternType ||
        oldDelegate.inkColor != inkColor ||
        oldDelegate.isDark != isDark;
  }
}
