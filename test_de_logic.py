import sqlite3
import re

# مسار قاعدة بياناتك النظيفة الموحدة
DB_PATH = "../Titan_Main_System/Titan_Unified_PROD_CLEAN_2026.db"

# قاموس الشارع المصري الشامل للترادفات ومطابقتها مع جداول Titan الفعلية
SYNONYMS_MAP = {
    # الأنشطة التجارية والخدمية (مجلد unified_commercial)
    "سوبرماركت": ("تجاري", "unified_commercial"), 
    "ماركت": ("تجاري", "unified_commercial"), 
    "بقاله": ("بقالة", "unified_commercial"),
    "مطعم": ("مطعم", "unified_commercial"), 
    "اكل": ("مطعم", "unified_commercial"), 
    "كافيه": ("كافيه", "unified_commercial"),
    "ميكانيكي": ("سيارات", "unified_commercial"), 
    "عفشه": ("سيارات", "unified_commercial"), 
    "ورشة": ("ورشة", "unified_commercial"),
    "شحن": ("شحن", "unified_commercial"), 
    "جمله": ("جملة", "unified_commercial"), 
    "مورد": ("مورد", "unified_commercial"),
    "محامي": ("محاماة", "unified_commercial"), 
    
    # الجانب الطبي والمراكز (مجلد unified_clinics)
    "دكتور": ("عيادات", "unified_clinics"), 
    "عياده": ("عيادات", "unified_clinics"), 
    "اسنان": ("أسنان", "unified_clinics"),
    "سنان": ("أسنان", "unified_clinics"),
    "جلديه": ("جلدية", "unified_clinics"),
    "ليزر": ("ليزر", "unified_clinics")
}

def normalize(text):
    if not text: return ""
    text = re.sub(r'[أإآا]', 'ا', text)
    text = re.sub(r'[يى]', 'ي', text)
    text = re.sub(r'ة', 'ه', text)
    return text.lower().strip()

def test_search(query, region=""):
    print(f"\n🔍 [بحث جديد]: '{query}' | المنطقة المستهدفة: '{region}'")
    norm_query = normalize(query)
    
    # لقط النية وتحديد الجدول الفعلي والتخصص بالعربي
    target_keyword = ""
    target_table = "unified_commercial" # الافتراضي للأنشطة العامة
    
    for key, val in SYNONYMS_MAP.items():
        if key in norm_query:
            target_keyword = val[0]
            target_table = val[1]
            break
            
    print(f"🎯 [لقط النية الحصين]: الجدول -> [{target_table}] | الكلمة المفتاحية -> [{target_keyword or 'عام'}]")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # بناء استعلام ديناميكي ذكي يبحث في التخصص والاسم والعنوان
        sql = f"SELECT name, specialty, address, area, phone, whatsapp, doctor, source_table FROM {target_table} WHERE 1=1"
        params = []
        
        if target_keyword:
            sql += " AND (specialty LIKE ? OR name LIKE ? OR category LIKE ?)"
            target_norm = f"%{target_keyword}%"
            params.extend([target_norm, target_norm, target_norm])
            
        if region:
            region_norm = f"%{normalize(region)}%"
            sql += " AND (area LIKE ? OR address LIKE ?)"
            params.extend([region_norm, region_norm])
            
        sql += " ORDER BY CASE WHEN phone IS NOT NULL AND phone != '' AND phone != '-' THEN 0 ELSE 1 END LIMIT 1"
        
        cursor.execute(sql, params)
        row = cursor.fetchone()
        
        if not row:
            # محاولة أوسع: البحث بدون اشتراط المنطقة في حال لم نجد في المربع الضيق
            print("🕵️‍♂️ لم نجد نتائج مباشرة في نفس المنطقة الحالية. جاري البحث في النطاق الأوسع العام...")
            sql_broad = f"SELECT name, specialty, address, area, phone, whatsapp, doctor, source_table FROM {target_table} WHERE 1=1"
            params_broad = []
            if target_keyword:
                sql_broad += " AND (specialty LIKE ? OR name LIKE ? OR category LIKE ?)"
                params_broad.extend([f"%{target_keyword}%", f"%{target_keyword}%", f"%{target_keyword}%"])
            sql_broad += " ORDER BY CASE WHEN phone IS NOT NULL AND phone != '' AND phone != '-' THEN 0 ELSE 1 END LIMIT 1"
            
            cursor.execute(sql_broad, params_broad)
            row = cursor.fetchone()
            if not row:
                print("❌ لم يتم العثور على أي بيانات مطابقة في الحصن بالكامل.")
                return
            
        name, spec, address, area, phone, wha, doc, src_tbl = row
        print("\n==========================================")
        print("📊 **الرد الذكي المفروم الخارج من محرك زمردة الصحراء:**")
        print("==========================================")
        print(f"🏢 **الاسم:** {name}")
        print(f"🛠️ **النشاط/التخصص الدقيق:** {spec or 'عام'}")
        print(f"📍 **العنوان الموثق:** {address or area or 'المنطقة العامة'}")
        if doc: print(f"👨‍⚕️ **بإشراف/إدارة:** {doc}")
        if phone and phone.strip() not in ['-', '']:
            print(f"📞 **رقم الهاتف:** {phone}")
        else:
            print("⚠️ **حالة الهاتف:** الرقم المباشر غير مسجل حالياً في مسح الشارع الأخير.")
            print("💡 *[منطق المساعدة]: يمكنك مراجعة أقرب صيدلية أو منشأة تجارية مجاورة لها بالشارع.*")
        if wha: print(f"💬 **واتساب الموثق:** {wha}")
        print(f"🗃️ **المصدر البرمجي:** {src_tbl}")
        print("==========================================")
        
    except Exception as e:
        print(f"❌ خطأ أثناء الاتصال بقاعدة البيانات: {e}")
    finally:
        if 'conn' in locals(): conn.close()

# تجارب حية على الكلمات المتوفرة في الـ DB (مثل جلدية ومصر الجديدة)
test_search("عايز دكتور جلدية و ليزر", "مصر الجديدة")
test_search("مركز تجميل محلي", "المعادي")
