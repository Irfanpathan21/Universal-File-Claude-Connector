import sys
import os

def main():
    if len(sys.argv) < 4:
        sys.stderr.write("Usage: python encrypt_excel.py <input_file> <output_file> <password>\n")
        sys.exit(1)

    input_path = os.path.abspath(sys.argv[1])
    output_path = os.path.abspath(sys.argv[2])
    password = sys.argv[3]

    if not os.path.exists(input_path):
        sys.stderr.write(f"ERROR: Input file not found: {input_path}\n")
        sys.exit(1)

    # Strategy 1: Excel COM Automation (Windows native Microsoft Excel)
    if os.name == 'nt':
        try:
            import win32com.client
            import pythoncom
            pythoncom.CoInitialize()
            excel = win32com.client.DispatchEx("Excel.Application")
            excel.Visible = False
            excel.DisplayAlerts = False
            try:
                wb = excel.Workbooks.Open(input_path)
                wb.SaveAs(output_path, 51, password)
                wb.Close(SaveChanges=False)
                excel.Quit()
                pythoncom.CoUninitialize()
                if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
                    sys.stdout.write("SUCCESS: COM\n")
                    sys.exit(0)
            except Exception as e_com:
                try:
                    excel.Quit()
                except Exception:
                    pass
                pythoncom.CoUninitialize()
                sys.stderr.write(f"COM error: {e_com}\n")
        except Exception as e_dispatch:
            sys.stderr.write(f"COM Dispatch error: {e_dispatch}\n")

    # Strategy 2: msoffcrypto-tool
    try:
        import msoffcrypto
        with open(input_path, "rb") as fin, open(output_path, "wb") as fout:
            file = msoffcrypto.OfficeFile(fin)
            file.encrypt(password, fout)
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            sys.stdout.write("SUCCESS: MSOFFCRYPTO\n")
            sys.exit(0)
    except Exception as e_crypto:
        sys.stderr.write(f"msoffcrypto error: {e_crypto}\n")

    # Strategy 3: openpyxl protection fallback
    try:
        import openpyxl
        wb = openpyxl.load_workbook(input_path)
        for ws in wb.worksheets:
            ws.protection.sheet = True
            ws.protection.password = password
            ws.protection.enable()
        wb.security.workbookPassword = password
        wb.security.lockStructure = True
        wb.save(output_path)
        if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
            sys.stdout.write("SUCCESS: OPENPYXL\n")
            sys.exit(0)
    except Exception as e_openpyxl:
        sys.stderr.write(f"openpyxl error: {e_openpyxl}\n")

    sys.stderr.write("ERROR: All Excel protection engines failed\n")
    sys.exit(1)

if __name__ == "__main__":
    main()
