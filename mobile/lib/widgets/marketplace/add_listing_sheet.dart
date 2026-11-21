import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../services/api_client.dart';
import '../../services/catalog_events.dart';
import '../../theme/app_colors.dart';
import '../../theme/social_ui.dart';

const _gemTypes = [
  'Sapphire', 'Ruby', 'Emerald', 'Spinel', 'Diamond',
  'Alexandrite', 'Tourmaline', 'Aquamarine', 'Tanzanite', 'Other',
];
const _cuts = ['Oval', 'Cushion', 'Round', 'Pear', 'Emerald Cut', 'Marquise', 'Cabochon', 'Other'];
const _clarities = ['Eye Clean', 'Loupe Clean', 'Slightly Included', 'Moderately Included', 'Heavily Included', 'Other'];
const _treatments = ['Unheated', 'Heated', 'Unknown', 'Other'];
const _certs = ['None', 'GIA', 'GRS', 'GIC', 'Local Lab', 'Other'];
const _origins = ['Sri Lanka', 'Madagascar', 'Myanmar', 'Thailand', 'Mozambique', 'Tanzania', 'Other'];

class AddListingSheet extends StatefulWidget {
  const AddListingSheet({
    super.key,
    this.listingId,
    required this.onClose,
  });

  final String? listingId;
  final VoidCallback onClose;

  @override
  State<AddListingSheet> createState() => _AddListingSheetState();
}

class _AddListingSheetState extends State<AddListingSheet> {
  int _step = 0;
  String _saleType = 'single';
  String? _gemType;
  String _weight = '';
  String _price = '';
  String? _cut;
  String? _clarity;
  String? _treatment;
  String? _certification;
  String? _origin;
  String _status = 'ACTIVE';
  final List<String> _images = [];
  bool _busy = false;
  String _error = '';

  bool get _editing => widget.listingId != null && widget.listingId!.isNotEmpty;

  List<String> get _steps {
    final steps = <String>[
      'saleType',
      'gemType',
      'weight',
      'price',
      'cut',
      'clarity',
      'treatment',
      'certification',
      'origin',
      if (_editing) 'status',
      'photos',
    ];
    return steps;
  }

  @override
  void initState() {
    super.initState();
    if (_editing) _loadExisting();
  }

  Future<void> _loadExisting() async {
    try {
      final listing = await apiGet<Map<String, dynamic>>(
        '/api/listings/${widget.listingId}',
      );
      setState(() {
        _saleType = '${listing['saleType'] ?? 'single'}';
        _gemType = listing['gemType']?.toString();
        _weight = '${listing['caratWeight'] ?? listing['weight'] ?? ''}';
        _price = '${listing['price'] ?? ''}';
        _cut = listing['cut']?.toString();
        _clarity = listing['clarity']?.toString();
        _treatment = listing['treatment']?.toString();
        _certification = listing['certification']?.toString();
        _origin = listing['origin']?.toString();
        _status = '${listing['status'] ?? 'ACTIVE'}';
        _images
          ..clear()
          ..addAll(
            (listing['images'] as List? ?? []).map((e) => '$e').where((e) => e.isNotEmpty),
          );
      });
    } catch (e) {
      setState(() => _error = '$e');
    }
  }

  Future<void> _pickImages() async {
    final picker = ImagePicker();
    final files = await picker.pickMultiImage(imageQuality: 80);
    for (final file in files.take(5 - _images.length)) {
      final bytes = await file.readAsBytes();
      if (bytes.lengthInBytes > 1.5 * 1024 * 1024) continue;
      final b64 = base64Encode(bytes);
      final name = (file.name.isNotEmpty ? file.name : file.path).toLowerCase();
      final mime = name.endsWith('.png') ? 'image/png' : 'image/jpeg';
      setState(() => _images.add('data:$mime;base64,$b64'));
    }
  }

  Future<void> _submit() async {
    final auth = context.read<AuthProvider>();
    setState(() {
      _busy = true;
      _error = '';
    });
    try {
      final body = {
        'saleType': _saleType,
        'gemType': _gemType,
        'type': _gemType,
        'variety': _gemType,
        'caratWeight': double.tryParse(_weight) ?? _weight,
        'weight': double.tryParse(_weight) ?? _weight,
        'price': double.tryParse(_price) ?? _price,
        'currency': 'LKR',
        'cut': _cut,
        'clarity': _clarity,
        'treatment': _treatment,
        'certification': _certification,
        'origin': _origin,
        'status': _status,
        'images': _images,
        'title': '$_gemType ${_weight}ct',
        'userId': auth.uid,
      };
      if (_editing) {
        await apiPost('/api/listings/${widget.listingId}', body);
      } else {
        await apiPost('/api/listings', body);
      }
      CatalogEvents.notifyCatalogChanged();
      widget.onClose();
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() {
        _error = '$e';
        _busy = false;
      });
    }
  }

  void _next() {
    if (_step >= _steps.length - 1) {
      _submit();
      return;
    }
    setState(() => _step++);
  }

  void _back() {
    if (_step == 0) {
      widget.onClose();
      Navigator.of(context).pop();
      return;
    }
    setState(() => _step--);
  }

  bool get _canContinue {
    final key = _steps[_step];
    switch (key) {
      case 'saleType':
        return _saleType.isNotEmpty;
      case 'gemType':
        return _gemType != null;
      case 'weight':
        return _weight.trim().isNotEmpty;
      case 'price':
        return _price.trim().isNotEmpty;
      case 'cut':
        return _cut != null;
      case 'clarity':
        return _clarity != null;
      case 'treatment':
        return _treatment != null;
      case 'certification':
        return _certification != null;
      case 'origin':
        return _origin != null;
      case 'status':
        return true;
      case 'photos':
        return _images.isNotEmpty;
      default:
        return true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height * 0.92;
    final key = _steps[_step];

    return Container(
      height: height,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            const SizedBox(height: 10),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.slate200,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 8, 8),
              child: Row(
                children: [
                  IconButton(onPressed: _back, icon: const Icon(Icons.arrow_back)),
                  Expanded(
                    child: Text(
                      _editing ? 'Edit listing' : 'List a gem',
                      style: SocialUi.nameStyle.copyWith(fontSize: 17),
                    ),
                  ),
                  IconButton(
                    onPressed: () {
                      widget.onClose();
                      Navigator.pop(context);
                    },
                    icon: const Icon(Icons.close_rounded, color: SocialUi.mute),
                  ),
                ],
              ),
            ),
            LinearProgressIndicator(
              value: (_step + 1) / _steps.length,
              backgroundColor: AppColors.slate100,
              color: AppColors.primary,
              minHeight: 2,
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: _buildStep(key),
              ),
            ),
            if (_error.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  _error,
                  style: const TextStyle(
                    color: Color(0xFFEF4444),
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: !_canContinue || _busy ? null : _next,
                  child: _busy
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(_step >= _steps.length - 1
                          ? (_editing ? 'Save changes' : 'Publish listing')
                          : 'Continue'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep(String key) {
    switch (key) {
      case 'saleType':
        return _choice(
          'What are you listing?',
          [
            _Choice('single', 'Single Gem'),
            _Choice('lot', 'Gem Lot'),
          ],
          _saleType,
          (v) => setState(() => _saleType = v),
        );
      case 'gemType':
        return _choice(
          'Gem type',
          _gemTypes.map((e) => _Choice(e, e)).toList(),
          _gemType,
          (v) => setState(() => _gemType = v),
        );
      case 'weight':
        return _numberField('Carat weight', _weight, (v) => setState(() => _weight = v));
      case 'price':
        return _numberField('Asking price (LKR)', _price, (v) => setState(() => _price = v));
      case 'cut':
        return _choice('Cut', _cuts.map((e) => _Choice(e, e)).toList(), _cut,
            (v) => setState(() => _cut = v));
      case 'clarity':
        return _choice('Clarity', _clarities.map((e) => _Choice(e, e)).toList(),
            _clarity, (v) => setState(() => _clarity = v));
      case 'treatment':
        return _choice('Treatment', _treatments.map((e) => _Choice(e, e)).toList(),
            _treatment, (v) => setState(() => _treatment = v));
      case 'certification':
        return _choice('Certification', _certs.map((e) => _Choice(e, e)).toList(),
            _certification, (v) => setState(() => _certification = v));
      case 'origin':
        return _choice('Origin', _origins.map((e) => _Choice(e, e)).toList(), _origin,
            (v) => setState(() => _origin = v));
      case 'status':
        return _choice(
          'Listing status',
          const [_Choice('ACTIVE', 'Available'), _Choice('SOLD', 'Sold')],
          _status,
          (v) => setState(() => _status = v),
        );
      case 'photos':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Add photos',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 8),
            const Text(
              'At least 1 image, up to 5.',
              style: TextStyle(color: AppColors.slate500),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                ..._images.asMap().entries.map((entry) {
                  return Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.memory(
                          base64Decode(entry.value.split(',').last),
                          width: 96,
                          height: 96,
                          fit: BoxFit.cover,
                        ),
                      ),
                      Positioned(
                        right: 4,
                        top: 4,
                        child: InkWell(
                          onTap: () => setState(() => _images.removeAt(entry.key)),
                          child: const CircleAvatar(
                            radius: 12,
                            backgroundColor: Colors.black54,
                            child: Icon(Icons.close, size: 14, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  );
                }),
                if (_images.length < 5)
                  InkWell(
                    onTap: _pickImages,
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      width: 96,
                      height: 96,
                      decoration: BoxDecoration(
                        color: AppColors.slate50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.slate200),
                      ),
                      child: const Icon(Icons.add_photo_alternate_outlined,
                          color: AppColors.primary),
                    ),
                  ),
              ],
            ),
          ],
        );
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _choice(
    String title,
    List<_Choice> options,
    String? value,
    ValueChanged<String> onSelect,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 20),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: options.map((option) {
            final selected = value == option.value;
            return ChoiceChip(
              label: Text(option.label),
              selected: selected,
              onSelected: (_) => onSelect(option.value),
              selectedColor: AppColors.primary,
              labelStyle: TextStyle(
                fontWeight: FontWeight.w700,
                color: selected ? Colors.white : AppColors.slate600,
              ),
              backgroundColor: Colors.white,
              side: BorderSide(
                color: selected ? AppColors.primary : AppColors.slate200,
                width: 2,
              ),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _numberField(String title, String value, ValueChanged<String> onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
        const SizedBox(height: 20),
        TextField(
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          onChanged: onChanged,
          controller: TextEditingController(text: value)
            ..selection = TextSelection.collapsed(offset: value.length),
          decoration: InputDecoration(
            filled: true,
            fillColor: AppColors.slate50,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(16),
              borderSide: BorderSide.none,
            ),
          ),
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}

class _Choice {
  const _Choice(this.value, this.label);
  final String value;
  final String label;
}
