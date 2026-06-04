import sqlite3

DB_PATH = "Titan_Unified_PROD_CLEAN_2026.db"

def inspect_db():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 1. جلب أسماء الجداول الفعلية المتاحة
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"📦 الجداول الموجودة في قاعدة البيانات الحالية: {tables}\n")
        
        # 2. فحص عينات من الجداول التجارية والطبية لمعرفة لغة التخصصات والأسماء
        for table in tables:
            if 'commercial' in table or 'clinic' in table or 'pharmacy' in table:
                print(f"--- 📊 عينة من جدول {table} ---")
                try:
                    # جلب أسماء الأعمدة
                    cursor.execute(f"PRAGMA table_info({table});")
                    columns = [col[1] for col in cursor.fetchall()]
                    print(f"🔹 الأعمدة: {columns}")
                    
                    # جلب أول 3 صفوف كعينة
                    cursor.execute(f"SELECT * FROM {table} LIMIT 3;")
                    rows = cursor.fetchall()
                    for row in rows:
                        print(f"   {row}")
                except Exception as e:
                    print(f"❌ تعذر فحص الجدول {table}: {e}")
                print()
                
    except Exception as e:
        print(f"❌ خطأ أثناء فتح قاعدة البيانات: {e}")
    finally:
        if 'conn' in locals(): conn.close()

inspect_db()
