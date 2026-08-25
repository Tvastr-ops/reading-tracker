import 'dart:math' as math;
import 'package:flutter/material.dart';

enum PaperPatternType {
  none,
  deckleGrain,
  screentoneHalftone,
  washiBotanical,
  pulpRosette,
  sakuraPetals,
  nordicConstellation,
  blueprintDrafting,
  crumpledCreases,
}

/// A GPU-accelerated paper stationery canvas underlay that paints bespoke procedural textures
/// behind screen content with zero runtime performance penalty.
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
      return Container(
        color: baseCanvasColor,
        child: child,
      );
    }

    final inkColor = isDark ? Colors.white : Colors.black;

    return Stack(
      fit: StackFit.expand,
      children: [
        // 1. Solid base canvas background color
        if (baseCanvasColor != null)
          Container(color: baseCanvasColor),

        // 2. Procedural stationery texture UNDERLAY (rendered behind widgets with RepaintBoundary)
        Positioned.fill(
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

        // 3. Child widget tree on top of the texture underlay
        child,
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
    final isDesktop = size.width >= 800;

    switch (patternType) {
      case PaperPatternType.deckleGrain:
        _drawDeckleGrain(canvas, size, isDesktop);
        break;
      case PaperPatternType.screentoneHalftone:
        _drawScreentoneHalftone(canvas, size, isDesktop);
        break;
      case PaperPatternType.washiBotanical:
        _drawWashiBotanical(canvas, size, isDesktop);
        break;
      case PaperPatternType.pulpRosette:
        _drawPulpRosette(canvas, size, isDesktop);
        break;
      case PaperPatternType.sakuraPetals:
        _drawSakuraPetals(canvas, size, isDesktop);
        break;
      case PaperPatternType.nordicConstellation:
        _drawNordicConstellation(canvas, size, isDesktop);
        break;
      case PaperPatternType.blueprintDrafting:
        _drawBlueprintDrafting(canvas, size, isDesktop);
        break;
      case PaperPatternType.crumpledCreases:
        _drawCrumpledCreases(canvas, size, isDesktop);
        break;
      case PaperPatternType.none:
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // 1. Classic Paperback & Charcoal Ledger: Deckle-Edge Paper Grain
  // ---------------------------------------------------------------------------
  void _drawDeckleGrain(Canvas canvas, Size size, bool isDesktop) {
    final grainPaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.055 : 0.045)
      ..style = PaintingStyle.fill;

    final fiberPaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.065 : 0.050)
      ..strokeWidth = 0.8
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final blockSize = isDesktop ? 70.0 : 55.0;
    for (double bx = 0; bx < size.width; bx += blockSize) {
      for (double by = 0; by < size.height; by += blockSize) {
        final seed = ((bx * 47 + by * 23) % 1000).toInt();
        final rand = math.Random(seed);

        for (int i = 0; i < 6; i++) {
          final gx = bx + rand.nextDouble() * blockSize;
          final gy = by + rand.nextDouble() * blockSize;
          canvas.drawCircle(Offset(gx, gy), 0.75 + rand.nextDouble() * 0.5, grainPaint);
        }

        // Fibrous flecks
        if (rand.nextDouble() > 0.4) {
          final fx = bx + rand.nextDouble() * blockSize;
          final fy = by + rand.nextDouble() * blockSize;
          final len = 4.0 + rand.nextDouble() * 6.0;
          final angle = rand.nextDouble() * math.pi;
          canvas.drawLine(
            Offset(fx, fy),
            Offset(fx + math.cos(angle) * len, fy + math.sin(angle) * len),
            fiberPaint,
          );
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Manga Inkpaper & Manga Noir: Tankobon Screentone & Stipple Halftone
  // ---------------------------------------------------------------------------
  void _drawScreentoneHalftone(Canvas canvas, Size size, bool isDesktop) {
    final spacing = isDesktop ? 18.0 : 15.0;
    final dotPaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.060 : 0.050)
      ..style = PaintingStyle.fill;

    final stipplePaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.075 : 0.060)
      ..strokeWidth = 0.75
      ..style = PaintingStyle.stroke;

    bool stagger = false;
    for (double y = spacing; y < size.height; y += spacing) {
      final offsetX = stagger ? spacing / 2 : 0.0;
      for (double x = spacing + offsetX; x < size.width; x += spacing) {
        canvas.drawCircle(Offset(x, y), 1.0, dotPaint);

        // Subtle diagonal cross-hatch stipples every 5th dot
        if (((x / spacing).toInt() + (y / spacing).toInt()) % 5 == 0) {
          canvas.drawLine(
            Offset(x - 2.5, y - 2.5),
            Offset(x + 2.5, y + 2.5),
            stipplePaint,
          );
        }
      }
      stagger = !stagger;
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Matcha Washi & Midnight Matcha: Botanical Kozo Mulberry Fibers
  // ---------------------------------------------------------------------------
  void _drawWashiBotanical(Canvas canvas, Size size, bool isDesktop) {
    final fiberPaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.070 : 0.055)
      ..strokeWidth = 0.95
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final leafFleckPaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.080 : 0.065)
      ..style = PaintingStyle.fill;

    final cellSize = isDesktop ? 80.0 : 65.0;
    for (double cx = 0; cx < size.width; cx += cellSize) {
      for (double cy = 0; cy < size.height; cy += cellSize) {
        final seed = ((cx * 31 + cy * 17) % 1000).toInt();
        final rand = math.Random(seed);

        final x1 = cx + rand.nextDouble() * (cellSize - 15) + 8;
        final y1 = cy + rand.nextDouble() * (cellSize - 15) + 8;

        // Curved organic mulberry fiber path
        final path = Path();
        path.moveTo(x1, y1);
        final cpX = x1 + (rand.nextDouble() - 0.5) * 16.0;
        final cpY = y1 + (rand.nextDouble() - 0.5) * 16.0;
        final endX = x1 + (rand.nextDouble() - 0.5) * 24.0;
        final endY = y1 + (rand.nextDouble() - 0.5) * 24.0;
        path.quadraticBezierTo(cpX, cpY, endX, endY);
        canvas.drawPath(path, fiberPaint);

        // Botanical tea-leaf elliptical flecks
        if (rand.nextDouble() > 0.35) {
          final lx = cx + rand.nextDouble() * cellSize;
          final ly = cy + rand.nextDouble() * cellSize;
          canvas.save();
          canvas.translate(lx, ly);
          canvas.rotate(rand.nextDouble() * math.pi);
          canvas.drawOval(
            Rect.fromCenter(center: Offset.zero, width: 2.2, height: 1.1),
            leafFleckPaint,
          );
          canvas.restore();
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Retro Pulp Comic & Dark Academia: Vintage Newsprint Rosette Dots
  // ---------------------------------------------------------------------------
  void _drawPulpRosette(Canvas canvas, Size size, bool isDesktop) {
    final rosettePaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.055 : 0.045)
      ..style = PaintingStyle.fill;

    final patinaPaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.040 : 0.035)
      ..style = PaintingStyle.fill;

    final clusterSpacing = isDesktop ? 36.0 : 30.0;
    for (double y = clusterSpacing; y < size.height; y += clusterSpacing) {
      for (double x = clusterSpacing; x < size.width; x += clusterSpacing) {
        // 4-dot CMYK rosette cluster
        const r = 2.8;
        canvas.drawCircle(Offset(x - r, y), 0.75, rosettePaint);
        canvas.drawCircle(Offset(x + r, y), 0.75, rosettePaint);
        canvas.drawCircle(Offset(x, y - r), 0.75, rosettePaint);
        canvas.drawCircle(Offset(x, y + r), 0.75, rosettePaint);

        // Micro center dot
        canvas.drawCircle(Offset(x, y), 0.5, rosettePaint);
      }
    }

    // Weathered pulp patina flecks
    const blockSize = 60.0;
    for (double bx = 0; bx < size.width; bx += blockSize) {
      for (double by = 0; by < size.height; by += blockSize) {
        final seed = ((bx * 13 + by * 37) % 1000).toInt();
        final rand = math.Random(seed);
        final px = bx + rand.nextDouble() * blockSize;
        final py = by + rand.nextDouble() * blockSize;
        canvas.drawCircle(Offset(px, py), 1.2 + rand.nextDouble() * 0.8, patinaPaint);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Sakura Manuscript & Midnight Sakura: Cherry Blossom Floral Petals
  // ---------------------------------------------------------------------------
  void _drawSakuraPetals(Canvas canvas, Size size, bool isDesktop) {
    // 1. Subtle Genko-yoshi manuscript lattice grid
    final gridSpacing = isDesktop ? 28.0 : 24.0;
    final gridPaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.035 : 0.025)
      ..strokeWidth = 0.6
      ..style = PaintingStyle.stroke;

    for (double x = gridSpacing; x < size.width; x += gridSpacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (double y = gridSpacing; y < size.height; y += gridSpacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    // 2. Floating Sakura Petals & 5-Petal Floral Watermarks
    final petalPaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.065 : 0.055)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.85;

    final petalFill = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.025 : 0.020)
      ..style = PaintingStyle.fill;

    final cellDist = isDesktop ? 90.0 : 75.0;
    for (double cx = 0; cx < size.width; cx += cellDist) {
      for (double cy = 0; cy < size.height; cy += cellDist) {
        final seed = ((cx * 19 + cy * 53) % 1000).toInt();
        final rand = math.Random(seed);

        final px = cx + rand.nextDouble() * (cellDist - 20) + 10;
        final py = cy + rand.nextDouble() * (cellDist - 20) + 10;
        final rotation = rand.nextDouble() * math.pi * 2;
        final isFivePetalFlower = rand.nextDouble() > 0.65;

        canvas.save();
        canvas.translate(px, py);
        canvas.rotate(rotation);

        if (isFivePetalFlower) {
          // Full 5-petal cherry blossom flower watermark
          const flowerRadius = 7.0;
          for (int p = 0; p < 5; p++) {
            final angle = (p * 2 * math.pi / 5) - (math.pi / 2);
            final petX = math.cos(angle) * flowerRadius;
            final petY = math.sin(angle) * flowerRadius;
            canvas.drawOval(
              Rect.fromCenter(center: Offset(petX, petY), width: 3.5, height: 2.2),
              petalFill,
            );
            canvas.drawOval(
              Rect.fromCenter(center: Offset(petX, petY), width: 3.5, height: 2.2),
              petalPaint,
            );
          }
          canvas.drawCircle(Offset.zero, 1.2, petalPaint);
        } else {
          // Single floating sakura petal silhouette with notched tip
          final path = Path();
          path.moveTo(0, -6);
          path.quadraticBezierTo(4, -3, 3, 3);
          path.quadraticBezierTo(0, 5, -3, 3);
          path.quadraticBezierTo(-4, -3, 0, -6);
          path.close();
          canvas.drawPath(path, petalFill);
          canvas.drawPath(path, petalPaint);
        }

        canvas.restore();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Nordic Glacier & Nordic Night: Crystalline Geometric Constellation
  // ---------------------------------------------------------------------------
  void _drawNordicConstellation(Canvas canvas, Size size, bool isDesktop) {
    final linePaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.045 : 0.035)
      ..strokeWidth = 0.7
      ..style = PaintingStyle.stroke;

    final starPaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.075 : 0.060)
      ..style = PaintingStyle.fill;

    final spacing = isDesktop ? 44.0 : 36.0;

    for (double y = spacing; y < size.height; y += spacing) {
      for (double x = spacing; x < size.width; x += spacing) {
        // Diamond lattice connector lines
        canvas.drawLine(Offset(x - spacing / 2, y), Offset(x, y - spacing / 2), linePaint);
        canvas.drawLine(Offset(x, y - spacing / 2), Offset(x + spacing / 2, y), linePaint);
        canvas.drawLine(Offset(x + spacing / 2, y), Offset(x, y + spacing / 2), linePaint);
        canvas.drawLine(Offset(x, y + spacing / 2), Offset(x - spacing / 2, y), linePaint);

        // Constellation starlight node
        canvas.drawCircle(Offset(x, y), 1.1, starPaint);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Drafting Vellum & Cyanotype Blueprint: Architectural Drafting Grid
  // ---------------------------------------------------------------------------
  void _drawBlueprintDrafting(Canvas canvas, Size size, bool isDesktop) {
    final minorSpacing = isDesktop ? 20.0 : 16.0;
    final majorSpacing = minorSpacing * 4;

    final minorPaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.040 : 0.030)
      ..strokeWidth = 0.55
      ..style = PaintingStyle.stroke;

    final majorPaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.080 : 0.065)
      ..strokeWidth = 0.95
      ..style = PaintingStyle.stroke;

    final crossPaint = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.110 : 0.090)
      ..strokeWidth = 1.1
      ..style = PaintingStyle.stroke;

    // Minor divisions
    for (double x = minorSpacing; x < size.width; x += minorSpacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), minorPaint);
    }
    for (double y = minorSpacing; y < size.height; y += minorSpacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), minorPaint);
    }

    // Major divisions
    for (double x = majorSpacing; x < size.width; x += majorSpacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), majorPaint);
    }
    for (double y = majorSpacing; y < size.height; y += majorSpacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), majorPaint);
    }

    // Major intersection drafting alignment crosses (+)
    for (double x = majorSpacing; x < size.width; x += majorSpacing) {
      for (double y = majorSpacing; y < size.height; y += majorSpacing) {
        const arm = 3.5;
        canvas.drawLine(Offset(x - arm, y), Offset(x + arm, y), crossPaint);
        canvas.drawLine(Offset(x, y - arm), Offset(x, y + arm), crossPaint);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Crumpled Kraft & Charred Papyrus: Origami Creases & Fold Facets
  // ---------------------------------------------------------------------------
  void _drawCrumpledCreases(Canvas canvas, Size size, bool isDesktop) {
    final creaseLight = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.065 : 0.050)
      ..strokeWidth = 0.85
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final creaseShadow = Paint()
      ..color = inkColor.withValues(alpha: isDark ? 0.035 : 0.025)
      ..strokeWidth = 1.5
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final cellSize = isDesktop ? 95.0 : 80.0;
    for (double cx = 0; cx < size.width; cx += cellSize) {
      for (double cy = 0; cy < size.height; cy += cellSize) {
        final seed = ((cx * 29 + cy * 43) % 1000).toInt();
        final rand = math.Random(seed);

        final x1 = cx + rand.nextDouble() * (cellSize - 20) + 10;
        final y1 = cy + rand.nextDouble() * (cellSize - 20) + 10;
        final midX = x1 + (rand.nextDouble() - 0.5) * 35.0;
        final midY = y1 + (rand.nextDouble() - 0.5) * 35.0;
        final endX = midX + (rand.nextDouble() - 0.5) * 30.0;
        final endY = midY + (rand.nextDouble() - 0.5) * 30.0;

        // Crease twin strokes (soft shadow + crisp fold ridge)
        canvas.drawLine(Offset(x1, y1), Offset(midX, midY), creaseShadow);
        canvas.drawLine(Offset(x1, y1), Offset(midX, midY), creaseLight);

        canvas.drawLine(Offset(midX, midY), Offset(endX, endY), creaseShadow);
        canvas.drawLine(Offset(midX, midY), Offset(endX, endY), creaseLight);

        // Branching micro-wrinkle fold
        if (rand.nextDouble() > 0.4) {
          final branchLen = 8.0 + rand.nextDouble() * 12.0;
          final branchAngle = rand.nextDouble() * math.pi * 2;
          canvas.drawLine(
            Offset(midX, midY),
            Offset(midX + math.cos(branchAngle) * branchLen, midY + math.sin(branchAngle) * branchLen),
            creaseLight,
          );
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant _PaperPatternPainter oldDelegate) {
    return oldDelegate.patternType != patternType ||
        oldDelegate.inkColor != inkColor ||
        oldDelegate.isDark != isDark;
  }
}
