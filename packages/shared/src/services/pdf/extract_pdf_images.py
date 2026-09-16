import sys
import os
import json
import io

def extract_with_fitz(input_pdf, output_dir, base_name, mode='auto', preferred_fmt='png'):
    import fitz
    from PIL import Image

    doc = fitz.open(input_pdf)
    total_pages = len(doc)
    results = []
    extracted_embedded = []
    seen_xrefs = set()

    # 1. Extract embedded images if requested
    if mode in ('auto', 'embedded'):
        for pno in range(total_pages):
            page = doc[pno]
            img_list = page.get_images(full=True)
            for img_info in img_list:
                xref = img_info[0]
                if xref in seen_xrefs:
                    continue
                seen_xrefs.add(xref)
                try:
                    base_img = doc.extract_image(xref)
                    if not base_img:
                        continue
                    img_bytes = base_img.get("image")
                    if not img_bytes:
                        continue

                    ext = base_img.get("ext", "png").lower()
                    target_ext = preferred_fmt.lower() if preferred_fmt else ('jpg' if ext in ('jpeg', 'jpg') else 'png')
                    if target_ext in ('jpg', 'jpeg'):
                        target_ext = 'jpg'
                        mime = 'image/jpeg'
                    else:
                        target_ext = 'png'
                        mime = 'image/png'

                    # Validate and convert using PIL to guarantee valid image container
                    try:
                        pil_img = Image.open(io.BytesIO(img_bytes))
                        if target_ext == 'jpg' and pil_img.mode in ('RGBA', 'LA', 'P'):
                            pil_img = pil_img.convert('RGB')
                        out_buf = io.BytesIO()
                        pil_img.save(out_buf, format='JPEG' if target_ext == 'jpg' else 'PNG', quality=95)
                        img_bytes = out_buf.getvalue()
                    except Exception as pe:
                        sys.stderr.write(f"PIL verification note for xref {xref}: {pe}\n")

                    img_filename = f"{base_name}_img_{len(extracted_embedded) + 1}.{target_ext}"
                    out_path = os.path.join(output_dir, img_filename)
                    with open(out_path, 'wb') as f_out:
                        f_out.write(img_bytes)

                    results.append({
                        "name": img_filename,
                        "path": out_path,
                        "size": len(img_bytes),
                        "mimeType": mime,
                        "extension": f".{target_ext}"
                    })
                    extracted_embedded.append(out_path)
                except Exception as err:
                    sys.stderr.write(f"Warning: could not extract image xref {xref}: {err}\n")

    # 2. If mode is 'pages', or if mode is 'auto' and no embedded images were found:
    if mode == 'pages' or (mode in ('auto', 'embedded') and len(results) == 0):
        target_ext = 'jpg' if preferred_fmt.lower() in ('jpg', 'jpeg') else 'png'
        mime = 'image/jpeg' if target_ext == 'jpg' else 'image/png'

        for pno in range(total_pages):
            page = doc[pno]
            pix = page.get_pixmap(dpi=150)
            page_filename = f"{base_name}_page_{pno + 1}.{target_ext}"
            out_path = os.path.join(output_dir, page_filename)

            if target_ext == 'jpg':
                from PIL import Image
                pil_img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                pil_img.save(out_path, format="JPEG", quality=92)
            else:
                pix.save(out_path)

            file_size = os.path.getsize(out_path)
            results.append({
                "name": page_filename,
                "path": out_path,
                "size": file_size,
                "mimeType": mime,
                "extension": f".{target_ext}"
            })

    doc.close()
    return results

def extract_with_pypdf(input_pdf, output_dir, base_name, preferred_fmt='png'):
    import pypdf
    from PIL import Image

    reader = pypdf.PdfReader(input_pdf)
    results = []
    img_idx = 1
    target_ext = 'jpg' if preferred_fmt.lower() in ('jpg', 'jpeg') else 'png'
    mime = 'image/jpeg' if target_ext == 'jpg' else 'image/png'

    for page in reader.pages:
        for image_file_object in page.images:
            out_filename = f"{base_name}_img_{img_idx}.{target_ext}"
            out_path = os.path.join(output_dir, out_filename)
            try:
                pil_img = Image.open(io.BytesIO(image_file_object.data))
                if target_ext == 'jpg' and pil_img.mode in ('RGBA', 'LA', 'P'):
                    pil_img = pil_img.convert('RGB')
                pil_img.save(out_path, format='JPEG' if target_ext == 'jpg' else 'PNG', quality=95)
            except Exception:
                with open(out_path, 'wb') as f:
                    f.write(image_file_object.data)

            results.append({
                "name": out_filename,
                "path": out_path,
                "size": os.path.getsize(out_path),
                "mimeType": mime,
                "extension": f".{target_ext}"
            })
            img_idx += 1

    return results

def main():
    if len(sys.argv) < 4:
        sys.stderr.write("Usage: python extract_pdf_images.py <input_pdf> <output_dir> <base_name> [mode] [format]\n")
        sys.exit(1)

    input_pdf = sys.argv[1]
    output_dir = sys.argv[2]
    base_name = sys.argv[3]
    mode = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else 'auto'
    preferred_fmt = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] else 'png'

    if not os.path.exists(input_pdf):
        sys.stderr.write(f"Input file not found: {input_pdf}\n")
        sys.exit(1)

    os.makedirs(output_dir, exist_ok=True)

    results = []
    try:
        results = extract_with_fitz(input_pdf, output_dir, base_name, mode, preferred_fmt)
    except Exception as e:
        sys.stderr.write(f"PyMuPDF failed: {e}. Trying pypdf fallback...\n")
        try:
            results = extract_with_pypdf(input_pdf, output_dir, base_name, preferred_fmt)
        except Exception as e2:
            sys.stderr.write(f"pypdf fallback failed: {e2}\n")
            sys.exit(1)

    if not results:
        sys.stderr.write("No images could be extracted or generated from PDF.\n")
        sys.exit(1)

    sys.stdout.write("RESULT_JSON:" + json.dumps(results) + "\n")
    sys.exit(0)

if __name__ == '__main__':
    main()
