import 'package:flutter/material.dart';
import '../services/enrichment_service.dart';
import '../theme/app_theme.dart';
import 'brutalist_widgets.dart';

class EnrichedDataSelection {
  final String? coverUrl;
  final String? title;
  final String? author;
  final num? totalUnits;
  final String? unitType;
  final String? notes;
  final String? genreTags;
  final String? sourceLink;
  final bool? isOngoing;

  const EnrichedDataSelection({
    this.coverUrl,
    this.title,
    this.author,
    this.totalUnits,
    this.unitType,
    this.notes,
    this.genreTags,
    this.sourceLink,
    this.isOngoing,
  });
}

class EnrichmentDialog extends StatefulWidget {
  final String initialQuery;

  const EnrichmentDialog({super.key, required this.initialQuery});

  @override
  State<EnrichmentDialog> createState() => _EnrichmentDialogState();
}

class _EnrichmentDialogState extends State<EnrichmentDialog> {
  final TextEditingController _searchCtrl = TextEditingController();
  final EnrichmentService _service = EnrichmentService.instance;

  String _scope = 'all';
  bool _isLoading = false;
  List<EnrichmentResult> _results = [];
  EnrichmentResult? _selected;

  // Field selection checkboxes
  bool _importCover = true;
  bool _importTitleAuthor = true;
  bool _importUnits = true;
  bool _importSynopsis = true;
  bool _importTags = true;
  bool _importLink = true;

  @override
  void initState() {
    super.initState();
    _searchCtrl.text = widget.initialQuery;
    if (widget.initialQuery.trim().isNotEmpty) {
      _performSearch(widget.initialQuery, _scope);
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _performSearch(String query, String scope) async {
    final q = query.trim();
    if (q.isEmpty) return;

    setState(() {
      _isLoading = true;
      _selected = null;
    });

    try {
      final res = await _service.search(q, type: scope);
      if (mounted) {
        setState(() {
          _results = res;
          _selected = res.isNotEmpty ? res.first : null;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _applySelection() {
    if (_selected == null) return;

    final result = EnrichedDataSelection(
      coverUrl: _importCover ? _selected!.coverUrl : null,
      title: _importTitleAuthor ? _selected!.title : null,
      author: _importTitleAuthor ? _selected!.author : null,
      totalUnits: _importUnits ? _selected!.totalUnits : null,
      unitType: _importUnits ? _selected!.unitType : null,
      notes: _importSynopsis ? _selected!.description : null,
      genreTags: _importTags ? _selected!.genreTags : null,
      sourceLink: _importLink ? _selected!.externalLink : null,
      isOngoing: _importUnits ? _selected!.isOngoing : null,
    );

    Navigator.of(context).pop(result);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final dialogBg = isDark ? AppColors.darkSurface : AppColors.paperBg;
    final borderColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;
    final inkColor = isDark ? AppColors.darkInkWhite : AppColors.inkBlack;
    final mutedInk = isDark ? Colors.white60 : AppColors.inkMuted;
    final cardBg = isDark ? AppColors.darkSurfaceHigh : Colors.white;

    return Dialog(
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
      backgroundColor: dialogBg,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Container(
        width: 680,
        height: 600,
        decoration: BoxDecoration(
          border: Border.all(color: borderColor, width: 2),
          boxShadow: [
            BoxShadow(color: borderColor, offset: const Offset(4, 4)),
          ],
        ),
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: borderColor, width: 2)),
                color: isDark ? AppColors.darkSurfaceHigh : AppColors.paperSurface,
              ),
              child: Row(
                children: [
                  const Icon(Icons.auto_awesome, color: AppColors.warningAmber, size: 18),
                  const SizedBox(width: 8),
                  Text(
                    '1-CLICK METADATA AUTO-ENRICH',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                      color: inkColor,
                      letterSpacing: 0.5,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: Icon(Icons.close, size: 18, color: inkColor),
                    onPressed: () => Navigator.of(context).pop(),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            ),

            // Search Bar & Scope Chips
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 38,
                          decoration: BoxDecoration(
                            color: cardBg,
                            border: Border.all(color: borderColor, width: 1.5),
                          ),
                          child: TextField(
                            controller: _searchCtrl,
                            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: inkColor),
                            decoration: InputDecoration(
                              hintText: 'Search Title, Author, or ISBN...',
                              hintStyle: TextStyle(fontSize: 12, color: mutedInk),
                              prefixIcon: Icon(Icons.search, size: 16, color: mutedInk),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(vertical: 9),
                            ),
                            onSubmitted: (val) => _performSearch(val, _scope),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      BrutalistButton(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        onPressed: _isLoading ? null : () => _performSearch(_searchCtrl.text, _scope),
                        child: _isLoading
                            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Text('SEARCH', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text('SCOPE: ', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: mutedInk)),
                      _buildScopeChip('all', 'ALL SOURCES', borderColor, inkColor),
                      const SizedBox(width: 4),
                      _buildScopeChip('isbn', 'EXACT ISBN', borderColor, inkColor),
                      const SizedBox(width: 4),
                      _buildScopeChip('manga', 'LN & MANGA', borderColor, inkColor),
                    ],
                  ),
                ],
              ),
            ),

            const Divider(height: 1, thickness: 1),

            // Body: Split List & Selected Preview
            Expanded(
              child: _isLoading
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const CircularProgressIndicator(strokeWidth: 2),
                          const SizedBox(height: 12),
                          Text('Aggregating public book databases...', style: TextStyle(fontSize: 12, color: mutedInk, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    )
                  : _results.isEmpty
                      ? Center(
                          child: Text(
                            _searchCtrl.text.isEmpty ? 'Type a title or ISBN above to search' : 'No results found. Try ISBN or alternative title.',
                            style: TextStyle(fontSize: 12, color: mutedInk),
                          ),
                        )
                      : Row(
                          children: [
                            // Left Results List (250px)
                            SizedBox(
                              width: 260,
                              child: ListView.separated(
                                padding: const EdgeInsets.all(8),
                                itemCount: _results.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 6),
                                itemBuilder: (ctx, idx) {
                                  final r = _results[idx];
                                  final isSel = _selected?.id == r.id;
                                  return InkWell(
                                    onTap: () => setState(() => _selected = r),
                                    child: Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(
                                        color: isSel ? AppColors.warningAmber.withValues(alpha: 0.15) : cardBg,
                                        border: Border.all(
                                          color: isSel ? AppColors.warningAmber : borderColor,
                                          width: isSel ? 2 : 1.2,
                                        ),
                                      ),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Container(
                                            width: 32,
                                            height: 46,
                                            decoration: BoxDecoration(
                                              border: Border.all(color: borderColor, width: 1),
                                              color: dialogBg,
                                            ),
                                            child: r.coverUrl != null
                                                ? Image.network(r.coverUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.book, size: 16))
                                                : const Icon(Icons.book, size: 16),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                                  color: isDark ? AppColors.darkSurface : AppColors.paperSurface,
                                                  child: Text(
                                                    r.sourceLabel,
                                                    style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w900, color: inkColor),
                                                  ),
                                                ),
                                                const SizedBox(height: 2),
                                                Text(
                                                  r.title,
                                                  maxLines: 2,
                                                  overflow: TextOverflow.ellipsis,
                                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: inkColor, height: 1.15),
                                                ),
                                                if (r.author != null)
                                                  Text(
                                                    'by ${r.author}',
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                    style: TextStyle(fontSize: 9.5, color: mutedInk),
                                                  ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),

                            const VerticalDivider(width: 1, thickness: 1),

                            // Right Selection Preview & Checkbox Merge Panel
                            Expanded(
                              child: _selected == null
                                  ? Center(child: Text('Select a book candidate', style: TextStyle(fontSize: 12, color: mutedInk)))
                                  : SingleChildScrollView(
                                      padding: const EdgeInsets.all(12),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Row(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Container(
                                                width: 58,
                                                height: 82,
                                                decoration: BoxDecoration(
                                                  border: Border.all(color: borderColor, width: 1.5),
                                                  color: dialogBg,
                                                ),
                                                child: _selected!.coverUrl != null
                                                    ? Image.network(_selected!.coverUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.book, size: 24))
                                                    : const Icon(Icons.book, size: 24),
                                              ),
                                              const SizedBox(width: 10),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      _selected!.title,
                                                      style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.w900, color: inkColor, height: 1.2),
                                                    ),
                                                    if (_selected!.author != null)
                                                      Text('by ${_selected!.author}', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: mutedInk)),
                                                    const SizedBox(height: 4),
                                                    Wrap(
                                                      spacing: 4,
                                                      children: [
                                                        if (_selected!.totalUnits != null)
                                                          _buildTag('${_selected!.totalUnits} ${_selected!.unitType ?? 'units'}', borderColor, inkColor),
                                                        if (_selected!.publishedYear != null)
                                                          _buildTag('${_selected!.publishedYear}', borderColor, inkColor),
                                                        if (_selected!.publisher != null)
                                                          _buildTag(_selected!.publisher!, borderColor, inkColor),
                                                      ],
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ),

                                          if (_selected!.description != null && _selected!.description!.isNotEmpty) ...[
                                            const SizedBox(height: 10),
                                            Text('SYNOPSIS', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w900, color: mutedInk)),
                                            const SizedBox(height: 2),
                                            Text(
                                              _selected!.description!,
                                              maxLines: 4,
                                              overflow: TextOverflow.ellipsis,
                                              style: TextStyle(fontSize: 11, color: inkColor, height: 1.3),
                                            ),
                                          ],

                                          const SizedBox(height: 12),
                                          Text('SELECT FIELDS TO IMPORT:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: inkColor, letterSpacing: 0.5)),
                                          const SizedBox(height: 6),

                                          Wrap(
                                            spacing: 12,
                                            runSpacing: 4,
                                            children: [
                                              _buildCheckbox('Cover Art', _importCover, (v) => setState(() => _importCover = v!)),
                                              _buildCheckbox('Title & Author', _importTitleAuthor, (v) => setState(() => _importTitleAuthor = v!)),
                                              _buildCheckbox('Length / Units', _importUnits, (v) => setState(() => _importUnits = v!)),
                                              _buildCheckbox('Synopsis / Notes', _importSynopsis, (v) => setState(() => _importSynopsis = v!)),
                                              _buildCheckbox('Genre Tags', _importTags, (v) => setState(() => _importTags = v!)),
                                              _buildCheckbox('Source Link', _importLink, (v) => setState(() => _importLink = v!)),
                                            ],
                                          ),

                                          const SizedBox(height: 16),
                                          BrutalistButton(
                                            isFullWidth: true,
                                            padding: const EdgeInsets.symmetric(vertical: 10),
                                            onPressed: _applySelection,
                                            child: const Row(
                                              mainAxisAlignment: MainAxisAlignment.center,
                                              children: [
                                                Icon(Icons.auto_awesome, size: 16),
                                                SizedBox(width: 6),
                                                Text('APPLY SELECTED METADATA', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                            ),
                          ],
                        ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScopeChip(String val, String label, Color borderColor, Color inkColor) {
    final isSel = _scope == val;
    return InkWell(
      onTap: () {
        setState(() => _scope = val);
        if (_searchCtrl.text.trim().isNotEmpty) {
          _performSearch(_searchCtrl.text, val);
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: isSel ? AppColors.warningAmber : Colors.transparent,
          border: Border.all(color: borderColor, width: 1.2),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.w900,
            color: isSel ? AppColors.inkBlack : inkColor,
          ),
        ),
      ),
    );
  }

  Widget _buildTag(String text, Color borderColor, Color inkColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
      decoration: BoxDecoration(border: Border.all(color: borderColor.withValues(alpha: 0.4), width: 1)),
      child: Text(text, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: inkColor)),
    );
  }

  Widget _buildCheckbox(String label, bool val, ValueChanged<bool?> onChanged) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: 22,
          height: 22,
          child: Checkbox(
            value: val,
            onChanged: onChanged,
            activeColor: AppColors.inkBlack,
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
          ),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
      ],
    );
  }
}
