import 'dart:math' as math;
import 'dart:ui' as ui;
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
  final double intensity;

  const PaperTextureCanvas({
    super.key,
    required this.child,
    required this.patternType,
    required this.isDark,
    this.baseCanvasColor,
    this.enabled = true,
    this.intensity = 1.0,
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
              isComplex: true,
              willChange: false,
              painter: _PaperPatternPainter(
                patternType: patternType,
                inkColor: inkColor,
                isDark: isDark,
                intensity: intensity,
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
  final double intensity;

  static final Map<String, ui.Picture> _globalPictureCache = {};
  static const int _maxCachedPictures = 4;

  _PaperPatternPainter({
    required this.patternType,
    required this.inkColor,
    required this.isDark,
    this.intensity = 1.0,
  });

  Color _alphaColor(double baseAlpha) =>
      inkColor.withValues(alpha: (baseAlpha * intensity).clamp(0.0, 1.0));

  String _cacheKey(Size size) =>
      '${patternType.name}_${size.width.toInt()}x${size.height.toInt()}_${isDark ? "d" : "l"}_${intensity.toStringAsFixed(2)}';

  @override
  void paint(Canvas canvas, Size size) {
    if (patternType == PaperPatternType.none || size.isEmpty) return;

    final key = _cacheKey(size);
    var picture = _globalPictureCache[key];

    if (picture == null) {
      // Evict oldest if cache gets too large (e.g. across window resizes)
      if (_globalPictureCache.length >= _maxCachedPictures) {
        final oldestKey = _globalPictureCache.keys.first;
        _globalPictureCache.remove(oldestKey)?.dispose();
      }

      final recorder = ui.PictureRecorder();
      final recordCanvas = Canvas(recorder, Rect.fromLTWH(0, 0, size.width, size.height));
      _drawPattern(recordCanvas, size);
      picture = recorder.endRecording();
      _globalPictureCache[key] = picture;
    }

    canvas.drawPicture(picture);
  }

  void _drawPattern(Canvas canvas, Size size) {
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
  // 1. Classic Paperback & Charcoal Ledger: Antique Laid Archival Paper
  // ---------------------------------------------------------------------------
  void _drawDeckleGrain(Canvas canvas, Size size, bool isDesktop) {
    // 1. Fine horizontal laid wire lines (classic laid paper watermark)
    final laidLinePaint = Paint()
      ..color = _alphaColor(isDark ? 0.08 : 0.07)
      ..strokeWidth = 0.6
      ..style = PaintingStyle.stroke;

    const laidSpacing = 18.0;
    for (double y = laidSpacing; y < size.height; y += laidSpacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), laidLinePaint);
    }

    // 2. Vertical chain lines (wide watermark ribs)
    final chainLinePaint = Paint()
      ..color = _alphaColor(isDark ? 0.12 : 0.10)
      ..strokeWidth = 0.8
      ..style = PaintingStyle.stroke;

    final chainSpacing = isDesktop ? 80.0 : 64.0;
    for (double x = chainSpacing; x < size.width; x += chainSpacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), chainLinePaint);
    }

    // 3. Organic rag pulp fibers & cotton inclusions
    final fiberPaint = Paint()
      ..color = _alphaColor(isDark ? 0.22 : 0.20)
      ..strokeWidth = 1.15
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final grainPaint = Paint()
      ..color = _alphaColor(isDark ? 0.18 : 0.16)
      ..style = PaintingStyle.fill;

    final blockSize = isDesktop ? 90.0 : 75.0;
    for (double bx = 0; bx < size.width; bx += blockSize) {
      for (double by = 0; by < size.height; by += blockSize) {
        final seed = ((bx * 47 + by * 23) % 1000).toInt();
        final rand = math.Random(seed);

        // Deckle pulp flecks
        for (int i = 0; i < 3; i++) {
          final gx = bx + rand.nextDouble() * blockSize;
          final gy = by + rand.nextDouble() * blockSize;
          canvas.drawCircle(Offset(gx, gy), 1.1 + rand.nextDouble() * 0.7, grainPaint);
        }

        // Curving rag cotton fiber strand
        final fx = bx + rand.nextDouble() * (blockSize - 20) + 10;
        final fy = by + rand.nextDouble() * (blockSize - 20) + 10;
        final fiberPath = Path()..moveTo(fx, fy);
        final cpX = fx + (rand.nextDouble() - 0.5) * 20.0;
        final cpY = fy + (rand.nextDouble() - 0.5) * 20.0;
        final endX = fx + (rand.nextDouble() - 0.5) * 32.0;
        final endY = fy + (rand.nextDouble() - 0.5) * 32.0;
        fiberPath.quadraticBezierTo(cpX, cpY, endX, endY);
        canvas.drawPath(fiberPath, fiberPaint);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Manga Inkpaper & Manga Noir: Tankobon Halftone Screentone & Speed Shading
  // ---------------------------------------------------------------------------
  void _drawScreentoneHalftone(Canvas canvas, Size size, bool isDesktop) {
    final spacing = isDesktop ? 26.0 : 22.0;
    final dotPaint = Paint()
      ..color = _alphaColor(isDark ? 0.20 : 0.18)
      ..style = PaintingStyle.fill;

    final hatchPaint = Paint()
      ..color = _alphaColor(isDark ? 0.24 : 0.22)
      ..strokeWidth = 1.05
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    bool stagger = false;
    for (double y = spacing; y < size.height; y += spacing) {
      final offsetX = stagger ? spacing / 2 : 0.0;
      for (double x = spacing + offsetX; x < size.width; x += spacing) {
        canvas.drawCircle(Offset(x, y), 1.4, dotPaint);

        // Manga 3-stroke diagonal shading hatch blocks on alternating grid modules
        final colIdx = (x / spacing).toInt();
        final rowIdx = (y / spacing).toInt();
        if ((colIdx + rowIdx * 3) % 7 == 0) {
          for (int h = -1; h <= 1; h++) {
            final off = h * 2.2;
            canvas.drawLine(
              Offset(x - 3.5 + off, y - 3.5 - off),
              Offset(x + 3.5 + off, y + 3.5 - off),
              hatchPaint,
            );
          }
        }
      }
      stagger = !stagger;
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Matcha Washi & Midnight Matcha: Japanese Kozo Mulberry & Botanical Flora
  // ---------------------------------------------------------------------------
  void _drawWashiBotanical(Canvas canvas, Size size, bool isDesktop) {
    final fiberPaint = Paint()
      ..color = _alphaColor(isDark ? 0.24 : 0.22)
      ..strokeWidth = 1.3
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final leafOutline = Paint()
      ..color = _alphaColor(isDark ? 0.26 : 0.24)
      ..strokeWidth = 1.1
      ..style = PaintingStyle.stroke;

    final leafFill = Paint()
      ..color = _alphaColor(isDark ? 0.10 : 0.08)
      ..style = PaintingStyle.fill;

    final cellSize = isDesktop ? 100.0 : 85.0;
    for (double cx = 0; cx < size.width; cx += cellSize) {
      for (double cy = 0; cy < size.height; cy += cellSize) {
        final seed = ((cx * 31 + cy * 17) % 1000).toInt();
        final rand = math.Random(seed);

        final x1 = cx + rand.nextDouble() * (cellSize - 20) + 10;
        final y1 = cy + rand.nextDouble() * (cellSize - 20) + 10;

        // Long organic Mulberry Kozo fiber curve
        final fiberPath = Path()..moveTo(x1, y1);
        final cp1X = x1 + (rand.nextDouble() - 0.5) * 35.0;
        final cp1Y = y1 + (rand.nextDouble() - 0.5) * 35.0;
        final cp2X = x1 + (rand.nextDouble() - 0.5) * 50.0;
        final cp2Y = y1 + (rand.nextDouble() - 0.5) * 50.0;
        final endX = x1 + (rand.nextDouble() - 0.5) * 60.0;
        final endY = y1 + (rand.nextDouble() - 0.5) * 60.0;
        fiberPath.cubicTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
        canvas.drawPath(fiberPath, fiberPaint);

        // Botanical Tea Leaf or Ginkgo Watermark
        final isGinkgo = rand.nextDouble() > 0.65;
        final lx = cx + rand.nextDouble() * (cellSize - 24) + 12;
        final ly = cy + rand.nextDouble() * (cellSize - 24) + 12;
        final rot = rand.nextDouble() * math.pi * 2;

        canvas.save();
        canvas.translate(lx, ly);
        canvas.rotate(rot);

        if (isGinkgo) {
          // Fan-shaped Ginkgo leaf outline
          final ginkgoPath = Path();
          ginkgoPath.moveTo(0, 8);
          ginkgoPath.lineTo(0, 3);
          ginkgoPath.quadraticBezierTo(-7, -4, -6, -9);
          ginkgoPath.quadraticBezierTo(0, -6, 0, -9);
          ginkgoPath.quadraticBezierTo(0, -6, 6, -9);
          ginkgoPath.quadraticBezierTo(7, -4, 0, 3);
          ginkgoPath.close();
          canvas.drawPath(ginkgoPath, leafFill);
          canvas.drawPath(ginkgoPath, leafOutline);
        } else {
          // Pointed tea leaf with center vein
          final leafPath = Path();
          leafPath.moveTo(0, -8);
          leafPath.quadraticBezierTo(4.5, 0, 0, 8);
          leafPath.quadraticBezierTo(-4.5, 0, 0, -8);
          leafPath.close();
          canvas.drawPath(leafPath, leafFill);
          canvas.drawPath(leafPath, leafOutline);
          canvas.drawLine(const Offset(0, -6), const Offset(0, 6), leafOutline);
        }

        canvas.restore();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Retro Pulp Comic & Dark Academia: Vintage Newsprint Rosettes & Typo Fleurons
  // ---------------------------------------------------------------------------
  void _drawPulpRosette(Canvas canvas, Size size, bool isDesktop) {
    final rosettePaint = Paint()
      ..color = _alphaColor(isDark ? 0.20 : 0.18)
      ..style = PaintingStyle.fill;

    final fleuronPaint = Paint()
      ..color = _alphaColor(isDark ? 0.24 : 0.22)
      ..strokeWidth = 1.15
      ..style = PaintingStyle.stroke;

    final patinaPaint = Paint()
      ..color = _alphaColor(isDark ? 0.15 : 0.13)
      ..style = PaintingStyle.fill;

    final clusterSpacing = isDesktop ? 50.0 : 42.0;
    for (double y = clusterSpacing; y < size.height; y += clusterSpacing) {
      for (double x = clusterSpacing; x < size.width; x += clusterSpacing) {
        final colIdx = (x / clusterSpacing).toInt();
        final rowIdx = (y / clusterSpacing).toInt();

        if ((colIdx + rowIdx) % 2 == 0) {
          // CMYK 4-dot Rosette Cluster
          const r = 3.6;
          canvas.drawCircle(Offset(x - r, y), 1.2, rosettePaint);
          canvas.drawCircle(Offset(x + r, y), 1.2, rosettePaint);
          canvas.drawCircle(Offset(x, y - r), 1.2, rosettePaint);
          canvas.drawCircle(Offset(x, y + r), 1.2, rosettePaint);
          canvas.drawCircle(Offset(x, y), 0.8, rosettePaint);
        } else {
          // Classical Bookplate Printer's Diamond Star Fleuron (✦)
          final starPath = Path();
          const arm = 5.0;
          const inner = 1.5;
          starPath.moveTo(x, y - arm);
          starPath.lineTo(x + inner, y - inner);
          starPath.lineTo(x + arm, y);
          starPath.lineTo(x + inner, y + inner);
          starPath.lineTo(x, y + arm);
          starPath.lineTo(x - inner, y + inner);
          starPath.lineTo(x - arm, y);
          starPath.lineTo(x - inner, y - inner);
          starPath.close();
          canvas.drawPath(starPath, fleuronPaint);
        }
      }
    }

    // Weathered pulp aging flecks
    const blockSize = 80.0;
    for (double bx = 0; bx < size.width; bx += blockSize) {
      for (double by = 0; by < size.height; by += blockSize) {
        final seed = ((bx * 13 + by * 37) % 1000).toInt();
        final rand = math.Random(seed);
        final px = bx + rand.nextDouble() * blockSize;
        final py = by + rand.nextDouble() * blockSize;
        canvas.drawCircle(Offset(px, py), 1.4 + rand.nextDouble() * 0.9, patinaPaint);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Sakura Manuscript & Midnight Sakura: Cherry Blossom Florals & Manuscript Lattice
  // ---------------------------------------------------------------------------
  void _drawSakuraPetals(Canvas canvas, Size size, bool isDesktop) {
    // 1. Genko-yoshi manuscript lattice grid
    final gridSpacing = isDesktop ? 34.0 : 28.0;
    final gridPaint = Paint()
      ..color = _alphaColor(isDark ? 0.11 : 0.09)
      ..strokeWidth = 0.75
      ..style = PaintingStyle.stroke;

    for (double x = gridSpacing; x < size.width; x += gridSpacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (double y = gridSpacing; y < size.height; y += gridSpacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    // 2. Floating Sakura Petals & 5-Petal Cherry Blossom Watermarks (Refined & 30% larger)
    final petalPaint = Paint()
      ..color = _alphaColor(isDark ? 0.24 : 0.22)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.05;

    final petalFill = Paint()
      ..color = _alphaColor(isDark ? 0.10 : 0.08)
      ..style = PaintingStyle.fill;

    final cellDist = isDesktop ? 110.0 : 90.0;
    for (double cx = 0; cx < size.width; cx += cellDist) {
      for (double cy = 0; cy < size.height; cy += cellDist) {
        final seed = ((cx * 19 + cy * 53) % 1000).toInt();
        final rand = math.Random(seed);

        final px = cx + rand.nextDouble() * (cellDist - 24) + 12;
        final py = cy + rand.nextDouble() * (cellDist - 24) + 12;
        final rotation = rand.nextDouble() * math.pi * 2;
        final isFivePetalFlower = rand.nextDouble() > 0.60;

        canvas.save();
        canvas.translate(px, py);
        canvas.rotate(rotation);

        if (isFivePetalFlower) {
          // Full 5-petal cherry blossom flower watermark (enlarged & refined)
          const flowerRadius = 9.5;
          for (int p = 0; p < 5; p++) {
            final angle = (p * 2 * math.pi / 5) - (math.pi / 2);
            final petX = math.cos(angle) * flowerRadius;
            final petY = math.sin(angle) * flowerRadius;
            canvas.drawOval(
              Rect.fromCenter(center: Offset(petX, petY), width: 4.8, height: 2.9),
              petalFill,
            );
            canvas.drawOval(
              Rect.fromCenter(center: Offset(petX, petY), width: 4.8, height: 2.9),
              petalPaint,
            );
          }
          canvas.drawCircle(Offset.zero, 1.5, petalPaint);
        } else {
          // Single floating sakura petal silhouette with notched tip (enlarged)
          final path = Path();
          path.moveTo(0, -8.5);
          path.quadraticBezierTo(5.5, -4.5, 4.2, 4.2);
          path.quadraticBezierTo(0, 6.8, -4.2, 4.2);
          path.quadraticBezierTo(-5.5, -4.5, 0, -8.5);
          path.close();
          canvas.drawPath(path, petalFill);
          canvas.drawPath(path, petalPaint);
        }

        canvas.restore();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Nordic Glacier & Nordic Night: Crystalline Geometric Constellations & Stars
  // ---------------------------------------------------------------------------
  void _drawNordicConstellation(Canvas canvas, Size size, bool isDesktop) {
    final linePaint = Paint()
      ..color = _alphaColor(isDark ? 0.13 : 0.11)
      ..strokeWidth = 0.85
      ..style = PaintingStyle.stroke;

    final starPaint = Paint()
      ..color = _alphaColor(isDark ? 0.25 : 0.22)
      ..style = PaintingStyle.fill;

    final radiantStarPaint = Paint()
      ..color = _alphaColor(isDark ? 0.28 : 0.25)
      ..strokeWidth = 1.15
      ..style = PaintingStyle.stroke;

    final spacing = isDesktop ? 56.0 : 46.0;

    for (double y = spacing; y < size.height; y += spacing) {
      for (double x = spacing; x < size.width; x += spacing) {
        final colIdx = (x / spacing).toInt();
        final rowIdx = (y / spacing).toInt();

        // Diamond lattice connector lines
        canvas.drawLine(Offset(x - spacing / 2, y), Offset(x, y - spacing / 2), linePaint);
        canvas.drawLine(Offset(x, y - spacing / 2), Offset(x + spacing / 2, y), linePaint);
        canvas.drawLine(Offset(x + spacing / 2, y), Offset(x, y + spacing / 2), linePaint);
        canvas.drawLine(Offset(x, y + spacing / 2), Offset(x - spacing / 2, y), linePaint);

        if ((colIdx + rowIdx) % 3 == 0) {
          // 4-point radiant compass star
          const arm = 4.5;
          canvas.drawLine(Offset(x - arm, y), Offset(x + arm, y), radiantStarPaint);
          canvas.drawLine(Offset(x, y - arm), Offset(x, y + arm), radiantStarPaint);
          canvas.drawCircle(Offset(x, y), 1.5, starPaint);
        } else {
          // Constellation starlight node
          canvas.drawCircle(Offset(x, y), 1.4, starPaint);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Drafting Vellum & Cyanotype Blueprint: Architectural Drafting Grid & Markers
  // ---------------------------------------------------------------------------
  void _drawBlueprintDrafting(Canvas canvas, Size size, bool isDesktop) {
    final minorSpacing = isDesktop ? 26.0 : 20.0;
    final majorSpacing = minorSpacing * 4;

    final minorPaint = Paint()
      ..color = _alphaColor(isDark ? 0.13 : 0.11)
      ..strokeWidth = 0.7
      ..style = PaintingStyle.stroke;

    final majorPaint = Paint()
      ..color = _alphaColor(isDark ? 0.24 : 0.22)
      ..strokeWidth = 1.15
      ..style = PaintingStyle.stroke;

    final crossPaint = Paint()
      ..color = _alphaColor(isDark ? 0.32 : 0.28)
      ..strokeWidth = 1.35
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

    // Major intersection drafting alignment crosses (+) and corner marks
    for (double x = majorSpacing; x < size.width; x += majorSpacing) {
      for (double y = majorSpacing; y < size.height; y += majorSpacing) {
        const arm = 4.5;
        canvas.drawLine(Offset(x - arm, y), Offset(x + arm, y), crossPaint);
        canvas.drawLine(Offset(x, y - arm), Offset(x, y + arm), crossPaint);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Crumpled Kraft & Charred Papyrus: Origami Creases & Faceted Folds
  // ---------------------------------------------------------------------------
  void _drawCrumpledCreases(Canvas canvas, Size size, bool isDesktop) {
    final creaseLight = Paint()
      ..color = _alphaColor(isDark ? 0.24 : 0.22)
      ..strokeWidth = 1.2
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final creaseShadow = Paint()
      ..color = _alphaColor(isDark ? 0.16 : 0.14)
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final cellSize = isDesktop ? 120.0 : 100.0;
    for (double cx = 0; cx < size.width; cx += cellSize) {
      for (double cy = 0; cy < size.height; cy += cellSize) {
        final seed = ((cx * 29 + cy * 43) % 1000).toInt();
        final rand = math.Random(seed);

        final x1 = cx + rand.nextDouble() * (cellSize - 20) + 10;
        final y1 = cy + rand.nextDouble() * (cellSize - 20) + 10;
        final midX = x1 + (rand.nextDouble() - 0.5) * 45.0;
        final midY = y1 + (rand.nextDouble() - 0.5) * 45.0;
        final endX = midX + (rand.nextDouble() - 0.5) * 40.0;
        final endY = midY + (rand.nextDouble() - 0.5) * 40.0;

        // Primary crease ridge (shadow + highlight pair for 3D depth)
        canvas.drawLine(Offset(x1, y1), Offset(midX, midY), creaseShadow);
        canvas.drawLine(Offset(x1, y1), Offset(midX, midY), creaseLight);

        canvas.drawLine(Offset(midX, midY), Offset(endX, endY), creaseShadow);
        canvas.drawLine(Offset(midX, midY), Offset(endX, endY), creaseLight);

        // Branching fold facets
        final branchLen = 12.0 + rand.nextDouble() * 16.0;
        final branchAngle = rand.nextDouble() * math.pi * 2;
        canvas.drawLine(
          Offset(midX, midY),
          Offset(midX + math.cos(branchAngle) * branchLen, midY + math.sin(branchAngle) * branchLen),
          creaseLight,
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant _PaperPatternPainter oldDelegate) {
    return oldDelegate.patternType != patternType ||
        oldDelegate.inkColor != inkColor ||
        oldDelegate.isDark != isDark ||
        oldDelegate.intensity != intensity;
  }
}
