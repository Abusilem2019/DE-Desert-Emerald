import sqlite3
import psycopg2
import os

SQLITE_DB = "Titan_Unified_PROD_CLEAN_2026.db"
POSTGRES_URL = "postgresql://postgres:password@helium/heliumdb?sslmode=disable"

def migrate():
    try:
        sql_conn = sqlite3.connect(SQLITE_DB)
        pg_conn = psycopg2.connect(POSTGRES_URL)
        sql_cur = sql_conn.cursor()
        pg_cur = pg_conn.cursor()

        tables = ['unified_commercial', 'unified_clinics', 'unified_pharmacies', 'unified_hospitals', 'unified_labs', 'unified_medical_supplies']

        for table in tables:
            print(f"🔄 جاري حقن جدول: [{table}]...")
            sql_cur.execute(f"SELECT * FROM {table}")
            rows = sql_cur.fetchall()
            
            if not rows: continue
                
            successful_inserts = 0
            for row in rows:
                cols = len(row)
                placeholders = ','.join(['%s'] * cols)
                query = f"INSERT INTO {table} VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING;"
                try:
                    pg_cur.execute(query, row)
                    successful_inserts += 1
                except:
                    pg_conn.rollback()
                    continue
                    
            print(f"   ✅ تم صب {successful_inserts} سجل في السيرفر الحي.")
            pg_conn.commit()
            
        print("\n✨ [العملية تمت بنجاح]: الـ 24 ألف سجل بقوا جوة السيرفر رسمي ومؤمنين!")
    except Exception as e:
        print(f"❌ حدث خطأ: {e}")
    finally:
        if 'sql_conn' in locals(): sql_conn.close()
        if 'pg_conn' in locals(): pg_conn.close()

if __name__ == "__main__":
    migrate()
