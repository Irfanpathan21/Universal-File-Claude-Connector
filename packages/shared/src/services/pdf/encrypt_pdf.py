import sys
import os

try:
    from pypdf import PdfReader, PdfWriter
except ImportError:
    try:
        from PyPDF2 import PdfReader, PdfWriter
    except ImportError:
        sys.stderr.write('ERROR: Neither pypdf nor PyPDF2 is installed.\n')
        sys.exit(1)

def main():
    if len(sys.argv) < 4:
        sys.stderr.write('Usage: python encrypt_pdf.py <input_pdf> <output_pdf> <password>\n')
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    password = sys.argv[3]

    if not os.path.exists(input_path):
        sys.stderr.write(f'ERROR: input file not found: {input_path}\n')
        sys.exit(1)

    try:
        reader = PdfReader(input_path)
        writer = PdfWriter()

        for page in reader.pages:
            writer.add_page(page)

        if reader.metadata:
            writer.add_metadata(reader.metadata)

        try:
            writer.encrypt(user_password=password, algorithm='AES-128')
        except Exception:
            writer.encrypt(user_password=password, algorithm='RC4-128')

        with open(output_path, 'wb') as f_out:
            writer.write(f_out)

        sys.stdout.write('SUCCESS\n')
        sys.exit(0)
    except Exception as e:
        sys.stderr.write(f'ERROR: {str(e)}\n')
        sys.exit(1)

if __name__ == '__main__':
    main()
