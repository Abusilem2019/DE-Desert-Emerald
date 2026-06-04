import sqlite3
import re

DB_PATH = "../Titan_Main_System/Titan_Unified_PROD_CLEAN_2026.db"

def clean_phone_number(phone_str):
    if not phone_str:
        return None
    
    # تحويل القيمة إلى نص وتنظيف المسافات والرموز التالفة
    phone_str = str(phone_str).strip()
    if phone_str in ["None", "null", "-", "", "غير محدد", "01000000000"]:
        return None
        
    # إذا كانت الخانة تحتوي على أكثر من رقم (مفصولين بـ / أو , أو -) نأخذ الرقم الأول فقط
    split_match = re.split(r'[/,|-]', phone_str)
    primary_phone = split_match[0].strip()
    
    # استخراج الأرقام فقط وحذف أي نصوص أو رموز
    digits = re.sub(r'[^0-9]', '', primary_phone)
    
    # معالجة كود الدولة المصري إذا كان مكتوباً (مثل 2010 -> 010)
    if digits.startswith("201") and len(digits) >= 12:
        digits = "0" + digits[2:]
        
    # تصحيح الأرقام التي تبدأ بـ 1 مباشرة (مثل 10xxxx -> 010xxxx)
    if digits.startswith("1") and len(digits) == 10:
        digits = "0" + digits
        
    # التحقق من أن الرقم يطابق معيار الهواتف المحمولة في مصر (11 رقم ويبدأ بـ 01)
    if digits.startswith("01") and len(digits) == 11:
        return digits
        
    # التحقق من الخطوط الأرضية المستقرة (أكبر من أو تساوي 8 أرقام)
    if len(digits) >= 8 and not digits.startswith("01"):
        return digits
        
    return None

def sanitize_phone_data():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        tables = ["unified_commercial", "unified_clinics"]
        print("📊 [System Progress]: Starting System Phone Sanitization Process...")
        
        for table in tables:
            cursor.execute(f"SELECT id, phone, whatsapp FROM {table};")
            rows = cursor.fetchall()
            
            updated_phones = 0
            updated_whatsapp = 0
            
            for row in rows:
                row_id, raw_phone, raw_whatsapp = row
                
                cleaned_p = clean_phone_number(raw_phone)
                cleaned_w = clean_phone_number(raw_whatsapp)
                
                # تحديث قاعدة البيانات في حال حدوث تغيير أو تنظيف للقيمة القديمة
                if cleaned_p != raw_phone or cleaned_w != raw_whatsapp:
                    cursor.execute(
                        f"UPDATE {table} SET phone = ?, whatsapp = ? WHERE id = ?;",
                        (cleaned_p, cleaned_w, row_id)
                    )
                    if cleaned_p != raw_phone: updated_phones += 1
                    if cleaned_w != raw_whatsapp: updated_whatsapp += 1
                    
            print(f"✅ Table [{table}]: Cleaned {updated_phones} phone fields and {updated_whatsapp} whatsapp fields.")
            
        conn.commit()
        print("\n✨ [Success]: Phone Data Sanitization completed cleanly and professionally.")
        
    except Exception as e:
        print(f"❌ [Error] Failed to execute phone sanitization: {e}")
    finally:
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    sanitize_phone_data()
