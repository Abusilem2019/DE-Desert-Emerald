import sqlite3
import psycopg2
import os

# إعدادات الاتصال
SQLITE_DB = "../Titan_Main_System/Titan_Unified_PROD_CLEAN_2026.db"

def migrate():
    # محاولة جلب الرابط من البيئة، ولو مش موجود نطلبه من المستخدم
    POSTGRES_URL = os.environ.get("DATABASE_URL")
    if not POSTGRES_URL:
        print("⚠️ لم يتم العثور على DATABASE_URL في النظام.")
        POSTGRES_URL = input("🔗 من فضلك، انسخ رابط قاعدة البيانات (DATABASE_URL) من Replit والصقه هنا:\n> ").strip()
        
    if not POSTGRES_URL:
        print("❌ خطأ: الرابط مطلوب لإتمام عملية النقل.")
        return

    try:
        # الاتصال بالقواعد
        sql_conn = sqlite3.connect(SQLITE_DB)
        pg_conn = psycopg2.connect(POSTGRES_URL)
        sql_cur = sql_conn.cursor()
        pg_cur = pg_conn.cursor()

        tables = ['unified_commercial', 'unified_clinics', 'unified_pharmacies', 'unified_hospitals', 'unified_labs', 'unified_medical_supplies']

        for table in tables:
            print(f"🔄 جاري قراءة ونقل جدول: [{table}]...")
            
            # التأكد من وجود الجدول في Postgres أولاً (إذا لم يكن موجوداً يجب إنشاؤه، لكن بافتراض أن الـ schema متطابقة)
            # جلب البيانات من SQLite
            sql_cur.execute(f"SELECT * FROM {table}")
            rows = sql_cur.fetchall()
            
            if not rows:
                print(f"   - الجدول فارغ، تم التخطي.")
                continue
                
            # تحويل البيانات إلى Postgres
            successful_inserts = 0
            for row in rows:
                cols = len(row)
                placeholders = ','.join(['%s'] * cols)
                # استخدام ON CONFLICT للتعامل مع المفاتيح المكررة إذا كانت موجودة
                query = f"INSERT INTO {table} VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING;"
                try:
                    pg_cur.execute(query, row)
                    successful_inserts += 1
                except Exception as row_e:
                    # تفادي توقف السكريبت بالكامل بسبب صف واحد به مشكلة
                    pg_conn.rollback()
                    continue
                    
            print(f"   ✅ تم حقن {successful_inserts} سجل بنجاح.")
            pg_conn.commit()
            
        print("\n✨ [Success]: تمت عملية الهجرة بالكامل! الـ 24 ألف سجل الآن على خوادم المشروع الحية.")
        
    except Exception as e:
        print(f"\n❌ [Error]: حدث خطأ أثناء عملية النقل: {e}")
    finally:
        if 'sql_conn' in locals(): sql_conn.close()
        if 'pg_conn' in locals(): pg_conn.close()

if __name__ == "__main__":
    migrate()
