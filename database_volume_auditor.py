import sqlite3

DB_PATH = "../Titan_Main_System/Titan_Unified_PROD_CLEAN_2026.db"

def audit_database_volume():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        print("📊 [System Audit]: Executing Official Database Volume Count...\n")
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'unified_%';")
        tables = [row[0] for row in cursor.fetchall()]
        
        grand_total = 0
        print("| اسم الجدول الفعلي (Table Name) | عدد السجلات الموثقة (Record Count) |")
        print("| :--- | :--- |")
        
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table};")
            count = cursor.fetchone()[0]
            print(f"| {table:<30} | {count:<33,} |")
            grand_total += count
            
        print(f"\n📈 [Grand Total]: إجمالي السجلات التجارية والطبية المفرومة في المنظومة: {grand_total:,} سجل.")
        
    except Exception as e:
        print(f"❌ [Audit Error]: Failed to read database volume: {e}")
    finally:
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    audit_database_volume()
