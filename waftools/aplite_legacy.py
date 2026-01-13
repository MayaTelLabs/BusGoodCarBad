from waflib.Configure import conf


@conf
def appinfo_bitmap_to_png(ctx, appinfo_json):
    supports = getattr(ctx, "supports_bitmap_resource", lambda: False)
    try:
        has_bitmap_support = bool(supports())
    except TypeError:
        # If supports is unexpectedly not callable, treat as False
        has_bitmap_support = False

    if not has_bitmap_support:
        for res in appinfo_json.get('resources', {}).get('media', []):
            if res.get('type') == 'bitmap':
                res['type'] = 'png'