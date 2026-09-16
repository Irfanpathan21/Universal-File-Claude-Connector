import sys
import os
import io

def parse_bgcolor(bg_str):
    if not bg_str or bg_str.lower() in ('none', 'transparent', ''):
        return None
    bg_str = bg_str.strip().lstrip('#')
    if len(bg_str) == 6:
        r = int(bg_str[0:2], 16)
        g = int(bg_str[2:4], 16)
        b = int(bg_str[4:6], 16)
        return (r, g, b, 255)
    elif len(bg_str) == 8:
        r = int(bg_str[0:2], 16)
        g = int(bg_str[2:4], 16)
        b = int(bg_str[4:6], 16)
        a = int(bg_str[6:8], 16)
        return (r, g, b, a)
    return None

def remove_background(input_path, output_path, model_name='u2net', bgcolor_str=None):
    bgcolor = parse_bgcolor(bgcolor_str)

    # Method 1: High-Fidelity AI Background Removal with rembg
    try:
        import rembg
        from PIL import Image

        with open(input_path, 'rb') as f:
            input_bytes = f.read()

        session = None
        # Preferred models in priority
        candidates = [model_name]
        if model_name != 'u2net':
            candidates.append('u2net')
        if 'u2netp' not in candidates:
            candidates.append('u2netp')

        for candidate in candidates:
            try:
                session = rembg.new_session(candidate)
                break
            except Exception:
                continue

        remove_kwargs = {
            'post_process_mask': True,
        }
        if bgcolor:
            remove_kwargs['bgcolor'] = bgcolor

        if session is not None:
            output_bytes = rembg.remove(input_bytes, session=session, **remove_kwargs)
        else:
            output_bytes = rembg.remove(input_bytes, **remove_kwargs)

        with open(output_path, 'wb') as f:
            f.write(output_bytes)

        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return True, f"Background removed with rembg AI ({model_name})"
    except Exception as e:
        sys.stderr.write(f"rembg notice: {e}\n")

    # Method 2: Color-distance fallback using PIL & NumPy
    try:
        from PIL import Image
        import numpy as np

        img = Image.open(input_path).convert("RGBA")
        arr = np.array(img)

        # Sample corner colors to determine background color
        h, w = arr.shape[:2]
        corners = [
            arr[0, 0, :3],
            arr[0, w - 1, :3],
            arr[h - 1, 0, :3],
            arr[h - 1, w - 1, :3]
        ]
        bg_color = np.median(corners, axis=0)

        # Calculate Euclidean color distance from background color
        diff = np.sqrt(np.sum((arr[:, :, :3].astype(np.float32) - bg_color.astype(np.float32)) ** 2, axis=-1))

        # Soft edge thresholding
        threshold = 28.0
        feather = 18.0
        alpha = np.clip((diff - threshold) / feather * 255.0, 0, 255).astype(np.uint8)
        arr[:, :, 3] = alpha

        res = Image.fromarray(arr)
        if bgcolor:
            bg_img = Image.new("RGBA", res.size, bgcolor)
            bg_img.alpha_composite(res)
            res = bg_img

        res.save(output_path, format="PNG")
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            return True, "Background removed with color-distance fallback"
    except Exception as e:
        sys.stderr.write(f"Fallback notice: {e}\n")

    return False, "Failed to remove background"

if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.stderr.write("Usage: python remove_bg.py <input> <output> [model] [bgcolor]\n")
        sys.exit(1)

    inp = sys.argv[1]
    out = sys.argv[2]
    model = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else 'u2net'
    bg = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else None

    success, msg = remove_background(inp, out, model, bg)
    if success:
        sys.exit(0)
    else:
        sys.stderr.write(f"Error: {msg}\n")
        sys.exit(1)
